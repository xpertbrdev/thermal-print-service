import { IsString, IsOptional, IsArray, ValidateNested, IsEnum, IsObject, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export enum ContentType {
  TEXT = 'text',
  IMAGE = 'image',
  TABLE = 'table',
  BARCODE = 'barcode',
  QR_CODE = 'qr-code',
  CUT = 'cut',
  BEEP = 'beep',
  CASH_DRAWER = 'cash-drawer',
  LINE = 'line',
  NEW_LINE = 'new-line'
}

export enum TextAlign {
  LEFT = 'left',
  CENTER = 'center',
  RIGHT = 'right'
}

export class TextStyleDto {
  @IsOptional()
  bold?: boolean;

  @IsOptional()
  underline?: boolean;

  @IsOptional()
  invert?: boolean;

  @IsOptional()
  @IsEnum(TextAlign)
  align?: TextAlign;

  @IsOptional()
  @IsNumber()
  width?: number;

  @IsOptional()
  @IsNumber()
  height?: number;
}

export class QrCodeDto {
  @IsString()
  value: string;

  @IsOptional()
  @IsNumber()
  size?: number; // Tamanho do QR code (1-8, padrão: 6)

  @IsOptional()
  @IsEnum(TextAlign)
  align?: TextAlign; // Alinhamento: left, center, right

  @IsOptional()
  @IsNumber()
  width?: number; // Largura personalizada

  @IsOptional()
  @IsNumber()
  height?: number; // Altura personalizada
}

export class TableRowDto {
  @IsArray()
  @IsString({ each: true })
  cells: string[];
}

export class TableDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  headers?: string[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TableRowDto)
  rows: TableRowDto[];
}

export class ContentItemDto {
  @IsEnum(ContentType)
  type: ContentType;

  @IsOptional()
  @IsString()
  value?: string;

  @IsOptional()
  @IsString()
  path?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => TextStyleDto)
  style?: TextStyleDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => TableDto)
  table?: TableDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => QrCodeDto)
  qrCode?: QrCodeDto;

  @IsOptional()
  @IsString()
  symbology?: string;
}

export class PrintRequestDto {
  @IsOptional()
  @IsString()
  printerId?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ContentItemDto)
  content: ContentItemDto[];
}
