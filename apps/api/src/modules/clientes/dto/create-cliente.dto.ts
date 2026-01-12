import { IsString, IsNotEmpty, IsOptional, IsEmail } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateClienteDto {
  @ApiProperty({ example: 'ELEVARAGUA' })
  @IsString()
  @IsNotEmpty({ message: 'El nombre es requerido' })
  nombre: string;

  @ApiPropertyOptional({ example: 'J-12345678-9' })
  @IsString()
  @IsOptional()
  rifCedula?: string;

  @ApiPropertyOptional({ example: 'cliente@email.com' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ example: '0412-1234567' })
  @IsString()
  @IsOptional()
  telefono?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  direccion?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  ciudad?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  estado?: string;
}
