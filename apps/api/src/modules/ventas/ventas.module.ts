import { Module } from '@nestjs/common';
import { VentasController } from './ventas.controller';
import { VentasService } from './ventas.service';
import { ProductosModule } from '../productos/productos.module';
import { ClientesModule } from '../clientes/clientes.module';
import { InventarioModule } from '../inventario/inventario.module';

@Module({
  imports: [ProductosModule, ClientesModule, InventarioModule],
  controllers: [VentasController],
  providers: [VentasService],
  exports: [VentasService],
})
export class VentasModule {}
