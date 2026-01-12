/**
 * Script para importar ventas diarias desde el Excel
 * Esto llenará la tabla 'ventas' con los registros individuales
 */

import { PrismaClient, MetodoPago } from '@prisma/client';
import * as XLSX from 'xlsx';
import * as path from 'path';

const prisma = new PrismaClient();

// Convertir fecha de Excel a Date (usando mediodía UTC para evitar problemas de zona horaria)
function excelDateToJSDate(serial: number): Date {
  // Excel serial date: days since Jan 1, 1900 (with Excel bug for 1900 leap year)
  // 25569 is the number of days from 1900-01-01 to 1970-01-01
  const utc_days = Math.floor(serial - 25569);
  // Use noon UTC (12:00) to avoid timezone boundary issues
  const date = new Date(Date.UTC(1970, 0, 1 + utc_days, 12, 0, 0));
  return date;
}

// Normalizar nombre de cliente para búsqueda
function normalizeClientName(name: string): string {
  return name
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, ' ');
}

// Mapear método de pago del Excel al enum
function mapMetodoPago(formaPago: string | null): MetodoPago {
  if (!formaPago) return MetodoPago.EFECTIVO_USD;

  const fp = formaPago.toUpperCase();

  if (fp.includes('ZELLE')) return MetodoPago.ZELLE;
  if (fp.includes('BINANCE')) return MetodoPago.BINANCE;
  if (fp.includes('BANESCO')) return MetodoPago.BANESCO;
  if (fp.includes('TRANSFERENCIA') && fp.includes('BS')) return MetodoPago.TRANSFERENCIA_BS;
  if (fp.includes('TRANSFERENCIA') && fp.includes('$')) return MetodoPago.TRANSFERENCIA_USD;
  if (fp.includes('PAGO MOVIL')) return MetodoPago.PAGO_MOVIL;
  if (fp.includes('EFECTIVO') && fp.includes('BS')) return MetodoPago.EFECTIVO_BS;
  if (fp.includes('MIXTO') || fp.includes('/')) return MetodoPago.MIXTO;

  return MetodoPago.EFECTIVO_USD;
}

