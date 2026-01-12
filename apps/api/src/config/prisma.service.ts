import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    super({
      log:
        process.env.NODE_ENV === 'development'
          ? ['query', 'info', 'warn', 'error']
          : ['error'],
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  async cleanDatabase() {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('No se puede limpiar la base de datos en producción');
    }

    // Orden de eliminación respetando foreign keys
    const models = [
      'ventaPago',
      'ventaDetalle',
      'venta',
      'transaccion',
      'movimientoStock',
      'alertaStock',
      'costoImportacion',
      'ordenCompraDetalle',
      'ordenCompra',
      'importacion',
      'gasto',
      'operacionCambio',
      'tasaCambio',
      'producto',
      'categoria',
      'categoriaGasto',
      'cliente',
      'usuario',
      'rol',
      'proveedor',
    ];

    for (const model of models) {
      await (this as any)[model].deleteMany();
    }
  }
}
