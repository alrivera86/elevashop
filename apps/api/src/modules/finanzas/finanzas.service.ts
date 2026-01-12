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
    // Usar transacciones para ventas ya que ahí están los datos migrados
    const [ventasMes, gastosMes] = await Promise.all([
      this.prisma.transaccion.aggregate({
        where: { anio, mes },
        _sum: { total: true, utilidad: true },
        _count: true,
      }),
      this.prisma.gasto.aggregate({
        where: { anio, mes },
        _sum: { monto: true },
      }),
    ]);

    const totalVentas = Number(ventasMes._sum.total) || 0;
    const totalUtilidad = Number(ventasMes._sum.utilidad) || 0;
    const totalGastos = Number(gastosMes._sum.monto) || 0;

    return {
      anio,
      mes,
      totalVentas,
      cantidadVentas: ventasMes._count,
      totalGastos,
      utilidadBruta: totalUtilidad - totalGastos,
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
    // Obtener distribución desde la tabla
    const distribucion = await this.prisma.$queryRaw<
      { concepto: string; moneda: string; monto: number; porcentaje: number }[]
    >`SELECT concepto, moneda, monto, porcentaje FROM distribucion_fondos`;

    // Obtener tasa de cambio actual para convertir Bs a USD
    const tasaCambio = await this.getTasaCambioActual();
    const tasa = Number(tasaCambio?.tasa) || 1;

    // Procesar datos
    const fondos: Record<string, { monto: number; moneda: string; porcentaje: number; montoUsd?: number }> = {};
    let totalVentas = 0;

    for (const row of distribucion) {
      const monto = Number(row.monto) || 0;
      fondos[row.concepto] = {
        monto,
        moneda: row.moneda,
        porcentaje: Number(row.porcentaje) || 0,
      };

      if (row.concepto === 'TOTAL_VENTAS') {
        totalVentas = monto;
      }

      // Convertir Bs a USD para mostrar equivalencia
      if (row.moneda === 'BS' && tasa > 0) {
        fondos[row.concepto].montoUsd = monto / tasa;
      }
    }

    // Estructura para el dashboard
    return {
      totalVentas,
      tasaCambio: tasa,
      cuentas: [
        {
          nombre: 'Efectivo USD',
          codigo: 'EFECTIVO_USD',
          monto: fondos.EFECTIVO_USD?.monto || 0,
          moneda: 'USD',
          porcentaje: fondos.EFECTIVO_USD?.porcentaje || 0,
          icono: 'banknote',
          color: 'green',
        },
        {
          nombre: 'Zelle',
          codigo: 'ZELLE',
          monto: fondos.ZELLE?.monto || 0,
          moneda: 'USD',
          porcentaje: fondos.ZELLE?.porcentaje || 0,
          icono: 'credit-card',
          color: 'purple',
        },
        {
          nombre: 'Banesco',
          codigo: 'BANESCO',
          monto: fondos.BANESCO?.monto || 0,
          moneda: 'USD',
          porcentaje: fondos.BANESCO?.porcentaje || 0,
          icono: 'building',
          color: 'blue',
        },
        {
          nombre: 'Bolívares',
          codigo: 'BOLIVARES',
          monto: fondos.BOLIVARES?.monto || 0,
          moneda: 'BS',
          montoUsd: fondos.BOLIVARES?.montoUsd || 0,
          porcentaje: fondos.BOLIVARES?.montoUsd
            ? ((fondos.BOLIVARES.montoUsd / totalVentas) * 100)
            : 0,
          icono: 'coins',
          color: 'yellow',
        },
      ],
      resumen: {
        enUsd: (fondos.EFECTIVO_USD?.monto || 0) + (fondos.ZELLE?.monto || 0) + (fondos.BANESCO?.monto || 0),
        enBs: fondos.BOLIVARES?.monto || 0,
        enBsEquivalenteUsd: fondos.BOLIVARES?.montoUsd || 0,
      },
    };
  }
}
