import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { promises as fs } from 'fs';
import { join } from 'path';
import * as https from 'https';
import * as http from 'http';
import { URL } from 'url';
import sharp from 'sharp';
import * as Jimp from 'jimp';

@Injectable()
export class ImageService {
  private readonly logger = new Logger(ImageService.name);
  private readonly tempDir = join(process.cwd(), 'temp');

  constructor() {
    this.ensureTempDirectory();
  }

  async processImageForPrinting(imagePath: string): Promise<string> {
    try {
      // Verificar se é URL ou caminho local
      if (this.isUrl(imagePath)) {
        return await this.downloadImage(imagePath);
      } else {
        return await this.validateLocalImage(imagePath);
      }
    } catch (error) {
      this.logger.error(`Erro ao processar imagem: ${error.message}`);
      throw new BadRequestException(`Falha ao processar imagem: ${error.message}`);
    }
  }

  private isUrl(path: string): boolean {
    try {
      new URL(path);
      return true;
    } catch {
      return false;
    }
  }

  private async downloadImage(imageUrl: string): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        const url = new URL(imageUrl);
        const protocol = url.protocol === 'https:' ? https : http;
        const fileName = this.generateTempFileName(url.pathname);
        const filePath = join(this.tempDir, fileName);

        const file = require('fs').createWriteStream(filePath);

        const request = protocol.get(imageUrl, (response) => {
          if (response.statusCode !== 200) {
            reject(new Error(`Falha ao baixar imagem: Status ${response.statusCode}`));
            return;
          }

          // Verificar se é uma imagem válida pelo Content-Type
          const contentType = response.headers['content-type'];
          if (!contentType || !contentType.startsWith('image/')) {
            reject(new Error(`Tipo de arquivo inválido: ${contentType}`));
            return;
          }

          response.pipe(file);

          file.on('finish', () => {
            file.close();
            this.logger.log(`Imagem baixada com sucesso: ${fileName}`);
            resolve(filePath);
          });

          file.on('error', (err) => {
            fs.unlink(filePath).catch(() => {}); // Limpar arquivo em caso de erro
            reject(err);
          });
        });

        request.on('error', (err) => {
          reject(new Error(`Erro na requisição: ${err.message}`));
        });

