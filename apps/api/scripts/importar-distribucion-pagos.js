const { PrismaClient } = require('@prisma/client');
const XLSX = require('xlsx');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
  console.log('=== IMPORTANDO DISTRIBUCIÓN DE PAGOS DEL EXCEL ===\n');

  const excelPath = path.join('/home/arivera/PROYECTOS/elevashop', 'listaprecioJA.xlsx');
  const workbook = XLSX.readFile(excelPath);

  const sheet = workbook.Sheets['❗️ENTRADA  SALIDA'];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  // Índices de columnas
  const FORMA_PAGO_IDX = 10;
  const EFECTIVO_USD_IDX = 12;
  const BS_IDX = 13;
  const ZELLE_IDX = 14;
  const BANESCO_IDX = 15;
  const MONTO_SALIDA_IDX = 9;
  const FECHA_SALIDA_IDX = 7;
  const MES_IDX = 23;

  // Normalizar método de pago
  function normalizarMetodo(formaPago) {
    if (!formaPago) return 'NO_ESPECIFICADO';
    const fp = formaPago.toString().toUpperCase().trim();

    if (fp.includes('EFECTIVO') && fp.includes('$')) return 'EFECTIVO_USD';
    if (fp === 'EFECTIVO' || fp === 'EFECTVO $' || fp === 'EECTIVO $') return 'EFECTIVO_USD';
    if (fp.includes('ZELLE')) return 'ZELLE';
    if (fp.includes('BINANCE')) return 'BINANCE';
    if (fp.includes('TRANSFERENCIA BS') || fp.includes('TRANSF BS') || fp.includes('TRANS BS')) return 'TRANSFERENCIA_BS';
    if (fp.includes('TRANSFERENCIA $') || fp.includes('TRANSF $') || fp.includes('TRANS $')) return 'TRANSFERENCIA_USD';
    if (fp === 'PENDIENTE') return 'PENDIENTE';
    if (fp.includes('/')) return 'MIXTO';

    return 'OTRO';
  }

  // Procesar todas las ventas
  const distribucionPorMes = {};
  const distribucionTotal = {
    EFECTIVO_USD: 0,
    EFECTIVO_BS: 0,
    ZELLE: 0,
    BANESCO: 0,
    TRANSFERENCIA_BS: 0,
    TRANSFERENCIA_USD: 0,
    BINANCE: 0,
    MIXTO: 0,
    PENDIENTE: 0,
    totalVentas: 0,
  };

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row || !row[0]) continue;

    const montoSalida = parseFloat(row[MONTO_SALIDA_IDX]) || 0;
    if (montoSalida <= 0) continue;

    const efectivoUsd = parseFloat(row[EFECTIVO_USD_IDX]) || 0;
    const bs = parseFloat(row[BS_IDX]) || 0;
    const zelle = parseFloat(row[ZELLE_IDX]) || 0;
    const banesco = parseFloat(row[BANESCO_IDX]) || 0;
    const mes = row[MES_IDX];

    distribucionTotal.EFECTIVO_USD += efectivoUsd;
    distribucionTotal.ZELLE += zelle;
    distribucionTotal.BANESCO += banesco;
    distribucionTotal.EFECTIVO_BS += bs; // En Bs
    distribucionTotal.totalVentas += montoSalida;

    // Agrupar por mes
    if (mes) {
      if (!distribucionPorMes[mes]) {
        distribucionPorMes[mes] = {
          efectivoUsd: 0,
          bs: 0,
          zelle: 0,
          banesco: 0,
          total: 0,
        };
      }
      distribucionPorMes[mes].efectivoUsd += efectivoUsd;
      distribucionPorMes[mes].bs += bs;
      distribucionPorMes[mes].zelle += zelle;
      distribucionPorMes[mes].banesco += banesco;
      distribucionPorMes[mes].total += montoSalida;
    }
  }

  console.log('=== DISTRIBUCIÓN TOTAL DE FONDOS ===\n');
  console.log('VENTAS TOTALES:', `$${distribucionTotal.totalVentas.toFixed(2)}`);
  console.log('\nDISTRIBUCIÓN POR MÉTODO:');
  console.log(`  Efectivo USD: $${distribucionTotal.EFECTIVO_USD.toFixed(2)} (${((distribucionTotal.EFECTIVO_USD / distribucionTotal.totalVentas) * 100).toFixed(1)}%)`);
  console.log(`  Zelle: $${distribucionTotal.ZELLE.toFixed(2)} (${((distribucionTotal.ZELLE / distribucionTotal.totalVentas) * 100).toFixed(1)}%)`);
  console.log(`  Banesco: $${distribucionTotal.BANESCO.toFixed(2)} (${((distribucionTotal.BANESCO / distribucionTotal.totalVentas) * 100).toFixed(1)}%)`);
  console.log(`  Bolívares (Bs): ${distribucionTotal.EFECTIVO_BS.toFixed(2)}`);

  // Calcular lo que no está en las columnas específicas
  const enCuentas = distribucionTotal.EFECTIVO_USD + distribucionTotal.ZELLE + distribucionTotal.BANESCO;
  const diferencia = distribucionTotal.totalVentas - enCuentas;
  console.log(`\n  En cuentas USD: $${enCuentas.toFixed(2)}`);
  console.log(`  Diferencia (probablemente en Bs o mixto): $${diferencia.toFixed(2)}`);

  console.log('\n=== DISTRIBUCIÓN POR MES (últimos 12) ===');
  const mesesOrdenados = Object.entries(distribucionPorMes)
    .sort((a, b) => b[0] - a[0])
    .slice(0, 12);

  mesesOrdenados.forEach(([mes, data]) => {
    console.log(`Mes ${mes}: Total $${data.total.toFixed(2)} | Efectivo $${data.efectivoUsd.toFixed(2)} | Zelle $${data.zelle.toFixed(2)} | Banesco $${data.banesco.toFixed(2)}`);
  });

  // Guardar distribución en la BD (crear tabla si no existe)
  console.log('\n=== GUARDANDO EN BASE DE DATOS ===');

  // Usar la tabla de configuración o crear registros
  // Por ahora guardaremos como JSON en una tabla de configuración

  // Verificar si existe la tabla distribucion_fondos
  try {
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS distribucion_fondos (
        id SERIAL PRIMARY KEY,
        concepto VARCHAR(50) NOT NULL,
        moneda VARCHAR(10) NOT NULL DEFAULT 'USD',
        monto DECIMAL(14,2) NOT NULL DEFAULT 0,
        porcentaje DECIMAL(5,2),
        actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(concepto)
      )
    `;

    // Limpiar e insertar datos actuales
    await prisma.$executeRaw`DELETE FROM distribucion_fondos`;

    const fondos = [
      { concepto: 'EFECTIVO_USD', monto: distribucionTotal.EFECTIVO_USD, moneda: 'USD' },
      { concepto: 'ZELLE', monto: distribucionTotal.ZELLE, moneda: 'USD' },
      { concepto: 'BANESCO', monto: distribucionTotal.BANESCO, moneda: 'USD' },
      { concepto: 'BOLIVARES', monto: distribucionTotal.EFECTIVO_BS, moneda: 'BS' },
      { concepto: 'TOTAL_VENTAS', monto: distribucionTotal.totalVentas, moneda: 'USD' },
    ];

    for (const fondo of fondos) {
      const porcentaje = fondo.moneda === 'USD' ? (fondo.monto / distribucionTotal.totalVentas) * 100 : null;
      await prisma.$executeRaw`
        INSERT INTO distribucion_fondos (concepto, moneda, monto, porcentaje)
        VALUES (${fondo.concepto}, ${fondo.moneda}, ${fondo.monto}, ${porcentaje})
      `;
    }

    console.log('✓ Distribución de fondos guardada en tabla distribucion_fondos');
  } catch (error) {
    console.error('Error guardando distribución:', error.message);
  }

  // Verificar datos guardados
  const fondosGuardados = await prisma.$queryRaw`SELECT * FROM distribucion_fondos`;
  console.log('\nDatos guardados:');
  fondosGuardados.forEach(f => {
    console.log(`  ${f.concepto}: ${f.moneda} ${Number(f.monto).toFixed(2)} ${f.porcentaje ? `(${Number(f.porcentaje).toFixed(1)}%)` : ''}`);
  });

  await prisma.$disconnect();
}

main().catch(console.error);
