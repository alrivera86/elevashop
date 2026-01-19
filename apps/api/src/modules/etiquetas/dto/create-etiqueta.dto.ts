import { IsString, IsOptional, IsBoolean, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateEtiquetaDto {
  @ApiProperty({ example: 'CLIENTE_PREMIUM', description: 'Código único de la etiqueta (mayúsculas y guiones)' })
  @IsString()
  @Matches(/^[A-Z][A-Z0-9_]*$/, { message: 'El código debe ser en mayúsculas, puede contener números y guiones bajos' })
  codigo: string;

  @ApiProperty({ example: 'Cliente Premium', description: 'Nombre visible de la etiqueta' })
  @IsString()
  nombre: string;

  @ApiPropertyOptional({ example: 'Clientes con beneficios especiales', description: 'Descripción de la etiqueta' })
  @IsString()
  @IsOptional()
  descripcion?: string;

  @ApiPropertyOptional({ example: '#FF5733', description: 'Color en formato hexadecimal' })
  @IsString()
  @IsOptional()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'El color debe estar en formato hexadecimal (#RRGGBB)' })
  color?: string;
}

export class UpdateEtiquetaDto {
  @ApiPropertyOptional({ example: 'Cliente Premium Plus' })
  @IsString()
  @IsOptional()
  nombre?: string;

  @ApiPropertyOptional({ example: 'Clientes con máximos beneficios' })
  @IsString()
  @IsOptional()
  descripcion?: string;

  @ApiPropertyOptional({ example: '#00FF00' })
  @IsString()
  @IsOptional()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'El color debe estar en formato hexadecimal (#RRGGBB)' })
  color?: string;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  activo?: boolean;
}

export class AsignarEtiquetaDto {
  @ApiProperty({ example: 1, description: 'ID del cliente' })
  clienteId: number;

  @ApiProperty({ example: 1, description: 'ID de la etiqueta' })
  etiquetaId: number;

  @ApiPropertyOptional({ example: 'admin@elevashop.com', description: 'Usuario que asigna la etiqueta' })
  @IsString()
  @IsOptional()
  asignadoPor?: string;
}

export class AsignarEtiquetasMasivoDto {
  @ApiProperty({ example: [1, 2, 3], description: 'IDs de los clientes' })
  clienteIds: number[];

  @ApiProperty({ example: 1, description: 'ID de la etiqueta a asignar' })
  etiquetaId: number;

  @ApiPropertyOptional({ example: 'admin@elevashop.com' })
  @IsString()
  @IsOptional()
  asignadoPor?: string;
}
