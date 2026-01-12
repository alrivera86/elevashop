import { IsString, IsNotEmpty, IsNumber, IsOptional, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProductoDto {
  @ApiProperty({ example: 'IMP2S37RA' })
  @IsString()
  @IsNotEmpty({ message: 'El código es requerido' })
  codigo: string;

  @ApiProperty({ example: 'Display 2D 37mm' })
  @IsString()
  @IsNotEmpty({ message: 'El nombre es requerido' })
  nombre: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  descripcion?: string;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  categoriaId?: number;

  @ApiProperty({ example: 85.18 })
  @IsNumber()
  @Min(0)
  precioMercadoLibre: number;

  @ApiProperty({ example: 75.00 })
  @IsNumber()
  @Min(0)
  precioMercado: number;

  @ApiProperty({ example: 70.70 })
  @IsNumber()
  @Min(0)
  precioElevapartes: number;

  @ApiPropertyOptional({ example: 42.42 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  precioCosto?: number;

  @ApiPropertyOptional({ example: 16 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  stockActual?: number;

  @ApiPropertyOptional({ example: 10 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  stockMinimo?: number;

  @ApiPropertyOptional({ example: 20 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  stockAdvertencia?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  ubicacion?: string;
}
