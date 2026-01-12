import { IsEnum, IsOptional, IsString, IsNumber, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { EstadoUnidad, OrigenUnidad } from '@prisma/client';

export class ActualizarSerialDto {
  @ApiPropertyOptional({ enum: EstadoUnidad, example: 'DEFECTUOSO' })
  @IsEnum(EstadoUnidad)
  @IsOptional()
  estado?: EstadoUnidad;

  @ApiPropertyOptional({ example: 160.00, description: 'Actualizar costo unitario' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  costoUnitario?: number;

  @ApiPropertyOptional({ enum: OrigenUnidad })
  @IsEnum(OrigenUnidad)
  @IsOptional()
  origenTipo?: OrigenUnidad;

  @ApiPropertyOptional({ example: 'LOTE-2024-002' })
  @IsString()
  @IsOptional()
  lote?: string;

  @ApiPropertyOptional({ example: 12 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  garantiaMeses?: number;

  @ApiPropertyOptional({ example: 'Unidad presenta defecto de fábrica' })
  @IsString()
  @IsOptional()
  notas?: string;
}
