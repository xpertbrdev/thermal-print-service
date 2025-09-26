import { Controller, Post, Get, Body, Param, Query, Logger } from '@nestjs/common';
import { PdfService } from '../services/pdf.service';
import { PdfProcessingDto, PdfInfoDto } from '../dto/pdf.dto';

@Controller('pdf')
export class PdfController {
  private readonly logger = new Logger(PdfController.name);

  constructor(private readonly pdfService: PdfService) {}

  /**
   * Processa PDF e converte para imagens otimizadas
   */
  @Post('process')
  async processPdf(@Body() processingDto: PdfProcessingDto) {
    this.logger.log(`Processando PDF para impressora: ${processingDto.printerId}`);
    
    try {
      const result = await this.pdfService.processPdf(processingDto.pdf, {
        printerId: processingDto.printerId,
        quality: processingDto.quality,
        density: processingDto.density,
        format: processingDto.format,
        pages: processingDto.pages,
      });

      return {
        success: result.success,
        message: result.success 
          ? `PDF processado com sucesso: ${result.processedPages}/${result.totalPages} páginas`
          : 'Falha no processamento do PDF',
        data: {
          totalPages: result.totalPages,
          processedPages: result.processedPages,
          images: result.images,
          processingTime: result.processingTime,
          errors: result.errors,
        },
      };
    } catch (error) {
      this.logger.error(`Erro no processamento de PDF: ${error.message}`);
      return {
        success: false,
        message: 'Erro interno no processamento de PDF',
        error: error.message,
      };
    }
  }

  /**
   * Obtém informações do PDF
   */
  @Post('info')
  async getPdfInfo(@Body() infoDto: PdfInfoDto) {
    this.logger.log('Obtendo informações do PDF');
    
    try {
      const info = await this.pdfService.getPdfInfo(infoDto.pdf);
      
      return {
        success: true,
        message: 'Informações obtidas com sucesso',
        data: info,
      };
    } catch (error) {
      this.logger.error(`Erro ao obter informações do PDF: ${error.message}`);
      return {
        success: false,
        message: 'Erro ao obter informações do PDF',
        error: error.message,
      };
    }
  }

  /**
   * Testa processamento de PDF com arquivo de exemplo
   */
  @Get('test')
  async testPdfProcessing(@Query('printerId') printerId: string = 'cozinha-1') {
    this.logger.log(`Teste de processamento PDF para impressora: ${printerId}`);
    
    try {
      // PDF de teste simples (1 página em branco)
      const testPdfBase64 = 'JVBERi0xLjQKMSAwIG9iago8PAovVHlwZSAvQ2F0YWxvZwovUGFnZXMgMiAwIFIKPj4KZW5kb2JqCjIgMCBvYmoKPDwKL1R5cGUgL1BhZ2VzCi9LaWRzIFszIDAgUl0KL0NvdW50IDEKPD4KZW5kb2JqCjMgMCBvYmoKPDwKL1R5cGUgL1BhZ2UKL1BhcmVudCAyIDAgUgovTWVkaWFCb3ggWzAgMCA2MTIgNzkyXQovUmVzb3VyY2VzIDw8Cj4+Ci9Db250ZW50cyA0IDAgUgo+PgplbmRvYmoKNCAwIG9iago8PAovTGVuZ3RoIDQ0Cj4+CnN0cmVhbQpCVApxCjAgMCAwIHJnCjAgMCAwIFJHCjU2LjY5MyA3ODUuMTk3IG0KNTYuNjkzIDc0MS4yNzMgbApTCkVUCmVuZHN0cmVhbQplbmRvYmoKeHJlZgowIDUKMDAwMDAwMDAwMCA2NTUzNSBmCjAwMDAwMDAwMDkgMDAwMDAgbgowMDAwMDAwMDU4IDAwMDAwIG4KMDAwMDAwMDExNSAwMDAwMCBuCjAwMDAwMDAyNDUgMDAwMDAgbgp0cmFpbGVyCjw8Ci9TaXplIDUKL1Jvb3QgMSAwIFIKPj4Kc3RhcnR4cmVmCjMzOQolJUVPRg==';
      
      const result = await this.pdfService.processPdf(testPdfBase64, {
        printerId,
        quality: 100,
        format: 'png',
      });

      return {
        success: true,
        message: 'Teste de PDF executado com sucesso',
        data: {
          testPdf: 'PDF de teste (1 página em branco)',
          result: {
            totalPages: result.totalPages,
            processedPages: result.processedPages,
            processingTime: result.processingTime,
            errors: result.errors,
          },
        },
      };
    } catch (error) {
      this.logger.error(`Erro no teste de PDF: ${error.message}`);
      return {
        success: false,
        message: 'Erro no teste de PDF',
        error: error.message,
      };
    }
  }

  /**
   * Limpeza de arquivos temporários
   */
  @Post('cleanup')
  async cleanupTempFiles(@Query('maxAgeHours') maxAgeHours: number = 24) {
    this.logger.log(`Executando limpeza de arquivos temporários (${maxAgeHours}h)`);
    
    try {
      await this.pdfService.cleanupOldTempFiles(maxAgeHours);
      
      return {
        success: true,
        message: `Limpeza executada com sucesso (arquivos > ${maxAgeHours}h removidos)`,
      };
    } catch (error) {
      this.logger.error(`Erro na limpeza: ${error.message}`);
      return {
        success: false,
        message: 'Erro na limpeza de arquivos temporários',
        error: error.message,
      };
    }
  }

  /**
   * Estatísticas do serviço PDF
   */
  @Get('stats')
  async getServiceStats() {
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
        message: 'Erro ao obter estatísticas',
        error: error.message,
      };
    }
  }

  /**
   * Documentação do serviço PDF
   */
  @Get('info')
  getServiceInfo() {
    return {
      success: true,
      message: 'Informações do serviço PDF',
      data: {
        description: 'Serviço para processamento de PDF em impressoras térmicas',
        features: [
          'Conversão PDF → Imagem otimizada',
          'Suporte a base64, arquivo local e URL',
          'Otimização automática para impressão térmica',
          'Processamento de páginas específicas',
          'Ajuste de qualidade e DPI',
          'Limpeza automática de arquivos temporários',
        ],
        supportedInputs: [
          'PDF base64 (com ou sem prefixo)',
          'Caminho de arquivo local',
          'URL de PDF público',
        ],
        outputFormats: ['PNG', 'JPEG'],
        maxFileSize: '50MB',
        tempDirectory: 'temp/pdf/',
        endpoints: [
          'POST /pdf/process - Processar PDF',
          'POST /pdf/info - Informações do PDF',
          'GET /pdf/test - Teste com PDF exemplo',
          'POST /pdf/cleanup - Limpeza de temporários',
          'GET /pdf/stats - Estatísticas do serviço',
          'GET /pdf/info - Esta documentação',
        ],
      },
    };
  }
}
