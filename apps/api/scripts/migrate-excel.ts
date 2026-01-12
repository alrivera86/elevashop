/**
 * Script de migración de datos desde Excel a PostgreSQL
 * Ejecutar con: pnpm migrate:excel
 */

import * as XLSX from 'xlsx';
import { PrismaClient, MetodoPago, TipoTransaccion, EstadoStock, TipoGasto } from '@prisma/client';
import * as path from 'path';

const prisma = new PrismaClient();

// Ruta al archivo Excel
const EXCEL_PATH = path.join(__dirname, '../../../listaprecioJA.xlsx');

// Mapeo de formas de pago del Excel a los enums de la BD
const METODO_PAGO_MAP: Record<string, MetodoPago> = {
  'EFECTIVO $': 'EFECTIVO_USD',
  'EFECTIVO$': 'EFECTIVO_USD',
  'EFECTVO $': 'EFECTIVO_USD',
  'EECTIVO $': 'EFECTIVO_USD',
  'EFECTIVO': 'EFECTIVO_USD',
  'EFECTIVO $ ': 'EFECTIVO_USD',
  'EFECTIVO ': 'EFECTIVO_USD',
  'ZELLE': 'ZELLE',
  'ZELLE ': 'ZELLE',
  'ZELLE  ': 'ZELLE',
  'TRANSFERENCIA BS': 'TRANSFERENCIA_BS',
  'TRANSFERNCIA BS': 'TRANSFERENCIA_BS',
  'TRANSF BS': 'TRANSFERENCIA_BS',
  'TRANSFERENCIA BS ': 'TRANSFERENCIA_BS',
  'TRANSFERENCIA $': 'TRANSFERENCIA_USD',
  'BANESCO': 'BANESCO',
  'BINANCE': 'BINANCE',
  'EFECTIVO $ / ZELLE': 'MIXTO',
  'EFECTIVO $ / TRANSF $': 'MIXTO',
  'EFECTIVO $ / TRANS BS': 'MIXTO',
  'EFECTIVO $ / TRANSF BS': 'MIXTO',
  'EFECTIVO $/ TRANSF BS': 'MIXTO',
  'EFECTIVO$ / TRANSF BS': 'MIXTO',
  'EFECTIVO / TRANSF BS': 'MIXTO',
  'EFECTIVO / TRANS BS': 'MIXTO',
  'EFECTIVO $/ TRANS BS': 'MIXTO',
  'EFECTIVO $ /  TRANSF BS': 'MIXTO',
  'ZELLE / EFECTIVO $': 'MIXTO',
  'ZELLE / TRANSFERENCIA $': 'MIXTO',
  'EFECTIVO / ZELLE': 'MIXTO',
  'EFECTIVO $ / BINANCE': 'MIXTO',
  'PENDIENTE': 'EFECTIVO_USD', // Default
};

// Mapeo de estados del Excel
const ESTADO_STOCK_MAP: Record<string, EstadoStock> = {
  'OK': 'OK',
  'ALERTA-W': 'ALERTA_W',
  'ALERTA': 'ALERTA',
  'AGOTADO': 'AGOTADO',
};

// Categorías de gastos
const CATEGORIAS_GASTO: Record<string, TipoGasto> = {
  'WILMEN VALERA': 'NOMINA',
  'VACACIONES': 'NOMINA',
  'UTILIDAD': 'NOMINA',
  'UTILIDAD ': 'NOMINA',
  'COMISION POR VENTAS': 'COMISION',
  'COMISION ML VENTA': 'COMISION',
  'PUBLICIDAD': 'MARKETING',
  'CONDOMINIO': 'SERVICIO',
  'CANTV': 'SERVICIO',
  'CELULAR 1': 'SERVICIO',
  'CELULAR ELEVASHOP': 'SERVICIO',
  'LUZ': 'SERVICIO',
  'ALCALDIA': 'IMPUESTO',
  'GASTOS VARIOS': 'OPERATIVO',
  'GASTOS OFICINA': 'OPERATIVO',
  'GASTO IMPORTACION': 'IMPORTACION',
  'INVERSION': 'INVERSION',
};

