import { IsNumber, IsArray, IsDateString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ReportarVentaDto {
  @ApiProperty({ type: [Number], example: [1, 2, 3] })
  @IsArray()
  @IsNumber({}, { each: true })
  detalleIds: number[];

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  fechaVenta?: string;
}

export class ReportarDevolucionDto {
  @ApiProperty({ type: [Number], example: [1, 2, 3] })
  @IsArray()
  @IsNumber({}, { each: true })
  detalleIds: number[];

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  fechaDevolucion?: string;
}
