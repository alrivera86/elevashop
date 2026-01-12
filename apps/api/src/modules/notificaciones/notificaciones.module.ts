import { Module } from '@nestjs/common';
import { NotificacionesService } from './notificaciones.service';
import { StockBajoListener } from './listeners/stock-bajo.listener';

@Module({
  providers: [NotificacionesService, StockBajoListener],
  exports: [NotificacionesService],
})
export class NotificacionesModule {}
