import { IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, IsArray, ValidateNested, IsEnum, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MetodoPago, Moneda } from '@prisma/client';

class VentaDetalleDto {
  @ApiProperty()
  @IsInt()
  productoId: number;

  @ApiProperty()
  @IsInt()
  @Min(1)
  cantidad: number;

  @ApiProperty()
  @IsNumber()
  precioUnitario: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  descuento?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  serial?: string;
}

class VentaPagoDto {
  @ApiProperty({ enum: MetodoPago })
  @IsEnum(MetodoPago)
  metodoPago: MetodoPago;

  @ApiProperty()
  @IsNumber()
  monto: number;

  @ApiPropertyOptional({ enum: Moneda })
  @IsEnum(Moneda)
  @IsOptional()
  moneda?: Moneda;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  tasaCambio?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  montoBs?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  referencia?: string;
}

export class CreateVentaDto {
  @ApiProperty()
  @IsInt()
  @IsNotEmpty()
  clienteId: number;

  @ApiPropertyOptional({ example: 'ORD-001' })
  @IsString()
  @IsOptional()
  numeroOrden?: string;

  @ApiProperty()
  @IsNumber()
  subtotal: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  descuento?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  impuesto?: number;

  @ApiProperty()
  @IsNumber()
  total: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notas?: string;

  @ApiProperty({ type: [VentaDetalleDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VentaDetalleDto)
  detalles: VentaDetalleDto[];

  @ApiPropertyOptional({ type: [VentaPagoDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VentaPagoDto)
  @IsOptional()
  pagos?: VentaPagoDto[];
}
