import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrintJob, PrinterQueue, JobStatus, JobStatusResponse } from '../interfaces/print-job.interface';
import { ConfigService } from './config.service';
import { PrinterService } from './printer.service';
import { SessionService } from './session.service';
import { MonitoringService } from './monitoring.service';

@Injectable()
export class QueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(QueueService.name);
  private readonly queues: Map<string, PrinterQueue> = new Map();
  private readonly jobs: Map<string, PrintJob> = new Map(); // sessionId -> job
  private readonly workers: Map<string, NodeJS.Timeout> = new Map();
  private readonly WORKER_INTERVAL = 1000; // 1 segundo
  private readonly MAX_RETRY_ATTEMPTS = 3;
  private readonly JOB_TIMEOUT = 30000; // 30 segundos

  constructor(
    private readonly configService: ConfigService,
    private readonly printerService: PrinterService,
    private readonly sessionService: SessionService,
    private readonly monitoringService: MonitoringService,
  ) {}

  async onModuleInit() {
    await this.initializeQueues();
    this.startWorkers();
    this.logger.log('Sistema de filas inicializado');
  }

  onModuleDestroy() {
    this.stopWorkers();
    this.logger.log('Sistema de filas finalizado');
  }

  /**
   * Adiciona um job à fila de impressão
   */
  async addJob(job: Omit<PrintJob, 'status' | 'createdAt'>): Promise<PrintJob> {
    const fullJob: PrintJob = {
      ...job,
      status: JobStatus.QUEUED,
      createdAt: new Date(),
      priority: job.priority || 2, // Normal por padrão
    };

    // Verificar se a impressora existe
    const printerConfig = await this.configService.getPrinterConfig(job.printerId);
    if (!printerConfig) {
      throw new Error(`Impressora com ID '${job.printerId}' não encontrada`);
    }

    // Inicializar fila da impressora se não existir
    if (!this.queues.has(job.printerId)) {
      await this.initializePrinterQueue(job.printerId);
    }

    const queue = this.queues.get(job.printerId)!;
    
    // Inserir job na posição correta baseado na prioridade
    this.insertJobByPriority(queue, fullJob);
    
    // Armazenar job no mapa global
    this.jobs.set(fullJob.sessionId, fullJob);

    // Registrar evento de monitoramento
    this.monitoringService.recordJobEvent({
      sessionId: fullJob.sessionId,
      printerId: fullJob.printerId,
      status: JobStatus.QUEUED,
      timestamp: fullJob.createdAt,
    });

    this.logger.log(`Job ${fullJob.sessionId} adicionado à fila da impressora ${job.printerId}`);
    
    return fullJob;
  }

  /**
   * Obtém o status de um job
   */
  async getJobStatus(sessionId: string): Promise<JobStatusResponse | null> {
    const job = this.jobs.get(sessionId);
    if (!job) {
      return null;
    }

    const printerConfig = await this.configService.getPrinterConfig(job.printerId);
    const queue = this.queues.get(job.printerId);
    
    let queuePosition = 0;
    let estimatedWaitTime = 0;

    if (queue && job.status === JobStatus.QUEUED) {
      queuePosition = queue.jobs.findIndex(j => j.sessionId === sessionId) + 1;
      estimatedWaitTime = this.calculateEstimatedWaitTime(queue, queuePosition);
    }

    return {
      sessionId: job.sessionId,
      status: job.status,
      printerId: job.printerId,
      printerName: printerConfig?.name || 'Desconhecida',
      createdAt: job.createdAt,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      error: job.error,
      queuePosition: queuePosition,
      estimatedWaitTime: estimatedWaitTime,
    };
  }

  /**
   * Cancela um job
   */
  async cancelJob(sessionId: string, reason?: string): Promise<boolean> {
    const job = this.jobs.get(sessionId);
    if (!job) {
      return false;
    }

    if (job.status === JobStatus.COMPLETED || job.status === JobStatus.FAILED) {
      return false; // Não pode cancelar job já finalizado
    }

    if (job.status === JobStatus.PRINTING) {
      // Se está imprimindo, marca para cancelamento mas pode não parar imediatamente
      const previousStatus = job.status;
      job.status = JobStatus.CANCELLED;
      job.error = reason || 'Cancelado pelo usuário';
      job.completedAt = new Date();
      
      // Registrar evento de monitoramento
      this.monitoringService.recordJobEvent({
        sessionId,
        printerId: job.printerId,
        status: JobStatus.CANCELLED,
        timestamp: job.completedAt,
        previousStatus,
        error: job.error,
      });
      
      this.logger.warn(`Job ${sessionId} cancelado durante impressão`);
    } else {
      // Remove da fila se ainda não começou
      const queue = this.queues.get(job.printerId);
      if (queue) {
        queue.jobs = queue.jobs.filter(j => j.sessionId !== sessionId);
      }
      
      const previousStatus = job.status;
      job.status = JobStatus.CANCELLED;
      job.error = reason || 'Cancelado pelo usuário';
      job.completedAt = new Date();
      
      // Registrar evento de monitoramento
      this.monitoringService.recordJobEvent({
        sessionId,
        printerId: job.printerId,
        status: JobStatus.CANCELLED,
        timestamp: job.completedAt,
        previousStatus,
        error: job.error,
      });
    }

    this.logger.log(`Job ${sessionId} cancelado: ${reason || 'sem motivo especificado'}`);
    return true;
  }

  /**
   * Obtém a fila de uma impressora
   */
  getPrinterQueue(printerId: string): PrinterQueue | null {
    return this.queues.get(printerId) || null;
  }

  /**
   * Limpa a fila de uma impressora (apenas jobs em fila)
   */
  async clearPrinterQueue(printerId: string): Promise<number> {
    const queue = this.queues.get(printerId);
    if (!queue) {
      return 0;
    }

    const queuedJobs = queue.jobs.filter(job => job.status === JobStatus.QUEUED);
    const cancelledCount = queuedJobs.length;

    // Marcar jobs como cancelados
    queuedJobs.forEach(job => {
      job.status = JobStatus.CANCELLED;
      job.error = 'Fila limpa pelo administrador';
      job.completedAt = new Date();
    });

    // Remover da fila
    queue.jobs = queue.jobs.filter(job => job.status !== JobStatus.CANCELLED);

    this.logger.log(`Fila da impressora ${printerId} limpa: ${cancelledCount} jobs cancelados`);
    return cancelledCount;
  }

  /**
   * Obtém estatísticas das filas
   */
  getQueueStats() {
    const stats = {
      totalQueues: this.queues.size,
      totalJobs: this.jobs.size,
      jobsByStatus: {
        queued: 0,
        printing: 0,
        completed: 0,
        failed: 0,
        cancelled: 0,
      },
      printerStats: [] as any[],
    };

    // Contar jobs por status
    this.jobs.forEach(job => {
      stats.jobsByStatus[job.status]++;
    });

    // Estatísticas por impressora
    this.queues.forEach((queue, printerId) => {
      stats.printerStats.push({
        printerId,
        queueLength: queue.jobs.length,
        isProcessing: queue.isProcessing,
        currentJob: queue.currentJob?.sessionId || null,
        lastActivity: queue.lastActivity,
      });
    });

    return stats;
  }

  // Métodos privados

  private async initializeQueues() {
    const printers = await this.configService.getAllPrinters();
    for (const printer of printers) {
      await this.initializePrinterQueue(printer.id);
    }
  }

  private async initializePrinterQueue(printerId: string) {
    if (!this.queues.has(printerId)) {
      this.queues.set(printerId, {
        printerId,
        jobs: [],
        isProcessing: false,
        lastActivity: new Date(),
      });
      this.logger.log(`Fila inicializada para impressora: ${printerId}`);
    }
  }

  private insertJobByPriority(queue: PrinterQueue, job: PrintJob) {
    // Inserir baseado na prioridade (1 = alta, 2 = normal, 3 = baixa)
    let insertIndex = queue.jobs.length;
    
    for (let i = 0; i < queue.jobs.length; i++) {
      if ((queue.jobs[i].priority || 2) > (job.priority || 2)) {
        insertIndex = i;
        break;
      }
    }
    
    queue.jobs.splice(insertIndex, 0, job);
  }

  private calculateEstimatedWaitTime(queue: PrinterQueue, position: number): number {
    // Estimativa simples: 10 segundos por job na frente
    const baseTimePerJob = 10;
    return Math.max(0, (position - 1) * baseTimePerJob);
  }

  private startWorkers() {
    this.queues.forEach((queue, printerId) => {
      const worker = setInterval(() => {
        this.processQueue(printerId).catch(error => {
          this.logger.error(`Erro no worker da impressora ${printerId}:`, error);
        });
      }, this.WORKER_INTERVAL);
      
      this.workers.set(printerId, worker);
    });
  }

  private stopWorkers() {
    this.workers.forEach((worker, printerId) => {
      clearInterval(worker);
      this.logger.log(`Worker da impressora ${printerId} parado`);
    });
    this.workers.clear();
  }

  private async processQueue(printerId: string) {
    const queue = this.queues.get(printerId);
    if (!queue || queue.isProcessing || queue.jobs.length === 0) {
      return;
    }

    const nextJob = queue.jobs.find(job => job.status === JobStatus.QUEUED);
    if (!nextJob) {
      return;
    }

    queue.isProcessing = true;
    queue.currentJob = nextJob;
    queue.lastActivity = new Date();

    try {
      // Marcar job como em processamento
      const previousStatus = nextJob.status;
      nextJob.status = JobStatus.PRINTING;
      nextJob.startedAt = new Date();
      
      // Registrar evento de monitoramento
      this.monitoringService.recordJobEvent({
        sessionId: nextJob.sessionId,
        printerId: nextJob.printerId,
        status: JobStatus.PRINTING,
        timestamp: nextJob.startedAt,
        previousStatus,
      });
      
      this.logger.log(`Iniciando processamento do job ${nextJob.sessionId} na impressora ${printerId}`);

      // Processar impressão
      await this.printerService.processJobAsync(nextJob);

      // Marcar como concluído
      nextJob.status = JobStatus.COMPLETED;
      nextJob.completedAt = new Date();
      
      // Registrar evento de monitoramento
      this.monitoringService.recordJobEvent({
        sessionId: nextJob.sessionId,
        printerId: nextJob.printerId,
        status: JobStatus.COMPLETED,
        timestamp: nextJob.completedAt,
        previousStatus: JobStatus.PRINTING,
      });
      
      this.logger.log(`Job ${nextJob.sessionId} concluído com sucesso`);

    } catch (error) {
      // Marcar como falhou
      nextJob.status = JobStatus.FAILED;
      nextJob.error = error.message;
      nextJob.completedAt = new Date();
      
      // Registrar evento de monitoramento
      this.monitoringService.recordJobEvent({
        sessionId: nextJob.sessionId,
        printerId: nextJob.printerId,
        status: JobStatus.FAILED,
        timestamp: nextJob.completedAt,
        previousStatus: JobStatus.PRINTING,
        error: error.message,
      });
      
      this.logger.error(`Job ${nextJob.sessionId} falhou:`, error);
    } finally {
      // Limpar estado da fila
      queue.isProcessing = false;
      queue.currentJob = undefined;
      queue.lastActivity = new Date();

      // Remover job concluído da fila após um tempo
      setTimeout(() => {
        queue.jobs = queue.jobs.filter(job => job.sessionId !== nextJob.sessionId);
      }, 60000); // Remove após 1 minuto
    }
  }
}
