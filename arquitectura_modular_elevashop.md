# 🏗️ ARQUITECTURA MODULAR ELEVASHOP
## Propuesta Técnica Optimizada

---

## 📊 ANÁLISIS COMPARATIVO

### Tu Propuesta Original vs Mi Recomendación

| Aspecto | Tu Propuesta | Mi Recomendación | Razón |
|---------|--------------|------------------|-------|
| **Backend** | Node.js + Express | **NestJS (Node.js)** | Modular por defecto, TypeScript, escalable |
| **Base de Datos** | PostgreSQL o MongoDB | **PostgreSQL + Redis** | Relacional para datos complejos + cache |
| **Frontend** | React o Vue.js | **Next.js (React)** | SSR, mejor SEO, API Routes integradas |
| **Móvil** | React Native o Flutter | **React Native + Expo** | Código compartido con web, desarrollo rápido |
| **Arquitectura** | Monolítica implícita | **Microservicios Modulares** | Independencia de módulos |
| **API** | REST | **REST + GraphQL** | Flexibilidad en consultas complejas |
| **Mensajería** | WhatsApp/Telegram directo | **Cola de mensajes + Bots** | Desacoplamiento, confiabilidad |

---

## 🎯 ARQUITECTURA PROPUESTA: MODULAR HEXAGONAL

### ¿Por qué Hexagonal (Ports & Adapters)?

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           CAPA DE PRESENTACIÓN                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │   Next.js   │  │React Native │  │  WhatsApp   │  │  Telegram   │    │
│  │     Web     │  │   Mobile    │  │     Bot     │  │     Bot     │    │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘    │
└─────────┼────────────────┼────────────────┼────────────────┼───────────┘
          │                │                │                │
          ▼                ▼                ▼                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                              API GATEWAY                                 │
│                         (Kong / Nginx / Traefik)                        │
│                    Rate Limiting, Auth, Load Balancing                  │
└─────────────────────────────────┬───────────────────────────────────────┘
                                  │
          ┌───────────────────────┼───────────────────────┐
          │                       │                       │
          ▼                       ▼                       ▼
┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
│   AUTH SERVICE  │   │  CORE SERVICE   │   │ NOTIFICATION    │
│   (Puerto 3051) │   │  (Puerto 3050)  │   │    SERVICE      │
│                 │   │                 │   │  (Puerto 3052)  │
│  • Login/Logout │   │  • Inventario   │   │                 │
│  • JWT/Refresh  │   │  • Ventas       │   │  • WhatsApp     │
│  • Roles        │   │  • Compras      │   │  • Telegram     │
│  • Permisos     │   │  • Clientes     │   │  • Email        │
│  • 2FA          │   │  • Reportes     │   │  • Push         │
└────────┬────────┘   └────────┬────────┘   └────────┬────────┘
         │                     │                     │
         └──────────┬──────────┴──────────┬──────────┘
                    │                     │
                    ▼                     ▼
        ┌───────────────────┐   ┌───────────────────┐
        │    PostgreSQL     │   │      Redis        │
        │   (Base Datos)    │   │     (Cache)       │
        │                   │   │                   │
        │  • Datos Core     │   │  • Sesiones       │
        │  • Transacciones  │   │  • Cache Queries  │
        │  • Históricos     │   │  • Rate Limiting  │
        └───────────────────┘   │  • Colas          │
                                └───────────────────┘
