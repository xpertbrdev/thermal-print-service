import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ThermalPrinter, PrinterTypes, CharacterSet } from 'node-thermal-printer';

@Injectable()
export class EscPosTestService {
  private readonly logger = new Logger(EscPosTestService.name);

  /**
   * Testa comandos ESC/POS de margem sem conectar à impressora
   * @param printerWidth - Largura da impressora em mm
   * @param printableWidth - Largura útil desejada em mm
   */
  async testMarginCommands(printerWidth: number, printableWidth?: number): Promise<{
    commands: string[];
    buffer: number[];
    analysis: string;
  }> {
    this.logger.log(`Testando comandos ESC/POS para impressora ${printerWidth}mm`);

    // Criar impressora fictícia para teste
    const printer = new ThermalPrinter({
      type: PrinterTypes.EPSON,
      interface: 'tcp://127.0.0.1:9100', // IP fictício
      width: 48,
      characterSet: CharacterSet.PC852_LATIN2
    });

    const commands: string[] = [];

    if (printableWidth && printableWidth < printerWidth) {
      // Teste com margem customizada
      const marginMm = (printerWidth - printableWidth) / 2;
      const marginUnits = this.calculateMarginUnits(marginMm);

      // ESC l n - Margem esquerda
      await printer.raw(Buffer.from([0x1B, 0x6C, marginUnits]));
      commands.push(`ESC l ${marginUnits} (1B 6C ${marginUnits.toString(16).padStart(2, '0').toUpperCase()}) - Margem esquerda ${marginMm}mm`);

      // ESC Q n - Margem direita
      await printer.raw(Buffer.from([0x1B, 0x51, marginUnits]));
      commands.push(`ESC Q ${marginUnits} (1B 51 ${marginUnits.toString(16).padStart(2, '0').toUpperCase()}) - Margem direita ${marginMm}mm`);

    } else {
      // Teste com margem zero
      await printer.raw(Buffer.from([0x1B, 0x6C, 0x00]));
      commands.push('ESC l 0 (1B 6C 00) - Margem esquerda zero');

      await printer.raw(Buffer.from([0x1B, 0x51, 0x00]));
      commands.push('ESC Q 0 (1B 51 00) - Margem direita zero');
    }

    // Adicionar texto de teste
    printer.alignCenter();
    printer.bold(true);
    printer.println('TESTE MARGEM ESC/POS');
    printer.bold(false);
    printer.alignLeft();
    printer.println('Esta linha deve ocupar toda largura disponível');
    printer.println('X'.repeat(48)); // Linha de X's para visualizar largura

    const buffer = Array.from(printer.getBuffer());

    const analysis = this.analyzeBuffer(buffer, commands);

    this.logger.log(`Comandos gerados: ${commands.length}`);
    this.logger.log(`Buffer size: ${buffer.length} bytes`);

    return {
      commands,
      buffer,
      analysis
    };
  }

  /**
   * Testa comando ESC W (área de impressão avançada)
   */
  async testAdvancedAreaCommand(
    startXMm: number,
    startYMm: number,
    widthMm: number,
    heightMm: number
  ): Promise<{
    command: string;
    buffer: number[];
    analysis: string;
  }> {
    this.logger.log(`Testando comando ESC W: área ${widthMm}x${heightMm}mm em (${startXMm}, ${startYMm})`);

    const printer = new ThermalPrinter({
      type: PrinterTypes.EPSON,
      interface: 'tcp://127.0.0.1:9100',
      width: 48
    });

    // Converter mm para unidades (1/180 inch)
    const unitsPerMm = 180 / 25.4;
    const xStart = Math.round(startXMm * unitsPerMm);
    const yStart = Math.round(startYMm * unitsPerMm);
    const width = Math.round(widthMm * unitsPerMm);
    const height = Math.round(heightMm * unitsPerMm);

    // ESC W - Comando avançado
    const escWCommand = Buffer.from([
      0x1B, 0x57,                           // ESC W
      xStart & 0xFF, (xStart >> 8) & 0xFF,  // xL, xH
      yStart & 0xFF, (yStart >> 8) & 0xFF,  // yL, yH
      width & 0xFF, (width >> 8) & 0xFF,    // dxL, dxH
      height & 0xFF, (height >> 8) & 0xFF   // dyL, dyH
    ]);

    await printer.raw(escWCommand);

    const command = `ESC W (1B 57 ${Array.from(escWCommand.slice(2)).map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ')}) - Área ${widthMm}x${heightMm}mm`;
    const buffer = Array.from(printer.getBuffer());
    const analysis = `Comando ESC W configurado para área de ${widthMm}x${heightMm}mm iniciando em (${startXMm}, ${startYMm})mm`;

    return {
      command,
      buffer,
      analysis
    };
  }

