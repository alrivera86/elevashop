# Documentación API Elevashop para Integración de Bot

## Información General

| Parámetro | Valor |
|-----------|-------|
| **Base URL Producción** | `https://elevashop-api.onrender.com` |
| **Base URL Local** | `http://localhost:4050` |
| **Autenticación** | JWT Bearer Token |
| **Content-Type** | `application/json` |

---

## Autenticación

Todas las rutas requieren autenticación JWT. El bot debe obtener un token antes de hacer consultas.

### Obtener Token

```http
POST /auth/login
Content-Type: application/json

{
  "email": "bot@elevashop.com",
  "password": "password_del_bot"
}
```

**Respuesta:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "bot@elevashop.com",
    "nombre": "Bot Elevashop"
  }
}
```

### Usar Token en Requests

```http
GET /productos
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## Endpoints para el Bot

### 1. Buscar Productos

#### Listar productos con filtros

```http
GET /productos?search={término}&page={página}&limit={cantidad}
```

**Parámetros Query:**
| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `search` | string | No | Busca por código o nombre del producto |
| `page` | number | No | Página (default: 1) |
| `limit` | number | No | Cantidad por página (default: 20) |
| `estado` | string | No | Filtrar por estado: `OK`, `ALERTA`, `ALERTA_W`, `AGOTADO` |
| `categoriaId` | number | No | Filtrar por categoría |

**Ejemplo - Buscar "motor":**
```http
GET /productos?search=motor&limit=10
```

**Respuesta:**
```json
{
  "productos": [
    {
      "id": 15,
      "codigo": "MOT-001",
      "nombre": "MOTOR GEARLESS 1000KG",
      "descripcion": "Motor gearless para ascensores de alta velocidad",
      "categoriaId": 3,
      "precioMercadoLibre": "2500.00",
      "precioMercado": "2200.00",
      "precioElevapartes": "1800.00",
      "precioCosto": "1200.00",
      "stockActual": 5,
      "stockMinimo": 2,
      "stockAdvertencia": 4,
      "estado": "OK",
      "ubicacion": "A-15",
      "activo": true,
      "categoria": {
        "id": 3,
        "nombre": "Motores"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "totalPages": 3
  }
}
```

---

#### Buscar producto por código exacto

```http
GET /productos/codigo/{codigo}
```

**Ejemplo:**
```http
GET /productos/codigo/MOT-001
```

**Respuesta:**
```json
{
  "id": 15,
  "codigo": "MOT-001",
  "nombre": "MOTOR GEARLESS 1000KG",
  "descripcion": "Motor gearless para ascensores de alta velocidad",
  "precioMercadoLibre": "2500.00",
  "precioMercado": "2200.00",
  "precioElevapartes": "1800.00",
  "precioCosto": "1200.00",
  "stockActual": 5,
  "stockMinimo": 2,
  "stockAdvertencia": 4,
  "estado": "OK",
  "ubicacion": "A-15",
  "categoria": {
    "id": 3,
    "nombre": "Motores"
  }
}
```

---

#### Buscar producto por ID

```http
GET /productos/{id}
```

**Ejemplo:**
```http
GET /productos/15
```

---

### 2. Consultar Inventario

#### Dashboard de inventario

```http
GET /inventario/dashboard
```

**Respuesta:**
```json
{
  "totalProductos": 182,
  "totalUnidades": 1250,
  "productosEnAlerta": 15,
  "productosAgotados": 8,
  "valorInventario": 125000.00
}
```

---

#### Inventario con seriales por producto

```http
GET /inventario/con-seriales?codigo={codigo}&conSeriales=true
```

**Parámetros Query:**
| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `productoId` | number | No | ID del producto |
| `codigo` | string | No | Código del producto |
| `conSeriales` | boolean | No | Incluir lista de seriales (default: true) |
| `page` | number | No | Página |
| `limit` | number | No | Cantidad por página |

**Ejemplo:**
```http
GET /inventario/con-seriales?codigo=MOT-001&conSeriales=true
```

