import { IsNumber, IsNotEmpty, IsOptional, IsArray, ValidateNested, IsDateString, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DetalleConsignacionDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  @IsNotEmpty()
  productoId: number;

  @ApiProperty({ example: 1 })
  @IsNumber()
  @IsNotEmpty()
  unidadInventarioId: number;

  @ApiProperty({ example: 150.00 })
  @IsNumber()
  @IsNotEmpty()
  precioConsignacion: number;
}

export class CreateConsignacionDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  @IsNotEmpty({ message: 'El consignatario es requerido' })
  consignatarioId: number;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  fechaEntrega?: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  fechaLimite?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notas?: string;

  @ApiProperty({ type: [DetalleConsignacionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DetalleConsignacionDto)
  @IsNotEmpty({ message: 'Debe incluir al menos un producto' })
  detalles: DetalleConsignacionDto[];
}
