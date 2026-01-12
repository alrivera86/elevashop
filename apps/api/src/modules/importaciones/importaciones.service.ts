import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';

@Injectable()
export class ImportacionesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.importacion.findMany({
      include: { proveedor: true },
      orderBy: { fechaFactura: 'desc' },
    });
  }

  async findOne(id: number) {
    const importacion = await this.prisma.importacion.findUnique({
      where: { id },
      include: {
        proveedor: true,
        ordenesCompra: { include: { detalles: { include: { producto: true } } } },
        costosImportacion: { include: { producto: true } },
      },
    });

    if (!importacion) {
      throw new NotFoundException(`Importación con ID ${id} no encontrada`);
    }

    return importacion;
  }

  async getEstadisticas() {
    const [total, porEstado] = await Promise.all([
      this.prisma.importacion.aggregate({
        _sum: { montoFactura: true, subTotal: true },
        _count: true,
      }),
      this.prisma.importacion.groupBy({
        by: ['estado'],
        _count: true,
        _sum: { montoFactura: true },
      }),
    ]);

    return { total, porEstado };
  }
}
