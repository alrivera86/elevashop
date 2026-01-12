import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../config/prisma.service';
import { TipoMovimiento, EstadoStock, EstadoUnidad, OrigenUnidad } from '@prisma/client';
import { RegistrarMovimientoDto } from './dto/registrar-movimiento.dto';
import { RegistrarSerialDto, RegistrarSerialesMultiplesDto } from './dto/registrar-serial.dto';
import { VenderSerialDto } from './dto/vender-serial.dto';
import { ActualizarSerialDto } from './dto/actualizar-serial.dto';
import {
  ImportacionMasivaDto,
  ImportacionExcelDto,
  ResultadoImportacionDto,
} from './dto/importacion-masiva.dto';

@Injectable()
export class InventarioService {
  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
  ) {}

  async registrarMovimiento(dto: RegistrarMovimientoDto) {
    const producto = await this.prisma.producto.findUnique({
      where: { id: dto.productoId },
    });

    if (!producto) {
      throw new NotFoundException(`Producto con ID ${dto.productoId} no encontrado`);
    }

    const stockAnterior = producto.stockActual;
    let stockNuevo: number;

    switch (dto.tipo) {
      case 'ENTRADA':
        stockNuevo = stockAnterior + dto.cantidad;
        break;
      case 'SALIDA':
        if (stockAnterior < dto.cantidad) {
          throw new BadRequestException(
            `Stock insuficiente. Disponible: ${stockAnterior}, Solicitado: ${dto.cantidad}`,
          );
        }
        stockNuevo = stockAnterior - dto.cantidad;
        break;
      case 'AJUSTE':
        stockNuevo = dto.cantidad; // Ajuste directo al valor indicado
        break;
      case 'DEVOLUCION':
        stockNuevo = stockAnterior + dto.cantidad;
        break;
      default:
        throw new BadRequestException('Tipo de movimiento inválido');
    }

    // Calcular nuevo estado
    const nuevoEstado = this.calcularEstado(
      stockNuevo,
      producto.stockMinimo,
      producto.stockAdvertencia,
    );

    // Crear movimiento y actualizar stock en una transacción
    const [movimiento, productoActualizado] = await this.prisma.$transaction([
      this.prisma.movimientoStock.create({
        data: {
          productoId: dto.productoId,
          tipo: dto.tipo,
          cantidad: dto.cantidad,
          stockAnterior,
          stockNuevo,
          referencia: dto.referencia,
          motivo: dto.motivo,
        },
      }),
      this.prisma.producto.update({
        where: { id: dto.productoId },
        data: {
          stockActual: stockNuevo,
          estado: nuevoEstado,
        },
      }),
    ]);

    // Emitir evento si stock bajo
    if (nuevoEstado !== 'OK' && producto.estado === 'OK') {
      this.eventEmitter.emit('stock.bajo', {
        productoId: producto.id,
        codigo: producto.codigo,
        nombre: producto.nombre,
        stockActual: stockNuevo,
        stockMinimo: producto.stockMinimo,
        estado: nuevoEstado,
      });
    }

    return { movimiento, producto: productoActualizado };
  }

  async getMovimientos(options?: {
    productoId?: number;
    tipo?: TipoMovimiento;
    fechaDesde?: Date;
    fechaHasta?: Date;
    page?: number;
    limit?: number;
  }) {
    const { productoId, tipo, fechaDesde, fechaHasta, page = 1, limit = 50 } = options || {};
    const skip = (page - 1) * limit;

    const where: any = {};

    if (productoId) where.productoId = productoId;
    if (tipo) where.tipo = tipo;
    if (fechaDesde || fechaHasta) {
      where.createdAt = {};
      if (fechaDesde) where.createdAt.gte = fechaDesde;
      if (fechaHasta) where.createdAt.lte = fechaHasta;
    }

    const [movimientos, total] = await Promise.all([
      this.prisma.movimientoStock.findMany({
        where,
        skip,
        take: limit,
        include: { producto: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.movimientoStock.count({ where }),
    ]);

    return {
      movimientos,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getAlertas() {
    return this.prisma.alertaStock.findMany({
      where: { resuelta: false },
      include: { producto: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async resolverAlerta(alertaId: number) {
    return this.prisma.alertaStock.update({
      where: { id: alertaId },
      data: { resuelta: true, resueltaAt: new Date() },
    });
  }

  async getDashboard() {
    const [productos, alertas, totalProductos, valorInventarioResult] = await Promise.all([
      this.prisma.producto.groupBy({
        by: ['estado'],
        where: { activo: true },
        _count: true,
      }),
      this.prisma.alertaStock.count({ where: { resuelta: false } }),
      this.prisma.producto.count({ where: { activo: true } }),
      this.prisma.$queryRaw<[{ valor: number }]>`
        SELECT COALESCE(SUM(stock_actual * precio_elevapartes), 0) as valor
        FROM productos
        WHERE activo = true
      `,
    ]);

    const estadoCount = productos.reduce((acc, item) => {
      acc[item.estado] = item._count;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalProductos,
      productosOk: estadoCount['OK'] || 0,
      productosBajoStock: estadoCount['ALERTA_W'] || estadoCount['ALERTA-W'] || 0,
      productosCriticos: estadoCount['ALERTA'] || 0,
      productosAgotados: estadoCount['AGOTADO'] || 0,
      valorInventario: Number(valorInventarioResult[0]?.valor) || 0,
      alertasNoLeidas: alertas,
    };
  }

  private calcularEstado(
    stockActual: number,
    stockMinimo: number,
    stockAdvertencia: number,
  ): EstadoStock {
    if (stockActual <= 0) return 'AGOTADO';
    if (stockActual <= stockMinimo) return 'ALERTA';
    if (stockActual <= stockAdvertencia) return 'ALERTA_W';
    return 'OK';
  }

  // ============ MÉTODOS DE SERIALES ============

  /**
   * Registrar una nueva unidad con serial
   */
  async registrarSerial(dto: RegistrarSerialDto) {
    // Verificar que el producto existe
    const producto = await this.prisma.producto.findUnique({
      where: { id: dto.productoId },
    });

    if (!producto) {
      throw new NotFoundException(`Producto con ID ${dto.productoId} no encontrado`);
    }

    // Verificar que el serial no existe
    const serialExistente = await this.prisma.unidadInventario.findUnique({
      where: { serial: dto.serial },
    });

    if (serialExistente) {
      throw new ConflictException(`El serial ${dto.serial} ya está registrado`);
    }

    // Calcular fecha de garantía
    const fechaEntrada = dto.fechaEntrada ? new Date(dto.fechaEntrada) : new Date();
    const garantiaMeses = dto.garantiaMeses ?? 6;
    const garantiaHasta = new Date(fechaEntrada);
    garantiaHasta.setMonth(garantiaHasta.getMonth() + garantiaMeses);

    // Crear la unidad y actualizar stock en transacción
    const [unidad, productoActualizado] = await this.prisma.$transaction([
      this.prisma.unidadInventario.create({
        data: {
          productoId: dto.productoId,
          serial: dto.serial.toUpperCase().trim(),
          costoUnitario: dto.costoUnitario,
          origenTipo: dto.origenTipo,
          lote: dto.lote,
          fechaEntrada,
          garantiaMeses,
          garantiaHasta,
          notas: dto.notas,
        },
        include: { producto: true },
      }),
      this.prisma.producto.update({
        where: { id: dto.productoId },
        data: { stockActual: { increment: 1 } },
      }),
    ]);

    // Recalcular estado del producto
    await this.actualizarEstadoProducto(dto.productoId);

    return unidad;
  }

  /**
   * Registrar múltiples seriales de una vez
   */
  async registrarSerialesMultiples(dto: RegistrarSerialesMultiplesDto) {
    // Verificar que el producto existe
    const producto = await this.prisma.producto.findUnique({
      where: { id: dto.productoId },
    });

    if (!producto) {
      throw new NotFoundException(`Producto con ID ${dto.productoId} no encontrado`);
    }

    // Verificar que ningún serial existe
    const serialesNormalizados = dto.seriales.map(s => s.toUpperCase().trim());
    const existentes = await this.prisma.unidadInventario.findMany({
      where: { serial: { in: serialesNormalizados } },
      select: { serial: true },
    });

    if (existentes.length > 0) {
      throw new ConflictException(
        `Los siguientes seriales ya existen: ${existentes.map(e => e.serial).join(', ')}`
      );
    }

    const fechaEntrada = new Date();
    const garantiaMeses = dto.garantiaMeses ?? 6;
    const garantiaHasta = new Date(fechaEntrada);
    garantiaHasta.setMonth(garantiaHasta.getMonth() + garantiaMeses);

    // Crear todas las unidades en transacción
    const resultado = await this.prisma.$transaction(async (tx) => {
      const unidades = await tx.unidadInventario.createMany({
        data: serialesNormalizados.map(serial => ({
          productoId: dto.productoId,
          serial,
          costoUnitario: dto.costoUnitario,
          origenTipo: dto.origenTipo,
          lote: dto.lote,
          fechaEntrada,
          garantiaMeses,
          garantiaHasta,
        })),
      });

      await tx.producto.update({
        where: { id: dto.productoId },
        data: { stockActual: { increment: serialesNormalizados.length } },
      });

      return unidades;
    });

    await this.actualizarEstadoProducto(dto.productoId);

    return {
      registrados: resultado.count,
      seriales: serialesNormalizados,
    };
  }

  /**
   * Vender una unidad por su serial
   */
  async venderSerial(dto: VenderSerialDto) {
    // Buscar la unidad
    const unidad = await this.prisma.unidadInventario.findUnique({
      where: { serial: dto.serial.toUpperCase().trim() },
      include: { producto: true },
    });

    if (!unidad) {
      throw new NotFoundException(`Serial ${dto.serial} no encontrado`);
    }

    if (unidad.estado !== 'DISPONIBLE') {
      throw new BadRequestException(
        `La unidad con serial ${dto.serial} no está disponible para venta (estado: ${unidad.estado})`
      );
    }

    // Verificar que el cliente existe
    const cliente = await this.prisma.cliente.findUnique({
      where: { id: dto.clienteId },
    });

    if (!cliente) {
      throw new NotFoundException(`Cliente con ID ${dto.clienteId} no encontrado`);
    }

    const fechaVenta = dto.fechaVenta ? new Date(dto.fechaVenta) : new Date();
    const utilidad = dto.precioVenta - Number(unidad.costoUnitario);

    // Calcular nueva fecha de garantía desde la venta
    const garantiaHasta = new Date(fechaVenta);
    garantiaHasta.setMonth(garantiaHasta.getMonth() + unidad.garantiaMeses);

    // Actualizar la unidad y el stock
    const [unidadActualizada] = await this.prisma.$transaction([
      this.prisma.unidadInventario.update({
        where: { id: unidad.id },
        data: {
          estado: 'VENDIDO',
          fechaVenta,
          clienteId: dto.clienteId,
          precioVenta: dto.precioVenta,
          metodoPago: dto.metodoPago,
          ventaId: dto.ventaId,
          utilidad,
          garantiaHasta,
          notas: dto.notas ? `${unidad.notas || ''}\n${dto.notas}`.trim() : unidad.notas,
        },
        include: { producto: true, cliente: true },
      }),
      this.prisma.producto.update({
        where: { id: unidad.productoId },
        data: { stockActual: { decrement: 1 } },
      }),
    ]);

    await this.actualizarEstadoProducto(unidad.productoId);

    return unidadActualizada;
  }

  /**
   * Actualizar información de un serial
   */
  async actualizarSerial(serial: string, dto: ActualizarSerialDto) {
    const unidad = await this.prisma.unidadInventario.findUnique({
      where: { serial: serial.toUpperCase().trim() },
    });

    if (!unidad) {
      throw new NotFoundException(`Serial ${serial} no encontrado`);
    }

    // Si cambia a VENDIDO sin pasar por venderSerial, no permitir
    if (dto.estado === 'VENDIDO' && unidad.estado !== 'VENDIDO') {
      throw new BadRequestException('Para vender una unidad use el endpoint de venta');
    }

    // Calcular nueva garantía si cambia garantiaMeses
    let garantiaHasta = unidad.garantiaHasta;
    if (dto.garantiaMeses !== undefined) {
      const fechaBase = unidad.fechaVenta || unidad.fechaEntrada;
      garantiaHasta = new Date(fechaBase);
      garantiaHasta.setMonth(garantiaHasta.getMonth() + dto.garantiaMeses);
    }

    // Si cambia de VENDIDO a DEVUELTO, incrementar stock
    const cambioStock = dto.estado === 'DEVUELTO' && unidad.estado === 'VENDIDO' ? 1 :
                        dto.estado === 'DISPONIBLE' && unidad.estado !== 'DISPONIBLE' ? 1 :
                        dto.estado === 'DEFECTUOSO' && unidad.estado === 'DISPONIBLE' ? -1 : 0;

    const resultado = await this.prisma.$transaction(async (tx) => {
      const actualizada = await tx.unidadInventario.update({
        where: { id: unidad.id },
        data: {
          ...dto,
          garantiaHasta: dto.garantiaMeses !== undefined ? garantiaHasta : undefined,
        },
        include: { producto: true, cliente: true },
      });

      if (cambioStock !== 0) {
        await tx.producto.update({
          where: { id: unidad.productoId },
          data: { stockActual: { increment: cambioStock } },
        });
      }

      return actualizada;
    });

    if (cambioStock !== 0) {
      await this.actualizarEstadoProducto(unidad.productoId);
    }

    return resultado;
  }

  /**
   * Buscar unidad por serial (para validar garantía)
   */
  async buscarPorSerial(serial: string) {
    const unidad = await this.prisma.unidadInventario.findUnique({
      where: { serial: serial.toUpperCase().trim() },
      include: {
        producto: true,
        cliente: true,
      },
    });

    if (!unidad) {
      return null;
    }

    // Calcular si está en garantía
    const ahora = new Date();
    const enGarantia = unidad.garantiaHasta ? unidad.garantiaHasta > ahora : false;
    const diasRestantesGarantia = unidad.garantiaHasta
      ? Math.max(0, Math.ceil((unidad.garantiaHasta.getTime() - ahora.getTime()) / (1000 * 60 * 60 * 24)))
      : 0;

    return {
      ...unidad,
      enGarantia,
      diasRestantesGarantia,
      vendidoPorNosotros: unidad.estado === 'VENDIDO' || unidad.estado === 'DEVUELTO',
    };
  }

  /**
   * Listar seriales de un producto
   */
  async listarSerialesPorProducto(productoId: number, options?: {
    estado?: EstadoUnidad;
    page?: number;
    limit?: number;
  }) {
    const { estado, page = 1, limit = 50 } = options || {};
    const skip = (page - 1) * limit;

    const where: any = { productoId };
    if (estado) where.estado = estado;

    const [unidades, total] = await Promise.all([
      this.prisma.unidadInventario.findMany({
        where,
        skip,
        take: limit,
        include: { cliente: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.unidadInventario.count({ where }),
    ]);

    return {
      unidades,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * Dashboard de seriales
   */
  async getEstadisticasSeriales(productoId?: number) {
    const where = productoId ? { productoId } : {};

    const [porEstado, totalUnidades, valorCosto, valorVenta] = await Promise.all([
      this.prisma.unidadInventario.groupBy({
        by: ['estado'],
        where,
        _count: true,
      }),
      this.prisma.unidadInventario.count({ where }),
      this.prisma.unidadInventario.aggregate({
        where: { ...where, estado: 'DISPONIBLE' },
        _sum: { costoUnitario: true },
      }),
      this.prisma.unidadInventario.aggregate({
        where: { ...where, estado: 'VENDIDO' },
        _sum: { precioVenta: true, utilidad: true },
      }),
    ]);

    const estadoCount = porEstado.reduce((acc, item) => {
      acc[item.estado] = item._count;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalUnidades,
      disponibles: estadoCount['DISPONIBLE'] || 0,
      vendidas: estadoCount['VENDIDO'] || 0,
      defectuosas: estadoCount['DEFECTUOSO'] || 0,
      devueltas: estadoCount['DEVUELTO'] || 0,
      reservadas: estadoCount['RESERVADO'] || 0,
      valorInventarioCosto: Number(valorCosto._sum.costoUnitario) || 0,
      totalVendido: Number(valorVenta._sum.precioVenta) || 0,
      utilidadTotal: Number(valorVenta._sum.utilidad) || 0,
    };
  }

  /**
   * Actualizar estado del producto basado en stock
   */
  private async actualizarEstadoProducto(productoId: number) {
    const producto = await this.prisma.producto.findUnique({
      where: { id: productoId },
    });

    if (producto) {
      const nuevoEstado = this.calcularEstado(
        producto.stockActual,
        producto.stockMinimo,
        producto.stockAdvertencia,
      );

      if (nuevoEstado !== producto.estado) {
        await this.prisma.producto.update({
          where: { id: productoId },
          data: { estado: nuevoEstado },
        });
      }
    }
  }

  // ============ MÉTODOS DE IMPORTACIÓN MASIVA ============

  /**
   * Importación masiva de productos con seriales (formato estructurado)
   */
  async importacionMasiva(dto: ImportacionMasivaDto): Promise<ResultadoImportacionDto> {
    const resultado: ResultadoImportacionDto = {
      totalProcesados: 0,
      exitosos: 0,
      errores: 0,
      detalles: [],
      productosActualizados: [],
    };

    const fechaEntrada = dto.fechaEntrada ? new Date(dto.fechaEntrada) : new Date();
    const garantiaMesesDefault = dto.garantiaMesesDefault ?? 6;

    // 1. Validar que todos los productos existen
    const codigosProductos = [...new Set(dto.productos.map(p => p.codigoProducto.toUpperCase().trim()))];
    const productosDB = await this.prisma.producto.findMany({
      where: {
        OR: [
          { codigo: { in: codigosProductos } },
          { id: { in: dto.productos.filter(p => p.productoId).map(p => p.productoId!) } },
        ],
      },
    });

    const productosPorCodigo = new Map(productosDB.map(p => [p.codigo.toUpperCase(), p]));
    const productosPorId = new Map(productosDB.map(p => [p.id, p]));

    // 2. Recolectar todos los seriales para validar duplicados
    const todosSeriales: string[] = [];
    for (const prod of dto.productos) {
      for (const unidad of prod.unidades) {
        todosSeriales.push(unidad.serial.toUpperCase().trim());
      }
    }

    // Verificar duplicados en el input
    const serialesSet = new Set<string>();
    const serialesDuplicadosInput: string[] = [];
    for (const serial of todosSeriales) {
      if (serialesSet.has(serial)) {
        serialesDuplicadosInput.push(serial);
      }
      serialesSet.add(serial);
    }

    if (serialesDuplicadosInput.length > 0) {
      throw new BadRequestException(
        `Seriales duplicados en el input: ${serialesDuplicadosInput.join(', ')}`
      );
    }

    // Verificar seriales existentes en BD
    const serialesExistentes = await this.prisma.unidadInventario.findMany({
      where: { serial: { in: todosSeriales } },
      select: { serial: true },
    });

    const serialesExistentesSet = new Set(serialesExistentes.map(s => s.serial));

    // 3. Procesar cada producto en una transacción
    await this.prisma.$transaction(async (tx) => {
      for (const prodDto of dto.productos) {
        const codigoUpper = prodDto.codigoProducto.toUpperCase().trim();
        const producto = prodDto.productoId
          ? productosPorId.get(prodDto.productoId)
          : productosPorCodigo.get(codigoUpper);

        if (!producto) {
          // Producto no encontrado - registrar errores para todas sus unidades
          for (const unidad of prodDto.unidades) {
            resultado.totalProcesados++;
            resultado.errores++;
            resultado.detalles.push({
              producto: prodDto.codigoProducto,
              serial: unidad.serial,
              estado: 'error',
              mensaje: `Producto ${prodDto.codigoProducto} no encontrado`,
            });
          }
          continue;
        }

        const stockAnterior = producto.stockActual;
        let unidadesAgregadas = 0;

        for (const unidadDto of prodDto.unidades) {
          const serialNorm = unidadDto.serial.toUpperCase().trim();
          resultado.totalProcesados++;

          // Verificar si el serial ya existe
          if (serialesExistentesSet.has(serialNorm)) {
            resultado.errores++;
            resultado.detalles.push({
              producto: producto.codigo,
              serial: serialNorm,
              estado: 'error',
              mensaje: `Serial ${serialNorm} ya existe en el sistema`,
            });
            continue;
          }

          // Calcular garantía
          const garantiaMeses = garantiaMesesDefault;
          const garantiaHasta = new Date(fechaEntrada);
          garantiaHasta.setMonth(garantiaHasta.getMonth() + garantiaMeses);

          // Determinar costo unitario
          const costoUnitario = unidadDto.costoUnitario
            ?? prodDto.costoUnitarioDefault
            ?? Number(producto.precioCosto)
            ?? 0;

          // Crear unidad
          await tx.unidadInventario.create({
            data: {
              productoId: producto.id,
              serial: serialNorm,
              estado: 'DISPONIBLE',
              fechaEntrada,
              origenTipo: dto.origen as OrigenUnidad,
              costoUnitario,
              lote: unidadDto.lote ?? prodDto.loteDefault ?? dto.referencia,
              garantiaMeses,
              garantiaHasta,
              notas: unidadDto.notas ?? dto.notas,
            },
          });

          resultado.exitosos++;
          unidadesAgregadas++;
          resultado.detalles.push({
            producto: producto.codigo,
            serial: serialNorm,
            estado: 'ok',
          });
        }

        // Actualizar stock del producto
        if (unidadesAgregadas > 0) {
          const stockNuevo = stockAnterior + unidadesAgregadas;
          const nuevoEstado = this.calcularEstado(
            stockNuevo,
            producto.stockMinimo,
            producto.stockAdvertencia,
          );

          await tx.producto.update({
            where: { id: producto.id },
            data: {
              stockActual: stockNuevo,
              estado: nuevoEstado,
            },
          });

          // Crear movimiento de stock
          await tx.movimientoStock.create({
            data: {
              productoId: producto.id,
              tipo: 'ENTRADA',
              cantidad: unidadesAgregadas,
              stockAnterior,
              stockNuevo,
              referencia: dto.referencia ?? `IMP-${fechaEntrada.toISOString().slice(0, 10)}`,
              motivo: `Importación masiva: ${dto.origen}${dto.notas ? ` - ${dto.notas}` : ''}`,
            },
          });

          resultado.productosActualizados.push({
            codigo: producto.codigo,
            nombre: producto.nombre,
            stockAnterior,
            stockNuevo,
            unidadesAgregadas,
          });
        }
      }
    });

    return resultado;
  }

  /**
   * Importación masiva desde formato Excel (filas planas)
   */
  async importacionDesdeExcel(dto: ImportacionExcelDto): Promise<ResultadoImportacionDto> {
    // Convertir formato Excel a formato estructurado
    const productosMap = new Map<string, {
      codigoProducto: string;
      unidades: { serial: string; costoUnitario?: number; lote?: string; notas?: string }[];
    }>();

    for (const fila of dto.filas) {
      const codigo = fila.codigoProducto.toUpperCase().trim();
      if (!productosMap.has(codigo)) {
        productosMap.set(codigo, { codigoProducto: codigo, unidades: [] });
      }
      productosMap.get(codigo)!.unidades.push({
        serial: fila.serial,
        costoUnitario: fila.costoUnitario,
        lote: fila.lote,
        notas: fila.notas,
      });
    }

    const importacionDto: ImportacionMasivaDto = {
      origen: dto.origen,
      fechaEntrada: dto.fechaEntrada,
      referencia: dto.referencia,
      garantiaMesesDefault: dto.garantiaMesesDefault,
      productos: Array.from(productosMap.values()),
    };

    return this.importacionMasiva(importacionDto);
  }

  /**
   * Obtener inventario con detalle de seriales
   */
  async getInventarioConSeriales(options?: {
    productoId?: number;
    codigo?: string;
    conSeriales?: boolean;
    page?: number;
    limit?: number;
  }) {
    const { productoId, codigo, conSeriales = true, page = 1, limit = 20 } = options || {};
    const skip = (page - 1) * limit;

    const where: any = { activo: true };
    if (productoId) where.id = productoId;
    if (codigo) where.codigo = { contains: codigo, mode: 'insensitive' };

    const [productos, total] = await Promise.all([
      this.prisma.producto.findMany({
        where,
        skip,
        take: limit,
        include: conSeriales ? {
          unidadesInventario: {
            select: {
              id: true,
              serial: true,
              estado: true,
              fechaEntrada: true,
              costoUnitario: true,
              origenTipo: true,
              lote: true,
              fechaVenta: true,
              precioVenta: true,
              garantiaHasta: true,
              cliente: { select: { id: true, nombre: true } },
            },
            orderBy: { createdAt: 'desc' },
          },
          _count: {
            select: { unidadesInventario: true },
          },
        } : undefined,
        orderBy: { codigo: 'asc' },
      }),
      this.prisma.producto.count({ where }),
    ]);

    // Agregar estadísticas de seriales por producto
    const productosConEstadisticas = productos.map(producto => {
      const unidades = (producto as any).unidadesInventario || [];
      const estadisticas = {
        totalUnidades: unidades.length,
        disponibles: unidades.filter((u: any) => u.estado === 'DISPONIBLE').length,
        vendidas: unidades.filter((u: any) => u.estado === 'VENDIDO').length,
        defectuosas: unidades.filter((u: any) => u.estado === 'DEFECTUOSO').length,
        stockSinSerial: Math.max(0, producto.stockActual - unidades.filter((u: any) => u.estado === 'DISPONIBLE').length),
      };

      return {
        ...producto,
        estadisticasSeriales: estadisticas,
      };
    });

    return {
      productos: productosConEstadisticas,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * Resumen de importaciones recientes
   */
  async getResumenImportaciones(dias: number = 30) {
    const fechaDesde = new Date();
    fechaDesde.setDate(fechaDesde.getDate() - dias);

    const [importacionesRecientes, porOrigen, ultimasUnidades] = await Promise.all([
      // Movimientos de entrada recientes
      this.prisma.movimientoStock.findMany({
        where: {
          tipo: 'ENTRADA',
          createdAt: { gte: fechaDesde },
        },
        include: { producto: true },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      // Unidades por origen
      this.prisma.unidadInventario.groupBy({
        by: ['origenTipo'],
        where: { fechaEntrada: { gte: fechaDesde } },
        _count: true,
        _sum: { costoUnitario: true },
      }),
      // Últimas unidades registradas
      this.prisma.unidadInventario.findMany({
        where: { fechaEntrada: { gte: fechaDesde } },
        include: { producto: { select: { codigo: true, nombre: true } } },
        orderBy: { fechaEntrada: 'desc' },
        take: 20,
      }),
    ]);

    const resumenPorOrigen = porOrigen.map(o => ({
      origen: o.origenTipo || 'NO_ESPECIFICADO',
      cantidad: o._count,
      costoTotal: Number(o._sum.costoUnitario) || 0,
    }));

    return {
      periodosDias: dias,
      totalMovimientosEntrada: importacionesRecientes.length,
      importacionesRecientes: importacionesRecientes.slice(0, 10),
      porOrigen: resumenPorOrigen,
      ultimasUnidades,
    };
  }
}
