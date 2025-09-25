import { ContentItemDto } from '../dto/print.dto';

export enum JobStatus {
  QUEUED = 'queued',
  PRINTING = 'printing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export interface PrintJob {
  sessionId: string;
  printerId: string;
  content: ContentItemDto[];
  status: JobStatus;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  priority?: number; // 1 = alta, 2 = normal, 3 = baixa
}

export interface PrinterQueue {
  printerId: string;
  jobs: PrintJob[];
  isProcessing: boolean;
  currentJob?: PrintJob;
  lastActivity?: Date;
}

export interface JobStatusResponse {
  sessionId: string;
  status: JobStatus;
  printerId: string;
  printerName: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  queuePosition?: number;
  estimatedWaitTime?: number; // em segundos
}
