import { Module } from '@nestjs/common';
import { ConsignacionController } from './consignacion.controller';
import { ConsignacionService } from './consignacion.service';

@Module({
  controllers: [ConsignacionController],
  providers: [ConsignacionService],
  exports: [ConsignacionService],
})
export class ConsignacionModule {}
