import { Module } from '@nestjs/common';
import { PrinterController } from '../controllers/printer.controller';
import { ConfigController } from '../controllers/config.controller';
import { PrintSessionController } from '../controllers/print-session.controller';
import { MonitoringController } from '../controllers/monitoring.controller';
import { PrinterService } from '../services/printer.service';
import { ConfigService } from '../services/config.service';
import { ImageService } from '../services/image.service';
import { QueueService } from '../services/queue.service';
import { SessionService } from '../services/session.service';
import { MonitoringService } from '../services/monitoring.service';

@Module({
  controllers: [
    PrinterController, 
    ConfigController, 
    PrintSessionController,
    MonitoringController
  ],
  providers: [
    PrinterService, 
    ConfigService, 
    ImageService,
    QueueService,
    SessionService,
    MonitoringService
  ],
  exports: [
    PrinterService, 
    ConfigService, 
    ImageService,
    QueueService,
    SessionService,
    MonitoringService
  ],
})
export class PrinterModule {}