async function main() {
  console.log('🚀 Iniciando migración de datos desde Excel...');
  console.log(`📁 Archivo: ${EXCEL_PATH}`);

  // Leer archivo Excel
  const workbook = XLSX.readFile(EXCEL_PATH);

  // Limpiar base de datos (solo en desarrollo)
  if (process.env.NODE_ENV !== 'production') {
    console.log('🧹 Limpiando base de datos...');
    await limpiarBaseDatos();
  }

  // 1. Crear roles básicos
  console.log('👥 Creando roles...');
  await crearRoles();

  // 2. Crear usuario admin
  console.log('👤 Creando usuario admin...');
  await crearUsuarioAdmin();

  // 3. Crear proveedor principal
  console.log('🏭 Creando proveedor...');
  await crearProveedor();

  // 4. Crear categorías de gastos
  console.log('📂 Creando categorías de gastos...');
  await crearCategoriasGasto();

  // 5. Migrar productos
  console.log('📦 Migrando productos...');
  await migrarProductos(workbook);

  // 6. Migrar clientes (extraer de transacciones)
  console.log('👥 Migrando clientes...');
  await migrarClientes(workbook);

  // 7. Migrar transacciones
  console.log('💰 Migrando transacciones...');
  await migrarTransacciones(workbook);

  // 8. Migrar gastos
  console.log('💸 Migrando gastos...');
  await migrarGastos(workbook);

  // 9. Migrar importaciones
  console.log('🚢 Migrando importaciones...');
  await migrarImportaciones(workbook);

  // 10. Migrar operaciones de cambio
  console.log('💱 Migrando operaciones de cambio...');
  await migrarOperacionesCambio(workbook);

  console.log('✅ Migración completada exitosamente!');
}

async function limpiarBaseDatos() {
  const models = [
    'ventaPago', 'ventaDetalle', 'venta', 'transaccion',
    'movimientoStock', 'alertaStock', 'costoImportacion',
    'ordenCompraDetalle', 'ordenCompra', 'importacion',
    'gasto', 'operacionCambio', 'tasaCambio', 'producto',
    'categoria', 'categoriaGasto', 'cliente', 'usuario', 'rol', 'proveedor',
  ];

  for (const model of models) {
    try {
      await (prisma as any)[model].deleteMany();
    } catch (e) {
      // Ignorar errores si la tabla no existe
    }
  }
}

async function crearRoles() {
  await prisma.rol.createMany({
    data: [
      { nombre: 'ADMIN', descripcion: 'Administrador del sistema', permisos: ['*'] },
      { nombre: 'VENDEDOR', descripcion: 'Vendedor', permisos: ['ventas:*', 'productos:read', 'clientes:*'] },
      { nombre: 'ALMACEN', descripcion: 'Encargado de almacén', permisos: ['inventario:*', 'productos:*'] },
    ],
    skipDuplicates: true,
  });
}

async function crearUsuarioAdmin() {
  const bcrypt = require('bcrypt');
  const adminRol = await prisma.rol.findFirst({ where: { nombre: 'ADMIN' } });

  await prisma.usuario.upsert({
    where: { email: 'admin@elevashop.com' },
    update: {},
    create: {
      email: 'admin@elevashop.com',
      passwordHash: await bcrypt.hash('admin123', 10),
      nombreCompleto: 'Administrador',
      rolId: adminRol!.id,
    },
  });

  // Crear usuario Elevapartes
  await prisma.usuario.upsert({
    where: { email: 'elevapartes@elevashop.com' },
    update: {},
    create: {
      email: 'elevapartes@elevashop.com',
      passwordHash: await bcrypt.hash('elevapartes123', 10),
      nombreCompleto: 'Elevapartes',
      rolId: adminRol!.id,
    },
  });

  // Crear usuario Elevashop
  const vendedorRol = await prisma.rol.findFirst({ where: { nombre: 'VENDEDOR' } });
  await prisma.usuario.upsert({
    where: { email: 'elevashop@elevashop.com' },
    update: {},
    create: {
      email: 'elevashop@elevashop.com',
      passwordHash: await bcrypt.hash('elevashop123', 10),
      nombreCompleto: 'Elevashop',
      rolId: vendedorRol!.id,
    },
  });
}

