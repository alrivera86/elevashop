import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';
import { CreateEtiquetaDto, UpdateEtiquetaDto, AsignarEtiquetaDto, AsignarEtiquetasMasivoDto } from './dto/create-etiqueta.dto';

@Injectable()
export class EtiquetasService {
  constructor(private prisma: PrismaService) {}

  // ============ CRUD ETIQUETAS ============

  async findAll() {
    const etiquetas = await this.prisma.etiqueta.findMany({
      where: { activo: true },
      include: {
        _count: {
          select: { clientes: true }
        }
      },
      orderBy: { nombre: 'asc' }
    });

    return etiquetas.map(e => ({
      ...e,
      cantidadClientes: e._count.clientes,
      _count: undefined
    }));
  }

  async findAllIncludingInactive() {
    return this.prisma.etiqueta.findMany({
      include: {
        _count: {
          select: { clientes: true }
        }
      },
      orderBy: { createdAt: 'asc' }
    });
  }

  async findOne(id: number) {
    const etiqueta = await this.prisma.etiqueta.findUnique({
      where: { id },
      include: {
        clientes: {
          include: {
            cliente: {
              select: {
                id: true,
                nombre: true,
                telefono: true,
                totalCompras: true
              }
            }
          }
        }
      }
    });

    if (!etiqueta) {
      throw new NotFoundException(`Etiqueta con ID ${id} no encontrada`);
    }

    return {
      ...etiqueta,
      clientes: etiqueta.clientes.map(ce => ce.cliente)
    };
  }

  async findByCodigo(codigo: string) {
    const etiqueta = await this.prisma.etiqueta.findUnique({
      where: { codigo }
    });

    if (!etiqueta) {
      throw new NotFoundException(`Etiqueta con código ${codigo} no encontrada`);
    }

    return etiqueta;
  }

  async create(dto: CreateEtiquetaDto) {
    const existe = await this.prisma.etiqueta.findUnique({
      where: { codigo: dto.codigo }
    });

    if (existe) {
      throw new ConflictException(`Ya existe una etiqueta con el código ${dto.codigo}`);
    }

    return this.prisma.etiqueta.create({
      data: {
        codigo: dto.codigo,
        nombre: dto.nombre,
        descripcion: dto.descripcion,
        color: dto.color || '#6B7280'
      }
    });
  }

  async update(id: number, dto: UpdateEtiquetaDto) {
    const etiqueta = await this.prisma.etiqueta.findUnique({ where: { id } });

    if (!etiqueta) {
      throw new NotFoundException(`Etiqueta con ID ${id} no encontrada`);
    }

    return this.prisma.etiqueta.update({
      where: { id },
      data: dto
    });
  }

  async remove(id: number) {
    const etiqueta = await this.prisma.etiqueta.findUnique({ where: { id } });

    if (!etiqueta) {
      throw new NotFoundException(`Etiqueta con ID ${id} no encontrada`);
    }

    // Desactivar en lugar de eliminar para mantener historial
    return this.prisma.etiqueta.update({
      where: { id },
      data: { activo: false }
    });
  }

  // ============ ASIGNACIÓN DE ETIQUETAS A CLIENTES ============

  async asignarEtiqueta(dto: AsignarEtiquetaDto) {
    // Verificar que existan cliente y etiqueta
    const [cliente, etiqueta] = await Promise.all([
      this.prisma.cliente.findUnique({ where: { id: dto.clienteId } }),
      this.prisma.etiqueta.findUnique({ where: { id: dto.etiquetaId } })
    ]);

    if (!cliente) {
      throw new NotFoundException(`Cliente con ID ${dto.clienteId} no encontrado`);
    }

    if (!etiqueta) {
      throw new NotFoundException(`Etiqueta con ID ${dto.etiquetaId} no encontrada`);
    }

    // Crear asignación (si ya existe, ignora)
    return this.prisma.clienteEtiqueta.upsert({
      where: {
        clienteId_etiquetaId: {
          clienteId: dto.clienteId,
          etiquetaId: dto.etiquetaId
        }
      },
      update: {},
      create: {
        clienteId: dto.clienteId,
        etiquetaId: dto.etiquetaId,
        asignadoPor: dto.asignadoPor
      },
      include: {
        etiqueta: true,
        cliente: {
          select: { id: true, nombre: true }
        }
      }
    });
  }

