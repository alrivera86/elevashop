import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';
import { CreateGastoDto } from './dto/finanzas.dto';
import { CreateConversionDto } from './dto/conversion.dto';
import { CreateOperacionExternaDto, CerrarOperacionExternaDto, CreateAjusteManualDto } from './dto/operacion-externa.dto';
import { MetodoPago, Moneda } from '@prisma/client';

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

  // ============ CONVERSIONES DE MONEDA ============

  async getConversiones(options: { page?: number; limit?: number }) {
    const { page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;

    const [conversiones, total] = await Promise.all([
      this.prisma.conversionMoneda.findMany({
        skip,
        take: limit,
        orderBy: { fecha: 'desc' },
        include: {
          ajustes: true,
        },
      }),
      this.prisma.conversionMoneda.count(),
    ]);

    return {
      data: conversiones.map(c => ({
        id: c.id,
        fecha: c.fecha,
        cuentaOrigen: c.cuentaOrigen,
        montoOrigen: Number(c.montoOrigen),
        monedaOrigen: c.monedaOrigen,
        cuentaDestino: c.cuentaDestino,
        montoDestino: Number(c.montoDestino),
        monedaDestino: c.monedaDestino,
        tasaCambio: Number(c.tasaCambio),
        notas: c.notas,
        createdAt: c.createdAt,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async createConversion(dto: CreateConversionDto) {
    const fecha = dto.fecha ? new Date(dto.fecha) : new Date();

    // Crear la conversion y los ajustes de fondo en una transaccion
    return this.prisma.$transaction(async (tx) => {
      // Crear la conversion
      const conversion = await tx.conversionMoneda.create({
        data: {
          fecha,
          cuentaOrigen: dto.cuentaOrigen,
          montoOrigen: dto.montoOrigen,
          monedaOrigen: dto.monedaOrigen,
          cuentaDestino: dto.cuentaDestino,
          montoDestino: dto.montoDestino,
          monedaDestino: dto.monedaDestino,
          tasaCambio: dto.tasaCambio,
          notas: dto.notas,
        },
      });

      // Crear ajuste de SALIDA en cuenta origen (negativo)
      await tx.ajusteFondo.create({
        data: {
          fecha,
          tipo: 'CONVERSION_SALIDA',
          metodoPago: dto.cuentaOrigen,
          monto: -Math.abs(dto.montoOrigen),
          moneda: dto.monedaOrigen,
          conversionId: conversion.id,
          descripcion: `Conversion a ${dto.cuentaDestino}`,
        },
      });

      // Crear ajuste de ENTRADA en cuenta destino (positivo)
      await tx.ajusteFondo.create({
        data: {
          fecha,
          tipo: 'CONVERSION_ENTRADA',
          metodoPago: dto.cuentaDestino,
          monto: Math.abs(dto.montoDestino),
          moneda: dto.monedaDestino,
          conversionId: conversion.id,
          descripcion: `Conversion desde ${dto.cuentaOrigen}`,
        },
      });

      return {
        id: conversion.id,
        fecha: conversion.fecha,
        cuentaOrigen: conversion.cuentaOrigen,
        montoOrigen: Number(conversion.montoOrigen),
        monedaOrigen: conversion.monedaOrigen,
        cuentaDestino: conversion.cuentaDestino,
        montoDestino: Number(conversion.montoDestino),
        monedaDestino: conversion.monedaDestino,
        tasaCambio: Number(conversion.tasaCambio),
        notas: conversion.notas,
      };
    });
  }

  async deleteConversion(id: number) {
    // Eliminar ajustes relacionados y la conversion
    return this.prisma.$transaction(async (tx) => {
      await tx.ajusteFondo.deleteMany({
        where: { conversionId: id },
      });

      return tx.conversionMoneda.delete({
        where: { id },
      });
    });
  }

  // ============ OPERACIONES EXTERNAS ============

  async getOperacionesExternas(options: { estado?: string } = {}) {
    const where: any = {};
    if (options.estado) {
      where.estado = options.estado;
    }

    const operaciones = await this.prisma.operacionExterna.findMany({
      where,
      orderBy: [
        { estado: 'asc' }, // ACTIVA primero
        { fechaInicio: 'desc' },
      ],
      include: {
        ajustes: true,
      },
    });

    return operaciones.map(op => ({
      id: op.id,
      nombre: op.nombre,
      tipo: op.tipo,
      estado: op.estado,
      cuentaOrigen: op.cuentaOrigen,
      montoSalida: Number(op.montoSalida),
      monedaSalida: op.monedaSalida,
      fechaInicio: op.fechaInicio,
      cuentaDestino: op.cuentaDestino,
      montoEntrada: op.montoEntrada ? Number(op.montoEntrada) : null,
      monedaEntrada: op.monedaEntrada,
      fechaCierre: op.fechaCierre,
      gananciaPerdida: op.gananciaPerdida ? Number(op.gananciaPerdida) : null,
      notas: op.notas,
      createdAt: op.createdAt,
    }));
  }

  async getOperacionesActivas() {
    return this.getOperacionesExternas({ estado: 'ACTIVA' });
  }

  async createOperacionExterna(dto: CreateOperacionExternaDto) {
    const fechaInicio = dto.fechaInicio ? new Date(dto.fechaInicio) : new Date();
    const monedaSalida = dto.monedaSalida || 'USD';

    return this.prisma.$transaction(async (tx) => {
      // Crear la operacion externa
      const operacion = await tx.operacionExterna.create({
        data: {
          nombre: dto.nombre,
          tipo: dto.tipo,
          estado: 'ACTIVA',
          cuentaOrigen: dto.cuentaOrigen,
          montoSalida: dto.montoSalida,
          monedaSalida,
          fechaInicio,
          notas: dto.notas,
        },
      });

      // Crear ajuste de SALIDA (el dinero sale de la cuenta)
      await tx.ajusteFondo.create({
        data: {
          fecha: fechaInicio,
          tipo: 'OPERACION_SALIDA',
          metodoPago: dto.cuentaOrigen,
          monto: -Math.abs(dto.montoSalida),
          moneda: monedaSalida,
          operacionExternaId: operacion.id,
          descripcion: `${dto.tipo}: ${dto.nombre}`,
        },
      });

      return {
        id: operacion.id,
        nombre: operacion.nombre,
        tipo: operacion.tipo,
        estado: operacion.estado,
        cuentaOrigen: operacion.cuentaOrigen,
        montoSalida: Number(operacion.montoSalida),
        monedaSalida: operacion.monedaSalida,
        fechaInicio: operacion.fechaInicio,
        notas: operacion.notas,
      };
    });
  }

  async cerrarOperacionExterna(id: number, dto: CerrarOperacionExternaDto) {
    const operacion = await this.prisma.operacionExterna.findUnique({
      where: { id },
    });

    if (!operacion) {
      throw new NotFoundException('Operacion externa no encontrada');
    }

    if (operacion.estado !== 'ACTIVA') {
      throw new BadRequestException('Solo se pueden cerrar operaciones activas');
    }

    const fechaCierre = dto.fechaCierre ? new Date(dto.fechaCierre) : new Date();
    const monedaEntrada = dto.monedaEntrada || operacion.monedaSalida;

    // Calcular ganancia/perdida
    // Para simplificar, asumimos misma moneda o convertimos a USD
    let gananciaPerdida = 0;
    const montoSalida = Number(operacion.montoSalida);
    const montoEntrada = dto.montoEntrada;

    if (operacion.monedaSalida === monedaEntrada) {
      gananciaPerdida = montoEntrada - montoSalida;
    } else {
      // Si son monedas diferentes, reportamos la diferencia en la moneda de entrada
      gananciaPerdida = montoEntrada - montoSalida;
    }

    return this.prisma.$transaction(async (tx) => {
      // Actualizar la operacion
      const updated = await tx.operacionExterna.update({
        where: { id },
        data: {
          estado: 'COMPLETADA',
          cuentaDestino: dto.cuentaDestino,
          montoEntrada: dto.montoEntrada,
          monedaEntrada,
          fechaCierre,
          gananciaPerdida,
          notas: dto.notas ? `${operacion.notas || ''}\nCierre: ${dto.notas}` : operacion.notas,
        },
      });

      // Crear ajuste de ENTRADA (el dinero entra a la cuenta destino)
      await tx.ajusteFondo.create({
        data: {
          fecha: fechaCierre,
          tipo: 'OPERACION_ENTRADA',
          metodoPago: dto.cuentaDestino,
          monto: Math.abs(dto.montoEntrada),
          moneda: monedaEntrada,
          operacionExternaId: id,
          descripcion: `Cierre ${operacion.tipo}: ${operacion.nombre}`,
        },
      });

      return {
        id: updated.id,
        nombre: updated.nombre,
        tipo: updated.tipo,
        estado: updated.estado,
        cuentaOrigen: updated.cuentaOrigen,
        montoSalida: Number(updated.montoSalida),
        monedaSalida: updated.monedaSalida,
        fechaInicio: updated.fechaInicio,
        cuentaDestino: updated.cuentaDestino,
        montoEntrada: Number(updated.montoEntrada),
        monedaEntrada: updated.monedaEntrada,
        fechaCierre: updated.fechaCierre,
        gananciaPerdida: Number(updated.gananciaPerdida),
        notas: updated.notas,
      };
    });
  }

  async cancelarOperacionExterna(id: number) {
    const operacion = await this.prisma.operacionExterna.findUnique({
      where: { id },
    });

    if (!operacion) {
      throw new NotFoundException('Operacion externa no encontrada');
    }

    if (operacion.estado !== 'ACTIVA') {
      throw new BadRequestException('Solo se pueden cancelar operaciones activas');
    }

    return this.prisma.$transaction(async (tx) => {
      // Revertir el ajuste de salida (devolver el dinero a la cuenta origen)
      await tx.ajusteFondo.create({
        data: {
          fecha: new Date(),
          tipo: 'OPERACION_ENTRADA',
          metodoPago: operacion.cuentaOrigen,
          monto: Math.abs(Number(operacion.montoSalida)),
          moneda: operacion.monedaSalida,
          operacionExternaId: id,
          descripcion: `Cancelacion: ${operacion.nombre}`,
        },
      });

      // Actualizar estado
      return tx.operacionExterna.update({
        where: { id },
        data: {
          estado: 'CANCELADA',
          fechaCierre: new Date(),
        },
      });
    });
  }

  async deleteOperacionExterna(id: number) {
    // Solo permitir eliminar operaciones canceladas o completadas
    const operacion = await this.prisma.operacionExterna.findUnique({
      where: { id },
    });

    if (!operacion) {
      throw new NotFoundException('Operacion externa no encontrada');
    }

    if (operacion.estado === 'ACTIVA') {
      throw new BadRequestException('No se pueden eliminar operaciones activas. Cancele primero.');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.ajusteFondo.deleteMany({
        where: { operacionExternaId: id },
      });

      return tx.operacionExterna.delete({
        where: { id },
      });
    });
  }

  // ============ AJUSTES MANUALES ============

  async createAjusteManual(dto: CreateAjusteManualDto) {
    const fecha = dto.fecha ? new Date(dto.fecha) : new Date();
    const moneda = dto.moneda || 'USD';

    return this.prisma.ajusteFondo.create({
      data: {
        fecha,
        tipo: 'AJUSTE_MANUAL',
        metodoPago: dto.metodoPago,
        monto: dto.monto,
        moneda,
        descripcion: dto.descripcion,
      },
    });
  }

  // ============ DISTRIBUCION DE FONDOS ACTUALIZADA ============

  async getDistribucionFondosConAjustes() {
    // Calcular distribución desde los pagos de ventas
    const pagos = await this.prisma.ventaPago.groupBy({
      by: ['metodoPago'],
      _sum: { monto: true },
    });

    // Obtener ajustes de fondos agrupados por método de pago
    const ajustes = await this.prisma.ajusteFondo.groupBy({
      by: ['metodoPago', 'moneda'],
      _sum: { monto: true },
    });

    // Obtener operaciones activas
    const operacionesActivas = await this.getOperacionesActivas();
    const totalOperacionesActivas = operacionesActivas.reduce(
      (sum, op) => sum + op.montoSalida,
      0
    );

    // Obtener tasa de cambio actual
    const tasaCambio = await this.getTasaCambioActual();
    const tasa = Number(tasaCambio?.tasa) || 36.5;

    // Calcular totales por método de pago
    const fondos: Record<string, { usd: number; bs: number }> = {};

    // Inicializar con pagos de ventas
    for (const pago of pagos) {
      const monto = Number(pago._sum.monto) || 0;
      if (!fondos[pago.metodoPago]) {
        fondos[pago.metodoPago] = { usd: 0, bs: 0 };
      }
      // Los pagos de ventas se asumen en USD excepto los de bolivares
      if (['EFECTIVO_BS', 'TRANSFERENCIA_BS', 'PAGO_MOVIL'].includes(pago.metodoPago)) {
        fondos[pago.metodoPago].bs += monto;
      } else {
        fondos[pago.metodoPago].usd += monto;
      }
    }

    // Aplicar ajustes de fondos
    for (const ajuste of ajustes) {
      const monto = Number(ajuste._sum.monto) || 0;
      if (!fondos[ajuste.metodoPago]) {
        fondos[ajuste.metodoPago] = { usd: 0, bs: 0 };
      }
      if (ajuste.moneda === 'VES') {
        fondos[ajuste.metodoPago].bs += monto;
      } else {
        fondos[ajuste.metodoPago].usd += monto;
      }
    }

    // Calcular totales
    let totalVentasUsd = 0;
    const cuentas: any[] = [];

    // Helper para obtener info de cuenta
    const getCuentaInfo = (codigo: string) => {
      const info: Record<string, { nombre: string; icono: string; color: string }> = {
        'EFECTIVO_USD': { nombre: 'Efectivo USD', icono: 'banknote', color: 'green' },
        'ZELLE': { nombre: 'Zelle', icono: 'credit-card', color: 'purple' },
        'BANESCO': { nombre: 'Banesco', icono: 'building', color: 'blue' },
        'BINANCE': { nombre: 'Binance', icono: 'bitcoin', color: 'yellow' },
        'BINANCE_USDT': { nombre: 'Binance USDT (Personal)', icono: 'bitcoin', color: 'yellow' },
        'BINANCE_ELEVASHOP': { nombre: 'Binance Elevashop', icono: 'bitcoin', color: 'orange' },
        'EFECTIVO_BS': { nombre: 'Efectivo Bs', icono: 'coins', color: 'yellow' },
        'TRANSFERENCIA_BS': { nombre: 'Transferencia Bs', icono: 'arrow-right-left', color: 'yellow' },
        'PAGO_MOVIL': { nombre: 'Pago Movil', icono: 'smartphone', color: 'yellow' },
        'TRANSFERENCIA_USD': { nombre: 'Transferencia USD', icono: 'arrow-right-left', color: 'green' },
        'EFECTIVO_CHILE': { nombre: 'Efectivo Chile', icono: 'banknote', color: 'red' },
      };
      return info[codigo] || { nombre: codigo, icono: 'wallet', color: 'gray' };
    };

    // Agregar cuentas con saldos
    for (const [codigo, saldos] of Object.entries(fondos)) {
      const info = getCuentaInfo(codigo);
      const esBolivares = ['EFECTIVO_BS', 'TRANSFERENCIA_BS', 'PAGO_MOVIL'].includes(codigo);

      if (esBolivares) {
        const montoUsd = tasa > 0 ? saldos.bs / tasa : 0;
        totalVentasUsd += montoUsd;
        cuentas.push({
          nombre: info.nombre,
          codigo,
          monto: saldos.bs,
          moneda: 'BS',
          montoUsd,
          porcentaje: 0, // Se calcula después
          icono: info.icono,
          color: info.color,
        });
      } else {
        const montoTotal = saldos.usd;
        totalVentasUsd += montoTotal;
        cuentas.push({
          nombre: info.nombre,
          codigo,
          monto: montoTotal,
          moneda: 'USD',
          porcentaje: 0,
          icono: info.icono,
          color: info.color,
        });
      }
    }

    // Calcular porcentajes
    for (const cuenta of cuentas) {
      const montoEnUsd = cuenta.moneda === 'BS' ? cuenta.montoUsd : cuenta.monto;
      cuenta.porcentaje = totalVentasUsd > 0 ? (montoEnUsd / totalVentasUsd) * 100 : 0;
    }

    // Ordenar: primero USD, luego Bs
    cuentas.sort((a, b) => {
      if (a.moneda === 'USD' && b.moneda !== 'USD') return -1;
      if (a.moneda !== 'USD' && b.moneda === 'USD') return 1;
      return b.monto - a.monto;
    });

    // Calcular resumen de bolivares
    const cuentasBs = cuentas.filter(c => c.moneda === 'BS');
    const totalBs = cuentasBs.reduce((sum, c) => sum + c.monto, 0);
    const totalBsEnUsd = cuentasBs.reduce((sum, c) => sum + (c.montoUsd || 0), 0);
    const totalUsd = cuentas.filter(c => c.moneda === 'USD').reduce((sum, c) => sum + c.monto, 0);

    return {
      totalVentas: totalVentasUsd,
      tasaCambio: tasa,
      cuentas,
      resumen: {
        enUsd: totalUsd,
        enBs: totalBs,
        enBsEquivalenteUsd: totalBsEnUsd,
      },
      operacionesActivas: {
        cantidad: operacionesActivas.length,
        montoTotal: totalOperacionesActivas,
        operaciones: operacionesActivas.map(op => ({
          id: op.id,
          nombre: op.nombre,
          tipo: op.tipo,
          monto: op.montoSalida,
          fechaInicio: op.fechaInicio,
        })),
      },
    };
  }
}