async function crearProveedor() {
  await prisma.proveedor.upsert({
    where: { id: 1 },
    update: {},
    create: {
      nombre: 'Controles',
      razonSocial: 'Controles S.A.',
      pais: 'Uruguay',
    },
  });
}

async function crearCategoriasGasto() {
  const categoriasUnicas = Object.entries(CATEGORIAS_GASTO);

  for (const [nombre, tipo] of categoriasUnicas) {
    await prisma.categoriaGasto.upsert({
      where: { nombre },
      update: {},
      create: { nombre, tipo },
    });
  }
}

async function migrarProductos(workbook: XLSX.WorkBook) {
  const sheet = workbook.Sheets['🟢INVENTARIO'];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

  // Saltar encabezado
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const codigo = row[1];
    const nombre = row[2];

    if (!codigo || typeof codigo !== 'string' || codigo.includes('TOTAL')) continue;

    try {
      const precioML = parseFloat(row[3]) || 0;
      const precioMercado = parseFloat(row[4]) || 0;
      const precioElevapartes = parseFloat(row[5]) || 0;
      const estadoExcel = row[6] || 'OK';
      const stockAdvertencia = parseInt(row[8]) || 0;
      const stockMinimo = parseInt(row[9]) || 0;
      const stockActual = parseInt(row[12]) || 0;

      await prisma.producto.upsert({
        where: { codigo },
        update: {
          precioMercadoLibre: precioML,
          precioMercado: precioMercado,
          precioElevapartes: precioElevapartes,
          stockActual,
          stockMinimo,
          stockAdvertencia,
          estado: ESTADO_STOCK_MAP[estadoExcel] || 'OK',
        },
        create: {
          codigo,
          nombre: nombre || codigo,
          precioMercadoLibre: precioML,
          precioMercado: precioMercado,
          precioElevapartes: precioElevapartes,
          stockActual,
          stockMinimo,
          stockAdvertencia,
          estado: ESTADO_STOCK_MAP[estadoExcel] || 'OK',
        },
      });

      console.log(`  ✓ Producto: ${codigo}`);
    } catch (error) {
      console.error(`  ✗ Error en producto ${codigo}:`, error);
    }
  }
}

async function migrarClientes(workbook: XLSX.WorkBook) {
  const sheet = workbook.Sheets['❗️ENTRADA  SALIDA'];
  const data = XLSX.utils.sheet_to_json(sheet) as any[];

  const clientesUnicos = new Set<string>();

  for (const row of data) {
    const clienteNombre = row['CLIENTE SALIDA'];
    if (clienteNombre && typeof clienteNombre === 'string' && clienteNombre.trim()) {
      clientesUnicos.add(clienteNombre.trim().toUpperCase());
    }
  }

  for (const nombre of clientesUnicos) {
    try {
      const nombreNormalizado = nombre.replace(/\s+/g, ' ');

      await prisma.cliente.upsert({
        where: { id: -1 }, // Forzar create
        update: {},
        create: {
          nombre: nombreNormalizado,
          nombreNormalizado,
        },
      });
    } catch (error) {
      // Cliente ya existe con nombre similar, ignorar
    }
  }

  console.log(`  ✓ ${clientesUnicos.size} clientes migrados`);
}

