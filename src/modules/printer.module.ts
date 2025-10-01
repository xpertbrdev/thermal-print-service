import { Logger, Module } from '@nestjs/common';
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
// import { PdfService } from '../services/pdf.service';
// import { PdfStandaloneService } from '../services/pdf-standalone.service';
import { PdfV3Service } from '../services/pdf-v3.service';
import { PdfController } from '../controllers/pdf.controller';

@Module({
  controllers: [
    PrinterController, 
    ConfigController, 
    PrintSessionController,
    MonitoringController,
    EscPosTestController,
    PdfController
  ],
  providers: [
    Logger,
    PrinterService, 
    ConfigService, 
    ImageService,
    QueueService,
    SessionService,
    MonitoringService,
    EscPosTestService,
    // PdfService,
    // PdfStandaloneService,
    PdfV3Service
  ],
  exports: [
    PrinterService, 
    ConfigService, 
    ImageService,
    QueueService,
    SessionService,
    MonitoringService,
    EscPosTestService,
    // PdfService,
    // PdfStandaloneService,
    PdfV3Service
  ],
})
export class PrinterModule {}
