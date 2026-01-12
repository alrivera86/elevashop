import { Module } from '@nestjs/common';
import { FinanzasController } from './finanzas.controller';
import { FinanzasService } from './finanzas.service';
import { PrismaModule } from '../../config/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [FinanzasController],
  providers: [FinanzasService],
  exports: [FinanzasService],
})
export class FinanzasModule {}
