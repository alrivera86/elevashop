import { IsNumber, IsNotEmpty, IsOptional, IsString, IsEnum, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MetodoPago } from '@prisma/client';

export class RegistrarPagoDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  @IsNotEmpty({ message: 'El consignatario es requerido' })
  consignatarioId: number;

  @ApiPropertyOptional({ example: 1 })
  @IsNumber()
  @IsOptional()
  consignacionId?: number;

  @ApiProperty({ example: 500.00 })
  @IsNumber()
  @IsNotEmpty({ message: 'El monto es requerido' })
  monto: number;

  @ApiProperty({ enum: MetodoPago, example: 'EFECTIVO_USD' })
  @IsEnum(MetodoPago)
  @IsNotEmpty({ message: 'El método de pago es requerido' })
  metodoPago: MetodoPago;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  referencia?: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  fecha?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notas?: string;
}
