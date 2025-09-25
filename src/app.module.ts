import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrinterModule } from './modules/printer.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrinterModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
