import { Controller, Post, Get, Body, Query, Param, Logger } from '@nestjs/common';
import { PdfService, PdfProcessingOptions } from '../services/pdf.service';
import { PdfStandaloneService } from '../services/pdf-standalone.service';
import { ProcessPdfDto, PdfInfoDto, CleanupDto } from '../dto/pdf.dto';

@Controller('pdf')
export class PdfController {
  private readonly logger = new Logger(PdfController.name);

  constructor(
    private readonly pdfService: PdfService,
    private readonly pdfStandaloneService: PdfStandaloneService,
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

      // Tentar primeiro com o serviço principal
      let result = await this.pdfService.processPdfForThermalPrinting(
        processDto.pdf,
        processDto.printerId,
        options,
      );

      // Se falhar com timeout ou erro de conexão, usar serviço standalone
      if (!result.success && (
        result.error?.includes('timeout') || 
        result.error?.includes('Socket timeout') ||
        result.error?.includes('connection')
      )) {
        this.logger.warn(`Serviço principal falhou, tentando standalone: ${result.error}`);
        
        const standaloneResult = await this.pdfStandaloneService.processPdfToImages(
          processDto.pdf,
          options,
        );

        result = {
          ...standaloneResult,
          optimizedPaths: standaloneResult.outputPaths, // Usar paths originais como otimizados
        };
      }

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
      this.logger.error(`Erro no processamento PDF: ${error.message}`);
      
      // Última tentativa com serviço standalone
      try {
        this.logger.log(`Tentativa final com serviço standalone...`);
        const standaloneResult = await this.pdfStandaloneService.processPdfToImages(
          processDto.pdf,
          {
            quality: processDto.quality || 95,
            format: processDto.format || 'png',
            pages: processDto.pages,
          },
        );

        return {
          success: standaloneResult.success,
          message: standaloneResult.success 
            ? `PDF processado com sucesso (modo standalone): ${standaloneResult.processedPages} páginas`
            : `Falha no processamento standalone: ${standaloneResult.error}`,
          data: {
            processedPages: standaloneResult.processedPages,
            totalPages: standaloneResult.totalPages,
            processingTime: standaloneResult.processingTime,
            outputPaths: standaloneResult.outputPaths,
            optimizedPaths: standaloneResult.outputPaths,
          },
          error: standaloneResult.error,
        };
      } catch (standaloneError) {
        this.logger.error(`Erro no processamento standalone: ${standaloneError.message}`);
        return {
          success: false,
          message: `Erro interno: ${error.message}`,
          error: error.message,
        };
      }
    }
  }

  /**
   * Obter informações do PDF
   */
  @Post('info')
  async getPdfInfo(@Body() infoDto: PdfInfoDto) {
    this.logger.log('Obtendo informações do PDF...');

    try {
      const info = await this.pdfService.getPdfInfo(infoDto.pdf);

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
      const result = await this.pdfService.processPdfForThermalPrinting(
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
      const result = await this.pdfService.cleanupTempFiles(maxAge);

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
      const stats = this.pdfService.getServiceStats();

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
        service: 'PDF Processing Service',
        version: '2.0.0',
        engine: 'pdf-to-png-converter',
        externalDependencies: false,
        features: [
          'PDF Base64 support',
          'File path support',
          'URL download support',
          'Page selection',
          'Quality control',
          'Thermal optimization',
          'Automatic cleanup',
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
