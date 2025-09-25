import { 
  Controller, 
  Post, 
  Get, 
  Delete,
  Body, 
  Param, 
  Query,
  HttpCode, 
  HttpStatus,
  NotFoundException,
  BadRequestException 
} from '@nestjs/common';
import { QueueService } from '../services/queue.service';
import { SessionService } from '../services/session.service';
import { ConfigService } from '../services/config.service';
import { PrintSessionRequestDto, PrintSessionResponseDto, CancelJobRequestDto } from '../dto/print-session.dto';
import { JobStatus } from '../interfaces/print-job.interface';

@Controller('print')
export class PrintSessionController {
  constructor(
    private readonly queueService: QueueService,
    private readonly sessionService: SessionService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Envia um job de impressão para a fila
   */
  @Post('session')
  @HttpCode(HttpStatus.ACCEPTED)
  async printWithSession(@Body() request: PrintSessionRequestDto): Promise<PrintSessionResponseDto> {
    try {
      // Gerar sessionId se não fornecido
      const sessionId = request.sessionId || this.sessionService.generateSessionId();

      // Validar sessionId se fornecido
      if (request.sessionId && !this.sessionService.isValidSessionId(request.sessionId)) {
        throw new BadRequestException('Formato de sessionId inválido');
      }

      // Determinar impressora
      let printerId = request.printerId;
      if (!printerId) {
        const printers = await this.configService.getAllPrinters();
        if (printers.length === 0) {
          throw new BadRequestException('Nenhuma impressora configurada');
        }
        printerId = printers[0].id;
      }

      // Verificar se impressora existe
      const printerConfig = await this.configService.getPrinterConfig(printerId);
      if (!printerConfig) {
        throw new BadRequestException(`Impressora '${printerId}' não encontrada`);
      }

      // Adicionar job à fila
      const job = await this.queueService.addJob({
        sessionId,
        printerId,
        content: request.content,
        priority: request.priority || 2,
      });

      // Obter posição na fila
      const status = await this.queueService.getJobStatus(sessionId);

      return {
        sessionId: job.sessionId,
        printerId: job.printerId,
        printerName: printerConfig.name,
        status: job.status,
        queuePosition: status?.queuePosition || 0,
        estimatedWaitTime: status?.estimatedWaitTime || 0,
        createdAt: job.createdAt,
      };

    } catch (error) {
      throw new BadRequestException(`Falha ao processar impressão: ${error.message}`);
    }
  }

  /**
   * Consulta o status de uma sessão de impressão
   */
  @Get('status/:sessionId')
  async getStatus(@Param('sessionId') sessionId: string) {
    const status = await this.queueService.getJobStatus(sessionId);
    
    if (!status) {
      throw new NotFoundException(`Sessão '${sessionId}' não encontrada`);
    }

    return {
      success: true,
      data: status,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Cancela uma sessão de impressão
   */
  @Delete('cancel/:sessionId')
  async cancelJob(
    @Param('sessionId') sessionId: string,
    @Body() request?: CancelJobRequestDto
  ) {
    const cancelled = await this.queueService.cancelJob(sessionId, request?.reason);
    
    if (!cancelled) {
      throw new NotFoundException(`Sessão '${sessionId}' não encontrada ou não pode ser cancelada`);
    }

    return {
      success: true,
      message: `Sessão '${sessionId}' cancelada com sucesso`,
      reason: request?.reason || 'Sem motivo especificado',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Lista jobs de uma impressora específica
   */
  @Get('queue/:printerId')
  async getPrinterQueue(@Param('printerId') printerId: string) {
    // Verificar se impressora existe
    const printerConfig = await this.configService.getPrinterConfig(printerId);
    if (!printerConfig) {
      throw new NotFoundException(`Impressora '${printerId}' não encontrada`);
    }

    const queue = this.queueService.getPrinterQueue(printerId);
    
    if (!queue) {
      return {
        success: true,
        data: {
          printerId,
          printerName: printerConfig.name,
          jobs: [],
          isProcessing: false,
          currentJob: null,
          lastActivity: null,
        },
      };
    }

    // Mapear jobs com informações detalhadas
    const jobsWithDetails = await Promise.all(
      queue.jobs.map(async (job) => {
        const status = await this.queueService.getJobStatus(job.sessionId);
        return {
          sessionId: job.sessionId,
          status: job.status,
          priority: job.priority,
          createdAt: job.createdAt,
          startedAt: job.startedAt,
          queuePosition: status?.queuePosition || 0,
          estimatedWaitTime: status?.estimatedWaitTime || 0,
        };
      })
    );

    return {
      success: true,
      data: {
        printerId,
        printerName: printerConfig.name,
        jobs: jobsWithDetails,
        isProcessing: queue.isProcessing,
        currentJob: queue.currentJob ? {
          sessionId: queue.currentJob.sessionId,
          status: queue.currentJob.status,
          startedAt: queue.currentJob.startedAt,
        } : null,
        lastActivity: queue.lastActivity,
      },
    };
  }

  /**
   * Limpa a fila de uma impressora
   */
  @Delete('queue/:printerId')
  async clearPrinterQueue(@Param('printerId') printerId: string) {
    // Verificar se impressora existe
    const printerConfig = await this.configService.getPrinterConfig(printerId);
    if (!printerConfig) {
      throw new NotFoundException(`Impressora '${printerId}' não encontrada`);
    }

    const cancelledCount = await this.queueService.clearPrinterQueue(printerId);

    return {
      success: true,
      message: `Fila da impressora '${printerConfig.name}' limpa com sucesso`,
      cancelledJobs: cancelledCount,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Obtém estatísticas gerais das filas
   */
  @Get('stats')
  async getQueueStats() {
    const stats = this.queueService.getQueueStats();

    // Adicionar nomes das impressoras
    const printerStatsWithNames = await Promise.all(
      stats.printerStats.map(async (printerStat) => {
        const config = await this.configService.getPrinterConfig(printerStat.printerId);
        return {
          ...printerStat,
          printerName: config?.name || 'Desconhecida',
        };
      })
    );

    return {
      success: true,
      data: {
        ...stats,
        printerStats: printerStatsWithNames,
        timestamp: new Date().toISOString(),
      },
    };
  }

  /**
   * Lista todas as sessões ativas (últimas 100)
   */
  @Get('sessions')
  async getActiveSessions(
    @Query('status') status?: string,
    @Query('printerId') printerId?: string,
    @Query('limit') limit?: string
  ) {
    const stats = this.queueService.getQueueStats();
    const sessions = [];

    // Filtrar por status se especificado
    const statusFilter = status ? status.split(',') : null;
    const limitNumber = limit ? parseInt(limit) : 100;

    // Coletar sessões de todas as filas
    for (const [queuePrinterId, queue] of this.queueService['queues']) {
      if (printerId && queuePrinterId !== printerId) {
        continue;
      }

      for (const job of queue.jobs) {
        if (statusFilter && !statusFilter.includes(job.status)) {
          continue;
        }

        const jobStatus = await this.queueService.getJobStatus(job.sessionId);
        if (jobStatus) {
          sessions.push(jobStatus);
        }
      }
    }

    // Ordenar por data de criação (mais recentes primeiro)
    sessions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return {
      success: true,
      data: {
        sessions: sessions.slice(0, limitNumber),
        total: sessions.length,
        filters: {
          status: statusFilter,
          printerId,
          limit: limitNumber,
        },
      },
    };
  }

  /**
   * Endpoint para monitoramento em tempo real (Server-Sent Events)
   */
  @Get('monitor/:sessionId')
  async monitorSession(@Param('sessionId') sessionId: string) {
    const status = await this.queueService.getJobStatus(sessionId);
    
    if (!status) {
      throw new NotFoundException(`Sessão '${sessionId}' não encontrada`);
    }

    // Retornar status atual (em uma implementação real, isso seria SSE)
    return {
      success: true,
      data: {
        ...status,
        isRealTime: false, // Indicar que não é tempo real nesta implementação
        refreshInterval: 2000, // Sugerir intervalo de polling em ms
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Reprocessar um job que falhou
   */
  @Post('retry/:sessionId')
  async retryJob(@Param('sessionId') sessionId: string) {
    const currentStatus = await this.queueService.getJobStatus(sessionId);
    
    if (!currentStatus) {
      throw new NotFoundException(`Sessão '${sessionId}' não encontrada`);
    }

    if (currentStatus.status !== JobStatus.FAILED) {
      throw new BadRequestException(`Sessão '${sessionId}' não está em estado de falha`);
    }

    // Recriar job com novo sessionId
    const newSessionId = this.sessionService.generateSessionId();
    const job = this.queueService['jobs'].get(sessionId);
    
    if (!job) {
      throw new NotFoundException(`Dados da sessão '${sessionId}' não encontrados`);
    }

    const newJob = await this.queueService.addJob({
      sessionId: newSessionId,
      printerId: job.printerId,
      content: job.content,
      priority: 1, // Alta prioridade para reprocessamento
    });

    return {
      success: true,
      message: `Sessão reprocessada com sucesso`,
      data: {
        originalSessionId: sessionId,
        newSessionId: newJob.sessionId,
        printerId: newJob.printerId,
        status: newJob.status,
      },
      timestamp: new Date().toISOString(),
    };
  }
}
