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

  // ============ GASTOS OPERATIVOS (Vista Excel) ============

  // Obtener todas las categorías de gastos
  async getCategorias() {
    return this.prisma.categoriaGasto.findMany({
      orderBy: { nombre: 'asc' },
    });
  }

  // Crear o actualizar categoría
  async upsertCategoria(nombre: string, tipo: string = 'OPERATIVO') {
    return this.prisma.categoriaGasto.upsert({
      where: { nombre },
      update: { tipo: tipo as any },
      create: { nombre, tipo: tipo as any },
    });
  }

  // Obtener gastos en formato matriz (para vista Excel)
  async getGastosMatriz(anioInicio: number, anioFin: number) {
    // Obtener todas las categorías
    const categorias = await this.prisma.categoriaGasto.findMany({
      orderBy: { nombre: 'asc' },
    });

    // Obtener todos los gastos del rango
    const gastos = await this.prisma.gasto.findMany({
      where: {
        anio: { gte: anioInicio, lte: anioFin },
      },
      include: { categoria: true },
      orderBy: [{ anio: 'asc' }, { mes: 'asc' }],
    });

    // Generar lista de meses
    const meses: { anio: number; mes: number; label: string }[] = [];
    const nombresMeses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
                         'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

    for (let anio = anioInicio; anio <= anioFin; anio++) {
      for (let mes = 1; mes <= 12; mes++) {
        meses.push({
          anio,
          mes,
          label: `${nombresMeses[mes - 1]} ${anio}`,
        });
      }
    }

    // Crear matriz de datos
    const matriz: Record<string, Record<string, number>> = {};
    const totalesPorMes: Record<string, number> = {};

    // Inicializar matriz con ceros
    for (const cat of categorias) {
      matriz[cat.nombre] = {};
      for (const m of meses) {
        const key = `${m.anio}-${m.mes}`;
        matriz[cat.nombre][key] = 0;
        totalesPorMes[key] = 0;
      }
    }

    // Llenar matriz con datos
    for (const gasto of gastos) {
      const key = `${gasto.anio}-${gasto.mes}`;
      const nombreCat = gasto.categoria?.nombre || 'Sin categoría';

      if (!matriz[nombreCat]) {
        matriz[nombreCat] = {};
        for (const m of meses) {
          const k = `${m.anio}-${m.mes}`;
          matriz[nombreCat][k] = 0;
        }
      }

      matriz[nombreCat][key] = (matriz[nombreCat][key] || 0) + Number(gasto.monto);
      totalesPorMes[key] = (totalesPorMes[key] || 0) + Number(gasto.monto);
    }

    return {
      categorias: categorias.map(c => ({ id: c.id, nombre: c.nombre, tipo: c.tipo })),
      meses,
      matriz,
      totalesPorMes,
    };
  }

  // Obtener gastos de un mes específico
  async getGastosMes(anio: number, mes: number) {
    const gastos = await this.prisma.gasto.findMany({
      where: { anio, mes },
      include: { categoria: true },
      orderBy: { categoria: { nombre: 'asc' } },
    });

    const total = gastos.reduce((sum, g) => sum + Number(g.monto), 0);

    return {
      anio,
      mes,
      gastos: gastos.map(g => ({
        id: g.id,
        categoria: g.categoria?.nombre || 'Sin categoría',
        categoriaId: g.categoriaId,
        monto: Number(g.monto),
        descripcion: g.descripcion,
        fecha: g.fecha,
      })),
      total,
    };
  }

  // Crear o actualizar gasto de un mes/categoría específico
  async upsertGastoMensual(data: {
    categoriaId: number;
    anio: number;
    mes: number;
    monto: number;
    descripcion?: string;
  }) {
    // Buscar si ya existe un gasto para esta categoría/mes/año
    const existente = await this.prisma.gasto.findFirst({
      where: {
        categoriaId: data.categoriaId,
        anio: data.anio,
        mes: data.mes,
      },
    });

    if (existente) {
      return this.prisma.gasto.update({
        where: { id: existente.id },
        data: {
          monto: data.monto,
          descripcion: data.descripcion,
        },
        include: { categoria: true },
      });
    }

    return this.prisma.gasto.create({
      data: {
        categoriaId: data.categoriaId,
        anio: data.anio,
        mes: data.mes,
        monto: data.monto,
        descripcion: data.descripcion,
        fecha: new Date(data.anio, data.mes - 1, 15), // Mitad del mes
        moneda: 'USD',
      },
      include: { categoria: true },
    });
  }

  // Eliminar gasto
  async deleteGasto(id: number) {
    return this.prisma.gasto.delete({ where: { id } });
  }

  // Importar gastos masivos (para migración del Excel)
  async importarGastos(datos: {
    categoria: string;
    tipo?: string;
    gastos: { anio: number; mes: number; monto: number }[];
  }[]) {
    const resultados: any[] = [];

    for (const item of datos) {
      // Crear o buscar categoría
      const categoria = await this.upsertCategoria(item.categoria, item.tipo || 'OPERATIVO');

      // Crear gastos
      for (const gasto of item.gastos) {
        if (gasto.monto > 0) {
          const result = await this.upsertGastoMensual({
            categoriaId: categoria.id,
            anio: gasto.anio,
            mes: gasto.mes,
            monto: gasto.monto,
          });
          resultados.push(result);
        }
      }
    }

    return { importados: resultados.length };
  }

  // Obtener resumen anual de gastos
  async getResumenAnual(anio: number) {
    const gastos = await this.prisma.gasto.findMany({
      where: { anio },
      include: { categoria: true },
    });

    const porCategoria: Record<string, number> = {};
    let total = 0;

    for (const g of gastos) {
      const cat = g.categoria?.nombre || 'Sin categoría';
      porCategoria[cat] = (porCategoria[cat] || 0) + Number(g.monto);
      total += Number(g.monto);
    }

    const porMes: Record<number, number> = {};
    for (let m = 1; m <= 12; m++) {
      porMes[m] = gastos
        .filter(g => g.mes === m)
        .reduce((sum, g) => sum + Number(g.monto), 0);
    }

    return {
      anio,
      total,
      porCategoria,
      porMes,
      promedio: total / 12,
    };
  }
}
