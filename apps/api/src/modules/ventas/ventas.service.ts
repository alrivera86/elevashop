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

    // Crear venta con transacción
    const venta = await this.prisma.$transaction(async (tx: any) => {
      // Crear la venta
      const nuevaVenta = await tx.venta.create({
        data: {
          clienteId: createVentaDto.clienteId,
          usuarioId,
          numeroOrden: createVentaDto.numeroOrden,
          subtotal: createVentaDto.subtotal,
          descuento: createVentaDto.descuento || 0,
          impuesto: createVentaDto.impuesto || 0,
          total: createVentaDto.total,
          notas: createVentaDto.notas,
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
          pagos: {
            create: createVentaDto.pagos?.map((p) => ({
              metodoPago: p.metodoPago,
              monto: p.monto,
              moneda: p.moneda || 'USD',
              tasaCambio: p.tasaCambio,
              montoBs: p.montoBs,
              referencia: p.referencia,
            })) || [],
          },
        },
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
        await tx.movimientoStock.create({
          data: {
            productoId: detalle.productoId,
            tipo: 'SALIDA',
            cantidad: detalle.cantidad,
            stockAnterior: producto!.stockActual + detalle.cantidad,
            stockNuevo: producto!.stockActual,
            referencia: nuevaVenta.numeroOrden || `VENTA-${nuevaVenta.id}`,
            motivo: `Venta a ${cliente.nombre}`,
          },
        });

        // Si tiene serial, actualizar la UnidadInventario
        if (detalle.serial) {
          const unidad = await tx.unidadInventario.findUnique({
            where: { serial: detalle.serial.toUpperCase().trim() },
          });

          if (unidad && unidad.estado === 'DISPONIBLE') {
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

      // Actualizar total de compras del cliente
      await tx.cliente.update({
        where: { id: cliente.id },
        data: {
          totalCompras: { increment: createVentaDto.total },
          cantidadOrdenes: { increment: 1 },
        },
      });

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
  }) {
    const { page = 1, limit = 20, clienteId, fechaDesde, fechaHasta } = options || {};
    const skip = (page - 1) * limit;

    const where: any = {};

    if (clienteId) where.clienteId = clienteId;
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
}
