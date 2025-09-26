import { Injectable, Logger } from '@nestjs/common';
import { ImageService } from './image.service';
import { ConfigService } from './config.service';
import * as fs from 'fs';
import * as path from 'path';
import * as pdf2pic from 'pdf2pic';

export interface PdfProcessingOptions {
  printerId: string;
  quality?: number;
  density?: number;
  format?: 'png' | 'jpeg';
  pages?: 'all' | number[];
  outputDir?: string;
}

export interface PdfProcessingResult {
  success: boolean;
  images: string[];
  totalPages: number;
  processedPages: number;
  errors: string[];
  processingTime: number;
}

@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name);
  private readonly tempDir = path.join(process.cwd(), 'temp', 'pdf');

  constructor(
    private readonly imageService: ImageService,
    private readonly configService: ConfigService,
  ) {
    // Criar diretório temporário se não existir
    this.ensureTempDirectory();
  }

  /**
   * Processa PDF (base64 ou arquivo) e converte para imagens otimizadas
   */
  async processPdf(
    pdfInput: string,
    options: PdfProcessingOptions,
  ): Promise<PdfProcessingResult> {
    const startTime = Date.now();
    this.logger.log(`Iniciando processamento de PDF para impressora: ${options.printerId}`);

    const result: PdfProcessingResult = {
      success: false,
      images: [],
      totalPages: 0,
      processedPages: 0,
      errors: [],
      processingTime: 0,
    };

    try {
      // 1. Preparar arquivo PDF
      const pdfPath = await this.preparePdfFile(pdfInput);
      this.logger.log(`PDF preparado em: ${pdfPath}`);

      // 2. Obter configuração da impressora
      const printerConfig = await this.configService.getPrinterConfig(options.printerId);
      if (!printerConfig) {
        throw new Error(`Impressora não encontrada: ${options.printerId}`);
      }

      // 3. Configurar opções de conversão
      const conversionOptions = this.buildConversionOptions(printerConfig, options);
      this.logger.log(`Opções de conversão: ${JSON.stringify(conversionOptions)}`);

      // 4. Converter PDF para imagens
      const images = await this.convertPdfToImages(pdfPath, conversionOptions);
      result.totalPages = images.length;
      this.logger.log(`PDF convertido em ${images.length} páginas`);

      // 5. Otimizar cada imagem para impressão térmica
      const optimizedImages: string[] = [];
      for (let i = 0; i < images.length; i++) {
        try {
          this.logger.log(`Otimizando página ${i + 1}/${images.length}`);
          const optimizedPath = await this.imageService.optimizeImageForThermalPrinting(
            images[i],
            printerConfig.printableWidth || printerConfig.width || 80,
          );
          optimizedImages.push(optimizedPath);
          result.processedPages++;
        } catch (error) {
          const errorMsg = `Erro ao otimizar página ${i + 1}: ${error.message}`;
          this.logger.error(errorMsg);
          result.errors.push(errorMsg);
        }
      }

      // 6. Limpeza de arquivos temporários originais
      await this.cleanupTempFiles([pdfPath, ...images]);

      result.success = optimizedImages.length > 0;
      result.images = optimizedImages;
      result.processingTime = Date.now() - startTime;

      this.logger.log(`PDF processado com sucesso: ${result.processedPages}/${result.totalPages} páginas em ${result.processingTime}ms`);
      return result;

    } catch (error) {
      const errorMsg = `Erro no processamento de PDF: ${error.message}`;
      this.logger.error(errorMsg);
      result.errors.push(errorMsg);
      result.processingTime = Date.now() - startTime;
      return result;
    }
  }

  /**
   * Prepara arquivo PDF a partir de base64 ou caminho
   */
  private async preparePdfFile(pdfInput: string): Promise<string> {
    // Verificar se é base64
    if (this.isBase64Pdf(pdfInput)) {
      return this.saveBase64AsPdf(pdfInput);
    }

    // Verificar se é URL
    if (this.isUrl(pdfInput)) {
      return this.downloadPdfFromUrl(pdfInput);
    }

    // Assumir que é caminho de arquivo
    if (fs.existsSync(pdfInput)) {
      return pdfInput;
    }

    throw new Error(`PDF não encontrado ou formato inválido: ${pdfInput}`);
  }

  /**
   * Verifica se input é base64 PDF
   */
  private isBase64Pdf(input: string): boolean {
    return input.startsWith('data:application/pdf;base64,') || 
           (input.length > 100 && /^[A-Za-z0-9+/]+=*$/.test(input));
  }

  /**
   * Verifica se input é URL
   */
  private isUrl(input: string): boolean {
    try {
      new URL(input);
      return input.startsWith('http://') || input.startsWith('https://');
    } catch {
      return false;
    }
  }

  /**
   * Salva base64 como arquivo PDF
   */
  private async saveBase64AsPdf(base64Input: string): Promise<string> {
    let base64Data = base64Input;
    
    // Remover prefixo se presente
    if (base64Data.startsWith('data:application/pdf;base64,')) {
      base64Data = base64Data.replace('data:application/pdf;base64,', '');
    }

    const fileName = `pdf_${Date.now()}_${Math.random().toString(36).substr(2, 5)}.pdf`;
    const filePath = path.join(this.tempDir, fileName);

    try {
      const buffer = Buffer.from(base64Data, 'base64');
      await fs.promises.writeFile(filePath, buffer);
      
      this.logger.log(`PDF base64 salvo: ${filePath} (${buffer.length} bytes)`);
      return filePath;
    } catch (error) {
      throw new Error(`Erro ao salvar PDF base64: ${error.message}`);
    }
  }

  /**
   * Download PDF de URL
   */
  private async downloadPdfFromUrl(url: string): Promise<string> {
    const fileName = `pdf_${Date.now()}_${Math.random().toString(36).substr(2, 5)}.pdf`;
    const filePath = path.join(this.tempDir, fileName);

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const buffer = await response.arrayBuffer();
      await fs.promises.writeFile(filePath, Buffer.from(buffer));
      
      this.logger.log(`PDF baixado: ${filePath} (${buffer.byteLength} bytes)`);
      return filePath;
    } catch (error) {
      throw new Error(`Erro ao baixar PDF: ${error.message}`);
    }
  }

  /**
   * Constrói opções de conversão baseadas na impressora
   */
  private buildConversionOptions(printerConfig: any, options: PdfProcessingOptions) {
    // Calcular DPI baseado na largura da impressora
    const printerWidthMm = printerConfig.printableWidth || printerConfig.width || 80;
    const targetDpi = this.calculateOptimalDpi(printerWidthMm);

    return {
      density: options.density || targetDpi,
      saveFilename: 'page',
      savePath: this.tempDir,
      format: options.format || 'png',
      width: Math.round((printerWidthMm / 25.4) * targetDpi), // Converter mm para pixels
      quality: options.quality || 100,
    };
  }

  /**
   * Calcula DPI ótimo baseado na largura da impressora
   */
  private calculateOptimalDpi(widthMm: number): number {
    // DPI padrão para impressoras térmicas
    const standardDpi = 203;
    
    // Ajustar DPI baseado na largura para otimizar qualidade vs tamanho
    if (widthMm <= 58) return 180;      // 58mm - DPI menor para arquivos menores
    if (widthMm <= 80) return 203;      // 80mm - DPI padrão
    if (widthMm <= 112) return 225;     // 112mm - DPI maior para mais detalhes
    return 250;                         // Impressoras maiores
  }

  /**
   * Converte PDF para imagens usando pdf2pic
   */
  private async convertPdfToImages(pdfPath: string, options: any): Promise<string[]> {
    try {
      const convert = pdf2pic.fromPath(pdfPath, options);
      
      // Converter todas as páginas
      const results = await convert.bulk(-1, { responseType: 'image' });
      
      const imagePaths: string[] = [];
      for (const result of results) {
        if (result.path) {
          imagePaths.push(result.path);
        }
      }

      if (imagePaths.length === 0) {
        throw new Error('Nenhuma página foi convertida');
      }

      this.logger.log(`${imagePaths.length} páginas convertidas com sucesso`);
      return imagePaths;

    } catch (error) {
      throw new Error(`Erro na conversão PDF→Imagem: ${error.message}`);
    }
  }

  /**
   * Obtém informações do PDF
   */
  async getPdfInfo(pdfInput: string): Promise<{
    pages: number;
    size: number;
    format: string;
    encrypted: boolean;
  }> {
    try {
      const pdfPath = await this.preparePdfFile(pdfInput);
      const stats = await fs.promises.stat(pdfPath);
      
      // Para obter número de páginas, fazemos uma conversão rápida
      const convert = pdf2pic.fromPath(pdfPath, {
        density: 72, // DPI baixo para rapidez
        format: 'png',
        width: 100,  // Tamanho mínimo para rapidez
      });
      
      const results = await convert.bulk(-1, { responseType: 'image' });
      
      // Limpar arquivo temporário se foi criado
      if (pdfInput !== pdfPath) {
        await this.cleanupTempFiles([pdfPath]);
      }

      return {
        pages: results.length,
        size: stats.size,
        format: 'PDF',
        encrypted: false, // pdf2pic falharia se fosse criptografado
      };

    } catch (error) {
      throw new Error(`Erro ao obter informações do PDF: ${error.message}`);
    }
  }

  /**
   * Cria diretório temporário
   */
  private ensureTempDirectory(): void {
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
      this.logger.log(`Diretório temporário criado: ${this.tempDir}`);
    }
  }

  /**
   * Limpeza de arquivos temporários
   */
  private async cleanupTempFiles(filePaths: string[]): Promise<void> {
    for (const filePath of filePaths) {
      try {
        if (fs.existsSync(filePath)) {
          await fs.promises.unlink(filePath);
          this.logger.debug(`Arquivo temporário removido: ${filePath}`);
        }
      } catch (error) {
        this.logger.warn(`Erro ao remover arquivo temporário ${filePath}: ${error.message}`);
      }
    }
  }

  /**
   * Limpeza automática de arquivos antigos (executar periodicamente)
   */
  async cleanupOldTempFiles(maxAgeHours: number = 24): Promise<void> {
    try {
      const files = await fs.promises.readdir(this.tempDir);
      const now = Date.now();
      const maxAge = maxAgeHours * 60 * 60 * 1000; // Converter para ms

      let cleanedCount = 0;
      for (const file of files) {
        const filePath = path.join(this.tempDir, file);
        const stats = await fs.promises.stat(filePath);
        
        if (now - stats.mtime.getTime() > maxAge) {
          await fs.promises.unlink(filePath);
          cleanedCount++;
        }
      }

      if (cleanedCount > 0) {
        this.logger.log(`Limpeza automática: ${cleanedCount} arquivos removidos`);
      }
    } catch (error) {
      this.logger.error(`Erro na limpeza automática: ${error.message}`);
    }
  }

  /**
   * Estatísticas do serviço
   */
  getServiceStats(): {
    tempDir: string;
    tempDirExists: boolean;
    supportedFormats: string[];
    maxFileSize: string;
  } {
    return {
      tempDir: this.tempDir,
      tempDirExists: fs.existsSync(this.tempDir),
      supportedFormats: ['PDF (base64)', 'PDF (file path)', 'PDF (URL)'],
      maxFileSize: '50MB (configurável)',
    };
  }
}