**Respuesta:**
```json
{
  "producto": {
    "id": 15,
    "codigo": "MOT-001",
    "nombre": "MOTOR GEARLESS 1000KG",
    "stockActual": 5,
    "precios": {
      "mercadoLibre": 2500.00,
      "mercado": 2200.00,
      "elevapartes": 1800.00
    }
  },
  "seriales": [
    {
      "serial": "MOT-001-2024-001",
      "estado": "DISPONIBLE",
      "fechaEntrada": "2024-01-15T10:00:00Z",
      "costoUnitario": 1200.00
    },
    {
      "serial": "MOT-001-2024-002",
      "estado": "DISPONIBLE",
      "fechaEntrada": "2024-01-15T10:00:00Z",
      "costoUnitario": 1200.00
    }
  ],
  "resumen": {
    "disponibles": 5,
    "vendidos": 12,
    "reservados": 0
  }
}
```

---

#### Buscar por serial (validar garantía)

```http
GET /inventario/seriales/buscar/{serial}
```

**Ejemplo:**
```http
GET /inventario/seriales/buscar/MOT-001-2024-001
```

**Respuesta:**
```json
{
  "serial": "MOT-001-2024-001",
  "producto": {
    "id": 15,
    "codigo": "MOT-001",
    "nombre": "MOTOR GEARLESS 1000KG"
  },
  "estado": "VENDIDO",
  "fechaVenta": "2024-02-20T14:30:00Z",
  "cliente": {
    "id": 193,
    "nombre": "G. FONSELEVEZ 2022 C.A"
  },
  "precioVenta": 1800.00,
  "garantia": {
    "meses": 6,
    "venceEl": "2024-08-20T14:30:00Z",
    "vigente": true
  }
}
```

---

### 3. Productos con Stock Bajo

```http
GET /productos/stock-bajo
```

**Respuesta:**
```json
[
  {
    "id": 25,
    "codigo": "CAB-005",
    "nombre": "CABLE DE TRACCIÓN 10MM",
    "stockActual": 2,
    "stockMinimo": 5,
    "estado": "ALERTA",
    "categoria": {
      "nombre": "Cables"
    }
  },
  {
    "id": 30,
    "codigo": "BOT-001",
    "nombre": "BOTONERA DE CABINA",
    "stockActual": 0,
    "stockMinimo": 3,
    "estado": "AGOTADO",
    "categoria": {
      "nombre": "Botoneras"
    }
  }
]
```

---

### 4. Estadísticas de Productos

```http
GET /productos/estadisticas
```

**Respuesta:**
```json
{
  "totalProductos": 182,
  "porEstado": {
    "OK": 150,
    "ALERTA_W": 15,
    "ALERTA": 10,
    "AGOTADO": 7
  },
  "totalUnidades": 1250
}
```

---

### 5. Tasa del Dólar (Binance P2P)

```http
GET /finanzas/tasa-dolar
```

**Respuesta:**
```json
{
  "rate": 52.50,
  "source": "binance_p2p",
  "updatedAt": "2024-01-17T16:00:00Z",
  "nextUpdate": "5:30 PM"
}
```

---

## Estructura de Datos

### Producto

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | number | ID único |
| `codigo` | string | Código del producto (único) |
| `nombre` | string | Nombre del producto |
| `descripcion` | string | Descripción detallada |
| `precioMercadoLibre` | decimal | Precio para Mercado Libre |
| `precioMercado` | decimal | Precio de mercado |
| `precioElevapartes` | decimal | Precio Elevapartes (mayorista) |
| `precioCosto` | decimal | Costo del producto |
| `stockActual` | number | Unidades disponibles |
| `stockMinimo` | number | Stock mínimo antes de alerta |
| `stockAdvertencia` | number | Stock de advertencia |
| `estado` | enum | `OK`, `ALERTA_W`, `ALERTA`, `AGOTADO` |
| `ubicacion` | string | Ubicación física en almacén |
| `categoria` | object | Categoría del producto |

### Estados de Stock

