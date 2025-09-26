import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ThermalPrinter, PrinterTypes, CharacterSet } from 'node-thermal-printer';
import { ConfigService } from './config.service';
import { ImageService } from './image.service';
import { PrintRequestDto, ContentItemDto, ContentType, TextAlign } from '../dto/print.dto';
import { PrinterConfigDto, PrinterType, InterfaceType } from '../dto/printer-config.dto';

@Injectable()
export class PrinterService {
  private readonly logger = new Logger(PrinterService.name);
  private currentPrinterId: string = '';

  constructor(
    private readonly configService: ConfigService,
    private readonly imageService: ImageService
  ) {}

  async processJobAsync(job: any): Promise<void> {
    const printerConfig = await this.getPrinterConfiguration(job.printerId);
    const printer = await this.createPrinterInstance(printerConfig);
    
    await this.processPrintContent(printer, job.content);
    await printer.execute();
    
    this.logger.log(`Job ${job.sessionId} processado com sucesso para impressora: ${printerConfig.id}`);
  }

  async print(printRequest: PrintRequestDto): Promise<{ success: boolean; message: string, buffer?: string }> {
    try {
      this.currentPrinterId = printRequest.printerId || 'default';
      const printerConfig = await this.getPrinterConfiguration(printRequest.printerId);
      const printer = await this.createPrinterInstance(printerConfig);
      
      await this.processPrintContent(printer, printRequest.content);
      
      let bufferText
      if (printRequest.returnBuffer) {
        bufferText = printer.getBuffer().toString('utf-8')

      } else {
        const result = await printer.execute();
        this.logger.log(`Impressão executada com sucesso para impressora: ${printerConfig.id}`);
      }
      
      return {
        success: true,
        message: 'Impressão realizada com sucesso',
        buffer: this.limparTextoEscPos(bufferText)
      };
    } catch (error) {
      this.logger.error('Erro durante impressão:', error);
      throw new BadRequestException(`Falha na impressão: ${error.message}`);
    }
  }

  limparTextoEscPos(str: string) {
    // Mantém apenas caracteres imprimíveis e quebras de linha
    let result = str.replaceAll(/[^\x20-\x7E\n]/g, '');
    result = result.replace(/[^\x20-\x7E\n]/g, '');
    return result
  }

  async testConnection(printerId?: string): Promise<{ connected: boolean; printer: string }> {
    try {
      const printerConfig = await this.getPrinterConfiguration(printerId);
      const printer = await this.createPrinterInstance(printerConfig);
      
      const isConnected = await printer.isPrinterConnected();
      
      return {
        connected: isConnected,
        printer: printerConfig.name
      };
    } catch (error) {
      this.logger.error('Erro ao testar conexão:', error);
      return {
        connected: false,
        printer: printerId || 'default'
      };
    }
  }

  private async getPrinterConfiguration(printerId?: string): Promise<PrinterConfigDto> {
    if (printerId) {
      const config = await this.configService.getPrinterConfig(printerId);
      if (!config) {
        throw new Error(`Impressora com ID '${printerId}' não encontrada`);
      }
      return config;
    }

    const allPrinters = await this.configService.getAllPrinters();
    if (allPrinters.length === 0) {
      throw new Error('Nenhuma impressora configurada');
    }

    return allPrinters[0]; // Retorna a primeira impressora como padrão
  }

  private async createPrinterInstance(config: PrinterConfigDto): Promise<ThermalPrinter> {
    const printerType = this.mapPrinterType(config.type);
    const connectionInterface = this.buildInterface(config);
    const characterSet = this.mapCharacterSet(config.characterSet);
    const defaultSettings = await this.configService.getDefaultSettings();

    const printer = new ThermalPrinter({
      type: printerType,
      interface: connectionInterface,
      width: config.charPerLine || defaultSettings.charPerLine || 48, // Usar charPerLine para caracteres por linha
      characterSet: characterSet,
      // timeout removido - não suportado pela interface
      removeSpecialCharacters: false,
      lineCharacter: '-',
      // breakLine: 1 // Removido - causava erro de tipo
    });

    return printer;
  }

  private mapPrinterType(type: PrinterType): any {
    const typeMap = {
      [PrinterType.EPSON]: PrinterTypes.EPSON,
      [PrinterType.STAR]: PrinterTypes.STAR,
      [PrinterType.BROTHER]: PrinterTypes.BROTHER,
      [PrinterType.TANCA]: PrinterTypes.TANCA,
      [PrinterType.DARUMA]: PrinterTypes.DARUMA,
      [PrinterType.CUSTOM]: PrinterTypes.CUSTOM
    };

    return typeMap[type] || PrinterTypes.EPSON;
  }

  private buildInterface(config: PrinterConfigDto): string {
    switch (config.connectionType) {
      case InterfaceType.NETWORK:
        return `tcp://${config.address}`;
      case InterfaceType.USB:
        return config.address; // Path do dispositivo USB
      case InterfaceType.SERIAL:
        return config.address; // Path da porta serial
      default:
        throw new Error(`Tipo de interface não suportado: ${config.connectionType}`);
    }
  }

