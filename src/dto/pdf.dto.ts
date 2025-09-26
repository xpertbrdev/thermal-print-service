import { IsString, IsOptional, IsNumber, IsArray, IsIn } from 'class-validator';

export class ProcessPdfDto {
  @IsString()
  printerId: string;

  @IsString()
  pdf: string; // Base64, file path, or URL

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  pages?: number[];

  @IsOptional()
  @IsNumber()
  quality?: number;

  @IsOptional()
  @IsIn(['png', 'jpeg'])
  format?: 'png' | 'jpeg';
}

export class PdfInfoDto {
  @IsString()
  pdf: string; // Base64, file path, or URL
}

export class CleanupDto {
  @IsOptional()
  @IsNumber()
  maxAgeHours?: number;
}