```

---

## 📁 ESTRUCTURA DE PROYECTO MODULAR

### Monorepo con Turborepo/Nx

```
elevashop/
├── 📁 apps/                          # Aplicaciones
│   ├── 📁 web/                       # Frontend Next.js
│   │   ├── 📁 app/                   # App Router (Next.js 14+)
│   │   │   ├── 📁 (auth)/           # Grupo de rutas auth
│   │   │   │   ├── login/
│   │   │   │   └── register/
│   │   │   ├── 📁 (dashboard)/      # Grupo dashboard
│   │   │   │   ├── layout.tsx
│   │   │   │   ├── page.tsx
│   │   │   │   ├── 📁 inventario/
│   │   │   │   ├── 📁 ventas/
│   │   │   │   ├── 📁 compras/
│   │   │   │   ├── 📁 clientes/
│   │   │   │   ├── 📁 reportes/
│   │   │   │   └── 📁 configuracion/
│   │   │   └── 📁 api/              # API Routes (BFF)
│   │   ├── 📁 components/
│   │   │   ├── 📁 ui/               # Componentes base (shadcn)
│   │   │   ├── 📁 forms/            # Formularios
│   │   │   ├── 📁 tables/           # Tablas de datos
│   │   │   ├── 📁 charts/           # Gráficos
│   │   │   └── 📁 layout/           # Layout components
│   │   ├── 📁 hooks/                # Custom hooks
│   │   ├── 📁 lib/                  # Utilidades
│   │   ├── 📁 stores/               # Zustand stores
│   │   └── 📁 styles/               # CSS/Tailwind
│   │
│   ├── 📁 mobile/                   # React Native + Expo
│   │   ├── 📁 app/                  # Expo Router
│   │   │   ├── (tabs)/
│   │   │   │   ├── index.tsx        # Dashboard
│   │   │   │   ├── ventas.tsx
│   │   │   │   ├── inventario.tsx
│   │   │   │   └── alertas.tsx
│   │   │   └── _layout.tsx
│   │   ├── 📁 components/
│   │   └── 📁 services/
│   │
│   └── 📁 api/                      # Backend NestJS
│       ├── 📁 src/
│       │   ├── 📁 modules/          # 🎯 MÓDULOS INDEPENDIENTES
│       │   │   ├── 📁 auth/
│       │   │   │   ├── auth.module.ts
│       │   │   │   ├── auth.controller.ts
│       │   │   │   ├── auth.service.ts
│       │   │   │   ├── 📁 strategies/
│       │   │   │   ├── 📁 guards/
│       │   │   │   └── 📁 dto/
│       │   │   │
│       │   │   ├── 📁 usuarios/
│       │   │   │   ├── usuarios.module.ts
│       │   │   │   ├── usuarios.controller.ts
│       │   │   │   ├── usuarios.service.ts
│       │   │   │   ├── 📁 entities/
│       │   │   │   └── 📁 dto/
│       │   │   │
│       │   │   ├── 📁 productos/
│       │   │   │   ├── productos.module.ts
│       │   │   │   ├── productos.controller.ts
│       │   │   │   ├── productos.service.ts
│       │   │   │   ├── 📁 entities/
│       │   │   │   │   └── producto.entity.ts
│       │   │   │   └── 📁 dto/
│       │   │   │       ├── create-producto.dto.ts
│       │   │   │       └── update-producto.dto.ts
│       │   │   │
│       │   │   ├── 📁 inventario/
│       │   │   │   ├── inventario.module.ts
│       │   │   │   ├── inventario.controller.ts
│       │   │   │   ├── inventario.service.ts
│       │   │   │   ├── 📁 entities/
│       │   │   │   ├── 📁 events/          # Eventos de dominio
│       │   │   │   │   └── stock-bajo.event.ts
│       │   │   │   └── 📁 listeners/
│       │   │   │       └── alerta-stock.listener.ts
│       │   │   │
│       │   │   ├── 📁 ventas/
│       │   │   │   ├── ventas.module.ts
│       │   │   │   ├── ventas.controller.ts
│       │   │   │   ├── ventas.service.ts
│       │   │   │   ├── 📁 entities/
│       │   │   │   └── 📁 events/
│       │   │   │
│       │   │   ├── 📁 compras/
│       │   │   │   └── ... (misma estructura)
│       │   │   │
│       │   │   ├── 📁 clientes/
│       │   │   │   └── ... (misma estructura)
│       │   │   │
│       │   │   ├── 📁 importaciones/
│       │   │   │   ├── importaciones.module.ts
│       │   │   │   ├── 📁 nacionalizacion/
│       │   │   │   └── 📁 proveedores/
│       │   │   │
│       │   │   ├── 📁 finanzas/
│       │   │   │   ├── finanzas.module.ts
│       │   │   │   ├── 📁 gastos/
│       │   │   │   ├── 📁 tasas-cambio/
│       │   │   │   └── 📁 flujo-caja/
│       │   │   │
│       │   │   ├── 📁 reportes/
│       │   │   │   ├── reportes.module.ts
│       │   │   │   ├── 📁 ventas/
│       │   │   │   ├── 📁 inventario/
│       │   │   │   └── 📁 financiero/
│       │   │   │
│       │   │   └── 📁 notificaciones/
│       │   │       ├── notificaciones.module.ts
│       │   │       ├── 📁 whatsapp/
│       │   │       ├── 📁 telegram/
│       │   │       └── 📁 email/
│       │   │
│       │   ├── 📁 common/            # Código compartido
│       │   │   ├── 📁 decorators/
│       │   │   ├── 📁 filters/
│       │   │   ├── 📁 interceptors/
│       │   │   ├── 📁 pipes/
│       │   │   └── 📁 guards/
│       │   │
│       │   ├── 📁 config/            # Configuración
│       │   │   ├── database.config.ts
│       │   │   ├── redis.config.ts
│       │   │   └── app.config.ts
│       │   │
│       │   ├── 📁 database/          # Base de datos
│       │   │   ├── 📁 migrations/
│       │   │   └── 📁 seeds/
│       │   │
│       │   ├── app.module.ts         # Módulo raíz
│       │   └── main.ts               # Entry point
│       │
│       ├── 📁 test/                  # Tests
│       │   ├── 📁 unit/
│       │   ├── 📁 integration/
│       │   └── 📁 e2e/
│       │
│       └── 📁 prisma/                # ORM Prisma
│           └── schema.prisma
│
├── 📁 packages/                      # Paquetes compartidos
│   ├── 📁 shared-types/             # TypeScript types compartidos
│   │   ├── src/
│   │   │   ├── producto.ts
│   │   │   ├── venta.ts
│   │   │   ├── cliente.ts
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── 📁 ui-components/            # Componentes React compartidos
│   │   ├── src/
│   │   │   ├── Button/
│   │   │   ├── Input/
│   │   │   ├── Modal/
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── 📁 utils/                    # Utilidades compartidas
│   │   ├── src/
│   │   │   ├── formatters.ts
│   │   │   ├── validators.ts
│   │   │   └── calculations.ts
│   │   └── package.json
│   │
│   └── 📁 api-client/               # Cliente API tipado
│       ├── src/
│       │   ├── client.ts
│       │   └── endpoints/
│       └── package.json
│
├── 📁 infrastructure/               # Infraestructura
│   ├── 📁 docker/
│   │   ├── Dockerfile.api
│   │   ├── Dockerfile.web
│   │   └── docker-compose.yml
│   │
│   ├── 📁 kubernetes/               # K8s (opcional, futuro)
│   │   ├── api-deployment.yaml
│   │   └── web-deployment.yaml
│   │
│   └── 📁 terraform/                # IaC (opcional)
│       └── main.tf
│
├── 📁 docs/                         # Documentación
│   ├── 📁 api/
│   ├── 📁 architecture/
│   └── 📁 user-guides/
│
├── 📁 scripts/                      # Scripts útiles
│   ├── migrate-data.ts
│   ├── seed-db.ts
│   └── backup.sh
│
├── turbo.json                       # Turborepo config
├── package.json                     # Root package.json
├── pnpm-workspace.yaml             # Workspace config
└── README.md
```

---

## 🔧 STACK TECNOLÓGICO DETALLADO

### Backend (NestJS)

```typescript
// apps/api/src/modules/inventario/inventario.module.ts

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';

