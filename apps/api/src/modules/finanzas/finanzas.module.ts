import { Module } from '@nestjs/common';
import { FinanzasController } from './finanzas.controller';
import { FinanzasService } from './finanzas.service';
import { BinanceP2PService } from './binance-p2p.service';
import { PrismaModule } from '../../config/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [FinanzasController],
  providers: [FinanzasService, BinanceP2PService],
  exports: [FinanzasService, BinanceP2PService],
})
export class FinanzasModule {}
