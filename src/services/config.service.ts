import { Injectable, Logger } from '@nestjs/common';
import { promises as fs } from 'fs';
import { join } from 'path';
import { PrinterConfigDto, PrinterConfigRequestDto } from '../dto/printer-config.dto';

@Injectable()
export class ConfigService {
  private readonly logger = new Logger(ConfigService.name);
  private readonly configPath = join(process.cwd(), 'printer-config.json');
  private config: PrinterConfigRequestDto | null = null;

  async loadConfig(): Promise<PrinterConfigRequestDto> {
    try {
      if (this.config) {
        return this.config!;
      }

      const configExists = await this.fileExists(this.configPath);
      if (!configExists) {
        this.logger.warn('Arquivo de configuração não encontrado. Criando configuração padrão.');
        await this.createDefaultConfig();
      }

      const configData = await fs.readFile(this.configPath, 'utf-8');
      this.config = JSON.parse(configData);
      this.logger.log('Configuração carregada com sucesso');
      return this.config!;
    } catch (error) {
      this.logger.error('Erro ao carregar configuração:', error);
      throw new Error('Falha ao carregar configuração das impressoras');
    }
  }

  async saveConfig(config: PrinterConfigRequestDto): Promise<void> {
    try {
      await fs.writeFile(this.configPath, JSON.stringify(config, null, 2));
      this.config = config;
      this.logger.log('Configuração salva com sucesso');
    } catch (error) {
      this.logger.error('Erro ao salvar configuração:', error);
      throw new Error('Falha ao salvar configuração das impressoras');
    }
  }

  async getPrinterConfig(printerId: string): Promise<PrinterConfigDto | null> {
    const config = await this.loadConfig();
    return config.printers.find(printer => printer.id === printerId) || null;
  }

  async getAllPrinters(): Promise<PrinterConfigDto[]> {
    const config = await this.loadConfig();
    return config.printers;
  }

  async getDefaultSettings() {
    const config = await this.loadConfig();
    return config.defaultSettings || {
      charPerLine: 48, // Caracteres por linha padrão
      width: 80, // Largura física padrão em mm
      printableWidth: 72, // Área de impressão útil padrão em mm
      characterSet: 'PC852_LATIN2',
      timeout: 5000,
      margins: {
        top: 0,
        bottom: 0,
        left: 0,
        right: 0
      },
      spacing: {
        lineHeight: 1,
        paragraphSpacing: 1
      }
    };
  }

  private async fileExists(path: string): Promise<boolean> {
    try {
      await fs.access(path);
      return true;
    } catch {
      return false;
    }
  }

  private async createDefaultConfig(): Promise<void> {
    const defaultConfig: PrinterConfigRequestDto = {
      printers: [
        {
          id: 'default-printer',
          name: 'Impressora Padrão 80mm',
          type: 'epson' as any,
          connectionType: 'network' as any,
          address: '192.168.1.100',
          charPerLine: 48, // 48 caracteres por linha
          width: 80, // 80mm de largura física
          printableWidth: 72, // 72mm de área de impressão útil
          characterSet: 'PC852_LATIN2' as any,
          timeout: 5000
        }
      ],
      defaultSettings: {
        charPerLine: 48, // Padrão: 48 caracteres por linha
        width: 80, // Padrão: 80mm de largura física
        printableWidth: 72, // Padrão: 72mm de área de impressão útil
        characterSet: 'PC852_LATIN2' as any,
        timeout: 5000,
        margins: {
          top: 0,
          bottom: 0,
          left: 0,
          right: 0
        },
        spacing: {
          lineHeight: 1,
          paragraphSpacing: 1
        }
      }
    };

    await this.saveConfig(defaultConfig);
  }
}
