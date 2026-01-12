/**
 * Script de importacion de datos desde CSV
 * Ejecutar con: node scripts/import-data.js
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

// Ruta a los archivos CSV
const DATA_DIR = path.join(__dirname, '../../../datos');

// Helpers
function parseNumber(str) {
  if (!str || str === '' || str === '-') return null;
  // Remover $, espacios, y convertir coma a punto
  const cleaned = str.toString()
    .replace(/\$/g, '')
    .replace(/\s/g, '')
    .replace(/\./g, '') // quitar puntos de miles
    .replace(',', '.'); // coma decimal a punto
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

function parseDate(str) {
  if (!str || str === '') return null;
  // Formato DD/MM/YYYY
  const parts = str.split('/');
  if (parts.length !== 3) return null;
  const [day, month, year] = parts;
  return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
}

function normalizeClientName(name) {
  if (!name) return null;
  return name.trim().toUpperCase().replace(/\s+/g, ' ');
}

function normalizePaymentMethod(method) {
  if (!method || method === '') return null;
  const m = method.trim().toUpperCase();

  // Si es pendiente, retornar null (no asignar método de pago)
  if (m === 'PENDIENTE' || m.includes('PENDIENTE')) return null;

  if (m.includes('ZELLE') && (m.includes('EFECTIVO') || m.includes('TRANS'))) return 'MIXTO';
  if (m.includes('EFECTIVO') && m.includes('TRANS')) return 'MIXTO';
  if (m.includes('BINANCE') && m.includes('EFECTIVO')) return 'MIXTO';

  if (m.includes('ZELLE')) return 'ZELLE';
  if (m.includes('BANESCO')) return 'BANESCO';
  if (m.includes('BINANCE')) return 'BINANCE';
  if (m.includes('TRANSFERENCIA BS') || m.includes('TRANSF BS') || m.includes('TRANSFERNCIA BS')) return 'TRANSFERENCIA_BS';
  if (m.includes('TRANSFERENCIA $') || m.includes('TRANSF $') || m.includes('TRANS $')) return 'TRANSFERENCIA_USD';
  if (m.includes('PAGO MOVIL') || m.includes('PAGO_MOVIL')) return 'PAGO_MOVIL';
  if (m.includes('EFECTIVO') || m.includes('EFECTVO') || m.includes('EECTIVO')) return 'EFECTIVO_USD';

  return 'EFECTIVO_USD'; // default
}

function readCSV(filename) {
  const filePath = path.join(DATA_DIR, filename);
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').map(line => {
    // Parse CSV handling quoted fields
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  });
  return lines;
}

// ==================== PASO 1: CATEGORIAS ====================
async function importCategorias() {
  console.log('\n========== IMPORTANDO CATEGORIAS ==========');

  const categorias = [
    { nombre: 'Controladores', descripcion: 'Controladores de ascensor CEA' },
    { nombre: 'Displays', descripcion: 'Displays e indicadores' },
    { nombre: 'Sensores', descripcion: 'Sensores opticos y magneticos' },
    { nombre: 'Adaptadores', descripcion: 'Adaptadores USB, Bluetooth, etc' },
    { nombre: 'Accesorios', descripcion: 'Extensiones, coordinadores, expansiones' },
  ];

  for (const cat of categorias) {
    await prisma.categoria.upsert({
      where: { nombre: cat.nombre },
      update: {},
      create: cat,
    });
  }

  const count = await prisma.categoria.count();
  console.log(`Categorias importadas: ${count}`);
  return await prisma.categoria.findMany();
}

// ==================== PASO 2: PRODUCTOS ====================
async function importProductos(categorias) {
  console.log('\n========== IMPORTANDO PRODUCTOS ==========');

  const lines = readCSV('Lista precios J & Alberto  - 🟢INVENTARIO (1).csv');

  // Mapeo de categoria por codigo
  const catMap = {
    'CEA': 'Controladores',
    'IMP': 'Displays',
    'I7S': 'Displays',
    'ILCD': 'Displays',
    'SOD': 'Sensores',
    'SPM': 'Sensores',
    'ATTL': 'Adaptadores',
    'EXT': 'Accesorios',
    'AV': 'Accesorios',
    'COO': 'Accesorios',
    'EXP': 'Accesorios',
    'FIBRA': 'Adaptadores',
  };

  const catByName = {};
  for (const c of categorias) {
    catByName[c.nombre] = c.id;
  }

  let imported = 0;

  // Filas 2-25 son productos
  for (let i = 1; i < lines.length; i++) {
    const row = lines[i];
    const codigo = row[1];
    const nombre = row[2];

    if (!codigo || codigo === '' || codigo === 'TOTAL VENTAS A LA FECHA DESDE 08/03/2023 A 31/12/2025') break;
    if (!nombre) continue;

    // Determinar categoria
    let catNombre = 'Accesorios';
    for (const [prefix, cat] of Object.entries(catMap)) {
      if (codigo.startsWith(prefix)) {
        catNombre = cat;
        break;
      }
    }

    const precioML = parseNumber(row[3]) || 0;
    const precioMercado = parseNumber(row[4]) || 0;
    const precioElevapartes = parseNumber(row[5]) || 0;
    const estado = row[6] || 'OK';
    const notificacionEnviada = row[7] === 'SI';
    const stockAdvertencia = parseInt(row[8]) || 0;
    const stockMinimo = parseInt(row[9]) || 0;
    const entrada = parseInt(row[10]) || 0;
    const salida = parseInt(row[11]) || 0;
    const stockActual = parseInt(row[12]) || 0;

    // Mapear estado
    let estadoDB = 'OK';
    if (estado === 'ALERTA-W') estadoDB = 'ALERTA_W';
    else if (estado === 'ALERTA') estadoDB = 'ALERTA';
    else if (estado === 'AGOTADO') estadoDB = 'AGOTADO';

    try {
      await prisma.producto.upsert({
        where: { codigo },
        update: {
          nombre,
          precioMercadoLibre: precioML,
          precioMercado: precioMercado,
          precioElevapartes: precioElevapartes,
          precioCosto: precioElevapartes * 0.6, // Estimado 60% del precio
          stockActual,
          stockMinimo,
          stockAdvertencia,
          estado: estadoDB,
          notificacionEnviada,
          categoriaId: catByName[catNombre],
        },
        create: {
          codigo,
          nombre,
          precioMercadoLibre: precioML,
          precioMercado: precioMercado,
          precioElevapartes: precioElevapartes,
          precioCosto: precioElevapartes * 0.6,
          stockActual,
          stockMinimo,
          stockAdvertencia,
          estado: estadoDB,
          notificacionEnviada,
          categoriaId: catByName[catNombre],
        },
      });
      imported++;
      console.log(`  [${imported}] ${codigo} - ${nombre} (Stock: ${stockActual}, Estado: ${estadoDB})`);
    } catch (err) {
      console.error(`  Error importando ${codigo}:`, err.message);
    }
  }

  console.log(`\nProductos importados: ${imported}`);
  return imported;
}

// ==================== PASO 3: CLIENTES ====================
async function importClientes() {
  console.log('\n========== IMPORTANDO CLIENTES ==========');

  const lines = readCSV('Lista precios J & Alberto  - ❗️ENTRADA _ SALIDA.csv');

  const clientesSet = new Set();

  // Extraer clientes unicos de columna 9 (CLIENTE SALIDA)
  for (let i = 1; i < lines.length; i++) {
    const cliente = normalizeClientName(lines[i][8]);
    if (cliente && cliente !== '' && cliente !== 'CLIENTE SALIDA') {
      clientesSet.add(cliente);
    }
  }

  const clientes = Array.from(clientesSet);
  console.log(`Clientes unicos encontrados: ${clientes.length}`);

  let imported = 0;
  for (const nombre of clientes) {
    try {
      // Verificar si ya existe
      const existe = await prisma.cliente.findFirst({
        where: { nombreNormalizado: nombre },
      });

      if (!existe) {
        await prisma.cliente.create({
          data: {
            nombre,
            nombreNormalizado: nombre,
            segmento: 'NUEVO',
            totalCompras: 0,
            cantidadOrdenes: 0,
          },
        });
        imported++;
        if (imported % 20 === 0) {
          console.log(`  Importados ${imported} clientes...`);
        }
      }
    } catch (err) {
      console.error(`  Error importando cliente ${nombre}:`, err.message);
    }
  }

  console.log(`Clientes importados: ${imported}`);
  return imported;
}

// ==================== PASO 4: UNIDADES INVENTARIO Y VENTAS ====================
async function importUnidadesYVentas() {
  console.log('\n========== IMPORTANDO UNIDADES Y VENTAS ==========');

  const lines = readCSV('Lista precios J & Alberto  - ❗️ENTRADA _ SALIDA.csv');

  // Obtener mapeos
  const productos = await prisma.producto.findMany();
  const productoMap = {};
  for (const p of productos) {
    productoMap[p.codigo] = p;
  }

  const clientes = await prisma.cliente.findMany();
  const clienteMap = {};
  for (const c of clientes) {
    clienteMap[c.nombreNormalizado] = c;
  }

  // Obtener usuario admin para las ventas (rol ADMIN = id 2)
  const usuario = await prisma.usuario.findFirst({
    where: {
      rol: { nombre: 'ADMIN' }
    }
  });
  if (!usuario) {
    console.error('No se encontro usuario admin');
    return;
  }
  console.log(`  Usando usuario: ${usuario.nombreCompleto} (ID: ${usuario.id})`)

  let unidadesImportadas = 0;
  let ventasCreadas = 0;

  // Agrupar ventas por cliente+fecha
  const ventasAgrupadas = {};

  for (let i = 1; i < lines.length; i++) {
    const row = lines[i];
    const codigo = row[0];
    const fechaEntradaStr = row[2];
    const cantidadEntrada = parseInt(row[3]) || 0;
    const produccion = row[4]; // lote
    const serial = row[5];
    const cantidadSalida = parseInt(row[6]) || 0;
    const fechaSalidaStr = row[7];
    const clienteNombre = normalizeClientName(row[8]);
    const montoSalida = parseNumber(row[9]);
    const formaPago = row[10];
    const costo = parseNumber(row[20]);
    const utilidad = parseNumber(row[21]);

    if (!codigo || codigo === 'CODIGO') continue;

    const producto = productoMap[codigo];
    if (!producto) {
      console.log(`  Producto no encontrado: ${codigo}`);
      continue;
    }

    const fechaEntrada = parseDate(fechaEntradaStr);
    const fechaSalida = parseDate(fechaSalidaStr);
    const costoUnitario = costo || (producto.precioCosto ? parseFloat(producto.precioCosto) : 0);

    // Determinar estado de la unidad
    let estado = 'DISPONIBLE';
    if (cantidadSalida > 0 && fechaSalida) {
      estado = 'VENDIDO';
    }

    // Crear unidad de inventario
    const serialCompleto = `${produccion}-${serial}`;

    try {
      const clienteObj = clienteNombre ? clienteMap[clienteNombre] : null;

      await prisma.unidadInventario.upsert({
        where: { serial: serialCompleto },
        update: {
          estado,
          fechaVenta: fechaSalida,
          clienteId: clienteObj?.id,
          precioVenta: montoSalida,
          utilidad: utilidad,
          metodoPago: estado === 'VENDIDO' ? normalizePaymentMethod(formaPago) : null,
        },
        create: {
          productoId: producto.id,
          serial: serialCompleto,
          estado,
          fechaEntrada: fechaEntrada || new Date(),
          origenTipo: 'IMPORTACION',
          costoUnitario: costoUnitario,
          lote: produccion,
          fechaVenta: fechaSalida,
          clienteId: clienteObj?.id,
          precioVenta: montoSalida,
          utilidad: utilidad,
          metodoPago: estado === 'VENDIDO' ? normalizePaymentMethod(formaPago) : null,
        },
      });
      unidadesImportadas++;

      // Si es venta, agrupar para crear venta
      if (estado === 'VENDIDO' && clienteObj && fechaSalida && montoSalida) {
        const key = `${clienteObj.id}-${fechaSalida.toISOString().split('T')[0]}`;
        if (!ventasAgrupadas[key]) {
          ventasAgrupadas[key] = {
            clienteId: clienteObj.id,
            fecha: fechaSalida,
            detalles: [],
            pagos: {},
            total: 0,
          };
        }
        ventasAgrupadas[key].detalles.push({
          productoId: producto.id,
          cantidad: 1,
          precioUnitario: montoSalida,
          costoUnitario: costoUnitario,
          serial: serialCompleto,
        });
        ventasAgrupadas[key].total += montoSalida;

        // Agregar pago
        const metodoPago = normalizePaymentMethod(formaPago);
        if (metodoPago && metodoPago !== 'PENDIENTE') {
          if (!ventasAgrupadas[key].pagos[metodoPago]) {
            ventasAgrupadas[key].pagos[metodoPago] = 0;
          }
          ventasAgrupadas[key].pagos[metodoPago] += montoSalida;
        }
      }

    } catch (err) {
      console.error(`  Error importando unidad ${serialCompleto}:`, err.message);
    }

    if (unidadesImportadas % 100 === 0) {
      console.log(`  Procesadas ${unidadesImportadas} unidades...`);
    }
  }

  console.log(`\nUnidades importadas: ${unidadesImportadas}`);

  // Crear ventas agrupadas
  console.log(`\nCreando ${Object.keys(ventasAgrupadas).length} ventas...`);

  for (const [key, venta] of Object.entries(ventasAgrupadas)) {
    try {
      const ventaCreada = await prisma.venta.create({
        data: {
          clienteId: venta.clienteId,
          usuarioId: usuario.id,
          fecha: venta.fecha,
          subtotal: venta.total,
          descuento: 0,
          impuesto: 0,
          total: venta.total,
          estadoPago: Object.keys(venta.pagos).length > 0 ? 'PAGADO' : 'PENDIENTE',
          estado: 'ENTREGADA',
          detalles: {
            create: venta.detalles.map(d => ({
              productoId: d.productoId,
              cantidad: d.cantidad,
              precioUnitario: d.precioUnitario,
              costoUnitario: d.costoUnitario,
              descuento: 0,
              subtotal: d.precioUnitario * d.cantidad,
              serial: d.serial,
            })),
          },
          pagos: {
            create: Object.entries(venta.pagos).map(([metodo, monto]) => ({
              metodoPago: metodo,
              monto: monto,
              moneda: 'USD',
            })),
          },
        },
      });
      ventasCreadas++;

      // Actualizar totales del cliente
      await prisma.cliente.update({
        where: { id: venta.clienteId },
        data: {
          totalCompras: { increment: venta.total },
          cantidadOrdenes: { increment: 1 },
        },
      });

    } catch (err) {
      console.error(`  Error creando venta ${key}:`, err.message);
    }
  }

  console.log(`Ventas creadas: ${ventasCreadas}`);

  return { unidadesImportadas, ventasCreadas };
}

// ==================== PASO 5: CATEGORIAS DE GASTO ====================
async function importCategoriasGasto() {
  console.log('\n========== IMPORTANDO CATEGORIAS DE GASTO ==========');

  const categorias = [
    { nombre: 'NOMINA', tipo: 'NOMINA' },
    { nombre: 'VACACIONES', tipo: 'NOMINA' },
    { nombre: 'UTILIDAD', tipo: 'NOMINA' },
    { nombre: 'COMISION', tipo: 'COMISION' },
    { nombre: 'PUBLICIDAD', tipo: 'MARKETING' },
    { nombre: 'CONDOMINIO', tipo: 'OPERATIVO' },
    { nombre: 'CANTV', tipo: 'SERVICIO' },
    { nombre: 'CELULAR', tipo: 'SERVICIO' },
    { nombre: 'LUZ', tipo: 'SERVICIO' },
    { nombre: 'ALCALDIA', tipo: 'IMPUESTO' },
    { nombre: 'GASTOS VARIOS', tipo: 'OPERATIVO' },
    { nombre: 'GASTOS OFICINA', tipo: 'OPERATIVO' },
    { nombre: 'GASTO IMPORTACION', tipo: 'IMPORTACION' },
    { nombre: 'INVERSION', tipo: 'INVERSION' },
  ];

  for (const cat of categorias) {
    await prisma.categoriaGasto.upsert({
      where: { nombre: cat.nombre },
      update: {},
      create: cat,
    });
  }

  const count = await prisma.categoriaGasto.count();
  console.log(`Categorias de gasto importadas: ${count}`);
}

// ==================== PASO 6: GASTOS MENSUALES ====================
async function importGastos() {
  console.log('\n========== IMPORTANDO GASTOS MENSUALES ==========');

  const lines = readCSV('Lista precios J & Alberto  - Gastos Mensuales Y CAMBIO BS.csv');

  const categoriasGasto = await prisma.categoriaGasto.findMany();
  const catMap = {};
  for (const c of categoriasGasto) {
    catMap[c.nombre] = c.id;
  }

  // Los meses estan en las columnas 1-36 (enero 2023 a diciembre 2025)
  const meses = [];
  const header = lines[0];
  for (let col = 1; col <= 36; col++) {
    const mesStr = header[col];
    if (mesStr && mesStr.includes(' ')) {
      const [mes, anio] = mesStr.split(' ');
      const mesesNombres = {
        'enero': 1, 'febrero': 2, 'marzo': 3, 'abril': 4, 'mayo': 5, 'junio': 6,
        'julio': 7, 'agosto': 8, 'septiembre': 9, 'octubre': 10, 'noviembre': 11, 'diciembre': 12
      };
      meses[col] = { mes: mesesNombres[mes.toLowerCase()], anio: parseInt(anio) };
    }
  }

  // Mapeo de filas a categorias
  const filaCategoria = {
    1: 'NOMINA', // WILMEN VALERA
    2: 'VACACIONES',
    3: 'UTILIDAD',
    4: 'COMISION', // COMISION POR VENTAS
    5: 'COMISION', // COMISION ML VENTA
    6: 'PUBLICIDAD',
    8: 'CONDOMINIO',
    9: 'CANTV',
    10: 'CELULAR', // CELULAR 1
    11: 'CELULAR', // CELULAR ELEVASHOP
    12: 'LUZ',
    13: 'ALCALDIA',
    14: 'GASTOS VARIOS',
    16: 'GASTO IMPORTACION',
  };

  let gastosImportados = 0;

  for (const [fila, catNombre] of Object.entries(filaCategoria)) {
    const row = lines[parseInt(fila)];
    if (!row) continue;

    const categoriaId = catMap[catNombre];
    if (!categoriaId) continue;

    for (let col = 1; col <= 36; col++) {
      const mesInfo = meses[col];
      if (!mesInfo) continue;

      const monto = parseNumber(row[col]);
      if (!monto || monto === 0) continue;

      try {
        await prisma.gasto.create({
          data: {
            categoriaId,
            monto,
            moneda: 'USD',
            fecha: new Date(mesInfo.anio, mesInfo.mes - 1, 15),
            mes: mesInfo.mes,
            anio: mesInfo.anio,
            descripcion: `${row[0]} - ${header[col]}`,
            estado: 'PAGADO',
          },
        });
        gastosImportados++;
      } catch (err) {
        // Ignorar duplicados
      }
    }
  }

  console.log(`Gastos importados: ${gastosImportados}`);
  return gastosImportados;
}

// ==================== PASO 7: IMPORTACIONES ====================
async function importImportaciones() {
  console.log('\n========== IMPORTANDO IMPORTACIONES ==========');

  const lines = readCSV('Lista precios J & Alberto  - 📉Control de inversiones.csv');

  // Crear proveedor por defecto
  const proveedor = await prisma.proveedor.upsert({
    where: { id: 1 },
    update: {},
    create: {
      nombre: 'CONTROLES URUGUAY',
      razonSocial: 'Controles Elevadores Uruguay',
      pais: 'Uruguay',
    },
  });

  let importadas = 0;

  // Filas 2-12 tienen las importaciones
  for (let i = 1; i < lines.length; i++) {
    const row = lines[i];
    const fechaStr = row[0];
    const factura = row[1];
    const montoFactura = parseNumber(row[2]);

    if (!factura || factura === '' || !montoFactura) continue;

    const fecha = parseDate(fechaStr);
    const montoTransferido = parseNumber(row[3]);
    const diferencia = parseNumber(row[4]);
    const comisionBanesco = parseNumber(row[6]);
    const comisionControles = parseNumber(row[7]);
    const porcentajeNac = parseNumber(row[8]?.replace('%', '')) / 100;
    const seguroNac = parseNumber(row[9]);
    const subTotal = parseNumber(row[10]);
    const descripcion = row[12];

    try {
      await prisma.importacion.upsert({
        where: { factura },
        update: {
          montoFactura,
          montoTransferido,
          diferencia,
          comisionBancoBanesco: comisionBanesco,
          comisionBancoControles: comisionControles,
          porcentajeNacionalizacion: porcentajeNac,
          seguroNacionalizacion: seguroNac,
          subTotal,
          descripcion,
        },
        create: {
          factura,
          proveedorId: proveedor.id,
          montoFactura,
          montoTransferido,
          diferencia,
          comisionBancoBanesco: comisionBanesco,
          comisionBancoControles: comisionControles,
          porcentajeNacionalizacion: porcentajeNac,
          seguroNacionalizacion: seguroNac,
          subTotal,
          descripcion,
          estado: 'RECIBIDA',
          fechaFactura: fecha,
        },
      });
      importadas++;
      console.log(`  [${importadas}] ${factura} - $${montoFactura}`);
    } catch (err) {
      console.error(`  Error importando ${factura}:`, err.message);
    }
  }

  console.log(`\nImportaciones importadas: ${importadas}`);
  return importadas;
}

// ==================== VERIFICACION FINAL ====================
async function verificarTotales() {
  console.log('\n========== VERIFICACION DE TOTALES ==========');

  const [
    totalProductos,
    totalClientes,
    totalUnidades,
    totalVentas,
    totalGastos,
    totalImportaciones,
  ] = await Promise.all([
    prisma.producto.count(),
    prisma.cliente.count(),
    prisma.unidadInventario.count(),
    prisma.venta.count(),
    prisma.gasto.count(),
    prisma.importacion.count(),
  ]);

  // Sumar ventas
  const sumaVentas = await prisma.venta.aggregate({
    _sum: { total: true },
  });

  // Sumar utilidades
  const sumaUtilidades = await prisma.unidadInventario.aggregate({
    where: { estado: 'VENDIDO' },
    _sum: { utilidad: true, precioVenta: true },
  });

  console.log('\n--- RESUMEN ---');
  console.log(`Productos: ${totalProductos}`);
  console.log(`Clientes: ${totalClientes}`);
  console.log(`Unidades de inventario: ${totalUnidades}`);
  console.log(`Ventas: ${totalVentas}`);
  console.log(`Gastos: ${totalGastos}`);
  console.log(`Importaciones: ${totalImportaciones}`);
  console.log(`\nTotal ventas: $${sumaVentas._sum.total || 0}`);
  console.log(`Total utilidades (unidades): $${sumaUtilidades._sum.utilidad || 0}`);
  console.log(`Total ingresos (unidades): $${sumaUtilidades._sum.precioVenta || 0}`);

  // Verificar ventas por mes (diciembre 2025)
  const ventasDic2025 = await prisma.venta.aggregate({
    where: {
      fecha: {
        gte: new Date('2025-12-01'),
        lte: new Date('2025-12-31'),
      },
    },
    _sum: { total: true },
    _count: true,
  });

  const ventasNov2025 = await prisma.venta.aggregate({
    where: {
      fecha: {
        gte: new Date('2025-11-01'),
        lte: new Date('2025-11-30'),
      },
    },
    _sum: { total: true },
    _count: true,
  });

  console.log(`\nVentas Diciembre 2025: $${ventasDic2025._sum.total || 0} (${ventasDic2025._count} ventas)`);
  console.log(`Ventas Noviembre 2025: $${ventasNov2025._sum.total || 0} (${ventasNov2025._count} ventas)`);
}

// ==================== MAIN ====================
async function main() {
  console.log('==============================================');
  console.log('   IMPORTACION DE DATOS ELEVASHOP');
  console.log('==============================================');

  try {
    // Paso 1: Categorias
    const categorias = await importCategorias();

    // Paso 2: Productos
    await importProductos(categorias);

    // Paso 3: Clientes
    await importClientes();

    // Paso 4: Unidades de inventario y ventas
    await importUnidadesYVentas();

    // Paso 5: Categorias de gasto
    await importCategoriasGasto();

    // Paso 6: Gastos mensuales
    await importGastos();

    // Paso 7: Importaciones
    await importImportaciones();

    // Verificacion final
    await verificarTotales();

    console.log('\n==============================================');
    console.log('   IMPORTACION COMPLETADA');
    console.log('==============================================');

  } catch (error) {
    console.error('Error durante la importacion:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
