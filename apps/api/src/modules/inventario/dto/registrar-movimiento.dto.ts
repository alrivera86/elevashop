import { IsInt, IsNotEmpty, IsEnum, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TipoMovimiento } from '@prisma/client';

export class RegistrarMovimientoDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @IsNotEmpty({ message: 'El producto es requerido' })
  productoId: number;

  @ApiProperty({ enum: TipoMovimiento, example: 'ENTRADA' })
  @IsEnum(TipoMovimiento)
  @IsNotEmpty({ message: 'El tipo de movimiento es requerido' })
  tipo: TipoMovimiento;

  @ApiProperty({ example: 10 })
  @IsInt()
  @Min(1, { message: 'La cantidad debe ser mayor a 0' })
  @IsNotEmpty({ message: 'La cantidad es requerida' })
  cantidad: number;

  @ApiPropertyOptional({ example: 'ORD-001' })
  @IsString()
  @IsOptional()
  referencia?: string;

  @ApiPropertyOptional({ example: 'Entrada por compra a proveedor' })
  @IsString()
  @IsOptional()
  motivo?: string;
}