  private mapCharacterSet(characterSet?: string): any {
    if (!characterSet) return CharacterSet.PC852_LATIN2;

    const charSetMap = {
      'PC852_LATIN2': CharacterSet.PC852_LATIN2,
      'PC437_USA': CharacterSet.PC437_USA,
      'PC850_MULTILINGUAL': CharacterSet.PC850_MULTILINGUAL,
      'PC860_PORTUGUESE': CharacterSet.PC860_PORTUGUESE,
      'PC863_CANADIAN_FRENCH': CharacterSet.PC863_CANADIAN_FRENCH,
      'PC865_NORDIC': CharacterSet.PC865_NORDIC,
      'PC858_EURO': CharacterSet.PC858_EURO,
      'WPC1252': CharacterSet.WPC1252,
      'CHINA': CharacterSet.CHINA,
      'JAPAN': CharacterSet.JAPAN,
      'KOREA': CharacterSet.KOREA,
    };

    return charSetMap[characterSet] || CharacterSet.PC852_LATIN2;
  }

  private async processPrintContent(printer: ThermalPrinter, content: ContentItemDto[]): Promise<void> {
    for (const item of content) {
      await this.processContentItem(printer, item);
    }
  }

  private async processContentItem(printer: ThermalPrinter, item: ContentItemDto): Promise<void> {
    switch (item.type) {
      case ContentType.TEXT:
        this.processTextItem(printer, item);
        break;
      case ContentType.IMAGE:
        await this.processImageItem(printer, item);
        break;
      case ContentType.TABLE:
        this.processTableItem(printer, item);
        break;
      case ContentType.BARCODE:
        this.processBarcodeItem(printer, item);
        break;
      case ContentType.QR_CODE:
        this.processQRCodeItem(printer, item);
        break;
      case ContentType.CUT:
        printer.cut();
        break;
      case ContentType.BEEP:
        printer.beep();
        break;
      case ContentType.CASH_DRAWER:
        printer.openCashDrawer();
        break;
      case ContentType.LINE:
        printer.drawLine();
        break;
      case ContentType.NEW_LINE:
        printer.newLine();
        break;
      default:
        this.logger.warn(`Tipo de conteúdo não suportado: ${item.type}`);
    }
  }

  private processTextItem(printer: ThermalPrinter, item: ContentItemDto): void {
    if (!item.value) return;

    // Aplicar estilos
    if (item.style) {
      if (item.style.bold) printer.bold(true);
      if (item.style.underline) printer.underline(true);
      if (item.style.invert) printer.invert(true);
      
      if (item.style.align) {
        switch (item.style.align) {
          case TextAlign.LEFT:
            printer.alignLeft();
            break;
          case TextAlign.CENTER:
            printer.alignCenter();
            break;
          case TextAlign.RIGHT:
            printer.alignRight();
            break;
        }
      }

      if (item.style.width && item.style.height) {
        printer.setTextSize(item.style.height, item.style.width);
      }
    }

    printer.println(item.value);

    // Reset estilos
    if (item.style) {
      if (item.style.bold) printer.bold(false);
      if (item.style.underline) printer.underline(false);
      if (item.style.invert) printer.invert(false);
      printer.setTextNormal();
      printer.alignLeft();
    }
  }

  private async processImageItem(printer: ThermalPrinter, item: ContentItemDto): Promise<void> {
    if (!item.path && !item.base64) {
      this.logger.warn('Caminho da imagem ou base64 não fornecido');
      return;
    }

    try {
      let processedImagePath: string;
      
      // Obter configuração da impressora para calcular área de impressão útil
      const printerConfig = await this.configService.getPrinterConfig(this.currentPrinterId);
      const printerWidthMm = printerConfig?.width || 80; // Largura física padrão: 80mm
      
      // Usar área de impressão útil (sem margens físicas) para redimensionamento correto
      const printerWidthPixels = this.imageService.calculatePrintableAreaInPixels(
        printerWidthMm,
        203, // DPI padrão para impressoras térmicas
        printerConfig?.printableWidth // Largura customizada se configurada
      );

      if (item.base64) {
        // Processar imagem base64
        processedImagePath = await this.imageService.processBase64Image(
          item.base64, 
          printerWidthPixels
        );
      } else {
        // Processar imagem por caminho/URL
        processedImagePath = await this.imageService.processImageForPrinting(item.path!);
        
        // Otimizar para impressão térmica com largura correta
        processedImagePath = await this.imageService.optimizeImageForThermalPrinting(
          processedImagePath, 
          printerWidthPixels
        );
      }
      
      // Imprimir imagem otimizada
      await printer.printImage(processedImagePath);
      
      this.logger.log(`Imagem impressa com sucesso: ${item.path || 'base64'}`);
    } catch (error) {
      this.logger.error(`Erro ao imprimir imagem: ${error.message}`);
      throw new Error(`Falha ao imprimir imagem: ${error.message}`);
    }
  }

