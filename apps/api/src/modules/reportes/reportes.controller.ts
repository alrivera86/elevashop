import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ReportesService } from './reportes.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('reportes')
@Controller('reportes')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ReportesController {
  constructor(private readonly reportesService: ReportesService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Dashboard general' })
  getDashboard() {
    return this.reportesService.getDashboardGeneral();
  }

  @Get('bi')
  @ApiOperation({ summary: 'Dashboard de inteligencia de negocio' })
  @ApiQuery({ name: 'fechaDesde', required: false, description: 'Fecha inicio (YYYY-MM-DD)' })
  @ApiQuery({ name: 'fechaHasta', required: false, description: 'Fecha fin (YYYY-MM-DD)' })
  getDashboardBI(
    @Query('fechaDesde') fechaDesde?: string,
    @Query('fechaHasta') fechaHasta?: string,
  ) {
    const desde = fechaDesde ? new Date(fechaDesde) : undefined;
    const hasta = fechaHasta ? new Date(fechaHasta + 'T23:59:59') : undefined;
    return this.reportesService.getDashboardBI(desde, hasta);
  }

  @Get('top-clientes')
  @ApiOperation({ summary: 'Top clientes por ventas' })
  @ApiQuery({ name: 'limit', required: false })
  getTopClientes(@Query('limit') limit?: string) {
    return this.reportesService.getTopClientes(limit ? parseInt(limit) : 10);
  }

  @Get('top-productos')
  @ApiOperation({ summary: 'Top productos mas vendidos' })
  @ApiQuery({ name: 'limit', required: false })
  getTopProductos(@Query('limit') limit?: string) {
    return this.reportesService.getTopProductos(limit ? parseInt(limit) : 10);
  }

  @Get('metodos-pago')
  @ApiOperation({ summary: 'Ventas por metodo de pago' })
  @ApiQuery({ name: 'dias', required: false })
  getMetodosPago(@Query('dias') dias?: string) {
    return this.reportesService.getVentasPorMetodoPago(dias ? parseInt(dias) : 30);
  }

  @Get('utilidades')
  @ApiOperation({ summary: 'Resumen de utilidades' })
  getUtilidades() {
    return this.reportesService.getResumenUtilidades();
  }

  @Get('productos-reposicion')
  @ApiOperation({ summary: 'Productos que necesitan reposicion' })
  getProductosReposicion() {
    return this.reportesService.getProductosReposicion();
  }

  @Get('inventario')
  @ApiOperation({ summary: 'Reporte de inventario' })
  getReporteInventario() {
    return this.reportesService.getReporteInventario();
  }
}
