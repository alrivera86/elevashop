import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';

@Injectable()
export class ReportesService {
  constructor(private prisma: PrismaService) {}

  async getDashboardGeneral() {
    const hoy = new Date();
    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

    const [
      ventasMes,
      productosTotal,
      productosAlerta,
      clientesActivos,
      topProductos,
      ventasRecientes,
    ] = await Promise.all([
      this.prisma.venta.aggregate({
        where: { fecha: { gte: inicioMes } },
        _sum: { total: true },
        _count: true,
      }),
      this.prisma.producto.count({ where: { activo: true } }),
      this.prisma.producto.count({
        where: { activo: true, estado: { in: ['ALERTA', 'ALERTA_W', 'AGOTADO'] } },
      }),
      this.prisma.cliente.count({ where: { activo: true } }),
      this.prisma.ventaDetalle.groupBy({
        by: ['productoId'],
        _sum: { cantidad: true, subtotal: true },
        orderBy: { _sum: { subtotal: 'desc' } },
        take: 5,
      }),
      this.prisma.venta.findMany({
        take: 5,
        orderBy: { fecha: 'desc' },
        include: { cliente: true },
      }),
    ]);

    return {
      ventasMes: {
        total: ventasMes._sum.total || 0,
        cantidad: ventasMes._count,
      },
      inventario: {
        total: productosTotal,
        enAlerta: productosAlerta,
      },
      clientes: clientesActivos,
      topProductos,
      ventasRecientes,
    };
  }

  // Top clientes por ventas
  async getTopClientes(limit = 10, fechaDesde?: Date, fechaHasta?: Date) {
    // Si hay filtro de fecha, calcular desde ventas
    if (fechaDesde || fechaHasta) {
      const whereVentas: any = {};
      if (fechaDesde) whereVentas.fecha = { gte: fechaDesde };
      if (fechaHasta) whereVentas.fecha = { ...whereVentas.fecha, lte: fechaHasta };

      const ventasPorCliente = await this.prisma.venta.groupBy({
        by: ['clienteId'],
        where: whereVentas,
        _sum: { total: true },
        _count: true,
        orderBy: { _sum: { total: 'desc' } },
        take: limit,
      });

      const clienteIds = ventasPorCliente.map((v: { clienteId: number }) => v.clienteId);
      const clientes = await this.prisma.cliente.findMany({
        where: { id: { in: clienteIds } },
        select: { id: true, nombre: true, telefono: true, createdAt: true },
      });
      const clientesMap = new Map(clientes.map((c: { id: number; nombre: string; telefono: string | null; createdAt: Date }) => [c.id, c]));

      return ventasPorCliente.map((v, index) => {
        const cliente = clientesMap.get(v.clienteId);
        const total = Number(v._sum.total) || 0;
        return {
          posicion: index + 1,
          id: v.clienteId,
          nombre: cliente?.nombre || 'Cliente',
          telefono: cliente?.telefono,
          totalCompras: total,
          cantidadOrdenes: v._count,
          ticketPromedio: v._count > 0 ? total / v._count : 0,
          clienteDesde: cliente?.createdAt,
        };
      });
    }

    // Sin filtro de fecha, usar totalCompras acumulado
    const clientes = await this.prisma.cliente.findMany({
      where: { activo: true },
      orderBy: { totalCompras: 'desc' },
      take: limit,
      select: {
        id: true,
        nombre: true,
        telefono: true,
        totalCompras: true,
        cantidadOrdenes: true,
        createdAt: true,
      },
    });

    return clientes.map((c: { id: number; nombre: string; telefono: string | null; totalCompras: any; cantidadOrdenes: number | null; createdAt: Date }, index: number) => ({
      posicion: index + 1,
      id: c.id,
      nombre: c.nombre,
      telefono: c.telefono,
      totalCompras: Number(c.totalCompras) || 0,
      cantidadOrdenes: c.cantidadOrdenes || 0,
      ticketPromedio: c.cantidadOrdenes && c.cantidadOrdenes > 0
        ? (Number(c.totalCompras) || 0) / c.cantidadOrdenes
        : 0,
      clienteDesde: c.createdAt,
    }));
  }

