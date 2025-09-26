import { Injectable, Logger } from '@nestjs/common';
import { pdfToPng } from 'pdf-to-png-converter';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

export interface PdfProcessingOptions {
  quality?: number;
  density?: number;
  format?: 'png' | 'jpeg';
  pages?: number[];
  width?: number;
  height?: number;
}

export interface PdfProcessingResult {
  success: boolean;
  processedPages: number;
  totalPages: number;
  processingTime: number;
  outputPaths: string[];
  error?: string;
}

export interface PdfInfo {
  pages: number;
  size: number;
  format: string;
  title?: string;
  author?: string;
  subject?: string;
  creator?: string;
  producer?: string;
  creationDate?: Date;
  modificationDate?: Date;
}

@Injectable()
export class PdfStandaloneService {
  private readonly logger = new Logger(PdfStandaloneService.name);
  private readonly tempDir = '/tmp/thermal-printer-pdf-standalone';

  constructor() {
    this.ensureTempDirectory();
  }

  /**
   * Processar PDF para imagens PNG (sem dependência de impressora)
   */
  async processPdfToImages(
    pdfInput: string | Buffer,
    options: PdfProcessingOptions = {},
  ): Promise<PdfProcessingResult> {
    const startTime = Date.now();
    this.logger.log(`Iniciando processamento PDF standalone`);

    try {
      // 1. Preparar PDF buffer
      const pdfBuffer = await this.preparePdfBuffer(pdfInput);
      this.logger.log(`PDF preparado: ${pdfBuffer.length} bytes`);

      // 2. Converter PDF para PNG
      const pngPages = await this.convertPdfToPngStandalone(pdfBuffer, options);
      this.logger.log(`Conversão concluída: ${pngPages.length} páginas`);

      const processingTime = Date.now() - startTime;
      this.logger.log(`Processamento PDF standalone concluído em ${processingTime}ms`);

      return {
        success: true,
        processedPages: pngPages.length,
        totalPages: pngPages.length,
        processingTime,
        outputPaths: pngPages.map(page => page.path),
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.logger.error(`Erro no processamento PDF standalone: ${error.message}`);
      
      return {
        success: false,
        processedPages: 0,
        totalPages: 0,
        processingTime,
        outputPaths: [],
        error: error.message,
      };
    }
  }

  /**
   * Obter informações do PDF
   */
  async getPdfInfo(pdfInput: string | Buffer): Promise<PdfInfo> {
    this.logger.log('Obtendo informações do PDF...');

    try {
      const pdfBuffer = await this.preparePdfBuffer(pdfInput);
      
      // Usar pdf-to-png-converter para obter informações básicas
      const tempId = this.generateTempId();
      const tempFolder = path.join(this.tempDir, tempId);
      
      // Criar pasta temporária
      if (!fs.existsSync(tempFolder)) {
        fs.mkdirSync(tempFolder, { recursive: true });
      }

      try {
        // Converter apenas primeira página para contar total
        const pngPages = await pdfToPng(pdfBuffer, {
          outputFolder: tempFolder,
          outputFileMaskFunc: (pageNumber) => `info_page_${pageNumber}`,
          pagesToProcess: [1] // Apenas primeira página
        });

        // Tentar obter total de páginas
        let totalPages = 1;
        try {
          const allPages = await pdfToPng(pdfBuffer, {
            outputFolder: tempFolder,
            outputFileMaskFunc: (pageNumber) => `count_page_${pageNumber}`,
            pagesToProcess: [-1] // Todas as páginas
          });
          totalPages = allPages.length;
        } catch (countError) {
          this.logger.warn(`Não foi possível contar todas as páginas: ${countError.message}`);
        }

        const info: PdfInfo = {
          pages: totalPages,
          size: pdfBuffer.length,
          format: 'PDF',
          title: 'Documento PDF',
          creator: 'pdf-to-png-converter',
          producer: 'Thermal Printer Microservice Standalone',
          creationDate: new Date(),
          modificationDate: new Date(),
        };

        this.logger.log(`Informações PDF obtidas: ${info.pages} páginas, ${info.size} bytes`);
        return info;

      } finally {
        // Limpar arquivos temporários
        this.cleanupTempFolder(tempFolder);
      }

    } catch (error) {
      this.logger.error(`Erro ao obter informações do PDF: ${error.message}`);
      throw new Error(`Falha ao processar PDF: ${error.message}`);
    }
  }

  /**
   * Preparar buffer do PDF a partir de diferentes inputs
   */
  private async preparePdfBuffer(pdfInput: string | Buffer): Promise<Buffer> {
    if (Buffer.isBuffer(pdfInput)) {
      return pdfInput;
    }

    if (typeof pdfInput === 'string') {
      // Base64 com prefixo
      if (pdfInput.startsWith('data:application/pdf;base64,')) {
        const base64Data = pdfInput.replace('data:application/pdf;base64,', '');
        return Buffer.from(base64Data, 'base64');
      }

      // Base64 puro
      if (this.isBase64(pdfInput)) {
        return Buffer.from(pdfInput, 'base64');
      }

      // URL
      if (pdfInput.startsWith('http://') || pdfInput.startsWith('https://')) {
        this.logger.log(`Baixando PDF de URL: ${pdfInput}`);
        const response = await fetch(pdfInput);
        if (!response.ok) {
          throw new Error(`Falha ao baixar PDF: ${response.statusText}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        return Buffer.from(arrayBuffer);
      }

      // Caminho de arquivo
      if (fs.existsSync(pdfInput)) {
        this.logger.log(`Lendo PDF do arquivo: ${pdfInput}`);
        return fs.readFileSync(pdfInput);
      }

      throw new Error(`Formato de PDF não suportado: ${typeof pdfInput}`);
    }

    throw new Error(`Tipo de input inválido: ${typeof pdfInput}`);
  }

  /**
   * Converter PDF para PNG (versão standalone sem dependências externas)
   */
  private async convertPdfToPngStandalone(
    pdfBuffer: Buffer,
    options: PdfProcessingOptions,
  ): Promise<Array<{ path: string; name: string }>> {
    const tempId = this.generateTempId();
    const tempFolder = path.join(this.tempDir, tempId);
    
    // Criar pasta temporária
    if (!fs.existsSync(tempFolder)) {
      fs.mkdirSync(tempFolder, { recursive: true });
    }

    this.logger.log(`Convertendo PDF para PNG na pasta: ${tempFolder}`);

    try {
      // Configurações otimizadas e isoladas
      const pdfOptions = {
        outputFolder: tempFolder,
        outputFileMaskFunc: (pageNumber: number) => `page_${pageNumber}`,
        pagesToProcess: options.pages || [-1], // -1 = todas as páginas
        // Configurações para máxima compatibilidade
        disableFontFace: true,
        useSystemFonts: false,
        viewportScale: 1.0,
        outputFilesFormat: 'png' as const,
        // Configurações de qualidade
        pngQuality: options.quality || 95,
        density: options.density || 150,
      };

      this.logger.log(`Iniciando conversão standalone com timeout de 60s`);

      // Executar conversão com timeout mais longo para PDFs complexos
      const conversionPromise = pdfToPng(pdfBuffer, pdfOptions);
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error('Timeout na conversão PDF - operação cancelada após 60 segundos'));
        }, 60000); // 60 segundos de timeout
      });

      const pngPages = await Promise.race([conversionPromise, timeoutPromise]);

      this.logger.log(`Conversão standalone concluída: ${pngPages.length} páginas geradas`);
      return pngPages;

    } catch (error) {
      this.logger.error(`Erro na conversão PDF→PNG standalone: ${error.message}`);
      
      // Limpar pasta temporária em caso de erro
      this.cleanupTempFolder(tempFolder);
      
      // Tratar diferentes tipos de erro
      if (error.message.includes('timeout')) {
        throw new Error(`Timeout na conversão PDF - arquivo muito complexo ou grande`);
      } else if (error.message.includes('Invalid PDF')) {
        throw new Error(`PDF inválido ou corrompido`);
      } else {
        throw new Error(`Falha na conversão standalone: ${error.message}`);
      }
    }
  }

  /**
   * Limpeza de arquivos temporários
   */
  async cleanupTempFiles(maxAgeHours: number = 12): Promise<{ cleaned: number; errors: number }> {
    this.logger.log(`Iniciando limpeza de arquivos temporários standalone (idade máxima: ${maxAgeHours}h)`);
    
    let cleaned = 0;
    let errors = 0;
    const maxAge = maxAgeHours * 60 * 60 * 1000; // Converter para ms
    const now = Date.now();

    try {
      if (!fs.existsSync(this.tempDir)) {
        return { cleaned: 0, errors: 0 };
      }

      const folders = fs.readdirSync(this.tempDir);
      
      for (const folder of folders) {
        const folderPath = path.join(this.tempDir, folder);
        
        try {
          const stats = fs.statSync(folderPath);
          const age = now - stats.mtime.getTime();
          
          if (age > maxAge) {
            this.cleanupTempFolder(folderPath);
            cleaned++;
            this.logger.log(`Pasta temporária removida: ${folder}`);
          }
        } catch (error) {
          errors++;
          this.logger.warn(`Erro ao limpar pasta ${folder}: ${error.message}`);
        }
      }

    } catch (error) {
      this.logger.error(`Erro na limpeza geral: ${error.message}`);
      errors++;
    }

    this.logger.log(`Limpeza standalone concluída: ${cleaned} pastas removidas, ${errors} erros`);
    return { cleaned, errors };
  }

  /**
   * Obter estatísticas do serviço
   */
  getServiceStats(): any {
    const tempDirExists = fs.existsSync(this.tempDir);
    let tempFolders = 0;
    let tempSize = 0;

    if (tempDirExists) {
      try {
        const folders = fs.readdirSync(this.tempDir);
        tempFolders = folders.length;
        
        // Calcular tamanho aproximado
        folders.forEach(folder => {
          try {
            const folderPath = path.join(this.tempDir, folder);
            const files = fs.readdirSync(folderPath);
            files.forEach(file => {
              const filePath = path.join(folderPath, file);
              const stats = fs.statSync(filePath);
              tempSize += stats.size;
            });
          } catch (error) {
            // Ignorar erros de arquivos individuais
          }
        });
      } catch (error) {
        this.logger.warn(`Erro ao calcular estatísticas: ${error.message}`);
      }
    }

    return {
      service: 'PdfStandaloneService',
      version: '1.0.0',
      engine: 'pdf-to-png-converter',
      externalDependencies: false,
      tempDirectory: this.tempDir,
      tempFolders,
      tempSizeBytes: tempSize,
      tempSizeMB: Math.round(tempSize / 1024 / 1024 * 100) / 100,
      features: [
        'PDF Base64 support',
        'File path support', 
        'URL download support',
        'Page selection',
        'Quality control',
        'Isolated processing',
        'Extended timeout handling',
        'Zero printer dependencies'
      ]
    };
  }

  /**
   * Utilitários privados
   */
  private ensureTempDirectory(): void {
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
      this.logger.log(`Diretório temporário standalone criado: ${this.tempDir}`);
    }
  }

  private generateTempId(): string {
    return `pdf_standalone_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  }

  private isBase64(str: string): boolean {
    try {
      return Buffer.from(str, 'base64').toString('base64') === str;
    } catch {
      return false;
    }
  }

  private cleanupTempFolder(folderPath: string): void {
    try {
      if (fs.existsSync(folderPath)) {
        const files = fs.readdirSync(folderPath);
        files.forEach(file => {
          const filePath = path.join(folderPath, file);
          fs.unlinkSync(filePath);
        });
        fs.rmdirSync(folderPath);
      }
    } catch (error) {
      this.logger.warn(`Erro ao limpar pasta ${folderPath}: ${error.message}`);
    }
  }
}