  async quitarEtiqueta(clienteId: number, etiquetaId: number) {
    const asignacion = await this.prisma.clienteEtiqueta.findUnique({
      where: {
        clienteId_etiquetaId: { clienteId, etiquetaId }
      }
    });

    if (!asignacion) {
      throw new NotFoundException('El cliente no tiene esta etiqueta asignada');
    }

    return this.prisma.clienteEtiqueta.delete({
      where: {
        clienteId_etiquetaId: { clienteId, etiquetaId }
      }
    });
  }

  async asignarMasivo(dto: AsignarEtiquetasMasivoDto) {
    const etiqueta = await this.prisma.etiqueta.findUnique({
      where: { id: dto.etiquetaId }
    });

    if (!etiqueta) {
      throw new NotFoundException(`Etiqueta con ID ${dto.etiquetaId} no encontrada`);
    }

    const resultados = await this.prisma.clienteEtiqueta.createMany({
      data: dto.clienteIds.map(clienteId => ({
        clienteId,
        etiquetaId: dto.etiquetaId,
        asignadoPor: dto.asignadoPor
      })),
      skipDuplicates: true
    });

    return {
      etiqueta: etiqueta.nombre,
      clientesAsignados: resultados.count,
      total: dto.clienteIds.length
    };
  }

  async quitarMasivo(clienteIds: number[], etiquetaId: number) {
    const resultado = await this.prisma.clienteEtiqueta.deleteMany({
      where: {
        clienteId: { in: clienteIds },
        etiquetaId
      }
    });

    return {
      clientesActualizados: resultado.count
    };
  }

  // ============ CONSULTAS PARA CLIENTES ============

  async getEtiquetasCliente(clienteId: number) {
    const cliente = await this.prisma.cliente.findUnique({
      where: { id: clienteId },
      include: {
        etiquetas: {
          include: {
            etiqueta: true
          }
        }
      }
    });

    if (!cliente) {
      throw new NotFoundException(`Cliente con ID ${clienteId} no encontrado`);
    }

    return cliente.etiquetas.map(ce => ce.etiqueta);
  }

  async clienteTieneEtiqueta(clienteId: number, codigo: string): Promise<boolean> {
    const asignacion = await this.prisma.clienteEtiqueta.findFirst({
      where: {
        clienteId,
        etiqueta: { codigo }
      }
    });

    return !!asignacion;
  }

  async getClientesPorEtiqueta(codigo: string) {
    const etiqueta = await this.prisma.etiqueta.findUnique({
      where: { codigo },
      include: {
        clientes: {
          include: {
            cliente: true
          }
        }
      }
    });

    if (!etiqueta) {
      throw new NotFoundException(`Etiqueta con código ${codigo} no encontrada`);
    }

    return etiqueta.clientes.map(ce => ce.cliente);
  }

  // ============ PARA EL BOT ============

  async getNivelAccesoCliente(clienteId: number) {
    const etiquetas = await this.getEtiquetasCliente(clienteId);
    const codigos = etiquetas.map(e => e.codigo);

    // Determinar nivel de acceso basado en etiquetas
    if (codigos.includes('CLIENTE_VIP')) {
      return {
        nivel: 'VIP',
        verPrecios: true,
        verPrecioMercado: true,
        verDisponibilidad: true
      };
    }

    // Por defecto: CLIENTE_GENERAL
    return {
      nivel: 'GENERAL',
      verPrecios: false,
      verPrecioMercado: false,
      verDisponibilidad: true
    };
  }
}
