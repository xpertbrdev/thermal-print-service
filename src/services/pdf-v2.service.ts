import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from './config.service';
import { ImageService } from './image.service';
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
  optimizedPaths?: string[];
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
export class PdfV2Service {
  private readonly logger = new Logger(PdfV2Service.name);
  private readonly tempDir = '/tmp/thermal-printer-pdf';

  constructor(
    private readonly configService: ConfigService,
    private readonly imageService: ImageService,
  ) {
    this.ensureTempDirectory();
  }

  /**
   * Processar PDF para impressão térmica usando pdf-to-png-converter (sem dependências externas)
   */
  async processPdfForThermalPrinting(
    pdfInput: string | Buffer,
    printerId: string,
    options: PdfProcessingOptions = {},
  ): Promise<PdfProcessingResult> {
    const startTime = Date.now();
    this.logger.log(`Iniciando processamento PDF para impressora: ${printerId}`);

    try {
      // 1. Preparar PDF buffer
      const pdfBuffer = await this.preparePdfBuffer(pdfInput);
      this.logger.log(`PDF preparado: ${pdfBuffer.length} bytes`);

      // 2. Obter configuração da impressora
      const printerConfig = await this.configService.getPrinterConfiguration(printerId);
      if (!printerConfig) {
        throw new Error(`Impressora não encontrada: ${printerId}`);
      }

      // 3. Calcular configurações otimizadas
      const processingOptions = this.calculateOptimalSettings(printerConfig, options);
      this.logger.log(`Configurações calculadas:`, processingOptions);

      // 4. Converter PDF para PNG usando pdf-to-png-converter
      const pngPages = await this.convertPdfToPng(pdfBuffer, processingOptions);
      this.logger.log(`Conversão concluída: ${pngPages.length} páginas`);

      // 5. Otimizar imagens para impressão térmica
      const optimizedPaths = await this.optimizeImagesForThermalPrinting(
        pngPages.map(page => page.path),
        printerConfig,
      );

      const processingTime = Date.now() - startTime;
      this.logger.log(`Processamento PDF concluído em ${processingTime}ms`);

      return {
        success: true,
        processedPages: pngPages.length,
        totalPages: pngPages.length,
        processingTime,
        outputPaths: pngPages.map(page => page.path),
        optimizedPaths,
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.logger.error(`Erro no processamento PDF: ${error.message}`);
      
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
        // Converter apenas para contar páginas (sem salvar)
        const pngPages = await pdfToPng(pdfBuffer, {
          outputFolder: tempFolder,
          outputFileMask: 'info_page',
          pngOptions: {
            quality: 10, // Baixa qualidade apenas para contar
            width: 100,
            height: 100
          },
          pagesToProcess: [-1] // Todas as páginas
        });

        const info: PdfInfo = {
          pages: pngPages.length,
          size: pdfBuffer.length,
          format: 'PDF',
          title: 'Documento PDF',
          creator: 'pdf-to-png-converter',
          producer: 'Thermal Printer Microservice',
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
   * Converter PDF para PNG usando pdf-to-png-converter
   */
  private async convertPdfToPng(
    pdfBuffer: Buffer,
    options: any,
  ): Promise<Array<{ path: string; name: string }>> {
    const tempId = this.generateTempId();
    const tempFolder = path.join(this.tempDir, tempId);
    
    // Criar pasta temporária
    if (!fs.existsSync(tempFolder)) {
      fs.mkdirSync(tempFolder, { recursive: true });
    }

    this.logger.log(`Convertendo PDF para PNG na pasta: ${tempFolder}`);

    try {
      const pngPages = await pdfToPng(pdfBuffer, {
        outputFolder: tempFolder,
        outputFileMask: 'page',
        pngOptions: {
          quality: options.quality || 100,
          width: options.width,
          height: options.height
        },
        pagesToProcess: options.pages || [-1] // -1 = todas as páginas
      });

      this.logger.log(`Conversão concluída: ${pngPages.length} páginas geradas`);
      return pngPages;

    } catch (error) {
      this.logger.error(`Erro na conversão PDF→PNG: ${error.message}`);
      throw new Error(`Falha na conversão: ${error.message}`);
    }
  }

  /**
   * Calcular configurações otimizadas baseadas na impressora
   */
  private calculateOptimalSettings(printerConfig: any, options: PdfProcessingOptions): any {
    // Calcular DPI baseado na largura da impressora
    let optimalDpi = 203; // Padrão
    if (printerConfig.width <= 58) {
      optimalDpi = 180; // 58mm
    } else if (printerConfig.width <= 80) {
      optimalDpi = 203; // 80mm
    } else {
      optimalDpi = 225; // 112mm+
    }

    // Calcular largura em pixels
    const widthMm = printerConfig.printableWidth || printerConfig.width || 80;
    const widthPx = Math.round((widthMm / 25.4) * optimalDpi);

    return {
      quality: options.quality || 95,
      density: options.density || optimalDpi,
      format: options.format || 'png',
      pages: options.pages,
      width: options.width || widthPx,
      height: options.height, // Deixar automático baseado na proporção
    };
  }

  /**
   * Otimizar imagens para impressão térmica
   */
  private async optimizeImagesForThermalPrinting(
    imagePaths: string[],
    printerConfig: any,
  ): Promise<string[]> {
    const optimizedPaths: string[] = [];

    for (const imagePath of imagePaths) {
      try {
        this.logger.log(`Otimizando imagem: ${imagePath}`);
        
        const optimizedPath = await this.imageService.optimizeImageForThermalPrinting(
          imagePath,
          printerConfig.id || 'default',
        );
        
        optimizedPaths.push(optimizedPath);
        this.logger.log(`Imagem otimizada salva: ${optimizedPath}`);
        
      } catch (error) {
        this.logger.warn(`Falha ao otimizar ${imagePath}: ${error.message}`);
        // Usar imagem original se otimização falhar
        optimizedPaths.push(imagePath);
      }
    }

    return optimizedPaths;
  }

  /**
   * Limpeza de arquivos temporários
   */
  async cleanupTempFiles(maxAgeHours: number = 12): Promise<{ cleaned: number; errors: number }> {
    this.logger.log(`Iniciando limpeza de arquivos temporários (idade máxima: ${maxAgeHours}h)`);
    
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

    this.logger.log(`Limpeza concluída: ${cleaned} pastas removidas, ${errors} erros`);
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
      service: 'PdfV2Service',
      version: '2.0.0',
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
        'Thermal optimization',
        'Automatic cleanup',
        'Zero external dependencies'
      ]
    };
  }

  /**
   * Utilitários privados
   */
  private ensureTempDirectory(): void {
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
      this.logger.log(`Diretório temporário criado: ${this.tempDir}`);
    }
  }

  private generateTempId(): string {
    return `pdf_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
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