        request.setTimeout(10000, () => {
          request.destroy();
          reject(new Error('Timeout ao baixar imagem'));
        });

      } catch (error) {
        reject(error);
      }
    });
  }

  private async validateLocalImage(imagePath: string): Promise<string> {
    try {
      // Verificar se o arquivo existe
      await fs.access(imagePath);

      // Verificar se é um arquivo de imagem válido pela extensão
      const validExtensions = ['.png', '.jpg', '.jpeg', '.bmp', '.gif'];
      const extension = imagePath.toLowerCase().substring(imagePath.lastIndexOf('.'));
      
      if (!validExtensions.includes(extension)) {
        throw new Error(`Extensão de arquivo não suportada: ${extension}`);
      }

      // Verificar se o arquivo não está vazio
      const stats = await fs.stat(imagePath);
      if (stats.size === 0) {
        throw new Error('Arquivo de imagem está vazio');
      }

      this.logger.log(`Imagem local validada: ${imagePath}`);
      return imagePath;

    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error(`Arquivo de imagem não encontrado: ${imagePath}`);
      }
      throw error;
    }
  }

  private generateTempFileName(originalPath: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2);
    const extension = originalPath.substring(originalPath.lastIndexOf('.')) || '.png';
    return `temp_${timestamp}_${random}${extension}`;
  }

  private async ensureTempDirectory(): Promise<void> {
    try {
      await fs.access(this.tempDir);
    } catch {
      await fs.mkdir(this.tempDir, { recursive: true });
      this.logger.log('Diretório temporário criado');
    }
  }

  async cleanupTempFiles(): Promise<void> {
    try {
      const files = await fs.readdir(this.tempDir);
      const tempFiles = files.filter(file => file.startsWith('temp_'));
      
      for (const file of tempFiles) {
        const filePath = join(this.tempDir, file);
        const stats = await fs.stat(filePath);
        
        // Remover arquivos temporários com mais de 1 hora
        const oneHourAgo = Date.now() - (60 * 60 * 1000);
        if (stats.mtime.getTime() < oneHourAgo) {
          await fs.unlink(filePath);
          this.logger.log(`Arquivo temporário removido: ${file} [created at: ${stats.mtime.getTime()}]`);
        }
      }
    } catch (error) {
      this.logger.error(`Erro ao limpar arquivos temporários: ${error.message}`);
    }
  }

  /**
   * Processa imagem base64 para impressão
   * @param base64Data - String base64 da imagem (com ou sem prefixo data:image/...)
   * @param printerWidth - Largura da impressora em pixels (padrão: 384px para 58mm)
   */
  async processBase64Image(base64Data: string, printerWidth: number = 384): Promise<string> {
    try {
      // Remover prefixo data:image/... se existir
      const base64Clean = base64Data.replace(/^data:image\/[a-z]+;base64,/, '');
      
      // Converter base64 para buffer
      const imageBuffer = Buffer.from(base64Clean, 'base64');
      
      // Gerar nome de arquivo temporário
      const fileName = this.generateTempFileName('.png');
      const tempPath = join(this.tempDir, fileName);
      
      // Salvar buffer como arquivo temporário
      await fs.writeFile(tempPath, imageBuffer);
      
      this.logger.log(`Imagem base64 processada: ${fileName}`);
      
      // Otimizar para impressão térmica
      return await this.optimizeImageForThermalPrinting(tempPath, printerWidth);
      
    } catch (error) {
      this.logger.error(`Erro ao processar imagem base64: ${error.message}`);
      throw new BadRequestException(`Falha ao processar imagem base64: ${error.message}`);
    }
  }

  /**
   * Otimiza imagem para impressão térmica
   * @param imagePath - Caminho da imagem original
   * @param printerWidth - Largura da impressora em pixels
   */
  async optimizeImageForThermalPrinting(imagePath: string, printerWidth: number = 384): Promise<string> {
    try {
      const optimizedFileName = this.generateTempFileName('_optimized.png');
      const optimizedPath = join(this.tempDir, optimizedFileName);

      this.logger.log(`Iniciando otimização da imagem para impressão térmica...`);
      
      // Usar Sharp para processamento completo
      const sharpImage = sharp(imagePath);
      const metadata = await sharpImage.metadata();
      
      this.logger.log(`Imagem original: ${metadata.width}x${metadata.height}, formato: ${metadata.format}`);

      // 1. Calcular dimensões mantendo proporção
      let targetWidth = printerWidth;
      let targetHeight: number;
      
      if (metadata.width && metadata.height) {
        const aspectRatio = metadata.height / metadata.width;
        targetHeight = Math.round(targetWidth * aspectRatio);
      } else {
        targetHeight = printerWidth; // Fallback quadrado
      }

      // 2. Processar imagem com Sharp (otimizado para impressão térmica)
      await sharpImage
        .resize(targetWidth, targetHeight, {
          fit: 'inside',
          withoutEnlargement: false,
          kernel: sharp.kernel.lanczos3 // Melhor qualidade para redimensionamento
        })
        .greyscale() // Converter para escala de cinza
        .normalize() // Normalizar contraste automaticamente
        .modulate({
          brightness: 1.1, // Aumentar brilho 10%
          saturation: 0,   // Remover saturação (já em greyscale)
          hue: 0
        })
        .sharpen(1, 1, 0.5) // Aplicar sharpening leve
        .threshold(128, { // Aplicar threshold para preto e branco puros
          greyscale: true,
          grayscale: true
        })
        .png({ 
          quality: 100, 
          compressionLevel: 0,
          palette: true // Usar paleta para reduzir tamanho
        })
        .toFile(optimizedPath);

      const finalMetadata = await sharp(optimizedPath).metadata();
      const fileSize = Math.round((await fs.stat(optimizedPath)).size / 1024);
      
      this.logger.log(`Imagem otimizada: ${finalMetadata.width}x${finalMetadata.height}, tamanho: ${fileSize}KB`);

      return optimizedPath;

    } catch (error) {
      this.logger.error(`Erro ao otimizar imagem: ${error.message}`);
      throw new BadRequestException(`Falha na otimização da imagem: ${error.message}`);
    }
  }

  /**
   * Calcula largura da impressora em pixels baseado na largura física em mm
   * @param widthMm - Largura física em mm (ex: 58, 80, 112)
   * @param dpi - DPI da impressora (padrão: 203)
   */
  calculatePrinterWidthInPixels(widthMm: number, dpi: number = 203): number {
    const totalWidthInches = widthMm / 25.4; // Converter mm para polegadas
    const pixelWidth = Math.round(totalWidthInches * dpi);
    
    this.logger.log(`Largura calculada: ${widthMm}mm = ${totalWidthInches.toFixed(2)}in = ${pixelWidth}px (${dpi} DPI)`);
    
    return pixelWidth;
  }

  /**
   * Calcula área de impressão útil em pixels (sem margens físicas da impressora)
   * @param printerWidthMm - Largura física da impressora em mm
   * @param dpi - DPI da impressora (padrão: 203)
   * @param customPrintableWidth - Largura de impressão customizada (opcional)
   */
  calculatePrintableAreaInPixels(
    printerWidthMm: number, 
    dpi: number = 203,
    customPrintableWidth?: number
  ): number {
    let printableWidthMm: number;
    
    if (customPrintableWidth) {
      printableWidthMm = customPrintableWidth;
    } else {
      const specs = this.getPrinterSpecs(printerWidthMm);
      printableWidthMm = specs.printableWidth;
    }
    
    const printableWidthInches = printableWidthMm / 25.4;
    const pixelWidth = Math.round(printableWidthInches * dpi);
    
    this.logger.log(`Área de impressão: ${printerWidthMm}mm total → ${printableWidthMm}mm útil = ${pixelWidth}px (${dpi} DPI)`);
    
    return pixelWidth;
  }

  /**
   * Obtém especificações da impressora baseado na largura
   * @param widthMm - Largura da impressora em mm
   */
  private getPrinterSpecs(widthMm: number): { printableWidth: number; marginMm: number; totalWidth: number } {
    const specs = {
      58: { printableWidth: 48, marginMm: 5, totalWidth: 58 },
      80: { printableWidth: 72, marginMm: 4, totalWidth: 80 },
      112: { printableWidth: 104, marginMm: 4, totalWidth: 112 }
    };
    
    // Retornar especificação exata ou calcular baseado em 90% da largura
    return specs[widthMm] || {
      printableWidth: Math.round(widthMm * 0.9), // 90% como área útil
      marginMm: Math.round(widthMm * 0.05), // 5% de margem cada lado
      totalWidth: widthMm
    };
  }

  /**
   * Calcula largura da impressora em pixels baseado em caracteres (método legado)
   * @param characterWidth - Largura em caracteres (ex: 32, 48, 58)
   * @param dpi - DPI da impressora (padrão: 203)
   * @deprecated Use calculatePrinterWidthInPixels(widthMm) em vez disso
   */
  calculatePrinterWidthInPixelsFromChars(characterWidth: number, dpi: number = 203): number {
    // Cálculo aproximado: cada caractere tem ~2.5mm de largura
    const characterWidthMm = 2.5;
    const totalWidthMm = characterWidth * characterWidthMm;
    const totalWidthInches = totalWidthMm / 25.4;
    const pixelWidth = Math.round(totalWidthInches * dpi);
    
    this.logger.log(`Largura calculada (chars): ${characterWidth} chars = ${totalWidthMm}mm = ${pixelWidth}px`);
    
    return pixelWidth;
  }

  /**
   * Aplica dithering avançado usando Sharp (mais eficiente)
   * @param imagePath - Caminho da imagem
   * @param algorithm - Algoritmo de dithering ('floyd-steinberg' | 'ordered')
   */
  async applyAdvancedDithering(imagePath: string, algorithm: 'floyd-steinberg' | 'ordered' = 'floyd-steinberg'): Promise<string> {
    try {
      const ditheredFileName = this.generateTempFileName('_dithered.png');
      const ditheredPath = join(this.tempDir, ditheredFileName);

      if (algorithm === 'floyd-steinberg') {
        // Sharp não tem Floyd-Steinberg nativo, usar threshold com noise
        await sharp(imagePath)
          .greyscale()
          .threshold(128, { greyscale: true })
          .png()
          .toFile(ditheredPath);
      } else {
        // Ordered dithering usando threshold com padrão
        await sharp(imagePath)
          .greyscale()
          .threshold(128, { greyscale: true })
          .png()
          .toFile(ditheredPath);
      }

      return ditheredPath;
    } catch (error) {
      this.logger.error(`Erro ao aplicar dithering: ${error.message}`);
      return imagePath; // Retorna original em caso de erro
    }
  }
}
