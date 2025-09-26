import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from './config.service';
import { ImageService } from './image.service';
import { pdf } from 'pdf-to-img';
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
export class PdfV3Service {
  private readonly logger = new Logger(PdfV3Service.name);
  private readonly tempDir = '/tmp/thermal-printer-pdf-v3';

  constructor(
    private readonly configService: ConfigService,
    private readonly imageService: ImageService,
  ) {
    this.ensureTempDirectory();
  }

  /**
   * Processar PDF para impressão térmica usando pdf-to-img
   */
  async processPdfForThermalPrinting(
    pdfInput: string | Buffer,
    printerId: string,
    options: PdfProcessingOptions = {},
  ): Promise<PdfProcessingResult> {
    const startTime = Date.now();
    this.logger.log(`Iniciando processamento PDF v3 para impressora: ${printerId}`);

    try {
      // 1. Preparar PDF buffer
      const pdfBuffer = await this.preparePdfBuffer(pdfInput);
      this.logger.log(`PDF preparado: ${pdfBuffer.length} bytes`);

      // 2. Obter configuração da impressora (sem testar conexão)
      const printerConfig = await this.configService.getPrinterConfig(printerId);
      if (!printerConfig) {
        throw new Error(`Impressora não encontrada: ${printerId}`);
      }

      // 3. Calcular configurações otimizadas
      const processingOptions = this.calculateOptimalSettings(printerConfig, options);
      this.logger.log(`Configurações calculadas:`, processingOptions);

      // 4. Converter PDF para imagens usando pdf-to-img
      const imagePaths = await this.convertPdfToImages(pdfBuffer, processingOptions);
      this.logger.log(`Conversão concluída: ${imagePaths.length} páginas`);

      // 5. Otimizar imagens para impressão térmica
      let optimizedPaths: string[] = [];
      try {
        this.logger.log(`Iniciando otimização de imagens...`);
        optimizedPaths = await this.optimizeImagesForThermalPrinting(
          imagePaths,
          printerConfig,
        );
        this.logger.log(`Otimização concluída: ${optimizedPaths.length} imagens`);
      } catch (optimizationError) {
        this.logger.warn(`Falha na otimização, usando imagens originais: ${optimizationError.message}`);
        optimizedPaths = imagePaths;
      }

      const processingTime = Date.now() - startTime;
      this.logger.log(`Processamento PDF v3 concluído em ${processingTime}ms`);

      return {
        success: true,
        processedPages: imagePaths.length,
        totalPages: imagePaths.length,
        processingTime,
        outputPaths: imagePaths,
        optimizedPaths,
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.logger.error(`Erro no processamento PDF v3: ${error.message}`);
      
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
    this.logger.log('Obtendo informações do PDF v3...');

    try {
      const pdfBuffer = await this.preparePdfBuffer(pdfInput);
      
      // Usar pdf-to-img para obter informações básicas
      const tempId = this.generateTempId();
      const tempFolder = path.join(this.tempDir, tempId);
      
      // Criar pasta temporária
      if (!fs.existsSync(tempFolder)) {
        fs.mkdirSync(tempFolder, { recursive: true });
      }

      try {
        // Converter PDF para contar páginas
        const document = await pdf(pdfBuffer, { scale: 1.0 });
        let pageCount = 0;
        
        // Iterar através das páginas para contar
        for await (const image of document) {
          pageCount++;
          // Salvar apenas a primeira página para teste
          if (pageCount === 1) {
            const imagePath = path.join(tempFolder, `info_page_1.png`);
            fs.writeFileSync(imagePath, image);
          }
          // Parar após algumas páginas para não consumir muito tempo
          if (pageCount >= 10) break;
        }

        // Se não conseguiu contar todas, tentar obter total real
        if (pageCount >= 10) {
          try {
            const fullDocument = await pdf(pdfBuffer, { scale: 0.1 }); // Escala baixa para rapidez
            pageCount = 0;
            for await (const image of fullDocument) {
              pageCount++;
            }
          } catch (countError) {
            this.logger.warn(`Não foi possível contar todas as páginas: ${countError.message}`);
          }
        }

        const info: PdfInfo = {
          pages: pageCount,
          size: pdfBuffer.length,
          format: 'PDF',
          title: 'Documento PDF',
          creator: 'pdf-to-img',
          producer: 'Thermal Printer Microservice V3',
          creationDate: new Date(),
          modificationDate: new Date(),
        };

        this.logger.log(`Informações PDF v3 obtidas: ${info.pages} páginas, ${info.size} bytes`);
        return info;

      } finally {
        // Limpar arquivos temporários
        this.cleanupTempFolder(tempFolder);
      }

    } catch (error) {
      this.logger.error(`Erro ao obter informações do PDF v3: ${error.message}`);
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
   * Converter PDF para imagens usando pdf-to-img
   */
  private async convertPdfToImages(
    pdfBuffer: Buffer,
    options: any,
  ): Promise<string[]> {
    const tempId = this.generateTempId();
    const tempFolder = path.join(this.tempDir, tempId);
    
    // Criar pasta temporária
    if (!fs.existsSync(tempFolder)) {
      fs.mkdirSync(tempFolder, { recursive: true });
    }

    this.logger.log(`Convertendo PDF para imagens na pasta: ${tempFolder}`);

    try {
      // Configurações para pdf-to-img
      const pdfOptions = {
        scale: options.density ? options.density / 150 : 1.0, // Converter DPI para escala
        width: options.width,
        height: options.height,
      };

      this.logger.log(`Iniciando conversão v3 com opções:`, pdfOptions);

      const document = await pdf(pdfBuffer, pdfOptions);
      const imagePaths: string[] = [];
      let pageNumber = 1;

      // Processar páginas específicas se solicitado
      const pagesToProcess = options.pages || [];
      const processAllPages = pagesToProcess.length === 0 || pagesToProcess.includes(-1);

      for await (const image of document) {
        // Verificar se deve processar esta página
        if (!processAllPages && !pagesToProcess.includes(pageNumber)) {
          pageNumber++;
          continue;
        }

        const imagePath = path.join(tempFolder, `page_${pageNumber}.png`);
        fs.writeFileSync(imagePath, image);
        imagePaths.push(imagePath);
        
        this.logger.log(`Página ${pageNumber} convertida: ${imagePath}`);
        pageNumber++;

        // Limitar número de páginas para evitar uso excessivo de memória
        if (imagePaths.length >= 50) {
          this.logger.warn(`Limitando conversão a 50 páginas para evitar uso excessivo de memória`);
          break;
        }
      }

      this.logger.log(`Conversão v3 concluída: ${imagePaths.length} páginas geradas`);
      return imagePaths;

    } catch (error) {
      this.logger.error(`Erro na conversão PDF→IMG v3: ${error.message}`);
      
      // Limpar pasta temporária em caso de erro
      this.cleanupTempFolder(tempFolder);
      
      throw new Error(`Falha na conversão v3: ${error.message}`);
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
        
        // Usar largura em pixels baseada na configuração da impressora
        const printerWidthMm = printerConfig.printableWidth || printerConfig.width || 80;
        const dpi = 203; // DPI padrão para impressoras térmicas
        const widthPixels = Math.round((printerWidthMm / 25.4) * dpi);
        
        // Chamar otimização com largura em pixels
        const optimizedPath = await this.imageService.optimizeImageForThermalPrinting(
          imagePath,
          widthPixels,
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
    this.logger.log(`Iniciando limpeza de arquivos temporários v3 (idade máxima: ${maxAgeHours}h)`);
    
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
      this.logger.error(`Erro na limpeza geral v3: ${error.message}`);
      errors++;
    }

    this.logger.log(`Limpeza v3 concluída: ${cleaned} pastas removidas, ${errors} erros`);
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
        this.logger.warn(`Erro ao calcular estatísticas v3: ${error.message}`);
      }
    }

    return {
      service: 'PdfV3Service',
      version: '3.0.0',
      engine: 'pdf-to-img',
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
        'Simple and reliable conversion',
        'Memory efficient processing'
      ]
    };
  }

  /**
   * Utilitários privados
   */
  private ensureTempDirectory(): void {
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
      this.logger.log(`Diretório temporário v3 criado: ${this.tempDir}`);
    }
  }

  private generateTempId(): string {
    return `pdf_v3_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
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
