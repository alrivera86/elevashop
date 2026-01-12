const XLSX = require('xlsx');
const path = require('path');

const excelPath = path.join(__dirname, '../../../listaprecioJA.xlsx');
const workbook = XLSX.readFile(excelPath);

// Revisar Control Ordenes de Compra para ver costos
const sheets = ['Control Ordenes de Compra', 'Ordenes', '❗️ENTRADA  SALIDA'];

sheets.forEach(sheetName => {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return;

  console.log('\n======================');
  console.log('HOJA:', sheetName);
  console.log('======================');

  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  console.log('Encabezados:');
  const headers = data[0] || [];
  headers.forEach((h, i) => {
    if (h) console.log(`  ${i}: ${h}`);
  });

  console.log('\nPrimeras 3 filas de datos:');
  data.slice(1, 4).forEach((row, i) => {
    console.log(`Fila ${i + 1}:`, row.slice(0, 15));
  });
});

// Buscar columnas con "costo", "price", "compra" en todas las hojas
console.log('\n\n=== BUSCANDO COLUMNAS DE COSTO ===');
workbook.SheetNames.forEach(sheetName => {
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  const headers = data[0] || [];

  const costoHeaders = headers.filter((h, i) => {
    if (!h) return false;
    const lower = h.toString().toLowerCase();
    return lower.includes('costo') || lower.includes('cost') || lower.includes('compra') || lower.includes('fob');
  });

  if (costoHeaders.length > 0) {
    console.log(`\n${sheetName}:`);
    costoHeaders.forEach(h => console.log(`  - ${h}`));
  }
});
