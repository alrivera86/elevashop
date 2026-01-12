import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrismaService } from '../../config/prisma.service';

@ApiTags('notificaciones')
@Controller('notificaciones')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NotificacionesController {
  constructor(private prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Obtener todas las notificaciones' })
  async getNotificaciones() {
    // Obtener productos con stock bajo o agotado como alertas
    const productosEnAlerta = await this.prisma.producto.findMany({
      where: {
        activo: true,
        OR: [
          { estado: 'ALERTA' },
          { estado: 'ALERTA_W' },
          { estado: 'AGOTADO' },
        ],
      },
      orderBy: [
        { estado: 'asc' },
        { stockActual: 'asc' },
      ],
      take: 50,
    });

    // Mapear a formato de notificaciones
    const notificaciones = productosEnAlerta.map((producto, index) => ({
      id: `stock-${producto.id}`,
      tipo: producto.estado === 'AGOTADO' ? 'CRITICA' :
            producto.estado === 'ALERTA' ? 'ALERTA' : 'ADVERTENCIA',
      titulo: producto.estado === 'AGOTADO'
        ? `Producto agotado: ${producto.codigo}`
        : `Stock bajo: ${producto.codigo}`,
      mensaje: `${producto.nombre} tiene ${producto.stockActual} unidades. Minimo: ${producto.stockMinimo}`,
      leida: false,
      fecha: producto.updatedAt,
      metadata: {
        productoId: producto.id,
        codigo: producto.codigo,
        stockActual: producto.stockActual,
        stockMinimo: producto.stockMinimo,
      },
    }));

    return {
      data: notificaciones,
      total: notificaciones.length,
      noLeidas: notificaciones.length,
    };
  }

  @Get('resumen')
  @ApiOperation({ summary: 'Resumen de notificaciones' })
  async getResumen() {
    const [agotados, alertas, advertencias] = await Promise.all([
      this.prisma.producto.count({
        where: { activo: true, estado: 'AGOTADO' },
      }),
      this.prisma.producto.count({
        where: { activo: true, estado: 'ALERTA' },
      }),
      this.prisma.producto.count({
        where: { activo: true, estado: 'ALERTA_W' },
      }),
    ]);

    return {
      total: agotados + alertas + advertencias,
      criticas: agotados,
      alertas: alertas,
      advertencias: advertencias,
    };
  }
}
