import { IsString, IsOptional, IsArray, ValidateNested, IsEnum, IsObject, IsNumber, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export enum ContentType {
  TEXT = 'text',
  IMAGE = 'image',
  TABLE = 'table',
  BARCODE = 'barcode',
  QR_CODE = 'qr-code',
  PDF = 'pdf',
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

export class TableColumnDto {
  @IsOptional()
  @IsNumber()
  width?: number; // Largura da coluna em caracteres

  @IsOptional()
  @IsEnum(TextAlign)
  align?: TextAlign; // Alinhamento do conteúdo da coluna

  @IsOptional()
  @IsString()
  padding?: string; // Caractere de preenchimento (padrão: espaço)
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

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TableColumnDto)
  columns?: TableColumnDto[]; // Configurações de largura e alinhamento por coluna

  @IsOptional()
  @IsNumber()
  defaultColumnWidth?: number; // Largura padrão se não especificada

  @IsOptional()
  @IsString()
  separator?: string; // Separador entre colunas (padrão: " | ")

  @IsOptional()
  @IsString()
  borderChar?: string; // Caractere para bordas (padrão: "-")
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
  @IsString()
  base64?: string; // Imagem em formato base64 (com ou sem prefixo data:image/...)

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

  // PDF content
  @IsOptional()
  @IsString()
  pdf?: string; // base64, file path, ou URL

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  pages?: number[]; // Páginas específicas

  @IsOptional()
  @IsNumber()
  quality?: number; // Qualidade da conversão

  @IsOptional()
  @IsString()
  symbology?: string;
}

export class PrintRequestDto {
  @IsOptional()
  @IsString()
  printerId?: string;

  @IsOptional()
  @IsBoolean()
  returnBuffer?: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ContentItemDto)
  content: ContentItemDto[];
}