  // Top productos mas vendidos
  async getTopProductos(limit = 10, fechaDesde?: Date, fechaHasta?: Date) {
    // Construir filtro de fecha
    const whereVenta: any = {};
    if (fechaDesde) whereVenta.fecha = { gte: fechaDesde };
    if (fechaHasta) whereVenta.fecha = { ...whereVenta.fecha, lte: fechaHasta };

    // Obtener ventas agrupadas por producto
    const productosVendidos = await this.prisma.ventaDetalle.groupBy({
      by: ['productoId'],
      where: fechaDesde || fechaHasta ? { venta: whereVenta } : undefined,
      _sum: { cantidad: true, subtotal: true },
      _count: true,
      orderBy: { _sum: { subtotal: 'desc' } },
      take: limit,
    });

    // Obtener detalles de los productos
    const productosIds = productosVendidos.map((p: { productoId: number }) => p.productoId);
    const productos = await this.prisma.producto.findMany({
      where: { id: { in: productosIds } },
      select: {
        id: true,
        codigo: true,
        nombre: true,
        precioElevapartes: true,
        precioCosto: true,
        stockActual: true,
        categoria: { select: { nombre: true } },
      },
    });

    const productosMap = new Map(productos.map(p => [p.id, p]));

    return productosVendidos.map((pv, index) => {
      const producto = productosMap.get(pv.productoId);
      const ingresos = Number(pv._sum.subtotal) || 0;
      const costo = (Number(producto?.precioCosto) || 0) * (pv._sum.cantidad || 0);

      return {
        posicion: index + 1,
        productoId: pv.productoId,
        codigo: producto?.codigo || 'N/A',
        nombre: producto?.nombre || 'Producto eliminado',
        categoria: producto?.categoria?.nombre || 'Sin categoria',
        unidadesVendidas: pv._sum.cantidad || 0,
        vecesVendido: pv._count,
        ingresos,
        costoEstimado: costo,
        utilidadEstimada: ingresos - costo,
        margenPorcentaje: ingresos > 0 ? ((ingresos - costo) / ingresos) * 100 : 0,
        stockActual: producto?.stockActual || 0,
      };
    });
  }

  // Ventas por metodo de pago
  async getVentasPorMetodoPago(dias = 30) {
    const fechaDesde = new Date();
    fechaDesde.setDate(fechaDesde.getDate() - dias);

    const pagos = await this.prisma.ventaPago.groupBy({
      by: ['metodoPago'],
      _sum: { monto: true },
      _count: true,
      where: {
        venta: { fecha: { gte: fechaDesde } },
      },
    });

    const total = pagos.reduce((sum, p) => sum + (Number(p._sum.monto) || 0), 0);

    return pagos.map(p => ({
      metodoPago: p.metodoPago,
      monto: Number(p._sum.monto) || 0,
      transacciones: p._count,
      porcentaje: total > 0 ? ((Number(p._sum.monto) || 0) / total) * 100 : 0,
    })).sort((a, b) => b.monto - a.monto);
  }

  // Resumen de utilidades
  async getResumenUtilidades(fechaDesde?: Date, fechaHasta?: Date) {
    const hoy = new Date();

    // Si hay filtro personalizado, usar esas fechas
    const usarFiltro = fechaDesde || fechaHasta;
    const inicioMes = fechaDesde || new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const finMes = fechaHasta || hoy;

    // Calcular periodo anterior (mismo rango de dias antes)
    const diasRango = Math.ceil((finMes.getTime() - inicioMes.getTime()) / (1000 * 60 * 60 * 24));
    const inicioAnterior = new Date(inicioMes);
    inicioAnterior.setDate(inicioAnterior.getDate() - diasRango - 1);
    const finAnterior = new Date(inicioMes);
    finAnterior.setDate(finAnterior.getDate() - 1);

    const [utilidadPeriodo, utilidadAnterior, utilidadTotal] = await Promise.all([
      this.prisma.unidadInventario.aggregate({
        where: {
          estado: 'VENDIDO',
          fechaVenta: { gte: inicioMes, lte: finMes },
        },
        _sum: { utilidad: true, precioVenta: true, costoUnitario: true },
        _count: true,
      }),
      this.prisma.unidadInventario.aggregate({
        where: {
          estado: 'VENDIDO',
          fechaVenta: { gte: inicioAnterior, lte: finAnterior },
        },
        _sum: { utilidad: true, precioVenta: true },
        _count: true,
      }),
      this.prisma.unidadInventario.aggregate({
        where: { estado: 'VENDIDO' },
        _sum: { utilidad: true, precioVenta: true, costoUnitario: true },
        _count: true,
      }),
    ]);

    const utilidadActual = Number(utilidadPeriodo._sum.utilidad) || 0;
    const utilidadAnt = Number(utilidadAnterior._sum.utilidad) || 0;
    const cambio = utilidadAnt > 0
      ? ((utilidadActual - utilidadAnt) / utilidadAnt) * 100
      : 0;

    return {
      mesActual: {
        utilidad: utilidadActual,
        ventas: Number(utilidadPeriodo._sum.precioVenta) || 0,
        costo: Number(utilidadPeriodo._sum.costoUnitario) || 0,
        unidades: utilidadPeriodo._count,
      },
      mesAnterior: {
        utilidad: utilidadAnt,
        ventas: Number(utilidadAnterior._sum.precioVenta) || 0,
        unidades: utilidadAnterior._count,
      },
      cambioMensual: cambio,
      acumulado: {
        utilidad: Number(utilidadTotal._sum.utilidad) || 0,
        ventas: Number(utilidadTotal._sum.precioVenta) || 0,
        costo: Number(utilidadTotal._sum.costoUnitario) || 0,
        unidades: utilidadTotal._count,
      },
    };
  }