// Entidades propias del módulo
import { Producto } from './entities/producto.entity';
import { MovimientoStock } from './entities/movimiento-stock.entity';
import { AlertaStock } from './entities/alerta-stock.entity';

// Servicios y controladores
import { InventarioController } from './inventario.controller';
import { InventarioService } from './inventario.service';
import { AlertasService } from './alertas.service';

// Listeners de eventos
import { StockBajoListener } from './listeners/stock-bajo.listener';

@Module({
  imports: [
    TypeOrmModule.forFeature([Producto, MovimientoStock, AlertaStock]),
    EventEmitterModule.forRoot(), // Para eventos entre módulos
  ],
  controllers: [InventarioController],
  providers: [
    InventarioService,
    AlertasService,
    StockBajoListener,
  ],
  exports: [InventarioService], // Exportar para uso en otros módulos
})
export class InventarioModule {}
```

```typescript
// apps/api/src/modules/inventario/inventario.service.ts

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Producto } from './entities/producto.entity';
import { StockBajoEvent } from './events/stock-bajo.event';

@Injectable()
export class InventarioService {
  constructor(
    @InjectRepository(Producto)
    private productoRepo: Repository<Producto>,
    private eventEmitter: EventEmitter2,
  ) {}

  async actualizarStock(productoId: number, cantidad: number, tipo: 'ENTRADA' | 'SALIDA') {
    const producto = await this.productoRepo.findOne({ where: { id: productoId } });
    
    if (!producto) {
      throw new NotFoundException(`Producto ${productoId} no encontrado`);
    }

    // Actualizar stock
    if (tipo === 'ENTRADA') {
      producto.stockActual += cantidad;
    } else {
      producto.stockActual -= cantidad;
    }

    await this.productoRepo.save(producto);

    // Emitir evento si stock bajo (DESACOPLADO)
    if (producto.stockActual <= producto.stockMinimo) {
      this.eventEmitter.emit(
        'stock.bajo',
        new StockBajoEvent(producto.id, producto.codigo, producto.stockActual, producto.stockMinimo)
      );
    }

    return producto;
  }
}
```

```typescript
// apps/api/src/modules/notificaciones/listeners/stock-bajo.listener.ts

import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { StockBajoEvent } from '../../inventario/events/stock-bajo.event';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { TelegramService } from '../telegram/telegram.service';

@Injectable()
export class StockBajoListener {
  constructor(
    private whatsappService: WhatsAppService,
    private telegramService: TelegramService,
  ) {}

  @OnEvent('stock.bajo')
  async handleStockBajo(event: StockBajoEvent) {
    const mensaje = `⚠️ ALERTA STOCK BAJO
Producto: ${event.codigo}
Stock actual: ${event.stockActual}
Stock mínimo: ${event.stockMinimo}
Acción requerida: Realizar orden de compra`;

    // Notificar por múltiples canales (desacoplado del inventario)
    await Promise.all([
      this.whatsappService.enviarMensaje(process.env.WHATSAPP_ADMIN, mensaje),
      this.telegramService.enviarMensaje(process.env.TELEGRAM_CHAT_ID, mensaje),
    ]);
  }
}
```

---

### Frontend (Next.js 14 con App Router)

```typescript
// apps/web/app/(dashboard)/inventario/page.tsx

