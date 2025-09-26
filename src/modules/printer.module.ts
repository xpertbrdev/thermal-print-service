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
import { EscPosTestService } from '../services/escpos-test.service';
import { EscPosTestController } from '../controllers/escpos-test.controller';

@Module({
  controllers: [
    PrinterController, 
    ConfigController, 
    PrintSessionController,
    MonitoringController,
    EscPosTestController
  ],
  providers: [
    PrinterService, 
    ConfigService, 
    ImageService,
    QueueService,
    SessionService,
    MonitoringService,
    EscPosTestService
  ],
  exports: [
    PrinterService, 
    ConfigService, 
    ImageService,
    QueueService,
    SessionService,
    MonitoringService,
    EscPosTestService
  ],
})
export class PrinterModule {}
