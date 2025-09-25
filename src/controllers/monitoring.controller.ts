import { Controller, Get, Param, Query, Delete } from '@nestjs/common';
import { MonitoringService } from '../services/monitoring.service';
import { QueueService } from '../services/queue.service';
import { ConfigService } from '../services/config.service';

@Controller('monitoring')
export class MonitoringController {
  constructor(
    private readonly monitoringService: MonitoringService,
    private readonly queueService: QueueService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Obtém métricas de performance geral
   */
  @Get('metrics')
  async getMetrics() {
    const metrics = this.monitoringService.getPerformanceMetrics();
    const queueStats = this.queueService.getQueueStats();

    return {
      success: true,
      data: {
        performance: metrics,
        queues: queueStats,
        timestamp: new Date().toISOString(),
      },
    };
  }

  /**
   * Obtém o histórico de eventos de um job
   */
  @Get('job/:sessionId/history')
  async getJobHistory(@Param('sessionId') sessionId: string) {
    const history = this.monitoringService.getJobHistory(sessionId);
    
    return {
      success: true,
      data: {
        sessionId,
        events: history,
        totalEvents: history.length,
      },
    };
  }

  /**
   * Obtém o status de saúde de todas as impressoras
   */
  @Get('health')
  async getPrintersHealth() {
    const healthData = this.monitoringService.getAllPrinterHealth();
    
    // Adicionar nomes das impressoras
    const healthWithNames = await Promise.all(
      healthData.map(async (health) => {
        const config = await this.configService.getPrinterConfig(health.printerId);
        return {
          ...health,
          printerName: config?.name || 'Desconhecida',
        };
      })
    );

    return {
      success: true,
      data: {
        printers: healthWithNames,
        summary: {
          total: healthWithNames.length,
          online: healthWithNames.filter(p => p.isOnline).length,
          offline: healthWithNames.filter(p => !p.isOnline).length,
        },
        timestamp: new Date().toISOString(),
      },
    };
  }

  /**
   * Obtém o status de saúde de uma impressora específica
   */
  @Get('health/:printerId')
  async getPrinterHealth(@Param('printerId') printerId: string) {
    const health = this.monitoringService.getPrinterHealth(printerId);
    
    if (!health) {
      return {
        success: false,
        message: `Dados de saúde não encontrados para impressora '${printerId}'`,
      };
    }

    const config = await this.configService.getPrinterConfig(printerId);
    
    return {
      success: true,
      data: {
        ...health,
        printerName: config?.name || 'Desconhecida',
        timestamp: new Date().toISOString(),
      },
    };
  }

  /**
   * Obtém alertas do sistema
   */
  @Get('alerts')
  async getAlerts(@Query('severity') severity?: string) {
    let alerts = this.monitoringService.getAlerts();
    
    if (severity) {
      alerts = alerts.filter(alert => alert.severity === severity);
    }

    return {
      success: true,
      data: {
        alerts,
        summary: {
          total: alerts.length,
          high: alerts.filter(a => a.severity === 'high').length,
          medium: alerts.filter(a => a.severity === 'medium').length,
          low: alerts.filter(a => a.severity === 'low').length,
        },
        timestamp: new Date().toISOString(),
      },
    };
  }

  /**
   * Dashboard com resumo geral
   */
  @Get('dashboard')
  async getDashboard() {
    const metrics = this.monitoringService.getPerformanceMetrics();
    const queueStats = this.queueService.getQueueStats();
    const healthData = this.monitoringService.getAllPrinterHealth();
    const alerts = this.monitoringService.getAlerts();

    // Calcular estatísticas do dashboard
    const dashboard = {
      overview: {
        totalJobs: metrics.totalJobs,
        successRate: metrics.successRate,
        averageProcessingTime: Math.round(metrics.averageProcessingTime / 1000), // em segundos
        activePrinters: healthData.filter(p => p.isOnline).length,
        totalPrinters: healthData.length,
      },
      queues: {
        totalQueued: queueStats.jobsByStatus.queued,
        totalPrinting: queueStats.jobsByStatus.printing,
        totalCompleted: queueStats.jobsByStatus.completed,
        totalFailed: queueStats.jobsByStatus.failed,
      },
      alerts: {
        total: alerts.length,
        critical: alerts.filter(a => a.severity === 'high').length,
        warnings: alerts.filter(a => a.severity === 'medium').length,
      },
      printers: await Promise.all(
        healthData.map(async (health) => {
          const config = await this.configService.getPrinterConfig(health.printerId);
          const queue = this.queueService.getPrinterQueue(health.printerId);
          
          return {
            id: health.printerId,
            name: config?.name || 'Desconhecida',
            status: health.isOnline ? 'online' : 'offline',
            queueLength: queue?.jobs.length || 0,
            isProcessing: queue?.isProcessing || false,
            successRate: health.successCount + health.errorCount > 0 
              ? Math.round((health.successCount / (health.successCount + health.errorCount)) * 100)
              : 0,
            averageTime: Math.round(health.averageProcessingTime / 1000), // em segundos
          };
        })
      ),
      timestamp: new Date().toISOString(),
    };

    return {
      success: true,
      data: dashboard,
    };
  }

  /**
   * Limpa o histórico de monitoramento
   */
  @Delete('cleanup')
  async cleanupHistory(@Query('hours') hours?: string) {
    const hoursToKeep = hours ? parseInt(hours) : 24;
    const cleanedCount = this.monitoringService.cleanupHistory(hoursToKeep);

    return {
      success: true,
      message: `Limpeza concluída: ${cleanedCount} registros removidos`,
      data: {
        cleanedJobs: cleanedCount,
        hoursKept: hoursToKeep,
        timestamp: new Date().toISOString(),
      },
    };
  }

  /**
   * Obtém estatísticas de uso por período
   */
  @Get('stats/usage')
  async getUsageStats(
    @Query('period') period: string = 'day', // day, week, month
    @Query('printerId') printerId?: string
  ) {
    // Esta seria uma implementação mais complexa que requer armazenamento histórico
    // Por simplicidade, retornamos as métricas atuais
    const metrics = this.monitoringService.getPerformanceMetrics();
    
    let filteredMetrics = metrics;
    if (printerId) {
      filteredMetrics = {
        ...metrics,
        printerMetrics: metrics.printerMetrics.filter(p => p.printerId === printerId),
      };
    }

    return {
      success: true,
      data: {
        period,
        printerId: printerId || 'all',
        metrics: filteredMetrics,
        note: 'Implementação básica - dados atuais apenas',
        timestamp: new Date().toISOString(),
      },
    };
  }
}