  private processTableItem(printer: ThermalPrinter, item: ContentItemDto): void {
    if (!item.table) return;

    const table = item.table;
    
    // Se não há configurações de colunas, usar método simples
    if (!table.columns || table.columns.length === 0) {
      this.processSimpleTable(printer, table);
      return;
    }

    // Processar tabela com larguras fixas
    this.processAdvancedTable(printer, table);
  }

  private processSimpleTable(printer: ThermalPrinter, table: any): void {
    // Método original para compatibilidade
    if (table.headers && table.headers.length > 0) {
      printer.bold(true);
      printer.table(table.headers);
      printer.bold(false);
      printer.drawLine();
    }

    for (const row of table.rows) {
      printer.table(row.cells);
    }
  }

  private processAdvancedTable(printer: ThermalPrinter, table: any): void {
    const columns = table.columns;
    const separator = table.separator || '';
    const borderChar = table.borderChar || '-';
    const defaultWidth = table.defaultColumnWidth || 10;

    // Calcular larguras das colunas
    const columnWidths = columns.map((col: any, index: number) => 
      col?.width || defaultWidth
    );

    // Imprimir cabeçalhos se existirem
    if (table.headers && table.headers.length > 0) {
      printer.bold(true);
      const headerLine = this.formatTableRow(table.headers, columnWidths, columns, '');
      printer.print(headerLine);
      printer.newLine();
      printer.bold(false);
      
      // Linha separadora
      const borderLine = this.createBorderLine(columnWidths, separator, borderChar);
      printer.print(borderLine);
      printer.newLine();
    }

    // Imprimir linhas da tabela
    for (const row of table.rows) {
      const formattedLine = this.formatTableRow(row.cells, columnWidths, columns, separator);
      printer.print(formattedLine);
      printer.newLine();
    }
  }

  private formatTableRow(cells: string[], widths: number[], columns: any[], separator: string): string {
    const formattedCells = cells.map((cell, index) => {
      const width = widths[index] || widths[0];
      const column = columns[index] || {};
      const align = column.align || 'left';
      const padding = column.padding || ' ';

      return this.formatCell(cell, width, align, padding);
    });

    return formattedCells.join(separator);
  }

  private formatCell(text: string, width: number, align: string, padding: string): string {
    // Truncar texto se for maior que a largura
    let content = text.length > width ? text.substring(0, width) : text;
    
    // Aplicar alinhamento
    switch (align) {
      case 'center':
        const totalPadding = width - content.length;
        const leftPadding = Math.floor(totalPadding / 2);
        const rightPadding = totalPadding - leftPadding;
        return padding.repeat(leftPadding) + content + padding.repeat(rightPadding);
      
      case 'right':
        return content.padStart(width, padding);
      
      case 'left':
      default:
        return content.padEnd(width, padding);
    }
  }

  private createBorderLine(widths: number[], separator: string, borderChar: string): string {
    const borders = widths.map(width => borderChar.repeat(width));
    return borders.join(separator.replace(/./g, borderChar));
  }

  private processBarcodeItem(printer: ThermalPrinter, item: ContentItemDto): void {
    if (!item.value) return;

    const symbology = item.symbology || 'CODE128';
    try {
      printer.code128(item.value);
    } catch (error) {
      this.logger.error(`Erro ao imprimir código de barras: ${error.message}`);
      throw new Error(`Falha ao imprimir código de barras: ${error.message}`);
    }
  }

  private processQRCodeItem(printer: ThermalPrinter, item: ContentItemDto): void {
    // Usar qrCode se disponível, senão usar value para compatibilidade
    const qrData = item.qrCode || { value: item.value, size: 6, align: 'left' as any };
    
    if (!qrData.value) return;

    try {
      // Configurar alinhamento se especificado
      if (qrData.align) {
        switch (qrData.align) {
          case 'left':
            printer.alignLeft();
            break;
          case 'center':
            printer.alignCenter();
            break;
          case 'right':
            printer.alignRight();
            break;
        }
      }

      // Configurar tamanho se especificado (1-8, padrão 6)
      const size = qrData.size || 6;
      
      // Configurar dimensões personalizadas se especificadas
      const options: any = {};
      if ('width' in qrData && qrData.width) options.width = qrData.width;
      if ('height' in qrData && qrData.height) options.height = qrData.height;

      // Imprimir QR Code com configurações
      const qrOptions = {
        cellSize: size,
        correction: 'M' as any,
        model: 2
      };

      // Adicionar dimensões personalizadas se especificadas
      if (Object.keys(options).length > 0) {
        Object.assign(qrOptions, options);
      }

      // Imprimir QR Code
      printer.printQR(qrData.value, qrOptions);

      // Resetar alinhamento para padrão (esquerda) após impressão
      if (qrData.align && qrData.align !== 'left') {
        printer.alignLeft();
      }

    } catch (error) {
      this.logger.error(`Erro ao imprimir QR Code: ${error.message}`);
      throw new Error(`Falha ao imprimir QR Code: ${error.message}`);
    }
  }
}
