import { IsInt, IsNotEmpty, IsEnum, IsOptional, IsString, IsNumber, Min, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrigenUnidad } from '@prisma/client';

export class RegistrarSerialDto {
  @ApiProperty({ example: 1, description: 'ID del producto' })
  @IsInt()
  @IsNotEmpty({ message: 'El producto es requerido' })
  productoId: number;

  @ApiProperty({ example: 'SN-2024-001234', description: 'Número de serial único' })
  @IsString()
  @IsNotEmpty({ message: 'El serial es requerido' })
  serial: string;

  @ApiProperty({ example: 150.00, description: 'Costo de adquisición de la unidad' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0, { message: 'El costo debe ser mayor o igual a 0' })
  @IsNotEmpty({ message: 'El costo unitario es requerido' })
  costoUnitario: number;

  @ApiPropertyOptional({ enum: OrigenUnidad, example: 'COMPRA' })
  @IsEnum(OrigenUnidad)
  @IsOptional()
  origenTipo?: OrigenUnidad;

  @ApiPropertyOptional({ example: 'LOTE-2024-001', description: 'Número de lote o importación' })
  @IsString()
  @IsOptional()
  lote?: string;

  @ApiPropertyOptional({ example: 6, description: 'Meses de garantía' })
  @IsInt()
  @Min(0)
  @IsOptional()
  garantiaMeses?: number;

  @ApiPropertyOptional({ example: '2024-01-15', description: 'Fecha de entrada (ISO)' })
  @IsDateString()
  @IsOptional()
  fechaEntrada?: string;

  @ApiPropertyOptional({ example: 'Unidad importada de China' })
  @IsString()
  @IsOptional()
  notas?: string;
}

// DTO para registrar múltiples seriales de una vez
export class RegistrarSerialesMultiplesDto {
  @ApiProperty({ example: 1, description: 'ID del producto' })
  @IsInt()
  @IsNotEmpty({ message: 'El producto es requerido' })
  productoId: number;

  @ApiProperty({
    example: ['SN-001', 'SN-002', 'SN-003'],
    description: 'Lista de seriales a registrar'
  })
  @IsString({ each: true })
  @IsNotEmpty({ message: 'Los seriales son requeridos' })
  seriales: string[];

  @ApiProperty({ example: 150.00, description: 'Costo unitario para todas las unidades' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsNotEmpty({ message: 'El costo unitario es requerido' })
  costoUnitario: number;

  @ApiPropertyOptional({ enum: OrigenUnidad, example: 'IMPORTACION' })
  @IsEnum(OrigenUnidad)
  @IsOptional()
  origenTipo?: OrigenUnidad;

  @ApiPropertyOptional({ example: 'LOTE-2024-001' })
  @IsString()
  @IsOptional()
  lote?: string;

  @ApiPropertyOptional({ example: 6 })
  @IsInt()
  @Min(0)
  @IsOptional()
  garantiaMeses?: number;
}
