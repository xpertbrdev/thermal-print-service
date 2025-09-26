import { IsString, IsOptional, IsEnum, IsArray, IsNumber, Min, Max } from 'class-validator';

export enum PdfFormat {
  PNG = 'png',
  JPEG = 'jpeg',
}

export class PdfProcessingDto {
  @IsString()
  printerId: string;

  @IsString()
  pdf: string; // base64, file path, ou URL

  @IsOptional()
  @IsNumber()
  @Min(72)
  @Max(600)
  quality?: number = 100;

  @IsOptional()
  @IsNumber()
  @Min(72)
  @Max(600)
  density?: number;

  @IsOptional()
  @IsEnum(PdfFormat)
  format?: PdfFormat = PdfFormat.PNG;

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  pages?: number[]; // Páginas específicas para processar

  @IsOptional()
  @IsString()
  sessionId?: string;

  @IsOptional()
  @IsEnum(['high', 'normal', 'low'])
  priority?: 'high' | 'normal' | 'low' = 'normal';
}

export class PdfInfoDto {
  @IsString()
  pdf: string; // base64, file path, ou URL
}

// DTO para adicionar PDF ao conteúdo de impressão
export class PdfContentDto {
  type: 'pdf';
  
  @IsString()
  pdf: string; // base64, file path, ou URL

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  pages?: number[]; // Páginas específicas (default: todas)

  @IsOptional()
  @IsNumber()
  @Min(72)
  @Max(600)
  quality?: number = 100;

  @IsOptional()
  @IsEnum(PdfFormat)
  format?: PdfFormat = PdfFormat.PNG;
}
