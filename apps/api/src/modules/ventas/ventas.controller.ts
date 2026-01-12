import { Controller, Get, Post, Body, Param, UseGuards, Query, Request, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { VentasService } from './ventas.service';
import { CreateVentaDto } from './dto/create-venta.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('ventas')
@Controller('ventas')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class VentasController {
  constructor(private readonly ventasService: VentasService) {}

  @Post()
  @ApiOperation({ summary: 'Crear venta' })
  create(@Body() createVentaDto: CreateVentaDto, @Request() req: any) {
    return this.ventasService.create(createVentaDto, req.user.sub);
  }

  @Get()
  @ApiOperation({ summary: 'Listar ventas' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'clienteId', required: false })
  findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('clienteId') clienteId?: number,
  ) {
    return this.ventasService.findAll({ page, limit, clienteId });
  }

  @Get('estadisticas')
  @ApiOperation({ summary: 'Estadísticas de ventas' })
  getEstadisticas() {
    return this.ventasService.getEstadisticasVentas();
  }

  @Get('resumen')
  @ApiOperation({ summary: 'Resumen de ventas' })
  getResumen() {
    return this.ventasService.getEstadisticasVentas();
  }

  @Get('ultimos-7-dias')
  @ApiOperation({ summary: 'Ventas de los últimos 7 días' })
  getUltimos7Dias() {
    return this.ventasService.getVentasUltimos7Dias();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener venta por ID' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.ventasService.findOne(id);
  }
}
