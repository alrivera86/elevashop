import { IsNumber, IsString, IsOptional, IsIn, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SetTasaCambioDto {
  @ApiProperty({ description: 'Nueva tasa de cambio (Bs por USD)' })
  @IsNumber()
  @Min(0.01)
  tasa: number;
}

export class CreateGastoDto {
  @ApiProperty({ description: 'Descripcion del gasto' })
  @IsString()
  descripcion: string;

  @ApiProperty({ description: 'Monto del gasto' })
  @IsNumber()
  @Min(0.01)
  monto: number;

  @ApiProperty({ description: 'Moneda', enum: ['USD', 'VES'] })
  @IsIn(['USD', 'VES'])
  moneda: 'USD' | 'VES';

  @ApiProperty({ description: 'Tipo de gasto' })
  @IsString()
  tipo: string;

  @ApiProperty({ description: 'Fecha del gasto', required: false })
  @IsOptional()
  @IsString()
  fecha?: string;

  @ApiProperty({ description: 'ID de categoria', required: false })
  @IsOptional()
  @IsNumber()
  categoriaId?: number;
}
