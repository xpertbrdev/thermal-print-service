import { Controller, Post, Get, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { ConfigService } from '../services/config.service';
import { PrinterConfigRequestDto, PrinterConfigDto } from '../dto/printer-config.dto';

@Controller('config')
export class ConfigController {
  constructor(private readonly configService: ConfigService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async updateConfig(@Body() config: PrinterConfigRequestDto) {
    await this.configService.saveConfig(config);
    return {
      success: true,
      message: 'Configuração atualizada com sucesso',
      data: config
    };
  }

  @Get()
  async getConfig() {
    const config = await this.configService.loadConfig();
    return {
      success: true,
      data: config
    };
  }

  @Get('printers')
  async getAllPrinters() {
    const printers = await this.configService.getAllPrinters();
    return {
      success: true,
      data: printers
    };
  }

  @Get('printers/:id')
  async getPrinter(@Param('id') id: string) {
    const printer = await this.configService.getPrinterConfig(id);
    if (!printer) {
      return {
        success: false,
        message: `Impressora com ID '${id}' não encontrada`
      };
    }
    
    return {
      success: true,
      data: printer
    };
  }

  @Get('default-settings')
  async getDefaultSettings() {
    const settings = await this.configService.getDefaultSettings();
    return {
      success: true,
      data: settings
    };
  }
}