  /**
   * Compara buffers com e sem comandos ESC/POS
   */
  async compareBuffers(): Promise<{
    withoutEscPos: number[];
    withEscPos: number[];
    difference: string[];
  }> {
    this.logger.log('Comparando buffers com e sem comandos ESC/POS');

    try {
      // Buffer sem comandos ESC/POS
      const printerWithout = new ThermalPrinter({
        type: PrinterTypes.EPSON,
        interface: 'tcp://127.0.0.1:9100',
        width: 48,
        options: {
          timeout: 30000
        }
      });

      printerWithout.println('TESTE SEM ESC/POS');
      const withoutEscPos = Array.from(printerWithout.getBuffer());

      // Buffer com comandos ESC/POS
      const printerWith = new ThermalPrinter({
        type: PrinterTypes.EPSON,
        interface: 'tcp://127.0.0.1:9100',
        width: 48
      });

      // Adicionar comandos de margem
      await printerWith.raw(Buffer.from([0x1B, 0x6C, 0x00])); // ESC l 0
      await printerWith.raw(Buffer.from([0x1B, 0x51, 0x00])); // ESC Q 0
      printerWith.println('TESTE COM ESC/POS');
      const withEscPos = Array.from(printerWith.getBuffer());
      printerWith.clear()

      // Analisar diferenças
      const difference: string[] = [];
      const extraBytes = withEscPos.slice(0, withEscPos.length - withoutEscPos.length);

      if (extraBytes.length >= 6) {
        difference.push(`ESC l 0: ${extraBytes.slice(0, 3).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' ')}`);
        difference.push(`ESC Q 0: ${extraBytes.slice(3, 6).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' ')}`);
      }

      this.logger.log(`Buffer sem ESC/POS: ${withoutEscPos.length} bytes`);
      this.logger.log(`Buffer com ESC/POS: ${withEscPos.length} bytes`);
      this.logger.log(`Diferença: ${withEscPos.length - withoutEscPos.length} bytes`);

      return {
        withoutEscPos,
        withEscPos,
        difference
      };
    } catch (e) {
      this.logger.error(`Compare error: ${e}`)
      throw new ServiceUnavailableException(`Impressora teste não iniciou. \n${e.message}`);
    }
  }

  /**
   * Valida se comandos ESC/POS estão sendo adicionados corretamente
   */
  async validateEscPosIntegration(printerId: string): Promise<{
    isWorking: boolean;
    commands: string[];
    issues: string[];
  }> {
    this.logger.log(`Validando integração ESC/POS para impressora: ${printerId}`);

    const issues: string[] = [];
    const commands: string[] = [];
    let isWorking = true;

    try {
      // Simular criação de impressora (sem conectar)
      const testResult = await this.testMarginCommands(80, 72);

      // Verificar se comandos de margem estão presentes
      const hasEscL = testResult.buffer.some((byte, index) =>
        byte === 0x1B && testResult.buffer[index + 1] === 0x6C
      );

      const hasEscQ = testResult.buffer.some((byte, index) =>
        byte === 0x1B && testResult.buffer[index + 1] === 0x51
      );

      if (!hasEscL) {
        issues.push('Comando ESC l (margem esquerda) não encontrado no buffer');
        isWorking = false;
      } else {
        commands.push('✅ ESC l detectado no buffer');
      }

      if (!hasEscQ) {
        issues.push('Comando ESC Q (margem direita) não encontrado no buffer');
        isWorking = false;
      } else {
        commands.push('✅ ESC Q detectado no buffer');
      }

      // Verificar ordem dos comandos
      const escLIndex = testResult.buffer.findIndex((byte, index) =>
        byte === 0x1B && testResult.buffer[index + 1] === 0x6C
      );

      const textIndex = testResult.buffer.findIndex((byte, index) =>
        byte === 0x54 && testResult.buffer[index + 1] === 0x45 // "TE" de "TESTE"
      );

      if (escLIndex > textIndex && textIndex !== -1) {
        issues.push('Comandos ESC/POS estão sendo enviados após o texto (ordem incorreta)');
        isWorking = false;
      } else {
        commands.push('✅ Comandos ESC/POS enviados antes do conteúdo');
      }

    } catch (error) {
      issues.push(`Erro na validação: ${error.message}`);
      isWorking = false;
    }

    this.logger.log(`Validação concluída: ${isWorking ? 'SUCESSO' : 'FALHA'}`);

    return {
      isWorking,
      commands,
      issues
    };
  }

  /**
   * Calcula unidades de margem para comandos ESC/POS
   */
  private calculateMarginUnits(marginMm: number, dpi: number = 203): number {
    const units = Math.round((marginMm / 25.4) * dpi / 8);
    return Math.max(0, Math.min(255, units));
  }

  /**
   * Analisa buffer de comandos
   */
  private analyzeBuffer(buffer: number[], commands: string[]): string {
    const analysis: string[] = [];

    analysis.push(`Buffer total: ${buffer.length} bytes`);
    analysis.push(`Comandos ESC/POS: ${commands.length}`);

    // Procurar comandos ESC/POS no buffer
    let escCount = 0;
    for (let i = 0; i < buffer.length - 1; i++) {
      if (buffer[i] === 0x1B) { // ESC
        escCount++;
        const nextByte = buffer[i + 1];
        switch (nextByte) {
          case 0x6C:
            analysis.push(`  Encontrado ESC l no offset ${i}`);
            break;
          case 0x51:
            analysis.push(`  Encontrado ESC Q no offset ${i}`);
            break;
          case 0x57:
            analysis.push(`  Encontrado ESC W no offset ${i}`);
            break;
        }
      }
    }

    analysis.push(`Total de comandos ESC encontrados: ${escCount}`);

    return analysis.join('\n');
  }
}
