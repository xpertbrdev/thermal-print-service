import { IsString, IsOptional, IsArray, ValidateNested, IsEnum, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ContentItemDto } from './print.dto';

export class PrintSessionRequestDto {
  @IsOptional()
  @IsString()
  sessionId?: string; // Se não fornecido, será gerado automaticamente

  @IsOptional()
  @IsString()
  printerId?: string; // Se não fornecido, usa impressora padrão

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ContentItemDto)
  content: ContentItemDto[];

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(3)
  priority?: number; // 1 = alta, 2 = normal (padrão), 3 = baixa
}

export class PrintSessionResponseDto {
  sessionId: string;
  printerId: string;
  printerName: string;
  status: string;
  queuePosition: number;
  estimatedWaitTime: number; // em segundos
  createdAt: Date;
}

export class CancelJobRequestDto {
  @IsString()
  sessionId: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
