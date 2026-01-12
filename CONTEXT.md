# ELEVASHOP - Contexto del Proyecto

## Descripcion General
Elevashop es un sistema de gestion empresarial para una tienda de repuestos de ascensores. El sistema maneja inventario, ventas, clientes, finanzas e importaciones.

## Stack Tecnologico
- **Monorepo**: Turborepo
- **Backend (API)**: NestJS + Prisma ORM + PostgreSQL
- **Frontend (Web)**: Next.js 14 + React Query + shadcn/ui + Tailwind CSS
- **Base de datos**: PostgreSQL (Docker)

## Estructura del Proyecto
```
/home/arivera/PROYECTOS/elevashop/
├── apps/
│   ├── api/                    # Backend NestJS
│   │   ├── src/
│   │   │   ├── modules/        # Modulos de la API
│   │   │   │   ├── auth/       # Autenticacion JWT
│   │   │   │   ├── usuarios/
│   │   │   │   ├── productos/
│   │   │   │   ├── inventario/
│   │   │   │   ├── ventas/
│   │   │   │   ├── clientes/
│   │   │   │   ├── finanzas/
│   │   │   │   └── reportes/
│   │   │   └── config/
│   │   └── prisma/
│   │       ├── schema.prisma   # Schema de la BD
│   │       └── seed-ventas-diarias.ts  # Script migracion ventas
│   └── web/                    # Frontend Next.js
│       ├── app/
│       │   ├── (auth)/         # Login/Register
│       │   └── (dashboard)/    # Dashboard principal
│       │       └── dashboard/
│       │           ├── page.tsx           # Dashboard principal
│       │           ├── inventario/
│       │           ├── ventas/
│       │           ├── clientes/
│       │           └── finanzas/
│       └── lib/
│           └── api.ts          # Cliente API con tipos
├── infrastructure/             # Docker configs
├── listaprecioJA.xlsx          # Excel con datos originales
└── CONTEXT.md                  # Este archivo
```

## Puertos
- **API**: http://localhost:4050/api/v1
- **Web**: http://localhost:4051
- **PostgreSQL**: localhost:5432

## Credenciales
- **Admin**: admin@elevashop.com / admin123
- **DB**: postgres / postgres / elevashop_db

## Como Ejecutar
```bash
# Desde la raiz del proyecto
cd /home/arivera/PROYECTOS/elevashop

# Iniciar base de datos
cd infrastructure && docker-compose up -d

# Iniciar API (en una terminal)
cd apps/api && pnpm dev
# API logs en: /tmp/api.log

# Iniciar Web (en otra terminal)
cd apps/web && pnpm dev
# Web logs en: /tmp/web.log
```

## Base de Datos - Tablas Principales

### productos
- Almacena productos con 3 niveles de precio (MercadoLibre, Mercado, Elevapartes)
- Stock actual, minimo, advertencia
- Estado: OK, ALERTA_W, ALERTA, AGOTADO

### ventas (NUEVA - poblada con datos diarios)
- Ventas individuales con fecha real
- Relacionada con: cliente, usuario, detalles, pagos

### transacciones (LEGACY - solo resumenes mensuales)
- Contiene resumenes mensuales importados del Excel
- Todas las fechas son el dia 15 de cada mes

### clientes
- nombre, nombreNormalizado (para busquedas)
- totalCompras, cantidadOrdenes

### movimientos_stock
- Tipo: ENTRADA, SALIDA, AJUSTE, DEVOLUCION
- Referencia a producto y cantidades

### alertas_stock
- Alertas automaticas por stock bajo/critico/agotado

### unidades_inventario (NUEVO)
- Cada unidad física con su serial único
- Estado: DISPONIBLE, VENDIDO, DEFECTUOSO, DEVUELTO
- Costo de adquisición y precio de venta
- Cliente al que se vendió
- Información de garantía (meses, fecha límite)

---

## SESION 2 - Sistema de Seriales (Trazabilidad)

### Problema
El sistema solo manejaba cantidades agregadas de productos (stockActual = 10), sin registro de unidades individuales con sus seriales. Esto impedía:
- Validar garantías
- Saber si un producto fue vendido por nosotros
- Conocer el historial de cada unidad

### Solución Implementada
Se creó un sistema completo de trazabilidad por serial:

#### 1. Nueva tabla `unidades_inventario`
```prisma
model UnidadInventario {
  id              Int
  productoId      Int           // Referencia al producto
  serial          String        // Serial único (ej: SN-2024-001234)
  estado          EstadoUnidad  // DISPONIBLE, VENDIDO, DEFECTUOSO, DEVUELTO

  // Entrada
  fechaEntrada    DateTime
  origenTipo      OrigenUnidad  // COMPRA, PRODUCCION, IMPORTACION
  costoUnitario   Decimal       // Costo de adquisición
  lote            String?       // Número de lote

  // Venta
  fechaVenta      DateTime?
  clienteId       Int?
  precioVenta     Decimal?
  metodoPago      MetodoPago?
  utilidad        Decimal?      // precioVenta - costoUnitario

  // Garantía
  garantiaMeses   Int           // Default 6 meses
  garantiaHasta   DateTime?     // Calculada automáticamente
}
```

#### 2. Nuevos Endpoints API
```
POST   /api/v1/inventario/seriales              - Registrar serial
POST   /api/v1/inventario/seriales/multiple     - Registrar múltiples
POST   /api/v1/inventario/seriales/vender       - Vender unidad
GET    /api/v1/inventario/seriales/buscar/:serial - Buscar (garantía)
PATCH  /api/v1/inventario/seriales/:serial      - Actualizar estado
GET    /api/v1/inventario/seriales/producto/:id - Listar por producto
GET    /api/v1/inventario/seriales/estadisticas - Dashboard seriales
```

#### 3. Nueva página Frontend
**Ruta:** `/dashboard/inventario/seriales`

**Funcionalidades:**
- Buscador de garantía por serial (verifica si vendimos y estado de garantía)
- Dashboard con estadísticas (disponibles, vendidas, utilidad total)
- Selector de producto para ver sus seriales
- Registrar seriales individuales o múltiples
- Vender unidades seleccionando cliente y precio
- Filtrar por estado (disponible, vendido, defectuoso, devuelto)

#### 4. Archivos modificados/creados

**Backend:**
- `apps/api/prisma/schema.prisma` - Modelo UnidadInventario + enums
- `apps/api/src/modules/inventario/inventario.service.ts` - Métodos de seriales
- `apps/api/src/modules/inventario/inventario.controller.ts` - Endpoints
- `apps/api/src/modules/inventario/dto/registrar-serial.dto.ts` - DTO registro
- `apps/api/src/modules/inventario/dto/vender-serial.dto.ts` - DTO venta
- `apps/api/src/modules/inventario/dto/actualizar-serial.dto.ts` - DTO actualizar

**Frontend:**
- `apps/web/lib/api.ts` - Tipos y funciones API para seriales
- `apps/web/app/(dashboard)/dashboard/inventario/seriales/page.tsx` - Página completa
- `apps/web/components/ui/textarea.tsx` - Componente nuevo
- `apps/web/components/layout/sidebar.tsx` - Enlace "Seriales" en navegación

### Flujo de uso

1. **Entrada de mercancía:**
   - Ir a Seriales > Seleccionar producto > Registrar Serial
   - Ingresar serial, costo, origen, lote, meses garantía
   - O registrar múltiples seriales de una vez

2. **Venta:**
   - Buscar producto > Ver seriales disponibles
   - Click "Vender" > Seleccionar cliente, precio, método de pago
   - El sistema calcula utilidad y actualiza garantía

3. **Validar garantía:**
   - Usar el buscador "Verificar Garantía"
   - Ingresar serial
   - Ver si fue vendido por nosotros, cliente, fechas, estado de garantía

---

## SESION 1 - Ventas Ultimos 7 Dias

### 1. Seccion "Ventas Ultimos 7 Dias" en Dashboard
Se agrego una nueva seccion visual al dashboard que muestra:
- Timeline de 7 dias (Lun-Dom, "Hoy", "Ayer")
- Ventas por dia con monto total
- Productos vendidos cada dia
- Dias sin ventas aparecen con borde punteado

**Archivos modificados:**
- `apps/api/src/modules/ventas/ventas.controller.ts` - Endpoint GET /ventas/ultimos-7-dias
- `apps/api/src/modules/ventas/ventas.service.ts` - Metodo getVentasUltimos7Dias()
- `apps/web/lib/api.ts` - Tipos VentaDia, VentasUltimos7Dias y funcion API
- `apps/web/app/(dashboard)/dashboard/page.tsx` - Componente visual timeline

### 2. Migracion de Ventas Diarias desde Excel
**Problema encontrado:** La migracion original solo importo RESUMENES MENSUALES a la tabla `transacciones`. Las ventas individuales como la del 19/12/2025 (CEA51FC-S $505) no estaban en la BD.

**Solucion:** Se creo un script de migracion que importa ventas individuales:

**Archivo:** `apps/api/prisma/seed-ventas-diarias.ts`