  // Productos que necesitan reposicion
  async getProductosReposicion() {
    return this.prisma.producto.findMany({
      where: {
        activo: true,
        OR: [
          { estado: 'AGOTADO' },
          { estado: 'ALERTA' },
          { estado: 'ALERTA_W' },
        ],
      },
      select: {
        id: true,
        codigo: true,
        nombre: true,
        stockActual: true,
        stockMinimo: true,
        stockAdvertencia: true,
        estado: true,
        precioCosto: true,
        categoria: { select: { nombre: true } },
      },
      orderBy: [
        { estado: 'asc' },
        { stockActual: 'asc' },
      ],
    });
  }

  // Dashboard completo de inteligencia de negocio
  async getDashboardBI(fechaDesde?: Date, fechaHasta?: Date) {
    // Si no hay fechas, es "Todo el tiempo" - no aplicar filtros de fecha
    const esTodoElTiempo = !fechaDesde && !fechaHasta;

    // Calcular dias para metodos de pago basado en el rango
    let diasMetodosPago = 9999; // Por defecto todo
    if (fechaDesde && fechaHasta) {
      diasMetodosPago = Math.ceil((fechaHasta.getTime() - fechaDesde.getTime()) / (1000 * 60 * 60 * 24));
    }

    const [
      topClientes,
      topProductos,
      metodosPago,
      utilidades,
      productosReposicion,
      totalClientesActivos,
    ] = await Promise.all([
      this.getTopClientes(10, fechaDesde, fechaHasta),
      this.getTopProductos(10, fechaDesde, fechaHasta),
      this.getVentasPorMetodoPago(diasMetodosPago),
      this.getResumenUtilidadesBI(fechaDesde, fechaHasta, esTodoElTiempo),
      this.getProductosReposicion(),
      this.prisma.cliente.count({ where: { activo: true, totalCompras: { gt: 0 } } }),
    ]);

    // Calcular metricas clave
    const totalVentasMes = topProductos.reduce((sum: number, p: { ingresos: number }) => sum + p.ingresos, 0);
    const totalUtilidadMes = utilidades.mesActual.utilidad;
    const margenPromedio = totalVentasMes > 0 ? (totalUtilidadMes / totalVentasMes) * 100 : 0;

    return {
      kpis: {
        ventasMes: utilidades.mesActual.ventas,
        utilidadMes: utilidades.mesActual.utilidad,
        margenPromedio,
        unidadesVendidas: utilidades.mesActual.unidades,
        cambioVsMesAnterior: utilidades.cambioMensual,
        clientesActivos: totalClientesActivos,
        productosEnAlerta: productosReposicion.length,
      },
      topClientes: topClientes.slice(0, 5),
      topProductos: topProductos.slice(0, 5),
      metodosPago,
      utilidades,
      productosReposicion: productosReposicion.slice(0, 10),
    };
  }

