import { Controller, Post, Get, Body, Query, Param, Logger } from '@nestjs/common';
// import { PdfService, PdfProcessingOptions } from '../services/pdf.service';
// import { PdfStandaloneService } from '../services/pdf-standalone.service';
import { PdfV3Service, PdfProcessingOptions } from '../services/pdf-v3.service';
import { ProcessPdfDto, PdfInfoDto, CleanupDto } from '../dto/pdf.dto';

@Controller('pdf')
export class PdfController {
  private readonly logger = new Logger(PdfController.name);

  constructor(
    private readonly pdfV3Service: PdfV3Service,
  ) {}

  /**
   * Processar PDF para impressão térmica
   */
  @Post('process')
  async processPdf(@Body() processDto: ProcessPdfDto) {
    this.logger.log(`Processando PDF para impressora: ${processDto.printerId}`);

    try {
      const options: PdfProcessingOptions = {
        quality: processDto.quality || 95,
        format: processDto.format || 'png',
        pages: processDto.pages,
      };

      // Usar o novo serviço v3 (mais confiável e simples)
      const result = await this.pdfV3Service.processPdfForThermalPrinting(
        processDto.pdf,
        processDto.printerId,
        options,
      );

      return {
        success: result.success,
        message: result.success 
          ? `PDF processado com sucesso: ${result.processedPages} páginas`
          : `Falha no processamento: ${result.error}`,
        data: {
          processedPages: result.processedPages,
          totalPages: result.totalPages,
          processingTime: result.processingTime,
          outputPaths: result.outputPaths,
          optimizedPaths: result.optimizedPaths,
        },
        error: result.error,
      };

    } catch (error) {
      this.logger.error(`Erro no processamento PDF V3: ${error.message}`);
      return {
        success: false,
        message: `Erro interno: ${error.message}`,
        error: error.message,
      };
    }
  }

  /**
   * Obter informações do PDF
   */
  @Post('info')
  async getPdfInfo(@Body() infoDto: PdfInfoDto) {
    this.logger.log('Obtendo informações do PDF...');

    try {
      const info = await this.pdfV3Service.getPdfInfo(infoDto.pdf);

      return {
        success: true,
        message: 'Informações obtidas com sucesso',
        data: info,
      };

    } catch (error) {
      this.logger.error(`Erro ao obter informações: ${error.message}`);
      return {
        success: false,
        message: `Erro ao processar PDF: ${error.message}`,
        error: error.message,
      };
    }
  }

  /**
   * Teste com PDF de exemplo
   */
  @Get('test')
  async testPdf(@Query('printerId') printerId: string = 'default-printer') {
    this.logger.log(`Teste PDF para impressora: ${printerId}`);

    // PDF simples de exemplo em base64
    const testPdfBase64 = 'JVBERi0xLjQKMSAwIG9iago8PAovVHlwZSAvQ2F0YWxvZwovUGFnZXMgMiAwIFIKPj4KZW5kb2JqCjIgMCBvYmoKPDwKL1R5cGUgL1BhZ2VzCi9LaWRzIFszIDAgUl0KL0NvdW50IDEKPD4KZW5kb2JqCjMgMCBvYmoKPDwKL1R5cGUgL1BhZ2UKL1BhcmVudCAyIDAgUgovTWVkaWFCb3ggWzAgMCA2MTIgNzkyXQovUmVzb3VyY2VzIDw8Cj4+Ci9Db250ZW50cyA0IDAgUgo+PgplbmRvYmoKNCAwIG9iago8PAovTGVuZ3RoIDQ0Cj4+CnN0cmVhbQpCVApxCjAgMCAwIHJnCjAgMCAwIFJHCjU2LjY5MyA3ODUuMTk3IG0KNTYuNjkzIDc0MS4yNzMgbApTCkVUCmVuZHN0cmVhbQplbmRvYmoKeHJlZgowIDUKMDAwMDAwMDAwMCA2NTUzNSBmCjAwMDAwMDAwMDkgMDAwMDAgbgowMDAwMDAwMDU4IDAwMDAwIG4KMDAwMDAwMDExNSAwMDAwMCBuCjAwMDAwMDAyNDUgMDAwMDAgbgp0cmFpbGVyCjw8Ci9TaXplIDUKL1Jvb3QgMSAwIFIKPj4Kc3RhcnR4cmVmCjMzOQolJUVPRg==';

    try {
      const result = await this.pdfV3Service.processPdfForThermalPrinting(
        `data:application/pdf;base64,${testPdfBase64}`,
        printerId,
        { quality: 100 },
      );

      return {
        success: result.success,
        message: result.success 
          ? 'Teste PDF executado com sucesso'
          : `Falha no teste: ${result.error}`,
        data: {
          testPdf: 'PDF simples de 1 página',
          processedPages: result.processedPages,
          processingTime: result.processingTime,
          outputPaths: result.outputPaths,
        },
        error: result.error,
      };

    } catch (error) {
      this.logger.error(`Erro no teste PDF: ${error.message}`);
      return {
        success: false,
        message: `Erro no teste: ${error.message}`,
        error: error.message,
      };
    }
  }

  /**
   * Limpeza de arquivos temporários
   */
  @Post('cleanup')
  async cleanupTempFiles(@Body() cleanupDto: CleanupDto) {
    this.logger.log('Iniciando limpeza de arquivos temporários...');

    try {
      const maxAge = cleanupDto.maxAgeHours || 12;
      const result = await this.pdfV3Service.cleanupTempFiles(maxAge);

      return {
        success: true,
        message: `Limpeza concluída: ${result.cleaned} pastas removidas`,
        data: {
          cleaned: result.cleaned,
          errors: result.errors,
          maxAgeHours: maxAge,
        },
      };

    } catch (error) {
      this.logger.error(`Erro na limpeza: ${error.message}`);
      return {
        success: false,
        message: `Erro na limpeza: ${error.message}`,
        error: error.message,
      };
    }
  }

  /**
   * Estatísticas do serviço PDF
   */
  @Get('stats')
  async getStats() {
    this.logger.log('Obtendo estatísticas do serviço PDF...');

    try {
      const stats = this.pdfV3Service.getServiceStats();

      return {
        success: true,
        message: 'Estatísticas obtidas com sucesso',
        data: stats,
      };

    } catch (error) {
      this.logger.error(`Erro ao obter estatísticas: ${error.message}`);
      return {
        success: false,
        message: `Erro interno: ${error.message}`,
        error: error.message,
      };
    }
  }

  /**
   * Informações sobre o serviço PDF
   */
  @Get('info')
  async getServiceInfo() {
    return {
      success: true,
      message: 'Serviço PDF ativo',
      data: {
        service: 'PDF Processing Service V3',
        version: '3.0.0',
        engine: 'pdf-to-img',
        externalDependencies: false,
        features: [
          'PDF Base64 support',
          'File path support',
          'URL download support',
          'Page selection',
          'Quality control',
          'Thermal optimization',
          'Automatic cleanup',
          'Simple and reliable conversion',
          'Memory efficient processing',
          'Zero external dependencies'
        ],
        endpoints: [
          'POST /pdf/process - Processar PDF para impressão',
          'POST /pdf/info - Obter informações do PDF',
          'GET /pdf/test - Teste com PDF exemplo',
          'POST /pdf/cleanup - Limpeza de temporários',
          'GET /pdf/stats - Estatísticas do serviço',
          'GET /pdf/info - Informações do serviço'
        ]
      },
    };
  }
}