**Como ejecutar:**
```bash
cd /home/arivera/PROYECTOS/elevashop/apps/api
npx ts-node prisma/seed-ventas-diarias.ts
```

**Ventas importadas (ultimos 30 dias):**
- 19/12/2025: EDINSON CHACON - CEA51FC-S x2 = $1010
- 15/12/2025: JORGE ROJAS - $1460
- 11/12/2025: SERGIO QUISPE - $540, RICARDO SEIJAS - $80
- 05/12/2025: JORGE ROJAS - $260
- 04/12/2025: VICTOR MOROS - $540, GRUPO ASC - $540
- 02/12/2025: EDINSON CHACON - $520
- Y mas...

### 3. Fix de Zona Horaria
Se corrigio la conversion de fechas Excel a JavaScript para evitar que las fechas se desplacen un dia por timezone.

**Antes:** `new Date(utc_value * 1000)` - causaba shift de 1 dia
**Despues:** `new Date(Date.UTC(1970, 0, 1 + utc_days, 12, 0, 0))` - usa mediodia UTC

---

## API Endpoints Principales

### Auth
- POST /api/v1/auth/login - Login
- POST /api/v1/auth/register - Registro
- GET /api/v1/auth/me - Usuario actual

### Productos
- GET /api/v1/productos - Listar (paginado)
- POST /api/v1/productos - Crear
- GET /api/v1/productos/:id - Obtener uno
- PUT /api/v1/productos/:id - Actualizar
- DELETE /api/v1/productos/:id - Eliminar

### Inventario
- GET /api/v1/inventario/dashboard - Stats del inventario
- GET /api/v1/inventario/alertas - Alertas de stock
- POST /api/v1/inventario/movimiento - Registrar movimiento

### Ventas
- GET /api/v1/ventas - Listar ventas
- POST /api/v1/ventas - Crear venta
- GET /api/v1/ventas/resumen - Resumen del mes
- GET /api/v1/ventas/ultimos-7-dias - **NUEVO** Timeline 7 dias

### Clientes
- GET /api/v1/clientes - Listar
- POST /api/v1/clientes - Crear
- PUT /api/v1/clientes/:id - Actualizar

### Finanzas
- GET /api/v1/finanzas/resumen - Balance general
- GET /api/v1/finanzas/tasa-cambio - Tasa actual
- POST /api/v1/finanzas/tasa-cambio - Actualizar tasa

---

## Excel Original (listaprecioJA.xlsx)

### Hojas importantes:
- `🟢INVENTARIO` - Lista de productos con precios y stock
- `❗️ENTRADA  SALIDA` - Transacciones individuales (entradas y salidas)
- `Gastos Mensuales Y CAMBIO BS` - Gastos y tasas de cambio
- `P_Ventas` - Resumen de ventas

### Columnas de ENTRADA SALIDA:
0. CODIGO
1. DESCRIPCION
2. FECHA ENTRADA
3. CANTIDAD ENTRADA
4. PRODUCCION
5. SERIAL
6. CANTIDAD SALIDA
7. FECHA SALIDA (Excel serial number)
8. CLIENTE SALIDA
9. MONTO SALIDA
10. FORMA DE PAGO
11. VENDIDA POR

---

## Errores Comunes y Soluciones

### Error: SelectItem must have non-empty value
**Causa:** Radix UI Select no permite value=""
**Solucion:** Usar value="all" y convertir en el handler

### Error: DialogContent requires DialogTitle
**Causa:** Accesibilidad de Radix UI
**Solucion:** Agregar DialogTitle (puede ser visualmente hidden)

### Ventas no aparecen en dashboard
**Causa:** Tabla `ventas` vacia, solo hay resumenes en `transacciones`
**Solucion:** Ejecutar seed-ventas-diarias.ts

---

## Proximos Pasos Sugeridos

1. Agregar mas datos historicos al script de migracion (cambiar fecha limite)
2. Crear funcionalidad para registrar ventas nuevas desde el frontend
3. Mejorar reportes con graficos
4. Implementar notificaciones de stock bajo
5. Agregar exportacion a PDF/Excel

---

## Comandos Utiles

```bash
# Ver logs de API
tail -f /tmp/api.log

# Ver logs de Web
tail -f /tmp/web.log

# Regenerar Prisma client
cd apps/api && npx prisma generate

# Push cambios a BD
cd apps/api && npx prisma db push

# Abrir Prisma Studio (GUI para BD)
cd apps/api && npx prisma studio

# Importar ventas diarias del Excel
cd apps/api && npx ts-node prisma/seed-ventas-diarias.ts
```

---

Ultima actualizacion: 2025-12-23 (Sistema de Seriales agregado)
