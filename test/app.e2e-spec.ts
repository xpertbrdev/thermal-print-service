import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
const request = require('supertest');
import { AppModule } from './../src/app.module';
import { PrinterService } from './../src/services/printer.service';
import * as fs from 'fs';
import { join } from 'path';

describe('Thermal Printer Microservice (e2e)', () => {
  let app: INestApplication;
  const configPath = join(process.cwd(), 'printer-config.json');

  beforeAll(async () => {
    if (fs.existsSync(configPath)) {
      fs.unlinkSync(configPath);
    }

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }));
    await app.init();
  });

  describe('Health Endpoint', () => {
    it('/print/health (GET) should return service status', () => {
      return request(app.getHttpServer())
        .get('/print/health')
        .expect(200)
        .expect((res) => {
          expect(res.body).toEqual({
            success: true,
            message: 'Microservice de impressão térmica funcionando',
            version: '1.0.0',
            timestamp: expect.any(String),
          });
        });
    });
  });

  describe('Config Endpoints', () => {
    it('/config (POST) should update the printer configuration', async () => {
      const config = {
        printers: [
          {
            id: 'test-printer',
            name: 'Test Printer',
            type: 'epson',
            connectionType: 'network',
            address: '127.0.0.1',
          },
        ],
      };

      await request(app.getHttpServer())
        .post('/config')
        .send(config)
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.printers[0].id).toBe('test-printer');
        });
    });

    it('/config (GET) should retrieve the current configuration', () => {
      return request(app.getHttpServer())
        .get('/config')
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.printers).toHaveLength(1);
          expect(res.body.data.printers[0].id).toBe('test-printer');
        });
    });
  });

  describe('Print Endpoint', () => {
    beforeAll(() => {
      const printerService = app.get(PrinterService);
      jest.spyOn(printerService, 'print').mockImplementation(async () => {
        return { success: true, message: 'Impressão simulada com sucesso' };
      });
      jest.spyOn(printerService, 'testConnection').mockImplementation(async (printerId) => {
        return { connected: true, printer: printerId || 'default' };
      });
    });

    it('/print (POST) should execute a print job successfully', () => {
      const printJob = {
        printerId: 'test-printer',
        content: [{ type: 'text', value: 'Hello World' }],
      };

      return request(app.getHttpServer())
        .post('/print')
        .send(printJob)
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.message).toBe('Impressão simulada com sucesso');
        });
    });

    it('/print (POST) should fail with invalid payload', () => {
      const invalidPrintJob = {
        printerId: 'test-printer',
        content: [{ type: 'invalid-type', value: 'Hello' }],
      };

      return request(app.getHttpServer())
        .post('/print')
        .send(invalidPrintJob)
        .expect(400);
    });

    it('/print/test-connection (GET) should test the printer connection', () => {
      return request(app.getHttpServer())
        .get('/print/test-connection?printerId=test-printer')
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.connected).toBe(true);
          expect(res.body.data.printer).toBe('test-printer');
        });
    });
  });

  afterAll(async () => {
    await app.close();
    if (fs.existsSync(configPath)) {
      fs.unlinkSync(configPath);
    }
  });
});