| Estado | Descripción |
|--------|-------------|
| `OK` | Stock normal |
| `ALERTA_W` | Stock bajo (warning) - por debajo de stockAdvertencia |
| `ALERTA` | Stock crítico - por debajo de stockMinimo |
| `AGOTADO` | Sin stock |

### Estados de Serial/Unidad

| Estado | Descripción |
|--------|-------------|
| `DISPONIBLE` | Unidad disponible para venta |
| `RESERVADO` | Unidad reservada |
| `VENDIDO` | Unidad vendida |
| `DEFECTUOSO` | Unidad con defecto |
| `DEVUELTO` | Unidad devuelta |

---

## Ejemplos de Consultas para el Bot

### 1. Cliente pregunta por un producto específico

**Input del cliente:** "¿Tienen motor gearless?"

**Llamada API:**
```http
GET /productos?search=motor%20gearless&limit=5
```

**Respuesta del bot:**
> Sí, tenemos el **MOTOR GEARLESS 1000KG** (código: MOT-001)
> - Precio: $1,800.00
> - Stock disponible: 5 unidades
> - Estado: Disponible

---

### 2. Cliente pregunta precio

**Input del cliente:** "¿Cuánto cuesta el MOT-001?"

**Llamada API:**
```http
GET /productos/codigo/MOT-001
```

**Respuesta del bot:**
> El **MOTOR GEARLESS 1000KG** tiene los siguientes precios:
> - Precio Elevapartes: $1,800.00
> - Precio Mercado: $2,200.00
> - Precio MercadoLibre: $2,500.00

---

### 3. Cliente consulta disponibilidad

**Input del cliente:** "¿Tienen cable de tracción?"

**Llamada API:**
```http
GET /productos?search=cable%20traccion
```

**Respuesta del bot (si hay stock):**
> Sí, tenemos **CABLE DE TRACCIÓN 10MM** disponible.
> Stock: 15 unidades | Precio: $45.00/metro

**Respuesta del bot (si no hay stock):**
> El **CABLE DE TRACCIÓN 10MM** está temporalmente agotado.
> ¿Deseas que te notifiquemos cuando esté disponible?

---

### 4. Cliente consulta garantía por serial

**Input del cliente:** "Quiero verificar garantía del serial MOT-001-2024-001"

**Llamada API:**
```http
GET /inventario/seriales/buscar/MOT-001-2024-001
```

**Respuesta del bot:**
> **Información del Serial MOT-001-2024-001**
> - Producto: MOTOR GEARLESS 1000KG
> - Fecha de venta: 20/02/2024
> - Garantía: 6 meses (vigente hasta 20/08/2024)
> - Estado: ✅ En garantía

---

### 5. Cliente pregunta por tasa del dólar

**Input del cliente:** "¿A cuánto está el dólar?"

**Llamada API:**
```http
GET /finanzas/tasa-dolar
```

**Respuesta del bot:**
> La tasa actual es **Bs 52.50** por dólar (Binance P2P)
> Última actualización: hace 2 horas
> Próxima actualización: 5:30 PM

---

## Códigos de Error

| Código | Descripción |
|--------|-------------|
| `401` | No autorizado - Token inválido o expirado |
| `404` | Recurso no encontrado |
| `500` | Error interno del servidor |

**Ejemplo error 404:**
```json
{
  "statusCode": 404,
  "message": "Producto con código XYZ-999 no encontrado",
  "error": "Not Found"
}
```

---

## Recomendaciones para el Bot

1. **Caché**: Guardar en caché las búsquedas frecuentes (5-10 minutos)
2. **Fuzzy Search**: Si no encuentra exacto, usar `search` con términos parciales
3. **Manejo de errores**: Siempre manejar 404 con mensaje amigable
4. **Tasa de dólar**: Refrescar cada 5 minutos máximo
5. **Tokens**: Renovar token JWT cada 24 horas

---

## Contacto

Para crear credenciales del bot o consultas técnicas:
- Email: arivera@elevashop.com
- Sistema: Elevashop ERP

---

*Documentación generada: Enero 2025*
