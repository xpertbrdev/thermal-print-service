import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { promises as fs } from 'fs';
import { join } from 'path';
import * as https from 'https';
import * as http from 'http';
import { URL } from 'url';

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
          this.logger.log(`Arquivo temporário removido: ${file}`);
        }
      }
    } catch (error) {
      this.logger.error(`Erro ao limpar arquivos temporários: ${error.message}`);
    }
  }

  // Método para conversão de imagem para formato otimizado para impressão térmica
  async optimizeImageForThermalPrinting(imagePath: string): Promise<string> {
    // Esta funcionalidade pode ser expandida no futuro para:
    // - Redimensionar imagens para largura da impressora
    // - Converter para escala de cinza
    // - Aplicar dithering para melhor qualidade em impressoras térmicas
    // - Ajustar contraste e brilho
    
    // Por enquanto, retorna o caminho original
    return imagePath;
  }
}
