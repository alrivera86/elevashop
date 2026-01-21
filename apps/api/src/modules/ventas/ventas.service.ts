import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';
import { InventarioService } from '../inventario/inventario.service';
import { ClientesService } from '../clientes/clientes.service';
import { CreateVentaDto } from './dto/create-venta.dto';

@Injectable()
export class VentasService {
  constructor(
    private prisma: PrismaService,
    private inventarioService: InventarioService,
    private clientesService: ClientesService,
  ) {}

  async create(createVentaDto: CreateVentaDto, usuarioId: number) {
    // Verificar cliente
    const cliente = await this.clientesService.findOne(createVentaDto.clienteId);

    // Validar stock de todos los productos
    for (const detalle of createVentaDto.detalles) {
      const producto = await this.prisma.producto.findUnique({
        where: { id: detalle.productoId },
      });

      if (!producto) {
        throw new NotFoundException(`Producto con ID ${detalle.productoId} no encontrado`);
      }

      if (producto.stockActual < detalle.cantidad) {
        throw new BadRequestException(
          `Stock insuficiente para ${producto.codigo}. Disponible: ${producto.stockActual}`,
        );
      }
    }

    const tipoVenta = createVentaDto.tipoVenta || 'VENTA';
    const esConsignacion = tipoVenta === 'CONSIGNACION';

    // Crear venta con transacción
    const venta = await this.prisma.$transaction(async (tx: any) => {
      // Preparar datos de la venta
      const ventaData: any = {
        clienteId: createVentaDto.clienteId,
        usuarioId,
        tipoVenta,
        numeroOrden: createVentaDto.numeroOrden,
        subtotal: createVentaDto.subtotal,
        descuento: createVentaDto.descuento || 0,
        impuesto: createVentaDto.impuesto || 0,
        total: createVentaDto.total,
        notas: createVentaDto.notas,
        // Las consignaciones empiezan como PENDIENTE de pago
        estadoPago: esConsignacion ? 'PENDIENTE' : (createVentaDto.pagos?.length ? 'PAGADO' : 'PENDIENTE'),
        detalles: {
          create: createVentaDto.detalles.map((d) => ({
            productoId: d.productoId,
            cantidad: d.cantidad,
            precioUnitario: d.precioUnitario,
            descuento: d.descuento || 0,
            subtotal: d.cantidad * d.precioUnitario - (d.descuento || 0),
            serial: d.serial,
          })),
        },
      };

      // Solo agregar pagos si NO es consignación y hay pagos
      if (!esConsignacion && createVentaDto.pagos?.length) {
        ventaData.pagos = {
          create: createVentaDto.pagos.map((p) => ({
            metodoPago: p.metodoPago,
            monto: p.monto,
            moneda: p.moneda || 'USD',
            tasaCambio: p.tasaCambio,
            montoBs: p.montoBs,
            referencia: p.referencia,
          })),
        };
      }

      // Crear la venta
      const nuevaVenta = await tx.venta.create({
        data: ventaData,
        include: {
          detalles: { include: { producto: true } },
          pagos: true,
          cliente: true,
        },
      });

      // Descontar stock y actualizar seriales
      for (const detalle of createVentaDto.detalles) {
        await tx.producto.update({
          where: { id: detalle.productoId },
          data: {
            stockActual: { decrement: detalle.cantidad },
          },
        });

        // Registrar movimiento de stock
        const producto = await tx.producto.findUnique({ where: { id: detalle.productoId } });
        const prefijo = esConsignacion ? 'CONS' : 'VENTA';
        await tx.movimientoStock.create({
          data: {
            productoId: detalle.productoId,
            tipo: 'SALIDA',
            cantidad: detalle.cantidad,
            stockAnterior: producto!.stockActual + detalle.cantidad,
            stockNuevo: producto!.stockActual,
            referencia: nuevaVenta.numeroOrden || `${prefijo}-${nuevaVenta.id}`,
            motivo: esConsignacion
              ? `Consignación a ${cliente.nombre}`
              : `Venta a ${cliente.nombre}`,
          },
        });

        // Si tiene serial, actualizar la UnidadInventario
        if (detalle.serial) {
          const unidad = await tx.unidadInventario.findUnique({
            where: { serial: detalle.serial.toUpperCase().trim() },
          });

          if (unidad && unidad.estado === 'DISPONIBLE') {
            if (esConsignacion) {
              // Consignación: marcar como CONSIGNADO
              await tx.unidadInventario.update({
                where: { serial: detalle.serial.toUpperCase().trim() },
                data: {
                  estado: 'CONSIGNADO',
                  clienteId: cliente.id,
                  ventaId: nuevaVenta.id,
                  precioVenta: detalle.precioUnitario,
                },
              });
            } else {
              // Venta normal: marcar como VENDIDO
              const utilidad = detalle.precioUnitario - Number(unidad.costoUnitario);
              const garantiaHasta = unidad.garantiaMeses
                ? new Date(Date.now() + unidad.garantiaMeses * 30 * 24 * 60 * 60 * 1000)
                : null;

              await tx.unidadInventario.update({
                where: { serial: detalle.serial.toUpperCase().trim() },
                data: {
                  estado: 'VENDIDO',
                  fechaVenta: new Date(),
                  clienteId: cliente.id,
                  ventaId: nuevaVenta.id,
                  precioVenta: detalle.precioUnitario,
                  metodoPago: createVentaDto.pagos?.[0]?.metodoPago,
                  utilidad,
                  garantiaHasta,
                },
              });
            }
          }
        }
      }

      // Solo actualizar estadísticas del cliente para ventas, no consignaciones
      if (!esConsignacion) {
        await tx.cliente.update({
          where: { id: cliente.id },
          data: {
            totalCompras: { increment: createVentaDto.total },
            cantidadOrdenes: { increment: 1 },
          },
        });
      }

      return nuevaVenta;
    });

    return venta;
  }

