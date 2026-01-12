const { PrismaClient } = require('@prisma/client');
const XLSX = require('xlsx');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
  console.log('=== ACTUALIZANDO PRECIOS DE COSTO ===\n');

  const excelPath = path.join(__dirname, '../../../listaprecioJA.xlsx');
  const workbook = XLSX.readFile(excelPath);

  // Usar la hoja ENTRADA SALIDA que tiene columna COSTO
  const sheet = workbook.Sheets['❗️ENTRADA  SALIDA'];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  // Columnas: CODIGO(0), COSTO(20)
  const CODIGO_IDX = 0;
  const COSTO_IDX = 20;

  // Agrupar costos por producto (usar el último costo registrado)
  const costosPorProducto = {};

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row || !row[CODIGO_IDX]) continue;

    const codigo = row[CODIGO_IDX].toString().toUpperCase().trim();
    const costo = parseFloat(row[COSTO_IDX]) || 0;

    if (costo > 0) {
      // Guardar todos los costos para calcular promedio o usar el último
      if (!costosPorProducto[codigo]) {
        costosPorProducto[codigo] = [];
      }
      costosPorProducto[codigo].push(costo);
    }
  }

  console.log('Productos con costos encontrados:', Object.keys(costosPorProducto).length);

  // Mostrar algunos ejemplos
  console.log('\nEjemplos de costos encontrados:');
  Object.entries(costosPorProducto).slice(0, 5).forEach(([codigo, costos]) => {
    const promedio = costos.reduce((a, b) => a + b, 0) / costos.length;
    const ultimo = costos[costos.length - 1];
    console.log(`  ${codigo}: Último=$${ultimo.toFixed(2)}, Promedio=$${promedio.toFixed(2)} (${costos.length} registros)`);
  });

  // Obtener productos de la BD
  const productos = await prisma.producto.findMany({
    where: { activo: true },
    select: { id: true, codigo: true, precioCosto: true },
  });

  console.log('\nProductos en BD:', productos.length);

  // Actualizar productos con el último costo registrado
  let actualizados = 0;
  let noEncontrados = [];

  for (const producto of productos) {
    const codigoUpper = producto.codigo.toUpperCase().trim();
    const costos = costosPorProducto[codigoUpper];

    if (costos && costos.length > 0) {
      // Usar el último costo registrado
      const ultimoCosto = costos[costos.length - 1];

      // Solo actualizar si es diferente
      if (!producto.precioCosto || Math.abs(Number(producto.precioCosto) - ultimoCosto) > 0.01) {
        await prisma.producto.update({
          where: { id: producto.id },
          data: { precioCosto: ultimoCosto },
        });
        console.log(`  ${producto.codigo}: $${ultimoCosto.toFixed(2)}`);
        actualizados++;
      }
    } else {
      noEncontrados.push(producto.codigo);
    }
  }

  console.log('\n=== RESULTADO ===');
  console.log('Productos actualizados:', actualizados);

  if (noEncontrados.length > 0) {
    console.log('Productos sin costo en Excel:', noEncontrados.join(', '));
  }

  // Verificar cuántos quedaron sin costo
  const sinCosto = await prisma.producto.findMany({
    where: { activo: true, precioCosto: null },
    select: { codigo: true, nombre: true },
  });
  console.log('\nProductos aún sin precio de costo:', sinCosto.length);
  sinCosto.forEach(p => console.log(`  - ${p.codigo}: ${p.nombre}`));

  await prisma.$disconnect();
}

main().catch(console.error);
