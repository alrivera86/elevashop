const { PrismaClient } = require('@prisma/client');
const XLSX = require('xlsx');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
  console.log('=== ACTUALIZANDO PRECIOS DE COSTO DESDE EXCEL ===\n');

  // Leer el Excel
  const excelPath = path.join(__dirname, '../../../listaprecioJA.xlsx');
  const workbook = XLSX.readFile(excelPath);

  // Buscar la hoja de inventario
  const sheetNames = workbook.SheetNames;
  console.log('Hojas disponibles:', sheetNames);

  // La hoja de inventario tiene el emoji verde
  const inventarioSheet = sheetNames.find(s => s.includes('INVENTARIO'));
  if (!inventarioSheet) {
    console.log('No se encontró hoja de inventario');
    return;
  }

  console.log('Usando hoja:', inventarioSheet);

  const sheet = workbook.Sheets[inventarioSheet];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  // Mostrar encabezados para identificar columnas
  console.log('\nEncabezados de la hoja:');
  const headers = data[0];
  headers.forEach((h, i) => console.log(`  ${i}: ${h}`));

  // Buscar índices de columnas relevantes
  const codigoIdx = headers.findIndex(h => h && h.toString().toUpperCase().includes('CODIGO'));
  const costoIdx = headers.findIndex(h => h && h.toString().toUpperCase().includes('COSTO'));

  console.log('\nColumna código:', codigoIdx, '| Columna costo:', costoIdx);

  if (codigoIdx === -1 || costoIdx === -1) {
    console.log('No se encontraron las columnas necesarias');
    // Mostrar primeras filas para debug
    console.log('\nPrimeras 5 filas:');
    data.slice(0, 5).forEach((row, i) => console.log(`Fila ${i}:`, row.slice(0, 10)));
    return;
  }

  // Obtener productos de la BD
  const productos = await prisma.producto.findMany({
    where: { activo: true },
    select: { id: true, codigo: true, precioCosto: true },
  });
  console.log('\nProductos en BD:', productos.length);

  // Crear mapa de productos
  const productosMap = {};
  productos.forEach(p => {
    productosMap[p.codigo.toUpperCase().trim()] = p;
  });

  // Procesar filas del Excel
  let actualizados = 0;
  let noEncontrados = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row || !row[codigoIdx]) continue;

    const codigo = row[codigoIdx].toString().toUpperCase().trim();
    const costo = parseFloat(row[costoIdx]) || 0;

    if (costo <= 0) continue;

    const producto = productosMap[codigo];
    if (producto) {
      if (!producto.precioCosto || Number(producto.precioCosto) !== costo) {
        await prisma.producto.update({
          where: { id: producto.id },
          data: { precioCosto: costo },
        });
        console.log(`  ${codigo}: $${costo}`);
        actualizados++;
      }
    } else {
      noEncontrados.push(codigo);
    }
  }

  console.log('\n=== RESULTADO ===');
  console.log('Productos actualizados:', actualizados);
  if (noEncontrados.length > 0) {
    console.log('Códigos en Excel no encontrados en BD:', noEncontrados.slice(0, 10).join(', '));
  }

  // Verificar cuántos quedaron sin costo
  const sinCosto = await prisma.producto.count({
    where: { activo: true, precioCosto: null },
  });
  console.log('Productos aún sin precio de costo:', sinCosto);

  await prisma.$disconnect();
}

main().catch(console.error);