  async findAll(options?: {
    page?: number;
    limit?: number;
    clienteId?: number;
    fechaDesde?: Date;
    fechaHasta?: Date;
    tipoVenta?: 'VENTA' | 'CONSIGNACION';
  }) {
    const { page = 1, limit = 20, clienteId, fechaDesde, fechaHasta, tipoVenta } = options || {};
    const skip = (page - 1) * limit;

    const where: any = {};

    if (clienteId) where.clienteId = clienteId;
    if (tipoVenta) where.tipoVenta = tipoVenta;
    if (fechaDesde || fechaHasta) {
      where.fecha = {};
      if (fechaDesde) where.fecha.gte = fechaDesde;
      if (fechaHasta) where.fecha.lte = fechaHasta;
    }

    const [ventas, total] = await Promise.all([
      this.prisma.venta.findMany({
        where,
        skip,
        take: limit,
        include: {
          cliente: true,
          usuario: { select: { id: true, nombreCompleto: true } },
          detalles: { include: { producto: true } },
          pagos: true,
        },
        orderBy: { fecha: 'desc' },
      }),
      this.prisma.venta.count({ where }),
    ]);

    return {
      ventas,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: number) {
    const venta = await this.prisma.venta.findUnique({
      where: { id },
      include: {
        cliente: true,
        usuario: { select: { id: true, nombreCompleto: true } },
        detalles: { include: { producto: true } },
        pagos: true,
      },
    });

    if (!venta) {
      throw new NotFoundException(`Venta con ID ${id} no encontrada`);
    }

    return venta;
  }

  async getEstadisticasVentas(fechaDesde?: Date, fechaHasta?: Date) {
    // Usar la tabla ventas para estadísticas del mes actual
    const now = new Date();
    const primerDiaMes = new Date(now.getFullYear(), now.getMonth(), 1);
    const ultimoDiaMes = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const [totalVentasResult, cantidadVentas] = await Promise.all([
      this.prisma.venta.aggregate({
        where: {
          fecha: {
            gte: primerDiaMes,
            lte: ultimoDiaMes,
          },
        },
        _sum: { total: true },
      }),
      this.prisma.venta.count({
        where: {
          fecha: {
            gte: primerDiaMes,
            lte: ultimoDiaMes,
          },
        },
      }),
    ]);

    const totalVentas = Number(totalVentasResult._sum.total) || 0;
    const ticketPromedio = cantidadVentas > 0 ? totalVentas / cantidadVentas : 0;

    return {
      totalVentas,
      cantidadVentas,
      ticketPromedio,
    };
  }

  async getVentasUltimos7Dias() {
    const now = new Date();
    const hace7Dias = new Date(now);
    hace7Dias.setDate(hace7Dias.getDate() - 6);
    hace7Dias.setHours(0, 0, 0, 0);

    // Obtener ventas de la tabla ventas agrupadas por día
    const ventas = await this.prisma.venta.findMany({
      where: {
        fecha: {
          gte: hace7Dias,
          lte: now,
        },
      },
      include: {
        detalles: {
          include: {
            producto: {
              select: { id: true, codigo: true, nombre: true },
            },
          },
        },
        cliente: {
          select: { id: true, nombre: true },
        },
      },
      orderBy: { fecha: 'desc' },
    });

    // Generar array de últimos 7 días
    const dias: {
      fecha: string;
      nombreDia: string;
      total: number;
      cantidad: number;
      productos: { nombre: string; cantidad: number; total: number }[];
    }[] = [];

    const diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

    for (let i = 6; i >= 0; i--) {
      const fecha = new Date(now);
      fecha.setDate(fecha.getDate() - i);
      fecha.setHours(0, 0, 0, 0);

      const fechaStr = fecha.toISOString().split('T')[0];
      const nombreDia = i === 0 ? 'Hoy' : i === 1 ? 'Ayer' : diasSemana[fecha.getDay()];

      // Filtrar ventas de este día
      const ventasDelDia = ventas.filter((v: { fecha: Date; total: any; detalles: any[] }) => {
        const ventaFecha = new Date(v.fecha);
        ventaFecha.setHours(0, 0, 0, 0);
        return ventaFecha.getTime() === fecha.getTime();
      });

      // Agrupar productos vendidos
      const productosMap = new Map<string, { nombre: string; cantidad: number; total: number }>();
      let totalDia = 0;
      let cantidadDia = ventasDelDia.length;

      for (const venta of ventasDelDia) {
        totalDia += Number(venta.total);
        for (const detalle of venta.detalles) {
          const key = detalle.producto.nombre;
          const existing = productosMap.get(key);
          if (existing) {
            existing.cantidad += detalle.cantidad;
            existing.total += Number(detalle.subtotal);
          } else {
            productosMap.set(key, {
              nombre: detalle.producto.nombre,
              cantidad: detalle.cantidad,
              total: Number(detalle.subtotal),
            });
          }
        }
      }

      dias.push({
        fecha: fechaStr,
        nombreDia,
        total: totalDia,
        cantidad: cantidadDia,
        productos: Array.from(productosMap.values()),
      });
    }

    return {
      dias,
      totalPeriodo: dias.reduce((sum, d) => sum + d.total, 0),
      cantidadVentas: dias.reduce((sum, d) => sum + d.cantidad, 0),
    };
  }

  async getVentasHoy() {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const manana = new Date(hoy);
    manana.setDate(manana.getDate() + 1);

    const ventas = await this.prisma.venta.findMany({
      where: {
        fecha: {
          gte: hoy,
          lt: manana,
        },
      },
      include: {
        cliente: { select: { id: true, nombre: true, telefono: true } },
        detalles: {
          include: {
            producto: { select: { id: true, codigo: true, nombre: true } },
          },
        },
        pagos: true,
      },
      orderBy: { fecha: 'desc' },
    });

    const totalVentas = ventas.reduce((sum, v) => sum + Number(v.total), 0);
    const cantidadVentas = ventas.length;
    const ticketPromedio = cantidadVentas > 0 ? totalVentas / cantidadVentas : 0;

    return {
      fecha: hoy.toISOString().split('T')[0],
      cantidadVentas,
      totalVentas,
      ticketPromedio,
      ventas: ventas.map(v => ({
        id: v.id,
        numero: v.numeroOrden,
        cliente: v.cliente?.nombre || 'Cliente general',
        total: Number(v.total),
        hora: new Date(v.fecha).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' }),
        productos: v.detalles.length,
        tipoVenta: v.tipoVenta,
        estadoPago: v.estadoPago,
      })),
    };
  }

  async getUltimaVenta() {
    const venta: any = await this.prisma.venta.findFirst({
      orderBy: { fecha: 'desc' },
      include: {
        cliente: { select: { id: true, nombre: true, telefono: true } },
        detalles: {
          include: {
            producto: { select: { id: true, codigo: true, nombre: true } },
          },
        },
        pagos: true,
        usuario: { select: { id: true, nombreCompleto: true } },
      },
    });

    if (!venta) {
      return { mensaje: 'No hay ventas registradas' };
    }

    return {
      id: venta.id,
      numero: venta.numeroOrden,
      fecha: venta.fecha,
      hora: new Date(venta.fecha).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' }),
      cliente: venta.cliente?.nombre || 'Cliente general',
      clienteTelefono: venta.cliente?.telefono,
      vendedor: venta.usuario?.nombreCompleto,
      total: Number(venta.total),
      tipoVenta: venta.tipoVenta,
      estadoPago: venta.estadoPago,
      productos: venta.detalles.map((d: any) => ({
        nombre: d.producto.nombre,
        codigo: d.producto.codigo,
        cantidad: d.cantidad,
        precio: Number(d.precioUnitario),
        subtotal: Number(d.subtotal),
      })),
      pagos: venta.pagos.map((p: any) => ({
        metodo: p.metodoPago,
        monto: Number(p.monto),
        moneda: p.moneda,
      })),
    };
  }

  async getConsignacionesDashboard() {
    // Obtener todas las consignaciones pendientes de pago
    const consignacionesPendientes = await this.prisma.venta.findMany({
      where: {
        tipoVenta: 'CONSIGNACION',
        estadoPago: { in: ['PENDIENTE', 'PARCIAL'] },
      },
      include: {
        cliente: { select: { id: true, nombre: true, telefono: true } },
        detalles: { include: { producto: { select: { id: true, codigo: true, nombre: true } } } },
      },
      orderBy: { fecha: 'desc' },
    });

    // Calcular totales
    const totalConsignado = consignacionesPendientes.reduce(
      (sum, c) => sum + Number(c.total),
      0,
    );

    // Calcular total pagado (de VentaPago)
    const pagosConsignaciones = await this.prisma.ventaPago.findMany({
      where: {
        venta: {
          tipoVenta: 'CONSIGNACION',
        },
      },
    });
    const totalPagado = pagosConsignaciones.reduce((sum, p) => sum + Number(p.monto), 0);

    const porCobrar = totalConsignado - totalPagado;

    // Top clientes con más consignaciones pendientes
    const clientesMap = new Map<number, { cliente: any; total: number; cantidad: number }>();
    for (const cons of consignacionesPendientes) {
      const existing = clientesMap.get(cons.clienteId);
      if (existing) {
        existing.total += Number(cons.total);
        existing.cantidad += 1;
      } else {
        clientesMap.set(cons.clienteId, {
          cliente: cons.cliente,
          total: Number(cons.total),
          cantidad: 1,
        });
      }
    }

    const topClientes = Array.from(clientesMap.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    // Unidades en consignación (por serial)
    const unidadesConsignadas = await this.prisma.unidadInventario.findMany({
      where: { estado: 'CONSIGNADO' },
      include: {
        producto: { select: { id: true, codigo: true, nombre: true } },
        cliente: { select: { id: true, nombre: true } },
      },
    });

    return {
      totalConsignado,
      totalPagado,
      porCobrar,
      cantidadConsignaciones: consignacionesPendientes.length,
      consignacionesPendientes,
      topClientes,
      unidadesConsignadas: unidadesConsignadas.length,
    };
  }

  async liquidarConsignacion(ventaId: number, pagos: any[]) {
    const venta = await this.findOne(ventaId);

    if (venta.tipoVenta !== 'CONSIGNACION') {
      throw new BadRequestException('Esta venta no es una consignación');
    }

    return this.prisma.$transaction(async (tx: any) => {
      // Registrar los pagos
      for (const pago of pagos) {
        await tx.ventaPago.create({
          data: {
            ventaId,
            metodoPago: pago.metodoPago,
            monto: pago.monto,
            moneda: pago.moneda || 'USD',
            tasaCambio: pago.tasaCambio,
            montoBs: pago.montoBs,
            referencia: pago.referencia,
          },
        });
      }

      // Calcular total pagado
      const totalPagos = await tx.ventaPago.aggregate({
        where: { ventaId },
        _sum: { monto: true },
      });

      const totalPagado = Number(totalPagos._sum.monto) || 0;
      const estadoPago =
        totalPagado >= Number(venta.total)
          ? 'PAGADO'
          : totalPagado > 0
          ? 'PARCIAL'
          : 'PENDIENTE';

      // Actualizar estado de la venta
      await tx.venta.update({
        where: { id: ventaId },
        data: { estadoPago },
      });

      // Si está pagado completamente, actualizar unidades a VENDIDO
      if (estadoPago === 'PAGADO') {
        for (const detalle of venta.detalles) {
          if (detalle.serial) {
            const unidad = await tx.unidadInventario.findUnique({
              where: { serial: detalle.serial.toUpperCase().trim() },
            });

            if (unidad && unidad.estado === 'CONSIGNADO') {
              const utilidad = Number(detalle.precioUnitario) - Number(unidad.costoUnitario);
              const garantiaHasta = unidad.garantiaMeses
                ? new Date(Date.now() + unidad.garantiaMeses * 30 * 24 * 60 * 60 * 1000)
                : null;

              await tx.unidadInventario.update({
                where: { id: unidad.id },
                data: {
                  estado: 'VENDIDO',
                  fechaVenta: new Date(),
                  metodoPago: pagos[0]?.metodoPago,
                  utilidad,
                  garantiaHasta,
                },
              });
            }
          }
        }

        // Actualizar estadísticas del cliente
        await tx.cliente.update({
          where: { id: venta.clienteId },
          data: {
            totalCompras: { increment: Number(venta.total) },
            cantidadOrdenes: { increment: 1 },
          },
        });
      }

      return this.findOne(ventaId);
    });
  }
}
