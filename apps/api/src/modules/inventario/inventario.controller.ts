import { Controller, Get, Post, Body, Patch, Param, UseGuards, Query, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiParam } from '@nestjs/swagger';
import { InventarioService } from './inventario.service';
import { RegistrarMovimientoDto } from './dto/registrar-movimiento.dto';
import { RegistrarSerialDto, RegistrarSerialesMultiplesDto } from './dto/registrar-serial.dto';
import { VenderSerialDto } from './dto/vender-serial.dto';
import { ActualizarSerialDto } from './dto/actualizar-serial.dto';
import { ImportacionMasivaDto, ImportacionExcelDto } from './dto/importacion-masiva.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TipoMovimiento, EstadoUnidad } from '@prisma/client';

@ApiTags('inventario')
@Controller('inventario')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class InventarioController {
  constructor(private readonly inventarioService: InventarioService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Dashboard de inventario' })
  getDashboard() {
    return this.inventarioService.getDashboard();
  }

  @Post('movimiento')
  @ApiOperation({ summary: 'Registrar movimiento de stock' })
  registrarMovimiento(@Body() dto: RegistrarMovimientoDto) {
    return this.inventarioService.registrarMovimiento(dto);
  }

  @Get('movimientos')
  @ApiOperation({ summary: 'Listar movimientos de stock' })
  @ApiQuery({ name: 'productoId', required: false, type: Number })
  @ApiQuery({ name: 'tipo', required: false, enum: TipoMovimiento })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getMovimientos(
    @Query('productoId') productoId?: number,
    @Query('tipo') tipo?: TipoMovimiento,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.inventarioService.getMovimientos({ productoId, tipo, page, limit });
  }

  @Get('alertas')
  @ApiOperation({ summary: 'Alertas de stock pendientes' })
  getAlertas() {
    return this.inventarioService.getAlertas();
  }

  @Patch('alertas/:id/resolver')
  @ApiOperation({ summary: 'Resolver alerta de stock' })
  resolverAlerta(@Param('id', ParseIntPipe) id: number) {
    return this.inventarioService.resolverAlerta(id);
  }

  // ============ ENDPOINTS DE SERIALES ============

  @Post('seriales')
  @ApiOperation({ summary: 'Registrar una unidad con serial' })
  registrarSerial(@Body() dto: RegistrarSerialDto) {
    return this.inventarioService.registrarSerial(dto);
  }

  @Post('seriales/multiple')
  @ApiOperation({ summary: 'Registrar múltiples seriales de un producto' })
  registrarSerialesMultiples(@Body() dto: RegistrarSerialesMultiplesDto) {
    return this.inventarioService.registrarSerialesMultiples(dto);
  }

  @Post('seriales/vender')
  @ApiOperation({ summary: 'Registrar venta de una unidad por serial' })
  venderSerial(@Body() dto: VenderSerialDto) {
    return this.inventarioService.venderSerial(dto);
  }

  @Get('seriales/buscar/:serial')
  @ApiOperation({ summary: 'Buscar unidad por serial (validar garantía)' })
  @ApiParam({ name: 'serial', description: 'Número de serial a buscar' })
  buscarPorSerial(@Param('serial') serial: string) {
    return this.inventarioService.buscarPorSerial(serial);
  }

  @Patch('seriales/:serial')
  @ApiOperation({ summary: 'Actualizar información de un serial' })
  @ApiParam({ name: 'serial', description: 'Número de serial' })
  actualizarSerial(
    @Param('serial') serial: string,
    @Body() dto: ActualizarSerialDto,
  ) {
    return this.inventarioService.actualizarSerial(serial, dto);
  }

  @Get('seriales/producto/:productoId')
  @ApiOperation({ summary: 'Listar seriales de un producto' })
  @ApiParam({ name: 'productoId', description: 'ID del producto' })
  @ApiQuery({ name: 'estado', required: false, enum: EstadoUnidad })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  listarSerialesPorProducto(
    @Param('productoId', ParseIntPipe) productoId: number,
    @Query('estado') estado?: EstadoUnidad,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.inventarioService.listarSerialesPorProducto(productoId, { estado, page, limit });
  }

  @Get('seriales/estadisticas')
  @ApiOperation({ summary: 'Estadísticas de seriales' })
  @ApiQuery({ name: 'productoId', required: false, type: Number })
  getEstadisticasSeriales(@Query('productoId') productoId?: number) {
    return this.inventarioService.getEstadisticasSeriales(productoId);
  }

  // ============ ENDPOINTS DE IMPORTACIÓN MASIVA ============

  @Post('importacion/masiva')
  @ApiOperation({ summary: 'Importación masiva de productos con seriales (formato estructurado)' })
  importacionMasiva(@Body() dto: ImportacionMasivaDto) {
    return this.inventarioService.importacionMasiva(dto);
  }

  @Post('importacion/excel')
  @ApiOperation({ summary: 'Importación masiva desde formato Excel (filas planas)' })
  importacionExcel(@Body() dto: ImportacionExcelDto) {
    return this.inventarioService.importacionDesdeExcel(dto);
  }

  @Get('con-seriales')
  @ApiOperation({ summary: 'Inventario con detalle de seriales por producto' })
  @ApiQuery({ name: 'productoId', required: false, type: Number })
  @ApiQuery({ name: 'codigo', required: false, type: String })
  @ApiQuery({ name: 'conSeriales', required: false, type: Boolean })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getInventarioConSeriales(
    @Query('productoId') productoId?: number,
    @Query('codigo') codigo?: string,
    @Query('conSeriales') conSeriales?: boolean,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.inventarioService.getInventarioConSeriales({
      productoId,
      codigo,
      conSeriales: conSeriales !== false,
      page,
      limit,
    });
  }

  @Get('importaciones/resumen')
  @ApiOperation({ summary: 'Resumen de importaciones recientes' })
  @ApiQuery({ name: 'dias', required: false, type: Number, description: 'Días hacia atrás (default: 30)' })
  getResumenImportaciones(@Query('dias') dias?: number) {
    return this.inventarioService.getResumenImportaciones(dias || 30);
  }
}
