import { Module } from '@nestjs/common';
import { EtiquetasService } from './etiquetas.service';
import { EtiquetasController } from './etiquetas.controller';

@Module({
  controllers: [EtiquetasController],
  providers: [EtiquetasService],
  exports: [EtiquetasService],
})
export class EtiquetasModule {}