import { Suspense } from 'react';
import { ProductosTable } from '@/components/tables/ProductosTable';
import { AlertasPanel } from '@/components/inventario/AlertasPanel';
import { StatsCards } from '@/components/inventario/StatsCards';
import { getInventarioStats, getProductos } from '@/lib/api/inventario';

export const metadata = {
  title: 'Inventario | Elevashop',
};

export default async function InventarioPage() {
  // Server Components - Fetching en servidor
  const [stats, productos] = await Promise.all([
    getInventarioStats(),
    getProductos({ page: 1, limit: 20 }),
  ]);

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Inventario</h1>
        <BtnNuevoProducto />
      </header>

      {/* Stats Cards */}
      <StatsCards stats={stats} />

      {/* Alertas de Stock */}
      <Suspense fallback={<AlertasSkeleton />}>
        <AlertasPanel />
      </Suspense>

      {/* Tabla de Productos */}
      <Suspense fallback={<TableSkeleton />}>
        <ProductosTable initialData={productos} />
      </Suspense>
    </div>
  );
}
```

```typescript
// apps/web/components/tables/ProductosTable.tsx
'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { apiClient } from '@/lib/api/client';
import type { Producto } from '@elevashop/shared-types';

interface ProductosTableProps {
  initialData: { productos: Producto[]; pagination: any };
}

