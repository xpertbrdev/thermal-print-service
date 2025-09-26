import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { EscPosTestService } from '../services/escpos-test.service';

@Controller('escpos-test')
export class EscPosTestController {
  constructor(private readonly escPosTestService: EscPosTestService) {}

  /**
   * Testa comandos ESC/POS de margem
   */
  @Get('margin/:width')
  async testMarginCommands(
    @Param('width') width: number,
    @Query('printableWidth') printableWidth?: number
  ) {
    return await this.escPosTestService.testMarginCommands(
      Number(width),
      printableWidth ? Number(printableWidth) : undefined
    );
  }

  /**
   * Testa comando ESC W (área de impressão avançada)
   */
  @Post('advanced-area')
  async testAdvancedArea(@Body() body: {
    startXMm: number;
    startYMm: number;
    widthMm: number;
    heightMm: number;
  }) {
    return await this.escPosTestService.testAdvancedAreaCommand(
      body.startXMm,
      body.startYMm,
      body.widthMm,
      body.heightMm
    );
  }

  /**
   * Compara buffers com e sem comandos ESC/POS
   */
  @Get('compare-buffers')
  async compareBuffers() {
    return await this.escPosTestService.compareBuffers();
  }

  /**
   * Valida integração ESC/POS para uma impressora
   */
  @Get('validate/:printerId')
  async validateIntegration(@Param('printerId') printerId: string) {
    return await this.escPosTestService.validateEscPosIntegration(printerId);
  }

  /**
   * Endpoint de informações sobre comandos ESC/POS implementados
   */
  @Get('info')
  getEscPosInfo() {
    return {
      title: 'Comandos ESC/POS Implementados',
      description: 'Informações sobre os comandos ESC/POS para controle de área de impressão',
      commands: {
        'ESC l n': {
          hex: '1B 6C n',
          description: 'Define margem esquerda (0-255 units)',
          usage: 'Eliminar margem esquerda ou centralizar conteúdo',
          example: 'ESC l 0 = margem zero, ESC l 10 = margem ~4mm'
        },
        'ESC Q n': {
          hex: '1B 51 n',
          description: 'Define margem direita (0-255 units)',
          usage: 'Eliminar margem direita ou centralizar conteúdo',
          example: 'ESC Q 0 = margem zero, ESC Q 10 = margem ~4mm'
        },
        'ESC W': {
          hex: '1B 57 xL xH yL yH dxL dxH dyL dyH',
          description: 'Define área de impressão customizada',
          usage: 'Controle total da área de impressão',
          example: 'Define posição e tamanho exatos da área útil'
        }
      },
      conversion: {
        formula: '(mm / 25.4) * dpi / 8 = units',
        examples: {
          '1mm': '~1 unit (203 DPI)',
          '4mm': '~10 units (203 DPI)',
          '8mm': '~20 units (203 DPI)'
        }
      },
      implementation: {
        when_called: 'Comandos enviados automaticamente na criação da impressora',
        integration: 'Integrado no PrinterService.createPrinterInstance()',
        fallback: 'Se printableWidth não especificado, usa margem zero'
      },
      testing: {
        endpoints: [
          'GET /escpos-test/margin/80 - Testa margem zero para impressora 80mm',
          'GET /escpos-test/margin/80?printableWidth=72 - Testa margem customizada',
          'GET /escpos-test/compare-buffers - Compara com/sem ESC/POS',
          'GET /escpos-test/validate/printer-id - Valida integração'
        ]
      }
    };
  }

  /**
   * Endpoint para testar diferentes cenários de margem
   */
  @Get('scenarios')
  getTestScenarios() {
    return {
      title: 'Cenários de Teste ESC/POS',
      scenarios: [
        {
          name: 'Margem Zero - Impressora 58mm',
          config: { width: 58, printableWidth: 58 },
          expected_commands: ['ESC l 0', 'ESC Q 0'],
          expected_result: 'Impressão ocupando toda largura (58mm)',
          test_url: '/escpos-test/margin/58?printableWidth=58'
        },
        {
          name: 'Margem Zero - Impressora 80mm',
          config: { width: 80, printableWidth: 80 },
          expected_commands: ['ESC l 0', 'ESC Q 0'],
          expected_result: 'Impressão ocupando toda largura (80mm)',
          test_url: '/escpos-test/margin/80?printableWidth=80'
        },
        {
          name: 'Área Customizada - 80mm → 72mm',
          config: { width: 80, printableWidth: 72 },
          expected_commands: ['ESC l 10', 'ESC Q 10'],
          expected_result: 'Impressão centralizada com 72mm úteis',
          test_url: '/escpos-test/margin/80?printableWidth=72'
        },
        {
          name: 'Área Customizada - 112mm → 104mm',
          config: { width: 112, printableWidth: 104 },
          expected_commands: ['ESC l 10', 'ESC Q 10'],
          expected_result: 'Impressão centralizada com 104mm úteis',
          test_url: '/escpos-test/margin/112?printableWidth=104'
        },
        {
          name: 'Margem Automática (sem printableWidth)',
          config: { width: 80 },
          expected_commands: ['ESC l 0', 'ESC Q 0'],
          expected_result: 'Margem zero automática',
          test_url: '/escpos-test/margin/80'
        }
      ],
      validation: {
        visual_check: 'Imprimir e medir distância das bordas',
        buffer_check: 'Verificar presença dos comandos no buffer',
        comparison: 'Comparar com impressão sem comandos ESC/POS'
      }
    };
  }
}