async function main() {
  console.log('=== Importando ventas diarias desde Excel ===\n');

  // Leer Excel
  const excelPath = path.join(__dirname, '../../../listaprecioJA.xlsx');
  const workbook = XLSX.readFile(excelPath);
  const sheet = workbook.Sheets['❗️ENTRADA  SALIDA'];
  const data: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  // Obtener usuario admin
  const adminUser = await prisma.usuario.findFirst({
    where: { email: 'admin@elevashop.com' }
  });

  if (!adminUser) {
    console.error('No se encontró el usuario admin');
    return;
  }

  // Obtener productos y clientes existentes
  const productos = await prisma.producto.findMany();
  const productosMap = new Map(productos.map(p => [p.codigo, p]));

  const clientes = await prisma.cliente.findMany();
  const clientesMap = new Map(clientes.map(c => [c.nombreNormalizado, c]));

  // Agrupar ventas por fecha y cliente (una venta puede tener múltiples productos)
  const ventasAgrupadas = new Map<string, {
    fecha: Date;
    clienteNombre: string;
    productos: {
      codigo: string;
      cantidad: number;
      precio: number;
      serial?: string;
      metodoPago: string;
    }[];
  }>();

  // Filtrar solo transacciones de SALIDA (ventas) de los últimos 30 días
  const hace30Dias = new Date();
  hace30Dias.setDate(hace30Dias.getDate() - 30);

  let rowsProcessed = 0;
  let ventasCreadas = 0;

  // Procesar cada fila del Excel
  for (let i = 1; i < data.length; i++) {
    const row = data[i];

    // Columnas según el Excel:
    // 0: CODIGO, 1: DESCRIPCION, 2: FECHA ENTRADA, 3: CANTIDAD ENTRADA,
    // 4: PRODUCCION, 5: SERIAL, 6: CANTIDAD SALIDA, 7: FECHA SALIDA,
    // 8: CLIENTE SALIDA, 9: MONTO SALIDA, 10: FORMA DE PAGO, 11: VENDIDA POR

    const cantidadSalida = row[6];
    const fechaSalidaSerial = row[7];
    const clienteNombre = row[8];
    const montoSalida = row[9];
    const codigo = row[0];
    const serial = row[5];
    const formaPago = row[10];

    // Solo procesar si hay venta (CANTIDAD SALIDA > 0 y FECHA SALIDA válida)
    if (!cantidadSalida || cantidadSalida <= 0 || !fechaSalidaSerial || !clienteNombre || !montoSalida) {
      continue;
    }

    // Convertir fecha
    const fechaVenta = excelDateToJSDate(fechaSalidaSerial);

    // Solo ventas de los últimos 30 días
    if (fechaVenta < hace30Dias) {
      continue;
    }

    // Verificar que el producto existe
    const producto = productosMap.get(codigo);
    if (!producto) {
      continue;
    }

    // Clave única para agrupar: fecha + cliente
    const fechaStr = fechaVenta.toISOString().split('T')[0];
    const clienteNormalizado = normalizeClientName(clienteNombre);
    const key = `${fechaStr}_${clienteNormalizado}`;

    if (!ventasAgrupadas.has(key)) {
      ventasAgrupadas.set(key, {
        fecha: fechaVenta,
        clienteNombre: clienteNombre.trim(),
        productos: []
      });
    }

    ventasAgrupadas.get(key)!.productos.push({
      codigo,
      cantidad: cantidadSalida,
      precio: montoSalida,
      serial: serial?.toString(),
      metodoPago: formaPago || 'EFECTIVO $'
    });

    rowsProcessed++;
  }

  console.log(`Filas procesadas: ${rowsProcessed}`);
  console.log(`Ventas agrupadas: ${ventasAgrupadas.size}`);

  // Crear ventas en la base de datos
  for (const [key, ventaData] of ventasAgrupadas) {
    // Buscar o crear cliente
    const clienteNormalizado = normalizeClientName(ventaData.clienteNombre);
    let cliente = clientesMap.get(clienteNormalizado);

    if (!cliente) {
      cliente = await prisma.cliente.create({
        data: {
          nombre: ventaData.clienteNombre,
          nombreNormalizado: clienteNormalizado,
        }
      });
      clientesMap.set(clienteNormalizado, cliente);
      console.log(`  Cliente creado: ${cliente.nombre}`);
    }

    // Calcular totales
    let subtotal = 0;
    const detalles: {
      productoId: number;
      cantidad: number;
      precioUnitario: number;
      subtotal: number;
      serial?: string;
    }[] = [];

    for (const prod of ventaData.productos) {
      const producto = productosMap.get(prod.codigo);
      if (producto) {
        const prodSubtotal = prod.cantidad * prod.precio;
        subtotal += prodSubtotal;
        detalles.push({
          productoId: producto.id,
          cantidad: prod.cantidad,
          precioUnitario: prod.precio,
          subtotal: prodSubtotal,
          serial: prod.serial
        });
      }
    }

    if (detalles.length === 0) continue;

    // Determinar método de pago predominante
    const metodoPago = mapMetodoPago(ventaData.productos[0].metodoPago);

    // Verificar si ya existe una venta similar (para evitar duplicados)
    const existingVenta = await prisma.venta.findFirst({
      where: {
        clienteId: cliente.id,
        fecha: {
          gte: new Date(ventaData.fecha.setHours(0, 0, 0, 0)),
          lt: new Date(new Date(ventaData.fecha).setHours(23, 59, 59, 999))
        },
        total: subtotal
      }
    });

    if (existingVenta) {
      console.log(`  Venta ya existe: ${ventaData.fecha.toISOString().split('T')[0]} - ${cliente.nombre} - $${subtotal}`);
      continue;
    }

    try {
      // Crear venta
      const venta = await prisma.venta.create({
        data: {
          clienteId: cliente.id,
          usuarioId: adminUser.id,
          fecha: ventaData.fecha,
          subtotal,
          total: subtotal,
          estadoPago: 'PAGADO',
          estado: 'ENTREGADA',
          detalles: {
            create: detalles.map(d => ({
              productoId: d.productoId,
              cantidad: d.cantidad,
              precioUnitario: d.precioUnitario,
              subtotal: d.subtotal,
              serial: d.serial
            }))
          },
          pagos: {
            create: [{
              metodoPago,
              monto: subtotal,
              moneda: 'USD'
            }]
          }
        }
      });

      ventasCreadas++;
      console.log(`  Venta creada: ${ventaData.fecha.toISOString().split('T')[0]} - ${cliente.nombre} - $${subtotal}`);
    } catch (error) {
      console.error(`  Error creando venta: ${error}`);
    }
  }

  console.log(`\n=== Resumen ===`);
  console.log(`Ventas creadas: ${ventasCreadas}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