  // Resumen de utilidades para BI - usa ventas y ventas_detalle
  async getResumenUtilidadesBI(fechaDesde?: Date, fechaHasta?: Date, esTodoElTiempo = false) {
    const hoy = new Date();

    // Helper para calcular utilidades desde ventas
    const calcularUtilidades = async (whereVenta: any) => {
      // Obtener ventas del periodo
      const ventas = await this.prisma.venta.aggregate({
        where: whereVenta,
        _sum: { total: true },
        _count: true,
      });

      // Obtener detalles con costos
      const detalles = await this.prisma.ventaDetalle.findMany({
        where: { venta: whereVenta },
        include: { producto: { select: { precioCosto: true } } },
      });

      const totalVentas = Number(ventas._sum.total) || 0;
      type DetalleVenta = { cantidad: number; producto: { precioCosto: any } | null };
      const totalUnidades = detalles.reduce((sum: number, d: DetalleVenta) => sum + d.cantidad, 0);
      const totalCosto = detalles.reduce((sum: number, d: DetalleVenta) => {
        return sum + (d.cantidad * (Number(d.producto?.precioCosto) || 0));
      }, 0);

      return {
        ventas: totalVentas,
        costo: totalCosto,
        utilidad: totalVentas - totalCosto,
        unidades: totalUnidades,
        cantidadVentas: ventas._count,
      };
    };

    if (esTodoElTiempo) {
      // Todo el tiempo - sin filtro de fechas
      const totales = await calcularUtilidades({});

      // Para comparar, calculamos el mes anterior
      const inicioMesAnterior = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
      const finMesAnterior = new Date(hoy.getFullYear(), hoy.getMonth(), 0, 23, 59, 59);
      const mesAnterior = await calcularUtilidades({
        fecha: { gte: inicioMesAnterior, lte: finMesAnterior },
      });

      return {
        mesActual: {
          utilidad: totales.utilidad,
          ventas: totales.ventas,
          costo: totales.costo,
          unidades: totales.unidades,
        },
        mesAnterior: {
          utilidad: mesAnterior.utilidad,
          ventas: mesAnterior.ventas,
          unidades: mesAnterior.unidades,
        },
        cambioMensual: 0,
        acumulado: {
          utilidad: totales.utilidad,
          ventas: totales.ventas,
          costo: totales.costo,
          unidades: totales.unidades,
        },
      };
    }

    // Con filtro de fechas
    const inicioMes = fechaDesde || new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const finMes = fechaHasta || hoy;

    // Calcular periodo anterior (mismo rango de dias antes)
    const diasRango = Math.ceil((finMes.getTime() - inicioMes.getTime()) / (1000 * 60 * 60 * 24));
    const inicioAnterior = new Date(inicioMes);
    inicioAnterior.setDate(inicioAnterior.getDate() - diasRango - 1);
    const finAnterior = new Date(inicioMes);
    finAnterior.setDate(finAnterior.getDate() - 1);

    const [periodoActual, periodoAnterior, totales] = await Promise.all([
      calcularUtilidades({ fecha: { gte: inicioMes, lte: finMes } }),
      calcularUtilidades({ fecha: { gte: inicioAnterior, lte: finAnterior } }),
      calcularUtilidades({}),
    ]);

    const cambio = periodoAnterior.utilidad > 0
      ? ((periodoActual.utilidad - periodoAnterior.utilidad) / periodoAnterior.utilidad) * 100
      : periodoActual.utilidad > 0 ? 100 : 0;

    return {
      mesActual: {
        utilidad: periodoActual.utilidad,
        ventas: periodoActual.ventas,
        costo: periodoActual.costo,
        unidades: periodoActual.unidades,
      },
      mesAnterior: {
        utilidad: periodoAnterior.utilidad,
        ventas: periodoAnterior.ventas,
        unidades: periodoAnterior.unidades,
      },
      cambioMensual: cambio,
      acumulado: {
        utilidad: totales.utilidad,
        ventas: totales.ventas,
        costo: totales.costo,
        unidades: totales.unidades,
      },
    };
  }

  async getReporteVentas(fechaDesde: Date, fechaHasta: Date) {
    return this.prisma.venta.findMany({
      where: {
        fecha: { gte: fechaDesde, lte: fechaHasta },
      },
      include: {
        cliente: true,
        detalles: { include: { producto: true } },
        pagos: true,
      },
      orderBy: { fecha: 'desc' },
    });
  }

  async getReporteInventario() {
    return this.prisma.producto.findMany({
      where: { activo: true },
      include: { categoria: true },
      orderBy: [{ estado: 'asc' }, { stockActual: 'asc' }],
    });
  }
}