async function migrarTransacciones(workbook: XLSX.WorkBook) {
  const sheet = workbook.Sheets['❗️ENTRADA  SALIDA'];
  const data = XLSX.utils.sheet_to_json(sheet) as any[];

  const usuarioElevapartes = await prisma.usuario.findFirst({ where: { nombreCompleto: 'Elevapartes' } });
  const usuarioElevashop = await prisma.usuario.findFirst({ where: { nombreCompleto: 'Elevashop' } });

  let count = 0;

  for (const row of data) {
    const codigo = row['CODIGO'];
    if (!codigo) continue;

    try {
      const producto = await prisma.producto.findUnique({ where: { codigo } });
      if (!producto) continue;

      const clienteNombre = row['CLIENTE SALIDA'];
      let cliente = null;

      if (clienteNombre) {
        cliente = await prisma.cliente.findFirst({
          where: { nombreNormalizado: clienteNombre.trim().toUpperCase().replace(/\s+/g, ' ') },
        });
      }

      const vendidaPor = row['VENDIDA POR'] || 'Elevapartes';
      const usuario = vendidaPor.toLowerCase().includes('elevashop') ? usuarioElevashop : usuarioElevapartes;

      const fechaEntrada = row['FECHA ENTRADA'] ? new Date(row['FECHA ENTRADA']) : null;
      const fechaSalida = row['FECHA SALIDA'] ? new Date(row['FECHA SALIDA']) : null;
      const cantidadEntrada = parseInt(row['CANTIDAD ENTRADA']) || 0;
      const cantidadSalida = parseFloat(row['CANTIDAD SALIDA']) || 0;

      const formaPago = row['FORMA DE PAGO'] || 'EFECTIVO $';
      const metodoPago = METODO_PAGO_MAP[formaPago.toUpperCase().trim()] || 'EFECTIVO_USD';

      const montoSalida = parseFloat(row['MONTO SALIDA']) || 0;
      const costo = parseFloat(row['COSTO']) || 0;
      const utilidad = parseFloat(row['UTILIDAD']) || 0;

      // Determinar tipo de transacción
      const tipo: TipoTransaccion = cantidadSalida > 0 ? 'SALIDA' : 'ENTRADA';
      const cantidad = tipo === 'SALIDA' ? cantidadSalida : cantidadEntrada;

      if (cantidad <= 0) continue;

      await prisma.transaccion.create({
        data: {
          tipo,
          productoId: producto.id,
          clienteId: cliente?.id,
          cantidad: Math.round(cantidad),
          precioUnitario: tipo === 'SALIDA' ? montoSalida / cantidad : null,
          costoUnitario: costo || null,
          total: tipo === 'SALIDA' ? montoSalida : null,
          utilidad: utilidad || null,
          serial: row['SERIAL']?.toString() || null,
          produccion: row['PRODUCCION']?.toString() || null,
          metodoPago: tipo === 'SALIDA' ? metodoPago : null,
          usuarioId: usuario!.id,
          fechaEntrada,
          fechaSalida,
          numeroOrden: row['NUMERO DE ORDEN']?.toString() || null,
          ubicacion: row['UBICACION'] || null,
          montoEfectivoUsd: parseFloat(row['Efectivo $']) || null,
          montoBs: parseFloat(row[' Bs']) || null,
          montoZelle: parseFloat(row['Zelle']) || null,
          montoBanesco: parseFloat(row['Banesco']) || null,
          tasaCambio: parseFloat(row['Tasa Cambio $']) || null,
          mes: fechaSalida?.getMonth() ? fechaSalida.getMonth() + 1 : (fechaEntrada?.getMonth() ? fechaEntrada.getMonth() + 1 : null),
          anio: fechaSalida?.getFullYear() || fechaEntrada?.getFullYear() || null,
        },
      });

      count++;
    } catch (error) {
      console.error(`  ✗ Error en transacción:`, error);
    }
  }

  console.log(`  ✓ ${count} transacciones migradas`);
}

