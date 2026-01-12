import { IsInt, IsNotEmpty, IsEnum, IsOptional, IsString, IsNumber, Min, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MetodoPago } from '@prisma/client';

export class VenderSerialDto {
  @ApiProperty({ example: 'SN-2024-001234', description: 'Serial de la unidad a vender' })
  @IsString()
  @IsNotEmpty({ message: 'El serial es requerido' })
  serial: string;

  @ApiProperty({ example: 1, description: 'ID del cliente' })
  @IsInt()
  @IsNotEmpty({ message: 'El cliente es requerido' })
  clienteId: number;

  @ApiProperty({ example: 250.00, description: 'Precio de venta' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0, { message: 'El precio debe ser mayor o igual a 0' })
  @IsNotEmpty({ message: 'El precio de venta es requerido' })
  precioVenta: number;

  @ApiProperty({ enum: MetodoPago, example: 'EFECTIVO_USD' })
  @IsEnum(MetodoPago)
  @IsNotEmpty({ message: 'El método de pago es requerido' })
  metodoPago: MetodoPago;

  @ApiPropertyOptional({ example: 1, description: 'ID de la venta asociada' })
  @IsInt()
  @IsOptional()
  ventaId?: number;

  @ApiPropertyOptional({ example: '2024-12-23', description: 'Fecha de venta (ISO)' })
  @IsDateString()
  @IsOptional()
  fechaVenta?: string;

  @ApiPropertyOptional({ example: 'Venta realizada en tienda' })
  @IsString()
  @IsOptional()
  notas?: string;
}

// DTO para vender múltiples seriales a un cliente
export class VenderSerialesMultiplesDto {
  @ApiProperty({
    example: [
      { serial: 'SN-001', precioVenta: 250 },
      { serial: 'SN-002', precioVenta: 300 }
    ],
    description: 'Lista de seriales con sus precios de venta'
  })
  items: { serial: string; precioVenta: number }[];

  @ApiProperty({ example: 1, description: 'ID del cliente' })
  @IsInt()
  @IsNotEmpty({ message: 'El cliente es requerido' })
  clienteId: number;

  @ApiProperty({ enum: MetodoPago, example: 'EFECTIVO_USD' })
  @IsEnum(MetodoPago)
  @IsNotEmpty({ message: 'El método de pago es requerido' })
  metodoPago: MetodoPago;

  @ApiPropertyOptional({ example: 1 })
  @IsInt()
  @IsOptional()
  ventaId?: number;
}
