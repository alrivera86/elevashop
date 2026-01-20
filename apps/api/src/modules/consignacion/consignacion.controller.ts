import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ConsignacionService } from './consignacion.service';
import {
  CreateConsignatarioDto,
  UpdateConsignatarioDto,
  CreateConsignacionDto,
  RegistrarPagoDto,
  ReportarVentaDto,
  ReportarDevolucionDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { EstadoConsignacion } from '@prisma/client';

@ApiTags('consignacion')
@Controller('consignacion')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ConsignacionController {
  constructor(private readonly consignacionService: ConsignacionService) {}

  // ==================== DASHBOARD ====================

  @Get('dashboard')
  @ApiOperation({ summary: 'Resumen general de consignaciones' })
  getDashboard() {
    return this.consignacionService.getDashboard();
  }

  @Get('por-cobrar')
  @ApiOperation({ summary: 'Listado detallado de deudas pendientes' })
  getPorCobrar() {
    return this.consignacionService.getResumenPorCobrar();
  }

  // ==================== CONSIGNATARIOS ====================

  @Post('consignatarios')
  @ApiOperation({ summary: 'Crear consignatario' })
  createConsignatario(@Body() dto: CreateConsignatarioDto) {
    return this.consignacionService.createConsignatario(dto);
  }

  @Get('consignatarios')
  @ApiOperation({ summary: 'Listar consignatarios' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'activo', required: false })
  findAllConsignatarios(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('activo') activo?: string,
  ) {
    return this.consignacionService.findAllConsignatarios({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      search,
      activo: activo !== undefined ? activo === 'true' : undefined,
    });
  }

  @Get('consignatarios/:id')
  @ApiOperation({ summary: 'Obtener consignatario por ID' })
  findOneConsignatario(@Param('id', ParseIntPipe) id: number) {
    return this.consignacionService.findOneConsignatario(id);
  }

  @Patch('consignatarios/:id')
  @ApiOperation({ summary: 'Actualizar consignatario' })
  updateConsignatario(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateConsignatarioDto,
  ) {
    return this.consignacionService.updateConsignatario(id, dto);
  }

  @Delete('consignatarios/:id')
  @ApiOperation({ summary: 'Desactivar consignatario' })
  deactivateConsignatario(@Param('id', ParseIntPipe) id: number) {
    return this.consignacionService.deactivateConsignatario(id);
  }

  // ==================== CONSIGNACIONES ====================

  @Post()
  @ApiOperation({ summary: 'Crear nueva consignación' })
  createConsignacion(@Body() dto: CreateConsignacionDto) {
    return this.consignacionService.createConsignacion(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar consignaciones' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'consignatarioId', required: false })
  @ApiQuery({ name: 'estado', required: false, enum: EstadoConsignacion })
  findAllConsignaciones(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('consignatarioId') consignatarioId?: number,
    @Query('estado') estado?: EstadoConsignacion,
  ) {
    return this.consignacionService.findAllConsignaciones({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      consignatarioId: consignatarioId ? Number(consignatarioId) : undefined,
      estado,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener consignación por ID' })
  findOneConsignacion(@Param('id', ParseIntPipe) id: number) {
    return this.consignacionService.findOneConsignacion(id);
  }

  @Post(':id/reportar-venta')
  @ApiOperation({ summary: 'Reportar unidades vendidas' })
  reportarVenta(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReportarVentaDto,
  ) {
    return this.consignacionService.reportarVenta(id, dto);
  }

  @Post(':id/devolucion')
  @ApiOperation({ summary: 'Registrar devolución de unidades' })
  reportarDevolucion(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReportarDevolucionDto,
  ) {
    return this.consignacionService.reportarDevolucion(id, dto);
  }

  // ==================== PAGOS ====================

  @Post('pago')
  @ApiOperation({ summary: 'Registrar pago/abono' })
  registrarPago(@Body() dto: RegistrarPagoDto) {
    return this.consignacionService.registrarPago(dto);
  }
}
