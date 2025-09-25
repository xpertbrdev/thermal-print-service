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

export enum CharacterSetType {
  PC852_LATIN2 = 'PC852_LATIN2',
  PC437_USA = 'PC437_USA',
  PC850_MULTILINGUAL = 'PC850_MULTILINGUAL',
  PC860_PORTUGUESE = 'PC860_PORTUGUESE',
  PC863_CANADIAN_FRENCH = 'PC863_CANADIAN_FRENCH',
  PC865_NORDIC = 'PC865_NORDIC',
  PC858_EURO = 'PC858_EURO',
  WPC1252 = 'WPC1252',
  CHINA = 'CHINA',
  JAPAN = 'JAPAN',
  KOREA = 'KOREA'
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
  @IsEnum(CharacterSetType)
  characterSet?: CharacterSetType;

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
    characterSet?: CharacterSetType;
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