async function migrarGastos(workbook: XLSX.WorkBook) {
  const sheet = workbook.Sheets['Gastos Mensuales Y CAMBIO BS'];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

  // Los encabezados son fechas en las columnas 1-36
  const encabezados = data[0];
  let count = 0;

  for (let i = 1; i < 20; i++) { // Primeras 20 filas son gastos
    const row = data[i];
    const nombreCategoria = row[0];

    if (!nombreCategoria || typeof nombreCategoria !== 'string') continue;
    if (nombreCategoria.includes('TOTALES') || nombreCategoria.includes('UTILIDAD')) continue;

    const categoria = await prisma.categoriaGasto.findFirst({ where: { nombre: nombreCategoria } });
    if (!categoria) continue;

    // Iterar por cada mes (columnas 1 en adelante)
    for (let j = 1; j < encabezados.length; j++) {
      const monto = parseFloat(row[j]);
      if (!monto || isNaN(monto) || monto <= 0) continue;

      const fechaColumna = encabezados[j];
      let fecha: Date;

      if (fechaColumna instanceof Date) {
        fecha = fechaColumna;
      } else if (typeof fechaColumna === 'string' && fechaColumna.includes(' ')) {
        // Formato "junio 2023"
        const meses: Record<string, number> = {
          'enero': 0, 'febrero': 1, 'marzo': 2, 'abril': 3, 'mayo': 4, 'junio': 5,
          'julio': 6, 'agosto': 7, 'septiembre': 8, 'octubre': 9, 'noviembre': 10, 'diciembre': 11,
        };
        const [mes, anio] = fechaColumna.toLowerCase().split(' ');
        fecha = new Date(parseInt(anio), meses[mes] || 0, 1);
      } else {
        continue;
      }

      try {
        await prisma.gasto.create({
          data: {
            categoriaId: categoria.id,
            monto,
            fecha,
            mes: fecha.getMonth() + 1,
            anio: fecha.getFullYear(),
          },
        });
        count++;
      } catch (error) {
        // Ignorar duplicados
      }
    }
  }

  console.log(`  ✓ ${count} gastos migrados`);
}

async function migrarImportaciones(workbook: XLSX.WorkBook) {
  const sheet = workbook.Sheets['📉Control de inversiones'];
  const data = XLSX.utils.sheet_to_json(sheet) as any[];

  const proveedor = await prisma.proveedor.findFirst();
  let count = 0;

  for (const row of data) {
    const factura = row['Factura'];
    if (!factura || typeof factura !== 'string') continue;

    try {
      await prisma.importacion.upsert({
        where: { factura },
        update: {},
        create: {
          factura,
          proveedorId: proveedor!.id,
          montoFactura: parseFloat(row['Monto en Factura']) || 0,
          montoTransferido: parseFloat(row['Monto Transferido']) || null,
          diferencia: parseFloat(row['Diferencia']) || null,
          numeroTransferencia: row['Numero de transferencia']?.toString() || null,
          comisionBancoBanesco: parseFloat(row['Comision Banco Banesco']) || null,
          comisionBancoControles: parseFloat(row['Comision Banco Controles']) || null,
          porcentajeNacionalizacion: parseFloat(row['%nacionalizacion']) || null,
          subTotal: parseFloat(row['Sub Total']) || null,
          descripcion: row['Descripcion'] || null,
          fechaFactura: row['Fecha'] ? new Date(row['Fecha']) : null,
        },
      });
      count++;
      console.log(`  ✓ Importación: ${factura}`);
    } catch (error) {
      console.error(`  ✗ Error en importación ${factura}:`, error);
    }
  }

  console.log(`  ✓ ${count} importaciones migradas`);
}

async function migrarOperacionesCambio(workbook: XLSX.WorkBook) {
  const sheet = workbook.Sheets['Gastos Mensuales Y CAMBIO BS'];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1, range: 23 }) as any[][];

  let count = 0;

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const cuenta = row[0];
    const vendedor = row[1];

    if (!cuenta || !vendedor || typeof cuenta !== 'string') continue;
    if (!cuenta.includes('CUENTA')) continue;

    try {
      const fecha = row[2] ? new Date(row[2]) : new Date();
      const montoUsd = parseFloat(row[3]) || 0;
      const montoBs = parseFloat(row[4]) || 0;
      const estado = row[5] || 'AUN EN BINANCE';
      const tasaCambio = parseFloat(row[8]) || (montoBs / montoUsd) || 0;
      const montoElevashop = parseFloat(row[9]) || null;

      if (montoUsd <= 0) continue;

      await prisma.operacionCambio.create({
        data: {
          cuenta: cuenta.replace('CUENTA ', '').trim(),
          vendedor,
          fecha,
          montoUsd,
          montoBs,
          tasaCambio,
          estado,
          montoElevashop,
        },
      });
      count++;
    } catch (error) {
      // Ignorar errores
    }
  }

  console.log(`  ✓ ${count} operaciones de cambio migradas`);
}

// Ejecutar
main()
  .catch((e) => {
    console.error('❌ Error en migración:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
