import { Module } from '@nestjs/common';
import { NotificacionesService } from './notificaciones.service';
import { NotificacionesController } from './notificaciones.controller';
import { StockBajoListener } from './listeners/stock-bajo.listener';
import { PrismaModule } from '../../config/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [NotificacionesController],
  providers: [NotificacionesService, StockBajoListener],
  exports: [NotificacionesService],
})
export class NotificacionesModule {}
