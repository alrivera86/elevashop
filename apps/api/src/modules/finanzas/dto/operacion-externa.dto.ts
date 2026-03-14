import { IsString, IsNumber, IsOptional, IsIn, IsDateString, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { MetodoPago, Moneda, TipoOperacionExterna } from '@prisma/client';

export class CreateOperacionExternaDto {
  @ApiProperty({ description: 'Nombre descriptivo de la operacion' })
  @IsString()
  nombre: string;

  @ApiProperty({ description: 'Tipo de operacion', enum: ['INVERSION', 'CAMBIO', 'PRESTAMO', 'OTRO'] })
  @IsIn(['INVERSION', 'CAMBIO', 'PRESTAMO', 'OTRO'])
  tipo: TipoOperacionExterna;

  @ApiProperty({ description: 'Cuenta de origen del dinero' })
  @IsString()
  cuentaOrigen: MetodoPago;

  @ApiProperty({ description: 'Monto que sale' })
  @IsNumber()
  @Min(0.01)
  montoSalida: number;

  @ApiProperty({ description: 'Moneda del monto de salida', enum: ['USD', 'VES'], required: false })
  @IsOptional()
  @IsIn(['USD', 'VES'])
  monedaSalida?: Moneda;

  @ApiProperty({ description: 'Fecha de inicio', required: false })
  @IsOptional()
  @IsDateString()
  fechaInicio?: string;

  @ApiProperty({ description: 'Notas adicionales', required: false })
  @IsOptional()
  @IsString()
  notas?: string;
}

export class CerrarOperacionExternaDto {
  @ApiProperty({ description: 'Cuenta donde entra el dinero' })
  @IsString()
  cuentaDestino: MetodoPago;

  @ApiProperty({ description: 'Monto que entra' })
  @IsNumber()
  @Min(0)
  montoEntrada: number;

  @ApiProperty({ description: 'Moneda del monto de entrada', enum: ['USD', 'VES'], required: false })
  @IsOptional()
  @IsIn(['USD', 'VES'])
  monedaEntrada?: Moneda;

  @ApiProperty({ description: 'Fecha de cierre', required: false })
  @IsOptional()
  @IsDateString()
  fechaCierre?: string;

  @ApiProperty({ description: 'Notas adicionales', required: false })
  @IsOptional()
  @IsString()
  notas?: string;
}

export class CreateAjusteManualDto {
  @ApiProperty({ description: 'Metodo de pago/cuenta afectada' })
  @IsString()
  metodoPago: MetodoPago;

  @ApiProperty({ description: 'Monto del ajuste (positivo o negativo)' })
  @IsNumber()
  monto: number;

  @ApiProperty({ description: 'Moneda', enum: ['USD', 'VES'], required: false })
  @IsOptional()
  @IsIn(['USD', 'VES'])
  moneda?: Moneda;

  @ApiProperty({ description: 'Descripcion del ajuste' })
  @IsString()
  descripcion: string;

  @ApiProperty({ description: 'Fecha del ajuste', required: false })
  @IsOptional()
  @IsDateString()
  fecha?: string;
}