export function ProductosTable({ initialData }: ProductosTableProps) {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['productos', page],
    queryFn: () => apiClient.productos.list({ page }),
    initialData,
    staleTime: 30000,
  });

  const getEstadoBadge = (estado: string) => {
    const variants = {
      'OK': 'success',
      'ALERTA-W': 'warning',
      'AGOTADO': 'destructive',
    };
    return <Badge variant={variants[estado]}>{estado}</Badge>;
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Código</TableHead>
            <TableHead>Nombre</TableHead>
            <TableHead className="text-right">P. Elevapartes</TableHead>
            <TableHead className="text-right">P. Mercado</TableHead>
            <TableHead className="text-right">P. ML</TableHead>
            <TableHead className="text-center">Stock</TableHead>
            <TableHead className="text-center">Estado</TableHead>
            <TableHead>Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.productos.map((producto) => (
            <TableRow key={producto.id}>
              <TableCell className="font-mono">{producto.codigo}</TableCell>
              <TableCell>{producto.nombre}</TableCell>
              <TableCell className="text-right">
                ${producto.precioElevapartes.toFixed(2)}
              </TableCell>
              <TableCell className="text-right">
                ${producto.precioMercado.toFixed(2)}
              </TableCell>
              <TableCell className="text-right">
                ${producto.precioMercadoLibre.toFixed(2)}
              </TableCell>
              <TableCell className="text-center">
                <span className={producto.stockActual <= producto.stockMinimo ? 'text-red-500 font-bold' : ''}>
                  {producto.stockActual}
                </span>
              </TableCell>
              <TableCell className="text-center">
                {getEstadoBadge(producto.estado)}
              </TableCell>
              <TableCell>
                <ProductoActions producto={producto} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
```

---

### Base de Datos (Prisma Schema)

```prisma
// apps/api/prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============ USUARIOS Y AUTH ============
model Usuario {
  id            Int       @id @default(autoincrement())
  email         String    @unique
  passwordHash  String    @map("password_hash")
  nombreCompleto String   @map("nombre_completo")
  rol           Rol       @relation(fields: [rolId], references: [id])
  rolId         Int       @map("rol_id")
  activo        Boolean   @default(true)
  ultimoLogin   DateTime? @map("ultimo_login")
  createdAt     DateTime  @default(now()) @map("created_at")
  updatedAt     DateTime  @updatedAt @map("updated_at")

  // Relaciones
  ventas        Venta[]
  transacciones Transaccion[]

  @@map("usuarios")
}

model Rol {
  id          Int       @id @default(autoincrement())
  nombre      String    @unique
  descripcion String?
  permisos    Json      // Array de strings con permisos
  usuarios    Usuario[]

  @@map("roles")
}

// ============ PRODUCTOS E INVENTARIO ============
model Producto {
  id                  Int       @id @default(autoincrement())
  codigo              String    @unique
  nombre              String
  descripcion         String?
  categoriaId         Int?      @map("categoria_id")
  categoria           Categoria? @relation(fields: [categoriaId], references: [id])
  
  // Precios múltiples
  precioMercadoLibre  Decimal   @map("precio_mercado_libre") @db.Decimal(10, 2)
  precioMercado       Decimal   @map("precio_mercado") @db.Decimal(10, 2)
  precioElevapartes   Decimal   @map("precio_elevapartes") @db.Decimal(10, 2)
  precioCosto         Decimal?  @map("precio_costo") @db.Decimal(10, 2)
  
  // Stock
  stockActual         Int       @default(0) @map("stock_actual")
  stockMinimo         Int       @default(0) @map("stock_minimo")
  estado              EstadoStock @default(OK)
  
  activo              Boolean   @default(true)
  createdAt           DateTime  @default(now()) @map("created_at")
  updatedAt           DateTime  @updatedAt @map("updated_at")

  // Relaciones
  transacciones       Transaccion[]
  movimientosStock    MovimientoStock[]
  alertasStock        AlertaStock[]
  ordenesCompraDetalle OrdenCompraDetalle[]

  @@map("productos")
}

model Categoria {
  id          Int        @id @default(autoincrement())
  nombre      String
  descripcion String?
  productos   Producto[]

  @@map("categorias")
}

model MovimientoStock {
  id            Int       @id @default(autoincrement())
  productoId    Int       @map("producto_id")
  producto      Producto  @relation(fields: [productoId], references: [id])
  tipo          TipoMovimiento
  cantidad      Int
  stockAnterior Int       @map("stock_anterior")
  stockNuevo    Int       @map("stock_nuevo")
  referencia    String?   // ID de venta, compra, etc.
  motivo        String?
  createdAt     DateTime  @default(now()) @map("created_at")

  @@map("movimientos_stock")
}

model AlertaStock {
  id          Int       @id @default(autoincrement())
  productoId  Int       @map("producto_id")
  producto    Producto  @relation(fields: [productoId], references: [id])
  tipoAlerta  TipoAlerta @map("tipo_alerta")
  stockActual Int       @map("stock_actual")
  stockMinimo Int       @map("stock_minimo")
  mensaje     String?
  resuelta    Boolean   @default(false)
  createdAt   DateTime  @default(now()) @map("created_at")
  resueltaAt  DateTime? @map("resuelta_at")

  @@map("alertas_stock")
}

// ============ CLIENTES ============
model Cliente {
  id                Int       @id @default(autoincrement())
  nombre            String
  rifCedula         String?   @map("rif_cedula")
  email             String?
  telefono          String?
  direccion         String?
  ciudad            String?
  estado            String?
  segmento          SegmentoCliente @default(NUEVO)
  totalCompras      Decimal   @default(0) @map("total_compras") @db.Decimal(12, 2)
  cantidadOrdenes   Int       @default(0) @map("cantidad_ordenes")
  activo            Boolean   @default(true)
  createdAt         DateTime  @default(now()) @map("created_at")
  updatedAt         DateTime  @updatedAt @map("updated_at")

  // Relaciones
  ventas            Venta[]
  transacciones     Transaccion[]

  @@map("clientes")
}

// ============ VENTAS Y TRANSACCIONES ============
model Venta {
  id              Int       @id @default(autoincrement())
  numeroOrden     String    @unique @map("numero_orden")
  clienteId       Int       @map("cliente_id")
  cliente         Cliente   @relation(fields: [clienteId], references: [id])
  usuarioId       Int       @map("usuario_id")
  usuario         Usuario   @relation(fields: [usuarioId], references: [id])
  fecha           DateTime  @default(now())
  subtotal        Decimal   @db.Decimal(12, 2)
  descuento       Decimal   @default(0) @db.Decimal(12, 2)
  impuesto        Decimal   @default(0) @db.Decimal(12, 2)
  total           Decimal   @db.Decimal(12, 2)
  metodoPago      MetodoPago @map("metodo_pago")
  estadoPago      EstadoPago @default(PENDIENTE) @map("estado_pago")
  estado          EstadoVenta @default(CONFIRMADA)
  notas           String?
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")

  // Relaciones
  detalles        VentaDetalle[]

  @@map("ventas")
}

model VentaDetalle {
  id              Int       @id @default(autoincrement())
  ventaId         Int       @map("venta_id")
  venta           Venta     @relation(fields: [ventaId], references: [id], onDelete: Cascade)
  productoId      Int       @map("producto_id")
  cantidad        Int
  precioUnitario  Decimal   @map("precio_unitario") @db.Decimal(10, 2)
  costoUnitario   Decimal?  @map("costo_unitario") @db.Decimal(10, 2)
  descuento       Decimal   @default(0) @db.Decimal(10, 2)
  subtotal        Decimal   @db.Decimal(10, 2)

  @@map("ventas_detalle")
}

model Transaccion {
  id                Int       @id @default(autoincrement())
  numeroTransaccion String    @unique @map("numero_transaccion")
  tipo              TipoTransaccion
  productoId        Int       @map("producto_id")
  producto          Producto  @relation(fields: [productoId], references: [id])
  clienteId         Int?      @map("cliente_id")
  cliente           Cliente?  @relation(fields: [clienteId], references: [id])
  cantidad          Int
  precioUnitario    Decimal?  @map("precio_unitario") @db.Decimal(10, 2)
  costoUnitario     Decimal?  @map("costo_unitario") @db.Decimal(10, 2)
  total             Decimal?  @db.Decimal(12, 2)
  utilidad          Decimal?  @db.Decimal(10, 2)
  metodoPago        MetodoPago? @map("metodo_pago")
  serial            String?
  numeroOrden       String?   @map("numero_orden")
  usuarioId         Int       @map("usuario_id")
  usuario           Usuario   @relation(fields: [usuarioId], references: [id])
  fecha             DateTime  @default(now())
  createdAt         DateTime  @default(now()) @map("created_at")

  @@map("transacciones")
}

// ============ PROVEEDORES E IMPORTACIONES ============
model Proveedor {
  id            Int       @id @default(autoincrement())
  nombre        String
  razonSocial   String?   @map("razon_social")
  contacto      String?
  email         String?
  telefono      String?
  pais          String?
  activo        Boolean   @default(true)
  createdAt     DateTime  @default(now()) @map("created_at")

  // Relaciones
  ordenesCompra OrdenCompra[]
  importaciones Importacion[]

  @@map("proveedores")
}

model OrdenCompra {
  id              Int       @id @default(autoincrement())
  numeroOrden     String    @unique @map("numero_orden")
  proveedorId     Int       @map("proveedor_id")
  proveedor       Proveedor @relation(fields: [proveedorId], references: [id])
  fecha           DateTime  @default(now())
  total           Decimal   @db.Decimal(12, 2)
  estado          EstadoOrdenCompra @default(PENDIENTE)
  importacionId   Int?      @map("importacion_id")
  importacion     Importacion? @relation(fields: [importacionId], references: [id])
  createdAt       DateTime  @default(now()) @map("created_at")

  // Relaciones
  detalles        OrdenCompraDetalle[]

  @@map("ordenes_compra")
}

model OrdenCompraDetalle {
  id              Int       @id @default(autoincrement())
  ordenCompraId   Int       @map("orden_compra_id")
  ordenCompra     OrdenCompra @relation(fields: [ordenCompraId], references: [id], onDelete: Cascade)
  productoId      Int       @map("producto_id")
  producto        Producto  @relation(fields: [productoId], references: [id])
  cantidadOrdenada Int      @map("cantidad_ordenada")
  cantidadRecibida Int      @default(0) @map("cantidad_recibida")
  precioUnitario  Decimal   @map("precio_unitario") @db.Decimal(10, 2)

  @@map("ordenes_compra_detalle")
}

model Importacion {
  id                    Int       @id @default(autoincrement())
  referencia            String    @unique
  proveedorId           Int       @map("proveedor_id")
  proveedor             Proveedor @relation(fields: [proveedorId], references: [id])
  numeroFactura         String?   @map("numero_factura")
  montoFactura          Decimal?  @map("monto_factura") @db.Decimal(12, 2)
  montoTransferido      Decimal?  @map("monto_transferido") @db.Decimal(12, 2)
  costoNacionalizacion  Decimal?  @map("costo_nacionalizacion") @db.Decimal(10, 2)
  costoFlete            Decimal?  @map("costo_flete") @db.Decimal(10, 2)
  costoSeguro           Decimal?  @map("costo_seguro") @db.Decimal(10, 2)
  comisionesBanco       Decimal?  @map("comisiones_banco") @db.Decimal(10, 2)
  porcentajeNacionalizacion Decimal? @map("porcentaje_nacionalizacion") @db.Decimal(5, 2)
  costoTotal            Decimal?  @map("costo_total") @db.Decimal(12, 2)
  estado                EstadoImportacion @default(PENDIENTE)
  fechaFactura          DateTime? @map("fecha_factura")
  fechaLlegada          DateTime? @map("fecha_llegada")
  createdAt             DateTime  @default(now()) @map("created_at")
  updatedAt             DateTime  @updatedAt @map("updated_at")

  // Relaciones
  ordenesCompra         OrdenCompra[]

  @@map("importaciones")
}

// ============ GASTOS Y FINANZAS ============
model Gasto {
  id              Int       @id @default(autoincrement())
  categoriaId     Int       @map("categoria_id")
  categoria       CategoriaGasto @relation(fields: [categoriaId], references: [id])
  monto           Decimal   @db.Decimal(12, 2)
  moneda          Moneda    @default(USD)
  tasaCambio      Decimal?  @map("tasa_cambio") @db.Decimal(10, 4)
  fecha           DateTime
  descripcion     String?
  comprobante     String?
  metodoPago      MetodoPago? @map("metodo_pago")
  estado          EstadoGasto @default(PAGADO)
  esRecurrente    Boolean   @default(false) @map("es_recurrente")
  createdAt       DateTime  @default(now()) @map("created_at")

  @@map("gastos")
}

model CategoriaGasto {
  id          Int       @id @default(autoincrement())
  nombre      String
  tipo        TipoGasto
  gastos      Gasto[]

  @@map("categorias_gasto")
}

model TasaCambio {
  id            Int       @id @default(autoincrement())
  fecha         DateTime  @db.Date
  monedaOrigen  Moneda    @map("moneda_origen")
  monedaDestino Moneda    @map("moneda_destino")
  tipo          TipoTasa  @default(PARALELO)
  tasa          Decimal   @db.Decimal(10, 4)
  createdAt     DateTime  @default(now()) @map("created_at")

  @@unique([fecha, monedaOrigen, monedaDestino, tipo])
  @@map("tasas_cambio")
}

// ============ ENUMS ============
enum EstadoStock {
  OK
  ALERTA_W @map("ALERTA-W")
  AGOTADO
}

enum TipoMovimiento {
  ENTRADA
  SALIDA
  AJUSTE
  DEVOLUCION
}

enum TipoAlerta {
  STOCK_BAJO
  STOCK_MINIMO
  AGOTADO
  SOBRESTOCK
}

enum SegmentoCliente {
  VIP
  FRECUENTE
  OCASIONAL
  NUEVO
}

enum TipoTransaccion {
  ENTRADA
  SALIDA
}

enum MetodoPago {
  EFECTIVO_USD
  EFECTIVO_BS
  ZELLE
  BANESCO
  TRANSFERENCIA
  PAGO_MOVIL
  MERCADO_PAGO
}

enum EstadoPago {
  PENDIENTE
  PARCIAL
  PAGADO
}

enum EstadoVenta {
  COTIZACION
  PENDIENTE
  CONFIRMADA
  EN_PREPARACION
  ENVIADA
  ENTREGADA
  CANCELADA
}

enum EstadoOrdenCompra {
  PENDIENTE
  CONFIRMADA
  EN_TRANSITO
  RECIBIDA
  CANCELADA
}

enum EstadoImportacion {
  PENDIENTE
  EN_TRANSITO
  EN_ADUANA
  NACIONALIZADA
  RECIBIDA
}

enum EstadoGasto {
  PENDIENTE
  PAGADO
  ANULADO
}

enum TipoGasto {
  OPERATIVO
  ADMINISTRATIVO
  VENTAS
  FINANCIERO
}

enum Moneda {
  USD
  VES
}

enum TipoTasa {
  OFICIAL
  PARALELO
  BCV
}
```

---

## 🔌 COMUNICACIÓN ENTRE MÓDULOS

### Sistema de Eventos (Event-Driven)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         FLUJO DE EVENTOS                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────┐    Evento: venta.creada     ┌─────────────┐           │
│  │   VENTAS    │ ───────────────────────────▶│ INVENTARIO  │           │
│  │   Module    │                             │   Module    │           │
│  └─────────────┘                             └──────┬──────┘           │
│                                                     │                   │
│                              Evento: stock.bajo     │                   │
│                              ───────────────────────┘                   │
│                              │                                          │
│                              ▼                                          │
│                     ┌─────────────────┐                                 │
│                     │ NOTIFICACIONES  │                                 │
│                     │     Module      │                                 │
│                     └────────┬────────┘                                 │
│                              │                                          │
│              ┌───────────────┼───────────────┐                          │
│              ▼               ▼               ▼                          │
│      ┌───────────┐   ┌───────────┐   ┌───────────┐                     │
│      │ WhatsApp  │   │ Telegram  │   │   Email   │                     │
│      └───────────┘   └───────────┘   └───────────┘                     │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Implementación con NestJS Event Emitter

```typescript
// Eventos disponibles en el sistema
const EVENTS = {
  // Ventas
  'venta.creada': VentaCreadaEvent,
  'venta.cancelada': VentaCanceladaEvent,
  
  // Inventario
  'stock.actualizado': StockActualizadoEvent,
  'stock.bajo': StockBajoEvent,
  'stock.agotado': StockAgotadoEvent,
  
  // Importaciones
  'importacion.recibida': ImportacionRecibidaEvent,
  'importacion.nacionalizada': ImportacionNacionalizadaEvent,
  
  // Clientes
  'cliente.nuevo': ClienteNuevoEvent,
  'cliente.vip': ClienteVIPEvent,
};
```

---

## 🔄 BENEFICIOS DE LA ARQUITECTURA MODULAR

### 1. Independencia de Módulos

```
✅ Modificar VENTAS no afecta INVENTARIO directamente
✅ Cambiar proveedor de WhatsApp no toca el core
✅ Agregar nuevo módulo (ej: Reparaciones) es plug & play
✅ Testing aislado por módulo
✅ Deploy independiente (si evoluciona a microservicios)
```

### 2. Escalabilidad Horizontal

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        ESCALAMIENTO                                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  FASE 1 (Actual): Monolito Modular                                     │
│  ┌─────────────────────────────────────────────────────┐               │
│  │  Un servidor con todos los módulos                  │               │
│  │  Fácil de desarrollar y deployar                    │               │
│  └─────────────────────────────────────────────────────┘               │
│                                                                         │
│  FASE 2 (Futuro): Microservicios                                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐               │
│  │  AUTH    │  │  CORE    │  │ REPORTS  │  │  NOTIF   │               │
│  │ Service  │  │ Service  │  │ Service  │  │ Service  │               │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘               │
│  Cada módulo puede escalar independientemente                           │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 3. Tipos Compartidos

```typescript
// packages/shared-types/src/producto.ts

export interface Producto {
  id: number;
  codigo: string;
  nombre: string;
  descripcion?: string;
  precioMercadoLibre: number;
  precioMercado: number;
  precioElevapartes: number;
  stockActual: number;
  stockMinimo: number;
  estado: 'OK' | 'ALERTA-W' | 'AGOTADO';
}

export interface CreateProductoDTO {
  codigo: string;
  nombre: string;
  descripcion?: string;
  precioMercadoLibre: number;
  precioMercado: number;
  precioElevapartes: number;
  stockMinimo?: number;
}

// Usado tanto en Frontend como Backend
// ¡Un solo lugar para cambios!
```

---

## 📱 INTEGRACIÓN WHATSAPP/TELEGRAM

### Arquitectura de Bots

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         BOT ARCHITECTURE                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Usuario WhatsApp/Telegram                                              │
│         │                                                               │
│         ▼                                                               │
│  ┌─────────────────┐                                                    │
│  │   Webhook API   │  ◄── WhatsApp Business API / Telegram Bot API     │
│  └────────┬────────┘                                                    │
│           │                                                             │
│           ▼                                                             │
│  ┌─────────────────┐                                                    │
│  │  Message Parser │  Parsea: "Venta: Cliente X, Producto Y, 5 uds"    │
│  └────────┬────────┘                                                    │
│           │                                                             │
│           ▼                                                             │
│  ┌─────────────────┐                                                    │
│  │  Command Router │  Detecta intención: VENTA, CONSULTA, ALERTA       │
│  └────────┬────────┘                                                    │
│           │                                                             │
│     ┌─────┴─────┬─────────────┐                                        │
│     ▼           ▼             ▼                                        │
│ ┌───────┐  ┌─────────┐  ┌──────────┐                                   │
│ │ Venta │  │ Stock   │  │ Reporte  │                                   │
│ │Handler│  │ Handler │  │ Handler  │                                   │
│ └───┬───┘  └────┬────┘  └────┬─────┘                                   │
│     │           │            │                                         │
│     └───────────┴────────────┘                                         │
│                 │                                                       │
│                 ▼                                                       │
│         ┌─────────────┐                                                 │
│         │  Core API   │                                                 │
│         └─────────────┘                                                 │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Comandos Soportados

```typescript
// Comandos de WhatsApp/Telegram

// VENTAS
"/venta Cliente, Producto, Cantidad"
"/venta ELEVARAGUA, IMP2S37RA, 5"
// Respuesta: ✅ Venta registrada: 5 x IMP2S37RA a ELEVARAGUA. Total: $375.00

// CONSULTAS
"/stock IMP2S37RA"
// Respuesta: 📦 IMP2S37RA: 16 unidades (Mínimo: 10) ⚠️

"/precio IMP2S37RA"
// Respuesta: 💰 IMP2S37RA
// - Elevapartes: $70.70
// - Mercado: $75.00
// - ML: $85.18

"/cliente ELEVARAGUA"
// Respuesta: 👤 ELEVARAGUA
// - Total compras: $12,500.00
// - Última compra: hace 3 días
// - Segmento: FRECUENTE

// REPORTES
"/reporte ventas hoy"
"/reporte ventas semana"
"/reporte inventario bajo"

// ALERTAS
"/alertas"
// Respuesta: ⚠️ 3 productos con stock bajo:
// - IMP2S37RA: 16 (min: 10)
// - I7S25: 8 (min: 4)
// - CEA36+: 6 (min: 10)
```

---

## 📊 COMPARATIVA FINAL

| Aspecto | Propuesta Original | Mi Propuesta | Ventaja |
|---------|-------------------|--------------|---------|
| **Modularidad** | Implícita | Explícita con NestJS Modules | Cambios aislados |
| **Tipos** | Duplicados | Compartidos via Monorepo | Un solo lugar de verdad |
| **Comunicación** | Directa entre servicios | Event-Driven | Desacoplamiento |
| **Frontend** | React básico | Next.js con Server Components | Mejor SEO, performance |
| **Mobile** | React Native o Flutter | React Native + Expo | Código compartido |
| **DB Schema** | SQL manual | Prisma ORM | Type-safe, migraciones |
| **Testing** | Mencionado | Por módulo aislado | Más confiable |
| **Escalabilidad** | Monolito | Monolito → Microservicios | Crecimiento orgánico |

---

## 🚀 ROADMAP SUGERIDO

### FASE 1: MVP Core (Semanas 1-8)
- Auth + Usuarios + Roles
- Inventario con alertas
- Ventas básicas
- Dashboard principal

### FASE 2: Operaciones (Semanas 9-14)
- Compras e Importaciones
- Clientes completo
- Gastos y Finanzas
- Reportes básicos

### FASE 3: Integraciones (Semanas 15-18)
- WhatsApp Bot
- Telegram Bot
- Notificaciones Push

### FASE 4: Mobile + Analytics (Semanas 19-22)
- App React Native
- Looker/Metabase
- Reportes avanzados

### FASE 5: Migración + Go-Live (Semanas 23-25)
- Migración de datos
- Capacitación
- Lanzamiento

**Total: 25 semanas (6 meses)**
