import { Controller, Get, Post, Body, Query, UseGuards, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { FinanzasService } from './finanzas.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SetTasaCambioDto, CreateGastoDto } from './dto/finanzas.dto';

@ApiTags('finanzas')
@Controller('finanzas')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FinanzasController {
  constructor(private readonly finanzasService: FinanzasService) {}

  @Get('gastos-mensuales')
  @ApiOperation({ summary: 'Gastos mensuales por año' })
  @ApiQuery({ name: 'anio', type: Number })
  getGastosMensuales(@Query('anio', ParseIntPipe) anio: number) {
    return this.finanzasService.getGastosMensuales(anio);
  }

  @Get('gastos-categoria')
  @ApiOperation({ summary: 'Gastos por categoría' })
  getGastosPorCategoria(
    @Query('anio', ParseIntPipe) anio: number,
    @Query('mes') mes?: number,
  ) {
    return this.finanzasService.getGastosPorCategoria(anio, mes);
  }

  @Get('tasa-cambio')
  @ApiOperation({ summary: 'Tasa de cambio actual' })
  getTasaCambio() {
    return this.finanzasService.getTasaCambioActual();
  }

  @Post('tasa-cambio')
  @ApiOperation({ summary: 'Actualizar tasa de cambio' })
  setTasaCambio(@Body() dto: SetTasaCambioDto) {
    return this.finanzasService.setTasaCambio(dto.tasa);
  }

  @Get('gastos')
  @ApiOperation({ summary: 'Listar gastos con paginacion' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'tipo', required: false })
  getGastos(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('tipo') tipo?: string,
  ) {
    return this.finanzasService.getGastos({
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 10,
      tipo,
    });
  }

  @Post('gastos')
  @ApiOperation({ summary: 'Registrar nuevo gasto' })
  createGasto(@Body() dto: CreateGastoDto) {
    return this.finanzasService.createGasto(dto);
  }

  @Get('operaciones-cambio')
  @ApiOperation({ summary: 'Operaciones de cambio BS/USDT' })
  getOperacionesCambio() {
    return this.finanzasService.getOperacionesCambio();
  }

  @Get('resumen')
  @ApiOperation({ summary: 'Resumen financiero mensual' })
  @ApiQuery({ name: 'anio', required: false })
  @ApiQuery({ name: 'mes', required: false })
  async getResumen(
    @Query('anio') anio?: string,
    @Query('mes') mes?: string,
  ) {
    const now = new Date();
    const year = anio ? parseInt(anio) : now.getFullYear();
    const month = mes ? parseInt(mes) : now.getMonth() + 1;

    const [resumenMes, balanceTotal, tasaCambio] = await Promise.all([
      this.finanzasService.getResumenFinanciero(year, month),
      this.finanzasService.getBalanceTotal(),
      this.finanzasService.getTasaCambioActual(),
    ]);

    return {
      ingresos: resumenMes.totalVentas,
      gastos: resumenMes.totalGastos,
      balance: balanceTotal.balance,
      valorInventario: balanceTotal.valorInventario,
      utilidadAcumulada: balanceTotal.utilidadAcumulada,
      tasaCambioActual: tasaCambio?.tasa || 0,
    };
  }

  @Get('distribucion-fondos')
  @ApiOperation({ summary: 'Distribución de fondos por método de pago' })
  getDistribucionFondos() {
    return this.finanzasService.getDistribucionFondos();
  }
}
