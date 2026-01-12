import { Controller, Get, Param, UseGuards, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ImportacionesService } from './importaciones.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('importaciones')
@Controller('importaciones')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ImportacionesController {
  constructor(private readonly importacionesService: ImportacionesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar importaciones' })
  findAll() {
    return this.importacionesService.findAll();
  }

  @Get('estadisticas')
  @ApiOperation({ summary: 'Estadísticas de importaciones' })
  getEstadisticas() {
    return this.importacionesService.getEstadisticas();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener importación por ID' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.importacionesService.findOne(id);
  }
}
