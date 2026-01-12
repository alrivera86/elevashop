import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificacionesService } from '../notificaciones.service';
import { PrismaService } from '../../../config/prisma.service';

interface StockBajoEvent {
  productoId: number;
  codigo: string;
  nombre: string;
  stockActual: number;
  stockMinimo: number;
  estado: string;
}

@Injectable()
export class StockBajoListener {
  constructor(
    private notificacionesService: NotificacionesService,
    private prisma: PrismaService,
  ) {}

  @OnEvent('stock.bajo')
  async handleStockBajo(event: StockBajoEvent) {
    // Crear alerta en base de datos
    await this.prisma.alertaStock.create({
      data: {
        productoId: event.productoId,
        tipoAlerta: event.estado === 'AGOTADO' ? 'AGOTADO' : 'STOCK_BAJO',
        stockActual: event.stockActual,
        stockMinimo: event.stockMinimo,
        mensaje: `Stock bajo para ${event.codigo}: ${event.stockActual} unidades`,
      },
    });

    // Marcar producto como notificado
    await this.prisma.producto.update({
      where: { id: event.productoId },
      data: { notificacionEnviada: true },
    });

    // Enviar notificación
    await this.notificacionesService.enviarAlertaStockBajo({
      codigo: event.codigo,
      nombre: event.nombre,
      stockActual: event.stockActual,
      stockMinimo: event.stockMinimo,
    });
  }
}
