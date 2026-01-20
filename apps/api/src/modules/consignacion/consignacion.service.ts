import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';
import {
  CreateConsignatarioDto,
  UpdateConsignatarioDto,
  CreateConsignacionDto,
  RegistrarPagoDto,
  ReportarVentaDto,
  ReportarDevolucionDto,
} from './dto';
import { EstadoConsignacion, EstadoDetalleConsignacion, EstadoUnidad } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class ConsignacionService {
  constructor(private prisma: PrismaService) {}

  // ==================== CONSIGNATARIOS ====================

  async createConsignatario(dto: CreateConsignatarioDto) {
    return this.prisma.consignatario.create({
      data: dto,
    });
  }

  async findAllConsignatarios(options?: {
    page?: number;
    limit?: number;
    search?: string;
    activo?: boolean;
  }) {
    const page = options?.page || 1;
    const limit = options?.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (options?.activo !== undefined) {
      where.activo = options.activo;
    }
    if (options?.search) {
      where.OR = [
        { nombre: { contains: options.search, mode: 'insensitive' } },
        { email: { contains: options.search, mode: 'insensitive' } },
        { telefono: { contains: options.search } },
      ];
    }

    const [consignatarios, total] = await Promise.all([
      this.prisma.consignatario.findMany({
        where,
        skip,
        take: limit,
        orderBy: { nombre: 'asc' },
        include: {
          _count: {
            select: { consignaciones: true },
          },
        },
      }),
      this.prisma.consignatario.count({ where }),
    ]);

    return {
      consignatarios,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOneConsignatario(id: number) {
    const consignatario = await this.prisma.consignatario.findUnique({
      where: { id },
      include: {
        consignaciones: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            detalles: {
              include: {
                producto: {
                  select: { id: true, codigo: true, nombre: true },
                },
                unidadInventario: {
                  select: { id: true, serial: true },
                },
              },
            },
          },
        },
        pagos: {
          orderBy: { fecha: 'desc' },
          take: 10,
        },
        _count: {
          select: { consignaciones: true, pagos: true },
        },
      },
    });

    if (!consignatario) {
      throw new NotFoundException(`Consignatario con ID ${id} no encontrado`);
    }

    return consignatario;
  }

  async updateConsignatario(id: number, dto: UpdateConsignatarioDto) {
    await this.findOneConsignatario(id);
    return this.prisma.consignatario.update({
      where: { id },
      data: dto,
    });
  }

  async deactivateConsignatario(id: number) {
    await this.findOneConsignatario(id);
    return this.prisma.consignatario.update({
      where: { id },
      data: { activo: false },
    });
  }

  // ==================== CONSIGNACIONES ====================

  async createConsignacion(dto: CreateConsignacionDto) {
    // Verificar que el consignatario existe y está activo
    const consignatario = await this.prisma.consignatario.findUnique({
      where: { id: dto.consignatarioId },
    });
    if (!consignatario) {
      throw new NotFoundException('Consignatario no encontrado');
    }
    if (!consignatario.activo) {
      throw new BadRequestException('El consignatario no está activo');
    }

    // Verificar que todas las unidades existen y están DISPONIBLES
    const unidadIds = dto.detalles.map((d) => d.unidadInventarioId);
    const unidades = await this.prisma.unidadInventario.findMany({
      where: { id: { in: unidadIds } },
      include: { producto: true },
    });

    if (unidades.length !== unidadIds.length) {
      throw new BadRequestException('Algunas unidades de inventario no existen');
    }

    const noDisponibles = unidades.filter((u) => u.estado !== EstadoUnidad.DISPONIBLE);
    if (noDisponibles.length > 0) {
      throw new BadRequestException(
        `Las siguientes unidades no están disponibles: ${noDisponibles.map((u) => u.serial).join(', ')}`,
      );
    }

    // Generar número de consignación
    const lastConsignacion = await this.prisma.consignacion.findFirst({
      orderBy: { id: 'desc' },
      select: { numero: true },
    });
    const nextNumber = lastConsignacion
      ? parseInt(lastConsignacion.numero.replace('CON-', '')) + 1
      : 1;
    const numero = `CON-${String(nextNumber).padStart(3, '0')}`;

    // Calcular valor total
    const valorTotal = dto.detalles.reduce(
      (sum, d) => sum + d.precioConsignacion,
      0,
    );

    // Crear consignación con transacción
    const result = await this.prisma.$transaction(async (tx) => {
      // Crear la consignación
      const consignacion = await tx.consignacion.create({
        data: {
          numero,
          consignatarioId: dto.consignatarioId,
          fechaEntrega: dto.fechaEntrega ? new Date(dto.fechaEntrega) : new Date(),
          fechaLimite: dto.fechaLimite ? new Date(dto.fechaLimite) : null,
          valorTotal,
          valorPendiente: valorTotal,
          notas: dto.notas,
          detalles: {
            create: dto.detalles.map((d) => ({
              productoId: d.productoId,
              unidadInventarioId: d.unidadInventarioId,
              precioConsignacion: d.precioConsignacion,
            })),
          },
        },
        include: {
          detalles: {
            include: {
              producto: true,
              unidadInventario: true,
            },
          },
        },
      });

      // Marcar unidades como CONSIGNADO
      await tx.unidadInventario.updateMany({
        where: { id: { in: unidadIds } },
        data: { estado: EstadoUnidad.CONSIGNADO },
      });

      // Restar stock de los productos
      const productoIds = [...new Set(dto.detalles.map((d) => d.productoId))];
      for (const productoId of productoIds) {
        const cantidad = dto.detalles.filter(
          (d) => d.productoId === productoId,
        ).length;
        await tx.producto.update({
          where: { id: productoId },
          data: { stockActual: { decrement: cantidad } },
        });
      }

      // Actualizar saldos del consignatario
      await tx.consignatario.update({
        where: { id: dto.consignatarioId },
        data: {
          totalConsignado: { increment: valorTotal },
          saldoPendiente: { increment: valorTotal },
        },
      });

      return consignacion;
    });

    return result;
  }

  async findAllConsignaciones(options?: {
    page?: number;
    limit?: number;
    consignatarioId?: number;
    estado?: EstadoConsignacion;
  }) {
    const page = options?.page || 1;
    const limit = options?.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (options?.consignatarioId) {
      where.consignatarioId = options.consignatarioId;
    }
    if (options?.estado) {
      where.estado = options.estado;
    }

    const [consignaciones, total] = await Promise.all([
      this.prisma.consignacion.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          consignatario: {
            select: { id: true, nombre: true, telefono: true },
          },
          detalles: {
            include: {
              producto: {
                select: { id: true, codigo: true, nombre: true },
              },
              unidadInventario: {
                select: { id: true, serial: true },
              },
            },
          },
          _count: {
            select: { detalles: true },
          },
        },
      }),
      this.prisma.consignacion.count({ where }),
    ]);

    return {
      consignaciones,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOneConsignacion(id: number) {
    const consignacion = await this.prisma.consignacion.findUnique({
      where: { id },
      include: {
        consignatario: true,
        detalles: {
          include: {
            producto: true,
            unidadInventario: true,
          },
        },
        pagos: {
          orderBy: { fecha: 'desc' },
        },
      },
    });

    if (!consignacion) {
      throw new NotFoundException(`Consignación con ID ${id} no encontrada`);
    }

    return consignacion;
  }

  // ==================== REPORTAR VENTA ====================

  async reportarVenta(consignacionId: number, dto: ReportarVentaDto) {
    const consignacion = await this.findOneConsignacion(consignacionId);

    // Verificar que los detalles pertenecen a la consignación
    const detalles = await this.prisma.consignacionDetalle.findMany({
      where: {
        id: { in: dto.detalleIds },
        consignacionId,
        estado: EstadoDetalleConsignacion.CONSIGNADO,
      },
      include: {
        unidadInventario: true,
      },
    });

    if (detalles.length !== dto.detalleIds.length) {
      throw new BadRequestException(
        'Algunos detalles no existen, no pertenecen a esta consignación o ya fueron procesados',
      );
    }

    const fechaVenta = dto.fechaVenta ? new Date(dto.fechaVenta) : new Date();

    const result = await this.prisma.$transaction(async (tx) => {
      // Marcar detalles como vendidos
      await tx.consignacionDetalle.updateMany({
        where: { id: { in: dto.detalleIds } },
        data: {
          estado: EstadoDetalleConsignacion.VENDIDO,
          fechaVenta,
        },
      });

      // Marcar unidades como vendidas
      const unidadIds = detalles.map((d) => d.unidadInventarioId);
      await tx.unidadInventario.updateMany({
        where: { id: { in: unidadIds } },
        data: { estado: EstadoUnidad.VENDIDO },
      });

      // Actualizar estado de la consignación si corresponde
      const updatedConsignacion = await this.actualizarEstadoConsignacion(
        tx,
        consignacionId,
      );

      return updatedConsignacion;
    });

    return result;
  }

  // ==================== DEVOLUCION ====================

  async reportarDevolucion(consignacionId: number, dto: ReportarDevolucionDto) {
    const consignacion = await this.findOneConsignacion(consignacionId);

    // Verificar que los detalles pertenecen a la consignación
    const detalles = await this.prisma.consignacionDetalle.findMany({
      where: {
        id: { in: dto.detalleIds },
        consignacionId,
        estado: EstadoDetalleConsignacion.CONSIGNADO,
      },
      include: {
        unidadInventario: true,
        producto: true,
      },
    });

    if (detalles.length !== dto.detalleIds.length) {
      throw new BadRequestException(
        'Algunos detalles no existen, no pertenecen a esta consignación o ya fueron procesados',
      );
    }

    const fechaDevolucion = dto.fechaDevolucion
      ? new Date(dto.fechaDevolucion)
      : new Date();

    // Calcular monto devuelto
    const montoDevuelto = detalles.reduce(
      (sum, d) => sum + Number(d.precioConsignacion),
      0,
    );

    const result = await this.prisma.$transaction(async (tx) => {
      // Marcar detalles como devueltos
      await tx.consignacionDetalle.updateMany({
        where: { id: { in: dto.detalleIds } },
        data: {
          estado: EstadoDetalleConsignacion.DEVUELTO,
          fechaDevolucion,
        },
      });

      // Marcar unidades como disponibles
      const unidadIds = detalles.map((d) => d.unidadInventarioId);
      await tx.unidadInventario.updateMany({
        where: { id: { in: unidadIds } },
        data: { estado: EstadoUnidad.DISPONIBLE },
      });

      // Sumar stock a los productos
      const productoIds = [...new Set(detalles.map((d) => d.productoId))];
      for (const productoId of productoIds) {
        const cantidad = detalles.filter((d) => d.productoId === productoId)
          .length;
        await tx.producto.update({
          where: { id: productoId },
          data: { stockActual: { increment: cantidad } },
        });
      }

      // Actualizar valorTotal y valorPendiente de la consignación
      await tx.consignacion.update({
        where: { id: consignacionId },
        data: {
          valorTotal: { decrement: montoDevuelto },
          valorPendiente: { decrement: montoDevuelto },
        },
      });

      // Actualizar saldos del consignatario
      await tx.consignatario.update({
        where: { id: consignacion.consignatarioId },
        data: {
          totalConsignado: { decrement: montoDevuelto },
          saldoPendiente: { decrement: montoDevuelto },
        },
      });

      // Actualizar estado de la consignación
      const updatedConsignacion = await this.actualizarEstadoConsignacion(
        tx,
        consignacionId,
      );

      return updatedConsignacion;
    });

    return result;
  }

  // ==================== PAGOS ====================

  async registrarPago(dto: RegistrarPagoDto) {
    // Verificar consignatario
    const consignatario = await this.prisma.consignatario.findUnique({
      where: { id: dto.consignatarioId },
    });
    if (!consignatario) {
      throw new NotFoundException('Consignatario no encontrado');
    }

    // Si se especifica consignación, verificar que existe
    if (dto.consignacionId) {
      const consignacion = await this.prisma.consignacion.findUnique({
        where: { id: dto.consignacionId },
      });
      if (!consignacion) {
        throw new NotFoundException('Consignación no encontrada');
      }
      if (consignacion.consignatarioId !== dto.consignatarioId) {
        throw new BadRequestException(
          'La consignación no pertenece a este consignatario',
        );
      }
    }

    const fecha = dto.fecha ? new Date(dto.fecha) : new Date();

    const result = await this.prisma.$transaction(async (tx) => {
      // Crear el pago
      const pago = await tx.consignacionPago.create({
        data: {
          consignatarioId: dto.consignatarioId,
          consignacionId: dto.consignacionId,
          monto: dto.monto,
          metodoPago: dto.metodoPago,
          referencia: dto.referencia,
          fecha,
          notas: dto.notas,
        },
      });

      // Actualizar saldos del consignatario
      await tx.consignatario.update({
        where: { id: dto.consignatarioId },
        data: {
          totalPagado: { increment: dto.monto },
          saldoPendiente: { decrement: dto.monto },
        },
      });

      // Si es pago a una consignación específica, actualizarla
      if (dto.consignacionId) {
        await tx.consignacion.update({
          where: { id: dto.consignacionId },
          data: {
            valorPagado: { increment: dto.monto },
            valorPendiente: { decrement: dto.monto },
          },
        });

        // Actualizar estado de la consignación
        await this.actualizarEstadoConsignacion(tx, dto.consignacionId);
      }

      return pago;
    });

    return result;
  }

  // ==================== DASHBOARD ====================

  async getDashboard() {
    const [
      resumenGeneral,
      consignatariosActivos,
      consignacionesPendientes,
      consignacionesVencidas,
    ] = await Promise.all([
      this.prisma.consignatario.aggregate({
        where: { activo: true },
        _sum: {
          totalConsignado: true,
          totalPagado: true,
          saldoPendiente: true,
        },
        _count: true,
      }),
      this.prisma.consignatario.count({ where: { activo: true } }),
      this.prisma.consignacion.count({
        where: { estado: { in: [EstadoConsignacion.PENDIENTE, EstadoConsignacion.EN_PROCESO] } },
      }),
      this.prisma.consignacion.count({
        where: { estado: EstadoConsignacion.VENCIDA },
      }),
    ]);

    // Top 5 consignatarios por saldo pendiente
    const topDeudores = await this.prisma.consignatario.findMany({
      where: {
        activo: true,
        saldoPendiente: { gt: 0 },
      },
      orderBy: { saldoPendiente: 'desc' },
      take: 5,
      select: {
        id: true,
        nombre: true,
        telefono: true,
        totalConsignado: true,
        totalPagado: true,
        saldoPendiente: true,
      },
    });

    return {
      valorTotalConsignado: Number(resumenGeneral._sum.totalConsignado) || 0,
      valorTotalPagado: Number(resumenGeneral._sum.totalPagado) || 0,
      valorPorCobrar: Number(resumenGeneral._sum.saldoPendiente) || 0,
      totalConsignatarios: consignatariosActivos,
      consignacionesPendientes,
      consignacionesVencidas,
      topDeudores,
    };
  }

  async getResumenPorCobrar() {
    const consignatarios = await this.prisma.consignatario.findMany({
      where: {
        activo: true,
        saldoPendiente: { gt: 0 },
      },
      orderBy: { saldoPendiente: 'desc' },
      include: {
        consignaciones: {
          where: {
            estado: { in: [EstadoConsignacion.PENDIENTE, EstadoConsignacion.EN_PROCESO] },
          },
          include: {
            detalles: {
              where: {
                estado: { in: [EstadoDetalleConsignacion.CONSIGNADO, EstadoDetalleConsignacion.VENDIDO] },
              },
              include: {
                producto: {
                  select: { id: true, codigo: true, nombre: true },
                },
                unidadInventario: {
                  select: { id: true, serial: true },
                },
              },
            },
          },
        },
      },
    });

    return consignatarios.map((c) => ({
      consignatario: {
        id: c.id,
        nombre: c.nombre,
        telefono: c.telefono,
      },
      totalConsignado: Number(c.totalConsignado),
      totalPagado: Number(c.totalPagado),
      saldoPendiente: Number(c.saldoPendiente),
      consignaciones: c.consignaciones.map((con) => ({
        id: con.id,
        numero: con.numero,
        fechaEntrega: con.fechaEntrega,
        fechaLimite: con.fechaLimite,
        valorTotal: Number(con.valorTotal),
        valorPagado: Number(con.valorPagado),
        valorPendiente: Number(con.valorPendiente),
        estado: con.estado,
        detalles: con.detalles.map((d) => ({
          id: d.id,
          producto: d.producto,
          serial: d.unidadInventario.serial,
          precioConsignacion: Number(d.precioConsignacion),
          estado: d.estado,
        })),
      })),
    }));
  }

  // ==================== HELPERS ====================

  private async actualizarEstadoConsignacion(tx: any, consignacionId: number) {
    const consignacion = await tx.consignacion.findUnique({
      where: { id: consignacionId },
      include: {
        detalles: true,
      },
    });

    const detalles = consignacion.detalles;
    const todosVendidosODevueltos = detalles.every(
      (d: any) =>
        d.estado === EstadoDetalleConsignacion.VENDIDO ||
        d.estado === EstadoDetalleConsignacion.DEVUELTO,
    );
    const algunoVendido = detalles.some(
      (d: any) => d.estado === EstadoDetalleConsignacion.VENDIDO,
    );
    const todosDevueltos = detalles.every(
      (d: any) => d.estado === EstadoDetalleConsignacion.DEVUELTO,
    );

    let nuevoEstado = consignacion.estado;

    if (todosDevueltos) {
      nuevoEstado = EstadoConsignacion.CANCELADA;
    } else if (
      todosVendidosODevueltos &&
      Number(consignacion.valorPendiente) <= 0
    ) {
      nuevoEstado = EstadoConsignacion.LIQUIDADA;
    } else if (algunoVendido || Number(consignacion.valorPagado) > 0) {
      nuevoEstado = EstadoConsignacion.EN_PROCESO;
    }

    if (nuevoEstado !== consignacion.estado) {
      await tx.consignacion.update({
        where: { id: consignacionId },
        data: { estado: nuevoEstado },
      });
    }

    return tx.consignacion.findUnique({
      where: { id: consignacionId },
      include: {
        consignatario: true,
        detalles: {
          include: {
            producto: true,
            unidadInventario: true,
          },
        },
        pagos: true,
      },
    });
  }
}
