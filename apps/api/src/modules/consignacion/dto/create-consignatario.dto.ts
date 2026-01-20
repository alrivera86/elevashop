import { IsString, IsNotEmpty, IsOptional, IsEmail, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateConsignatarioDto {
  @ApiProperty({ example: 'Juan Pérez' })
  @IsString()
  @IsNotEmpty({ message: 'El nombre es requerido' })
  nombre: string;

  @ApiPropertyOptional({ example: '0412-1234567' })
  @IsString()
  @IsOptional()
  telefono?: string;

  @ApiPropertyOptional({ example: 'consignatario@email.com' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  direccion?: string;

  @ApiPropertyOptional({ example: 'V-12345678' })
  @IsString()
  @IsOptional()
  rifCedula?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notas?: string;

  @ApiPropertyOptional({ example: 1, description: 'ID del cliente asociado' })
  @IsNumber()
  @IsOptional()
  clienteId?: number;
}

export class CreateConsignatarioDesdeClienteDto {
  @ApiProperty({ example: 1, description: 'ID del cliente' })
  @IsNumber()
  @IsNotEmpty({ message: 'El clienteId es requerido' })
  clienteId: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notas?: string;
}

export class UpdateConsignatarioDto {
  @ApiPropertyOptional({ example: 'Juan Pérez' })
  @IsString()
  @IsOptional()
  nombre?: string;

  @ApiPropertyOptional({ example: '0412-1234567' })
  @IsString()
  @IsOptional()
  telefono?: string;

  @ApiPropertyOptional({ example: 'consignatario@email.com' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  direccion?: string;

  @ApiPropertyOptional({ example: 'V-12345678' })
  @IsString()
  @IsOptional()
  rifCedula?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notas?: string;
}
