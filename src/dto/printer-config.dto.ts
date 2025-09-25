import { IsString, IsEnum, IsNumber, IsOptional, IsObject, ValidateNested, IsArray } from 'class-validator';
import { Type } from 'class-transformer';

export enum PrinterType {
  EPSON = 'epson',
  STAR = 'star',
  BROTHER = 'brother',
  TANCA = 'tanca',
  DARUMA = 'daruma',
  CUSTOM = 'custom'
}

export enum InterfaceType {
  NETWORK = 'network',
  USB = 'usb',
  SERIAL = 'serial'
}

export class PrinterConfigDto {
  @IsString()
  id: string;

  @IsString()
  name: string;

  @IsEnum(PrinterType)
  type: PrinterType;

  @IsEnum(InterfaceType)
  connectionType: InterfaceType;

  @IsString()
  address: string; // IP para network, path para USB/Serial

  @IsOptional()
  @IsNumber()
  width?: number;

  @IsOptional()
  @IsString()
  characterSet?: string;

  @IsOptional()
  @IsNumber()
  timeout?: number;
}

export class PrinterConfigRequestDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PrinterConfigDto)
  printers: PrinterConfigDto[];

  @IsOptional()
  @IsObject()
  defaultSettings?: {
    width?: number;
    characterSet?: string;
    timeout?: number;
    margins?: {
      top?: number;
      bottom?: number;
      left?: number;
      right?: number;
    };
    spacing?: {
      lineHeight?: number;
      paragraphSpacing?: number;
    };
  };
}
