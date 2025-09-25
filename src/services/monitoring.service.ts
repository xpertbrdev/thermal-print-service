import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter } from 'events';
import { JobStatus, PrintJob } from '../interfaces/print-job.interface';

export interface JobEvent {
  sessionId: string;
  printerId: string;
  status: JobStatus;
  timestamp: Date;
  previousStatus?: JobStatus;
  error?: string;
  metadata?: any;
}

export interface PrinterHealthStatus {
  printerId: string;
  isOnline: boolean;
  lastSeen: Date;
  errorCount: number;
  successCount: number;
  averageProcessingTime: number;
  currentLoad: number; // 0-100%
}

@Injectable()
export class MonitoringService extends EventEmitter {
  private readonly logger = new Logger(MonitoringService.name);
  private readonly jobHistory: Map<string, JobEvent[]> = new Map();
  private readonly printerHealth: Map<string, PrinterHealthStatus> = new Map();
  private readonly performanceMetrics: Map<string, number[]> = new Map(); // sessionId -> [startTime, endTime]
  private readonly MAX_HISTORY_PER_JOB = 50;
  private readonly MAX_PERFORMANCE_SAMPLES = 100;

  constructor() {
    super();
    this.setupEventListeners();
  }

  /**
   * Registra um evento de mudança de status
   */
  recordJobEvent(event: JobEvent): void {
    // Armazenar no histórico
    if (!this.jobHistory.has(event.sessionId)) {
      this.jobHistory.set(event.sessionId, []);
    }

    const history = this.jobHistory.get(event.sessionId)!;
    history.push(event);

    // Manter apenas os últimos eventos
    if (history.length > this.MAX_HISTORY_PER_JOB) {
      history.shift();
    }

    // Atualizar métricas de saúde da impressora
    this.updatePrinterHealth(event);

    // Emitir evento para listeners
    this.emit('jobStatusChanged', event);

    // Log do evento
    this.logger.log(`Job ${event.sessionId}: ${event.previousStatus || 'NEW'} → ${event.status}`);

    // Registrar métricas de performance
    if (event.status === JobStatus.PRINTING) {
      this.performanceMetrics.set(event.sessionId, [Date.now()]);
    } else if (event.status === JobStatus.COMPLETED || event.status === JobStatus.FAILED) {
      const metrics = this.performanceMetrics.get(event.sessionId);
      if (metrics && metrics.length === 1) {
        metrics.push(Date.now());
        this.updateProcessingTimeMetrics(event.printerId, metrics[1] - metrics[0]);
      }
    }
  }

  /**
   * Obtém o histórico de eventos de um job
   */
  getJobHistory(sessionId: string): JobEvent[] {
    return this.jobHistory.get(sessionId) || [];
  }

  /**
   * Obtém o status de saúde de uma impressora
   */
  getPrinterHealth(printerId: string): PrinterHealthStatus | null {
    return this.printerHealth.get(printerId) || null;
  }

  /**
   * Obtém o status de saúde de todas as impressoras
   */
  getAllPrinterHealth(): PrinterHealthStatus[] {
    return Array.from(this.printerHealth.values());
  }

  /**
   * Obtém métricas de performance
   */
  getPerformanceMetrics() {
    const metrics = {
      totalJobs: this.jobHistory.size,
      averageProcessingTime: 0,
      successRate: 0,
      printerMetrics: [] as any[],
    };

    // Calcular métricas globais
    let totalProcessingTime = 0;
    let completedJobs = 0;
    let successfulJobs = 0;

    this.jobHistory.forEach((history, sessionId) => {
      const lastEvent = history[history.length - 1];
      if (lastEvent.status === JobStatus.COMPLETED || lastEvent.status === JobStatus.FAILED) {
        completedJobs++;
        if (lastEvent.status === JobStatus.COMPLETED) {
          successfulJobs++;
        }

        const performanceData = this.performanceMetrics.get(sessionId);
        if (performanceData && performanceData.length === 2) {
          totalProcessingTime += performanceData[1] - performanceData[0];
        }
      }
    });

    metrics.averageProcessingTime = completedJobs > 0 ? totalProcessingTime / completedJobs : 0;
    metrics.successRate = completedJobs > 0 ? (successfulJobs / completedJobs) * 100 : 0;

    // Métricas por impressora
    this.printerHealth.forEach((health, printerId) => {
      metrics.printerMetrics.push({
        printerId,
        ...health,
        successRate: health.successCount + health.errorCount > 0 
          ? (health.successCount / (health.successCount + health.errorCount)) * 100 
          : 0,
      });
    });

    return metrics;
  }

