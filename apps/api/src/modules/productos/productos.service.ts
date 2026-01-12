import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../config/prisma.service';
import { CreateProductoDto } from './dto/create-producto.dto';
import { UpdateProductoDto } from './dto/update-producto.dto';
import { EstadoStock } from '@prisma/client';

@Injectable()
export class ProductosService {
  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
  ) {}

  async create(createProductoDto: CreateProductoDto) {
    const existingProduct = await this.prisma.producto.findUnique({
      where: { codigo: createProductoDto.codigo },
    });

    if (existingProduct) {
      throw new ConflictException(`El producto con código ${createProductoDto.codigo} ya existe`);
    }

    return this.prisma.producto.create({
      data: {
        ...createProductoDto,
        estado: this.calcularEstado(
          createProductoDto.stockActual || 0,
          createProductoDto.stockMinimo || 0,
          createProductoDto.stockAdvertencia || 0,
        ),
      },
      include: { categoria: true },
    });
  }

  async findAll(options?: {
    page?: number | string;
    limit?: number | string;
    search?: string;
    estado?: EstadoStock;
    categoriaId?: number | string;
  }) {
    const page = Number(options?.page) || 1;
    const limit = Number(options?.limit) || 20;
    const { search, estado, categoriaId } = options || {};
    const skip = (page - 1) * limit;

    const where: any = { activo: true };

    if (search) {
      where.OR = [
        { codigo: { contains: search, mode: 'insensitive' } },
        { nombre: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (estado) {
      where.estado = estado;
    }

    if (categoriaId) {
      where.categoriaId = Number(categoriaId);
    }

    const [productos, total] = await Promise.all([
      this.prisma.producto.findMany({
        where,
        skip,
        take: limit,
        include: { categoria: true },
        orderBy: { codigo: 'asc' },
      }),
      this.prisma.producto.count({ where }),
    ]);

    return {
      productos,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number) {
    const producto = await this.prisma.producto.findUnique({
      where: { id },
      include: { categoria: true },
    });

    if (!producto) {
      throw new NotFoundException(`Producto con ID ${id} no encontrado`);
    }

    return producto;
  }

  async findByCodigo(codigo: string) {
    const producto = await this.prisma.producto.findUnique({
      where: { codigo },
      include: { categoria: true },
    });

    if (!producto) {
      throw new NotFoundException(`Producto con código ${codigo} no encontrado`);
    }

    return producto;
  }

  async update(id: number, updateProductoDto: UpdateProductoDto) {
    const producto = await this.findOne(id);

    const stockActual = updateProductoDto.stockActual ?? producto.stockActual;
    const stockMinimo = updateProductoDto.stockMinimo ?? producto.stockMinimo;
    const stockAdvertencia = updateProductoDto.stockAdvertencia ?? producto.stockAdvertencia;

    return this.prisma.producto.update({
      where: { id },
      data: {
        ...updateProductoDto,
        estado: this.calcularEstado(stockActual, stockMinimo, stockAdvertencia),
      },
      include: { categoria: true },
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.producto.update({
      where: { id },
      data: { activo: false },
    });
  }

  async getProductosConStockBajo() {
    return this.prisma.producto.findMany({
      where: {
        activo: true,
        estado: { in: ['ALERTA', 'ALERTA_W', 'AGOTADO'] },
      },
      include: { categoria: true },
      orderBy: { stockActual: 'asc' },
    });
  }

  async getEstadisticas() {
    const [total, porEstado, valorInventario] = await Promise.all([
      this.prisma.producto.count({ where: { activo: true } }),
      this.prisma.producto.groupBy({
        by: ['estado'],
        where: { activo: true },
        _count: true,
      }),
      this.prisma.producto.aggregate({
        where: { activo: true },
        _sum: {
          stockActual: true,
        },
      }),
    ]);

    return {
      totalProductos: total,
      porEstado: porEstado.reduce((acc: Record<string, number>, item) => {
        acc[item.estado] = item._count;
        return acc;
      }, {}),
      totalUnidades: valorInventario._sum.stockActual || 0,
    };
  }

  private calcularEstado(stockActual: number, stockMinimo: number, stockAdvertencia: number): EstadoStock {
    if (stockActual <= 0) return 'AGOTADO';
    if (stockActual <= stockMinimo) return 'ALERTA';
    if (stockActual <= stockAdvertencia) return 'ALERTA_W';
    return 'OK';
  }
}
