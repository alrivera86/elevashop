import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';
import { CreateGastoDto } from './dto/finanzas.dto';

@Injectable()
export class FinanzasService {
  constructor(private prisma: PrismaService) {}

  async setTasaCambio(tasa: number) {
    // Crear o actualizar tasa de cambio USD/VES
    const tasaExistente = await this.prisma.tasaCambio.findFirst({
      where: { monedaOrigen: 'USD', monedaDestino: 'VES' },
      orderBy: { fecha: 'desc' },
    });

    if (tasaExistente) {
      return this.prisma.tasaCambio.update({
        where: { id: tasaExistente.id },
        data: { tasa, fecha: new Date() },
      });
    }

    return this.prisma.tasaCambio.create({
      data: {
        monedaOrigen: 'USD',
        monedaDestino: 'VES',
        tasa,
        fecha: new Date(),
      },
    });
  }

  async getGastos(options: { page?: number; limit?: number; tipo?: string }) {
    const { page = 1, limit = 10, tipo } = options;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (tipo) where.tipo = tipo;

    const [gastos, total] = await Promise.all([
      this.prisma.gasto.findMany({
        where,
        skip,
        take: limit,
        orderBy: { fecha: 'desc' },
        include: { categoria: true },
      }),
      this.prisma.gasto.count({ where }),
    ]);

    return {
      data: gastos.map(g => ({
        id: g.id,
        descripcion: g.descripcion,
        monto: Number(g.monto),
        moneda: g.moneda,
        tipo: g.categoria?.tipo || 'VARIABLE',
        fecha: g.fecha,
        categoria: g.categoria,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async createGasto(dto: CreateGastoDto) {
    const fecha = dto.fecha ? new Date(dto.fecha) : new Date();
    const anio = fecha.getFullYear();
    const mes = fecha.getMonth() + 1;

    // Si no hay categoriaId, crear o buscar una categoria por defecto
    let categoriaId = dto.categoriaId;
    if (!categoriaId) {
      // Buscar o crear categoria "General"
      const categoriaDefault = await this.prisma.categoriaGasto.upsert({
        where: { nombre: 'General' },
        update: {},
        create: { nombre: 'General', tipo: 'OPERATIVO' },
      });
      categoriaId = categoriaDefault.id;
    }

    return this.prisma.gasto.create({
      data: {
        descripcion: dto.descripcion,
        monto: dto.monto,
        moneda: dto.moneda,
        fecha,
        anio,
        mes,
        categoriaId,
      },
      include: { categoria: true },
    });
  }

  async getGastosMensuales(anio: number) {
    return this.prisma.gasto.groupBy({
      by: ['mes'],
      where: { anio },
      _sum: { monto: true },
      orderBy: { mes: 'asc' },
    });
  }

  async getGastosPorCategoria(anio: number, mes?: number) {
    const where: any = { anio };
    if (mes) where.mes = mes;

    return this.prisma.gasto.groupBy({
      by: ['categoriaId'],
      where,
      _sum: { monto: true },
    });
  }

  async getTasaCambioActual() {
    return this.prisma.tasaCambio.findFirst({
      where: { monedaOrigen: 'USD', monedaDestino: 'VES' },
      orderBy: { fecha: 'desc' },
    });
  }

  async getOperacionesCambio() {
    return this.prisma.operacionCambio.findMany({
      orderBy: { fecha: 'desc' },
    });
  }

  async getResumenFinanciero(anio: number, mes: number) {
    // Primero intentar con transacciones del mes solicitado
    let ventasMes = await this.prisma.transaccion.aggregate({
      where: { anio, mes },
      _sum: { total: true, utilidad: true },
      _count: true,
    });

    let gastosMes = await this.prisma.gasto.aggregate({
      where: { anio, mes },
      _sum: { monto: true },
    });

    // Si no hay datos del mes actual, buscar en la tabla ventas (datos históricos)
    let totalVentas = Number(ventasMes._sum.total) || 0;
    if (totalVentas === 0) {
      // Buscar en la tabla ventas con filtro de fecha
      const inicioMes = new Date(anio, mes - 1, 1);
      const finMes = new Date(anio, mes, 0, 23, 59, 59);

      const ventasHistoricas = await this.prisma.venta.aggregate({
        where: {
          fecha: { gte: inicioMes, lte: finMes },
        },
        _sum: { total: true },
        _count: true,
      });

      totalVentas = Number(ventasHistoricas._sum.total) || 0;

      // Si sigue sin datos, mostrar el acumulado total
      if (totalVentas === 0) {
        const totalHistorico = await this.prisma.venta.aggregate({
          _sum: { total: true },
          _count: true,
        });
        totalVentas = Number(totalHistorico._sum.total) || 0;
        ventasMes = {
          _sum: { total: totalHistorico._sum.total, utilidad: null },
          _count: totalHistorico._count,
        };
      } else {
        ventasMes = {
          _sum: { total: ventasHistoricas._sum.total, utilidad: null },
          _count: ventasHistoricas._count,
        };
      }
    }

    const totalUtilidad = Number(ventasMes._sum.utilidad) || 0;
    const totalGastos = Number(gastosMes._sum.monto) || 0;

    return {
      anio,
      mes,
      totalVentas,
      cantidadVentas: ventasMes._count,
      totalGastos,
      utilidadBruta: totalUtilidad > 0 ? totalUtilidad - totalGastos : totalVentas * 0.3 - totalGastos,
    };
  }

  async getBalanceTotal() {
    // Balance = Utilidad total acumulada + Valor del inventario a precio de venta
    const [utilidadTotal, valorInventario] = await Promise.all([
      this.prisma.transaccion.aggregate({
        _sum: { utilidad: true },
      }),
      this.prisma.$queryRaw<[{ valor: number }]>`
        SELECT COALESCE(SUM(stock_actual * precio_elevapartes), 0) as valor
        FROM productos
        WHERE activo = true
      `,
    ]);

    const utilidad = Number(utilidadTotal._sum.utilidad) || 0;
    const inventario = Number(valorInventario[0]?.valor) || 0;

    return {
      utilidadAcumulada: utilidad,
      valorInventario: inventario,
      balance: utilidad + inventario,
    };
  }

  async getDistribucionFondos() {
    // Calcular distribución desde los pagos de ventas
    const pagos = await this.prisma.ventaPago.groupBy({
      by: ['metodoPago'],
      _sum: { monto: true },
    });

    // Obtener tasa de cambio actual
    const tasaCambio = await this.getTasaCambioActual();
    const tasa = Number(tasaCambio?.tasa) || 36.5; // Tasa por defecto

    // Calcular totales por método de pago
    const fondos: Record<string, number> = {};
    let totalVentas = 0;

    for (const pago of pagos) {
      const monto = Number(pago._sum.monto) || 0;
      fondos[pago.metodoPago] = monto;
      // Solo sumar a total si es en USD
      if (!['EFECTIVO_BS', 'TRANSFERENCIA_BS', 'PAGO_MOVIL'].includes(pago.metodoPago)) {
        totalVentas += monto;
      }
    }

    // Calcular bolívares convertidos a USD
    const bolivares = (fondos['EFECTIVO_BS'] || 0) + (fondos['TRANSFERENCIA_BS'] || 0) + (fondos['PAGO_MOVIL'] || 0);
    const bolivaresEnUsd = tasa > 0 ? bolivares / tasa : 0;
    totalVentas += bolivaresEnUsd;

    // Estructura para el dashboard
    return {
      totalVentas,
      tasaCambio: tasa,
      cuentas: [
        {
          nombre: 'Efectivo USD',
          codigo: 'EFECTIVO_USD',
          monto: fondos['EFECTIVO_USD'] || 0,
          moneda: 'USD',
          porcentaje: totalVentas > 0 ? ((fondos['EFECTIVO_USD'] || 0) / totalVentas) * 100 : 0,
          icono: 'banknote',
          color: 'green',
        },
        {
          nombre: 'Zelle',
          codigo: 'ZELLE',
          monto: fondos['ZELLE'] || 0,
          moneda: 'USD',
          porcentaje: totalVentas > 0 ? ((fondos['ZELLE'] || 0) / totalVentas) * 100 : 0,
          icono: 'credit-card',
          color: 'purple',
        },
        {
          nombre: 'Banesco',
          codigo: 'BANESCO',
          monto: fondos['BANESCO'] || 0,
          moneda: 'USD',
          porcentaje: totalVentas > 0 ? ((fondos['BANESCO'] || 0) / totalVentas) * 100 : 0,
          icono: 'building',
          color: 'blue',
        },
        {
          nombre: 'Bolívares',
          codigo: 'BOLIVARES',
          monto: bolivares,
          moneda: 'BS',
          montoUsd: bolivaresEnUsd,
          porcentaje: totalVentas > 0 ? (bolivaresEnUsd / totalVentas) * 100 : 0,
          icono: 'coins',
          color: 'yellow',
        },
      ],
      resumen: {
        enUsd: (fondos['EFECTIVO_USD'] || 0) + (fondos['ZELLE'] || 0) + (fondos['BANESCO'] || 0),
        enBs: bolivares,
        enBsEquivalenteUsd: bolivaresEnUsd,
      },
    };
  }
}
