import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
const request = require('supertest');
import { AppModule } from './../src/app.module';
import { QueueService } from './../src/services/queue.service';
import { MonitoringService } from './../src/services/monitoring.service';
import { JobStatus } from './../src/interfaces/print-job.interface';
import * as fs from 'fs';
import { join } from 'path';

describe('Print Session System (e2e)', () => {
  let app: INestApplication;
  let queueService: QueueService;
  let monitoringService: MonitoringService;
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

    queueService = app.get(QueueService);
    monitoringService = app.get(MonitoringService);

    // Mock dos métodos de impressão
    jest.spyOn(queueService, 'processQueue' as any).mockImplementation(async () => {});
    
    await app.init();
  });

  beforeEach(async () => {
    // Limpar filas antes de cada teste
    await queueService.clearPrinterQueue('test-printer');
    
    // Configurar impressora de teste
    await request(app.getHttpServer())
      .post('/config')
      .send({
        printers: [
          {
            id: 'test-printer',
            name: 'Test Printer',
            type: 'epson',
            connectionType: 'network',
            address: '127.0.0.1',
          },
        ],
      });
  });

  describe('Print Session Endpoints', () => {
    it('/print/session (POST) should create a print job with session', async () => {
      const response = await request(app.getHttpServer())
        .post('/print/session')
        .send({
          printerId: 'test-printer',
          content: [{ type: 'text', value: 'Test print' }],
          priority: 1,
        })
        .expect(202);

      expect(response.body.sessionId).toMatch(/^sess_\d{8}_\d{6}_[A-F0-9]{8}$/);
      expect(response.body.printerId).toBe('test-printer');
      expect(response.body.printerName).toBe('Test Printer');
      expect(response.body.status).toBe(JobStatus.QUEUED);
      expect(response.body.queuePosition).toBeGreaterThanOrEqual(0);
    });

    it('/print/session (POST) should generate sessionId if not provided', async () => {
      const response = await request(app.getHttpServer())
        .post('/print/session')
        .send({
          printerId: 'test-printer',
          content: [{ type: 'text', value: 'Test print' }],
        })
        .expect(202);

      expect(response.body.sessionId).toBeDefined();
      expect(response.body.sessionId).toMatch(/^sess_\d{8}_\d{6}_[A-F0-9]{8}$/);
    });

    it('/print/session (POST) should use custom sessionId if provided', async () => {
      const customSessionId = 'sess_20250925_120000_ABCD1234';
      
      const response = await request(app.getHttpServer())
        .post('/print/session')
        .send({
          sessionId: customSessionId,
          printerId: 'test-printer',
          content: [{ type: 'text', value: 'Test print' }],
        })
        .expect(202);

      expect(response.body.sessionId).toBe(customSessionId);
    });

    it('/print/session (POST) should fail with invalid sessionId format', async () => {
      await request(app.getHttpServer())
        .post('/print/session')
        .send({
          sessionId: 'invalid-session-id',
          printerId: 'test-printer',
          content: [{ type: 'text', value: 'Test print' }],
        })
        .expect(400);
    });
  });

  describe('Status Endpoints', () => {
    let sessionId: string;

    beforeEach(async () => {
      const response = await request(app.getHttpServer())
        .post('/print/session')
        .send({
          printerId: 'test-printer',
          content: [{ type: 'text', value: 'Test print' }],
        });
      
      sessionId = response.body.sessionId;
    });

    it('/print/status/:sessionId (GET) should return job status', async () => {
      const response = await request(app.getHttpServer())
        .get(`/print/status/${sessionId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.sessionId).toBe(sessionId);
      expect(response.body.data.status).toBe(JobStatus.QUEUED);
      expect(response.body.data.printerId).toBe('test-printer');
      expect(response.body.data.printerName).toBe('Test Printer');
    });

    it('/print/status/:sessionId (GET) should return 404 for non-existent session', async () => {
      await request(app.getHttpServer())
        .get('/print/status/sess_20250925_120000_NONEXIST')
        .expect(404);
    });
  });

  describe('Cancel Endpoints', () => {
    let sessionId: string;

    beforeEach(async () => {
      const response = await request(app.getHttpServer())
        .post('/print/session')
        .send({
          printerId: 'test-printer',
          content: [{ type: 'text', value: 'Test print' }],
        });
      
      sessionId = response.body.sessionId;
    });

    it('/print/cancel/:sessionId (DELETE) should cancel a job', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/print/cancel/${sessionId}`)
        .send({ reason: 'Test cancellation' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.reason).toBe('Test cancellation');

      // Verificar se foi cancelado
      const statusResponse = await request(app.getHttpServer())
        .get(`/print/status/${sessionId}`);
      
      expect(statusResponse.body.data.status).toBe(JobStatus.CANCELLED);
    });

    it('/print/cancel/:sessionId (DELETE) should return 404 for non-existent session', async () => {
      await request(app.getHttpServer())
        .delete('/print/cancel/sess_20250925_120000_NONEXIST')
        .expect(404);
    });
  });

  describe('Queue Management Endpoints', () => {
    it('/print/queue/:printerId (GET) should return printer queue', async () => {
      // Adicionar alguns jobs
      await request(app.getHttpServer())
        .post('/print/session')
        .send({
          printerId: 'test-printer',
          content: [{ type: 'text', value: 'Job 1' }],
        });

      await request(app.getHttpServer())
        .post('/print/session')
        .send({
          printerId: 'test-printer',
          content: [{ type: 'text', value: 'Job 2' }],
        });

      const response = await request(app.getHttpServer())
        .get('/print/queue/test-printer')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.printerId).toBe('test-printer');
      expect(response.body.data.printerName).toBe('Test Printer');
      expect(response.body.data.jobs).toHaveLength(2);
    });

    it('/print/queue/:printerId (DELETE) should clear printer queue', async () => {
      // Adicionar job
      await request(app.getHttpServer())
        .post('/print/session')
        .send({
          printerId: 'test-printer',
          content: [{ type: 'text', value: 'Job to cancel' }],
        });

      const response = await request(app.getHttpServer())
        .delete('/print/queue/test-printer')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.cancelledJobs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Statistics Endpoints', () => {
    it('/print/stats (GET) should return queue statistics', async () => {
      const response = await request(app.getHttpServer())
        .get('/print/stats')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.totalQueues).toBeGreaterThanOrEqual(0);
      expect(response.body.data.jobsByStatus).toBeDefined();
      expect(response.body.data.printerStats).toBeInstanceOf(Array);
    });

    it('/print/sessions (GET) should return active sessions', async () => {
      // Criar uma sessão
      await request(app.getHttpServer())
        .post('/print/session')
        .send({
          printerId: 'test-printer',
          content: [{ type: 'text', value: 'Test session' }],
        });

      const response = await request(app.getHttpServer())
        .get('/print/sessions')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.sessions).toBeInstanceOf(Array);
      expect(response.body.data.total).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Monitoring Endpoints', () => {
    it('/monitoring/metrics (GET) should return performance metrics', async () => {
      const response = await request(app.getHttpServer())
        .get('/monitoring/metrics')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.performance).toBeDefined();
      expect(response.body.data.queues).toBeDefined();
    });

    it('/monitoring/health (GET) should return printer health status', async () => {
      const response = await request(app.getHttpServer())
        .get('/monitoring/health')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.printers).toBeInstanceOf(Array);
      expect(response.body.data.summary).toBeDefined();
    });

    it('/monitoring/alerts (GET) should return system alerts', async () => {
      const response = await request(app.getHttpServer())
        .get('/monitoring/alerts')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.alerts).toBeInstanceOf(Array);
      expect(response.body.data.summary).toBeDefined();
    });

    it('/monitoring/dashboard (GET) should return dashboard data', async () => {
      const response = await request(app.getHttpServer())
        .get('/monitoring/dashboard')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.overview).toBeDefined();
      expect(response.body.data.queues).toBeDefined();
      expect(response.body.data.alerts).toBeDefined();
      expect(response.body.data.printers).toBeInstanceOf(Array);
    });
  });

  afterAll(async () => {
    // Parar workers e limpar recursos
    if (queueService) {
      queueService.onModuleDestroy();
    }
    
    await app.close();
    
    if (fs.existsSync(configPath)) {
      fs.unlinkSync(configPath);
    }
  });
});
