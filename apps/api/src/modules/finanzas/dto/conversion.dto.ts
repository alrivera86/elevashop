import { IsString, IsNumber, IsOptional, IsIn, IsDateString, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { MetodoPago, Moneda, CuentaBinance } from '@prisma/client';

export class CreateConversionDto {
  @ApiProperty({ description: 'Cuenta de origen' })
  @IsString()
  cuentaOrigen: MetodoPago;

  @ApiProperty({ description: 'Monto de origen' })
  @IsNumber()
  @Min(0.01)
  montoOrigen: number;

  @ApiProperty({ description: 'Moneda de origen', enum: ['USD', 'VES'] })
  @IsIn(['USD', 'VES'])
  monedaOrigen: Moneda;

  @ApiProperty({ description: 'Cuenta de destino' })
  @IsString()
  cuentaDestino: MetodoPago;

  @ApiProperty({ description: 'Monto de destino' })
  @IsNumber()
  @Min(0.01)
  montoDestino: number;

  @ApiProperty({ description: 'Moneda de destino', enum: ['USD', 'VES'] })
  @IsIn(['USD', 'VES'])
  monedaDestino: Moneda;

  @ApiProperty({ description: 'Tasa de cambio aplicada' })
  @IsNumber()
  @Min(0.0001)
  tasaCambio: number;

  @ApiProperty({ description: 'Fecha de la conversion', required: false })
  @IsOptional()
  @IsDateString()
  fecha?: string;

  @ApiProperty({ description: 'Cuenta Binance específica donde está el USDT', required: false, enum: ['SR_JOSE', 'WILMEN', 'ALBERTO', 'ELEVASHOP'] })
  @IsOptional()
  @IsIn(['SR_JOSE', 'WILMEN', 'ALBERTO', 'ELEVASHOP'])
  cuentaBinanceDestino?: CuentaBinance;

  @ApiProperty({ description: 'Estado actual del dinero', required: false, enum: ['EN_CUENTA', 'TRANSFERIDO', 'GASTADO'] })
  @IsOptional()
  @IsIn(['EN_CUENTA', 'TRANSFERIDO', 'GASTADO'])
  estadoActual?: string;

  @ApiProperty({ description: 'Notas adicionales', required: false })
  @IsOptional()
  @IsString()
  notas?: string;
}

export class UpdateConversionDto {
  @ApiProperty({ description: 'Cuenta Binance específica donde está el USDT', required: false, enum: ['SR_JOSE', 'WILMEN', 'ALBERTO', 'ELEVASHOP'] })
  @IsOptional()
  @IsIn(['SR_JOSE', 'WILMEN', 'ALBERTO', 'ELEVASHOP'])
  cuentaBinanceDestino?: CuentaBinance;

  @ApiProperty({ description: 'Estado actual del dinero', required: false, enum: ['EN_CUENTA', 'TRANSFERIDO', 'GASTADO'] })
  @IsOptional()
  @IsIn(['EN_CUENTA', 'TRANSFERIDO', 'GASTADO'])
  estadoActual?: string;

  @ApiProperty({ description: 'Notas adicionales', required: false })
  @IsOptional()
  @IsString()
  notas?: string;

  @ApiProperty({ description: 'Fecha de la conversion', required: false })
  @IsOptional()
  @IsDateString()
  fecha?: string;
}
