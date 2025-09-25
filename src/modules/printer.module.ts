import { Module } from '@nestjs/common';
import { PrinterController } from '../controllers/printer.controller';
import { ConfigController } from '../controllers/config.controller';
import { PrinterService } from '../services/printer.service';
import { ConfigService } from '../services/config.service';
import { ImageService } from '../services/image.service';

@Module({
  controllers: [PrinterController, ConfigController],
  providers: [PrinterService, ConfigService, ImageService],
  exports: [PrinterService, ConfigService, ImageService],
})
export class PrinterModule {}
