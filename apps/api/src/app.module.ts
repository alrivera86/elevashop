import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';

// Módulos de la aplicación
import { AuthModule } from './modules/auth/auth.module';
import { UsuariosModule } from './modules/usuarios/usuarios.module';
import { ProductosModule } from './modules/productos/productos.module';
import { InventarioModule } from './modules/inventario/inventario.module';
import { VentasModule } from './modules/ventas/ventas.module';
import { ClientesModule } from './modules/clientes/clientes.module';
import { EtiquetasModule } from './modules/etiquetas/etiquetas.module';
import { ImportacionesModule } from './modules/importaciones/importaciones.module';
import { FinanzasModule } from './modules/finanzas/finanzas.module';
import { ReportesModule } from './modules/reportes/reportes.module';
import { NotificacionesModule } from './modules/notificaciones/notificaciones.module';
import { ConsignacionModule } from './modules/consignacion/consignacion.module';

// Servicios globales
import { PrismaModule } from './config/prisma.module';

@Module({
  imports: [
    // Configuración global
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Event Emitter para comunicación entre módulos
    EventEmitterModule.forRoot(),

    // Scheduler para tareas programadas (cron jobs)
    ScheduleModule.forRoot(),

    // Prisma (Base de datos)
    PrismaModule,

    // Módulos de negocio
    AuthModule,
    UsuariosModule,
    ProductosModule,
    InventarioModule,
    VentasModule,
    ClientesModule,
    EtiquetasModule,
    ImportacionesModule,
    FinanzasModule,
    ReportesModule,
    NotificacionesModule,
    ConsignacionModule,
  ],
})
export class AppModule {}
