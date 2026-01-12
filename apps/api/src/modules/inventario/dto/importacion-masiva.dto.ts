import {
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  IsArray,
  ValidateNested,
  IsDateString,
  Min,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum OrigenImportacion {
  COMPRA = 'COMPRA',
  PRODUCCION = 'PRODUCCION',
  IMPORTACION = 'IMPORTACION',
  DEVOLUCION = 'DEVOLUCION',
  AJUSTE = 'AJUSTE',
}

// DTO para una unidad individual en la importación
export class UnidadImportacionDto {
  @ApiProperty({ description: 'Número de serial único de la unidad' })
  @IsString()
  serial: string;

  @ApiPropertyOptional({ description: 'Costo unitario de esta unidad' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  costoUnitario?: number;

  @ApiPropertyOptional({ description: 'Número de lote' })
  @IsString()
  @IsOptional()
  lote?: string;

  @ApiPropertyOptional({ description: 'Notas adicionales' })
  @IsString()
  @IsOptional()
  notas?: string;
}

// DTO para importar múltiples unidades de UN producto
export class ImportacionProductoDto {
  @ApiProperty({ description: 'Código del producto' })
  @IsString()
  codigoProducto: string;

  @ApiPropertyOptional({ description: 'ID del producto (alternativa al código)' })
  @IsNumber()
  @IsOptional()
  productoId?: number;

  @ApiProperty({ description: 'Lista de unidades con sus seriales' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UnidadImportacionDto)
  @ArrayMinSize(1)
  unidades: UnidadImportacionDto[];

  @ApiPropertyOptional({ description: 'Costo unitario por defecto para todas las unidades' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  costoUnitarioDefault?: number;

  @ApiPropertyOptional({ description: 'Lote por defecto' })
  @IsString()
  @IsOptional()
  loteDefault?: string;
}

// DTO principal para importación masiva
export class ImportacionMasivaDto {
  @ApiProperty({ description: 'Tipo de origen de la importación', enum: OrigenImportacion })
  @IsEnum(OrigenImportacion)
  origen: OrigenImportacion;

  @ApiPropertyOptional({ description: 'Fecha de entrada al almacén' })
  @IsDateString()
  @IsOptional()
  fechaEntrada?: string;

  @ApiPropertyOptional({ description: 'Referencia de la importación (número de orden, factura, etc.)' })
  @IsString()
  @IsOptional()
  referencia?: string;

  @ApiPropertyOptional({ description: 'Meses de garantía por defecto' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  garantiaMesesDefault?: number;

  @ApiProperty({ description: 'Productos con sus unidades a importar' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImportacionProductoDto)
  @ArrayMinSize(1)
  productos: ImportacionProductoDto[];

  @ApiPropertyOptional({ description: 'Notas generales de la importación' })
  @IsString()
  @IsOptional()
  notas?: string;
}

// DTO para importación desde Excel (estructura plana)
export class FilaExcelImportacionDto {
  @ApiProperty()
  @IsString()
  codigoProducto: string;

  @ApiProperty()
  @IsString()
  serial: string;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  costoUnitario?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  lote?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notas?: string;
}

export class ImportacionExcelDto {
  @ApiProperty({ description: 'Tipo de origen de la importación', enum: OrigenImportacion })
  @IsEnum(OrigenImportacion)
  origen: OrigenImportacion;

  @ApiPropertyOptional({ description: 'Fecha de entrada al almacén' })
  @IsDateString()
  @IsOptional()
  fechaEntrada?: string;

  @ApiPropertyOptional({ description: 'Referencia de la importación' })
  @IsString()
  @IsOptional()
  referencia?: string;

  @ApiPropertyOptional({ description: 'Meses de garantía por defecto' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  garantiaMesesDefault?: number;

  @ApiProperty({ description: 'Filas del Excel (una fila por unidad)' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FilaExcelImportacionDto)
  @ArrayMinSize(1)
  filas: FilaExcelImportacionDto[];
}

// Respuesta de importación
export class ResultadoImportacionDto {
  totalProcesados: number;
  exitosos: number;
  errores: number;
  detalles: {
    producto: string;
    serial: string;
    estado: 'ok' | 'error';
    mensaje?: string;
  }[];
  productosActualizados: {
    codigo: string;
    nombre: string;
    stockAnterior: number;
    stockNuevo: number;
    unidadesAgregadas: number;
  }[];
}