  /**
   * Limpa histórico antigo
   */
  cleanupHistory(olderThanHours: number = 24): number {
    const cutoffTime = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);
    let cleanedCount = 0;

    this.jobHistory.forEach((history, sessionId) => {
      const filteredHistory = history.filter(event => event.timestamp > cutoffTime);
      
      if (filteredHistory.length !== history.length) {
        if (filteredHistory.length === 0) {
          this.jobHistory.delete(sessionId);
          this.performanceMetrics.delete(sessionId);
        } else {
          this.jobHistory.set(sessionId, filteredHistory);
        }
        cleanedCount++;
      }
    });

    if (cleanedCount > 0) {
      this.logger.log(`Limpeza do histórico: ${cleanedCount} jobs removidos`);
    }

    return cleanedCount;
  }

  /**
   * Obtém alertas baseados em métricas
   */
  getAlerts() {
    const alerts = [];
    const now = new Date();

    this.printerHealth.forEach((health, printerId) => {
      // Impressora offline
      const minutesSinceLastSeen = (now.getTime() - health.lastSeen.getTime()) / (1000 * 60);
      if (minutesSinceLastSeen > 5) {
        alerts.push({
          type: 'printer_offline',
          severity: 'high',
          printerId,
          message: `Impressora ${printerId} offline há ${Math.round(minutesSinceLastSeen)} minutos`,
          timestamp: now,
        });
      }

      // Taxa de erro alta
      const totalJobs = health.successCount + health.errorCount;
      if (totalJobs > 10) {
        const errorRate = (health.errorCount / totalJobs) * 100;
        if (errorRate > 20) {
          alerts.push({
            type: 'high_error_rate',
            severity: 'medium',
            printerId,
            message: `Taxa de erro alta: ${errorRate.toFixed(1)}% (${health.errorCount}/${totalJobs})`,
            timestamp: now,
          });
        }
      }

      // Carga alta
      if (health.currentLoad > 80) {
        alerts.push({
          type: 'high_load',
          severity: 'low',
          printerId,
          message: `Carga alta: ${health.currentLoad}%`,
          timestamp: now,
        });
      }
    });

    return alerts.sort((a, b) => {
      const severityOrder = { high: 3, medium: 2, low: 1 };
      return severityOrder[b.severity] - severityOrder[a.severity];
    });
  }

  // Métodos privados

  private setupEventListeners(): void {
    // Limpeza automática do histórico a cada hora
    setInterval(() => {
      this.cleanupHistory(24);
    }, 60 * 60 * 1000);

    // Log de eventos importantes
    this.on('jobStatusChanged', (event: JobEvent) => {
      if (event.status === JobStatus.FAILED) {
        this.logger.error(`Job ${event.sessionId} falhou: ${event.error}`);
      } else if (event.status === JobStatus.COMPLETED) {
        this.logger.log(`Job ${event.sessionId} concluído com sucesso`);
      }
    });
  }

  private updatePrinterHealth(event: JobEvent): void {
    if (!this.printerHealth.has(event.printerId)) {
      this.printerHealth.set(event.printerId, {
        printerId: event.printerId,
        isOnline: true,
        lastSeen: event.timestamp,
        errorCount: 0,
        successCount: 0,
        averageProcessingTime: 0,
        currentLoad: 0,
      });
    }

    const health = this.printerHealth.get(event.printerId)!;
    health.lastSeen = event.timestamp;
    health.isOnline = true;

    // Atualizar contadores
    if (event.status === JobStatus.COMPLETED) {
      health.successCount++;
    } else if (event.status === JobStatus.FAILED) {
      health.errorCount++;
    }

    // Calcular carga atual (simplificado)
    if (event.status === JobStatus.PRINTING) {
      health.currentLoad = Math.min(100, health.currentLoad + 20);
    } else if (event.status === JobStatus.COMPLETED || event.status === JobStatus.FAILED) {
      health.currentLoad = Math.max(0, health.currentLoad - 20);
    }
  }

  private updateProcessingTimeMetrics(printerId: string, processingTime: number): void {
    const health = this.printerHealth.get(printerId);
    if (health) {
      // Média móvel simples
      if (health.averageProcessingTime === 0) {
        health.averageProcessingTime = processingTime;
      } else {
        health.averageProcessingTime = (health.averageProcessingTime * 0.8) + (processingTime * 0.2);
      }
    }
  }
}
