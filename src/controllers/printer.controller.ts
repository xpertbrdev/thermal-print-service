import { Controller, Post, Get, Body, Param, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { PrinterService } from '../services/printer.service';
import { PrintRequestDto } from '../dto/print.dto';

@Controller('print')
export class PrinterController {
  constructor(private readonly printerService: PrinterService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async print(@Body() printRequest: PrintRequestDto) {
    try {
      const result = await this.printerService.print(printRequest);
      return {
        success: true,
        message: result.message,
        timestamp: new Date().toISOString(),
        buffer: result.buffer
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  @Get('test-connection')
  async testConnection(@Query('printerId') printerId?: string) {
    try {
      const result = await this.printerService.testConnection(printerId);
      return {
        success: true,
        data: result,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  @Get('health')
  getHealth() {
    return {
      success: true,
      message: 'Microservice de impressão térmica funcionando',
      version: '1.0.0',
      timestamp: new Date().toISOString()
    };
  }
}
