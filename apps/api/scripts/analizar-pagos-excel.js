const XLSX = require('xlsx');
const path = require('path');

const excelPath = path.join('/home/arivera/PROYECTOS/elevashop', 'listaprecioJA.xlsx');
const workbook = XLSX.readFile(excelPath);

const sheet = workbook.Sheets['❗️ENTRADA  SALIDA'];
const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

// Columnas identificadas:
// 10: FORMA DE PAGO
// 12: Efectivo $
// 13: Bs
// 14: Zelle
// 15: Banesco

const FORMA_PAGO_IDX = 10;
const EFECTIVO_USD_IDX = 12;
const BS_IDX = 13;
const ZELLE_IDX = 14;
const BANESCO_IDX = 15;
const MONTO_SALIDA_IDX = 9;

console.log('=== ANÁLISIS DE MÉTODOS DE PAGO EN EXCEL ===\n');

// Agrupar por forma de pago
const porFormaPago = {};
const totales = {
  efectivoUsd: 0,
  bolivares: 0,
  zelle: 0,
  banesco: 0,
  total: 0,
};

for (let i = 1; i < data.length; i++) {
  const row = data[i];
  if (!row || !row[0]) continue;

  const formaPago = row[FORMA_PAGO_IDX] || 'NO ESPECIFICADO';
  const montoSalida = parseFloat(row[MONTO_SALIDA_IDX]) || 0;
  const efectivoUsd = parseFloat(row[EFECTIVO_USD_IDX]) || 0;
  const bs = parseFloat(row[BS_IDX]) || 0;
  const zelle = parseFloat(row[ZELLE_IDX]) || 0;
  const banesco = parseFloat(row[BANESCO_IDX]) || 0;

  if (montoSalida > 0) {
    if (!porFormaPago[formaPago]) {
      porFormaPago[formaPago] = { count: 0, total: 0 };
    }
    porFormaPago[formaPago].count++;
    porFormaPago[formaPago].total += montoSalida;

    totales.efectivoUsd += efectivoUsd;
    totales.bolivares += bs;
    totales.zelle += zelle;
    totales.banesco += banesco;
    totales.total += montoSalida;
  }
}

console.log('--- POR FORMA DE PAGO (columna FORMA DE PAGO) ---');
Object.entries(porFormaPago)
  .sort((a, b) => b[1].total - a[1].total)
  .forEach(([forma, data]) => {
    console.log(`${forma}: ${data.count} transacciones, $${data.total.toFixed(2)}`);
  });

console.log('\n--- TOTALES POR COLUMNA DE MÉTODO ---');
console.log(`Efectivo USD: $${totales.efectivoUsd.toFixed(2)}`);
console.log(`Bolívares: Bs ${totales.bolivares.toFixed(2)}`);
console.log(`Zelle: $${totales.zelle.toFixed(2)}`);
console.log(`Banesco: $${totales.banesco.toFixed(2)}`);
console.log(`TOTAL VENTAS: $${totales.total.toFixed(2)}`);

// Verificar hoja de gastos
console.log('\n\n=== HOJA DE GASTOS ===');
const gastosSheet = workbook.Sheets['Gastos Mensuales Y CAMBIO BS'];
if (gastosSheet) {
  const gastosData = XLSX.utils.sheet_to_json(gastosSheet, { header: 1 });
  console.log('Columnas:', gastosData[0]);
  console.log('\nPrimeras filas:');
  for (let i = 1; i <= 10 && i < gastosData.length; i++) {
    if (gastosData[i] && gastosData[i].length > 0) {
      console.log(gastosData[i]);
    }
  }
}
