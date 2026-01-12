import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';
import { CreateClienteDto } from './dto/create-cliente.dto';
import { UpdateClienteDto } from './dto/update-cliente.dto';

@Injectable()
export class ClientesService {
  constructor(private prisma: PrismaService) {}

  async create(createClienteDto: CreateClienteDto) {
    const nombreNormalizado = this.normalizarNombre(createClienteDto.nombre);

    // Verificar si ya existe un cliente con nombre similar
    const existente = await this.prisma.cliente.findFirst({
      where: { nombreNormalizado },
    });

    if (existente) {
      throw new ConflictException(`Ya existe un cliente con nombre similar: ${existente.nombre}`);
    }

    return this.prisma.cliente.create({
      data: {
        ...createClienteDto,
        nombreNormalizado,
      },
    });
  }

  async findAll(options?: { page?: number; limit?: number; search?: string }) {
    const page = options?.page || 1;
    const limit = options?.limit || 20;
    const search = options?.search;
    const skip = (page - 1) * limit;

    const where: any = { activo: true };

    if (search) {
      where.OR = [
        { nombre: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { telefono: { contains: search } },
      ];
    }

    const [clientes, total] = await Promise.all([
      this.prisma.cliente.findMany({
        where,
        skip,
        take: limit,
        orderBy: { nombre: 'asc' },
      }),
      this.prisma.cliente.count({ where }),
    ]);

    return {
      clientes,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: number) {
    const cliente = await this.prisma.cliente.findUnique({
      where: { id },
      include: {
        ventas: {
          take: 20,
          orderBy: { fecha: 'desc' },
          include: {
            detalles: {
              include: {
                producto: {
                  select: { id: true, codigo: true, nombre: true },
                },
              },
            },
            pagos: true,
          },
        },
        unidadesCompradas: {
          orderBy: { fechaVenta: 'desc' },
          include: {
            producto: {
              select: { id: true, codigo: true, nombre: true },
            },
          },
        },
      },
    });

    if (!cliente) {
      throw new NotFoundException(`Cliente con ID ${id} no encontrado`);
    }

    // Calcular estadísticas adicionales
    const estadisticas = {
      totalVentas: cliente.ventas.length,
      totalGastado: Number(cliente.totalCompras),
      promedioCompra: cliente.cantidadOrdenes > 0
        ? Number(cliente.totalCompras) / cliente.cantidadOrdenes
        : 0,
      productosUnicos: new Set(cliente.ventas.flatMap(v => v.detalles.map(d => d.productoId))).size,
      serialesComprados: cliente.unidadesCompradas.length,
    };

    return {
      ...cliente,
      estadisticas,
    };
  }

  async findByNombre(nombre: string) {
    const nombreNormalizado = this.normalizarNombre(nombre);
    return this.prisma.cliente.findFirst({
      where: { nombreNormalizado },
    });
  }

  async findOrCreate(nombre: string) {
    const nombreNormalizado = this.normalizarNombre(nombre);

    let cliente = await this.prisma.cliente.findFirst({
      where: { nombreNormalizado },
    });

    if (!cliente) {
      cliente = await this.prisma.cliente.create({
        data: {
          nombre: nombre.trim(),
          nombreNormalizado,
        },
      });
    }

    return cliente;
  }

  async update(id: number, updateClienteDto: UpdateClienteDto) {
    await this.findOne(id);

    const data: any = { ...updateClienteDto };
    if (updateClienteDto.nombre) {
      data.nombreNormalizado = this.normalizarNombre(updateClienteDto.nombre);
    }

    return this.prisma.cliente.update({
      where: { id },
      data,
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.cliente.update({
      where: { id },
      data: { activo: false },
    });
  }

  async getTopClientes(limit: number = 10) {
    return this.prisma.cliente.findMany({
      where: { activo: true },
      orderBy: { totalCompras: 'desc' },
      take: limit,
    });
  }

  // Normaliza el nombre para evitar duplicados por espacios o mayúsculas
  private normalizarNombre(nombre: string): string {
    return nombre
      .toUpperCase()
      .trim()
      .replace(/\s+/g, ' '); // Múltiples espacios a uno solo
  }
}
