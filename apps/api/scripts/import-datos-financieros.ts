/**
 * Script de importacion de datos financieros historicos
 *
 * Este script carga:
 * 1. Saldos iniciales de cuentas nuevas (BINANCE_USDT, EFECTIVO_CHILE)
 * 2. Operaciones externas completadas historicas
 * 3. Conversiones historicas de Binance P2P
 *
 * Ejecutar con: npx ts-node scripts/import-datos-financieros.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando importacion de datos financieros...\n');

  // 1. Crear ajustes iniciales para balances de nuevas cuentas
  console.log('1. Creando saldos iniciales...');

  // BINANCE_USDT: $6,153.83
  const ajusteBinanceUsdt = await prisma.ajusteFondo.create({
    data: {
      fecha: new Date('2024-01-01'),
      tipo: 'AJUSTE_MANUAL',
      metodoPago: 'BINANCE_USDT',
      monto: 6153.83,
      moneda: 'USD',
      descripcion: 'Saldo inicial Binance USDT - Balance acumulado de operaciones P2P',
    },
  });
  console.log(`   - Binance USDT: $6,153.83 (ID: ${ajusteBinanceUsdt.id})`);

  // EFECTIVO_CHILE: $5,040.00
  const ajusteEfectivoChile = await prisma.ajusteFondo.create({
    data: {
      fecha: new Date('2026-03-05'),
      tipo: 'AJUSTE_MANUAL',
      metodoPago: 'EFECTIVO_CHILE',
      monto: 5040.00,
      moneda: 'USD',
      descripcion: 'Saldo inicial Efectivo Chile - Operacion cambio Sr Jose',
    },
  });
  console.log(`   - Efectivo Chile: $5,040.00 (ID: ${ajusteEfectivoChile.id})`);

  // 2. Registrar operacion de carros Suzuki como completada
  console.log('\n2. Registrando operacion Carros Suzuki (COMPLETADA)...');

  const operacionCarros = await prisma.operacionExterna.create({
    data: {
      nombre: 'Inversion Carros Suzuki',
      tipo: 'INVERSION',
      estado: 'COMPLETADA',
      cuentaOrigen: 'EFECTIVO_USD',
      montoSalida: 33000,
      monedaSalida: 'USD',
      fechaInicio: new Date('2025-06-01'), // Fecha aproximada de compra
      cuentaDestino: 'BANESCO',
      montoEntrada: 36695,
      monedaEntrada: 'USD',
      fechaCierre: new Date('2025-12-15'), // Fecha aproximada de venta
      gananciaPerdida: 3695,
      notas: 'Compra y venta de vehiculos Suzuki. Ganancia neta: $3,695',
    },
  });
  console.log(`   - Operacion creada (ID: ${operacionCarros.id})`);
  console.log(`   - Monto salida: $33,000 | Monto entrada: $36,695 | Ganancia: +$3,695`);

  // Crear ajustes de fondo correspondientes
  await prisma.ajusteFondo.createMany({
    data: [
      {
        fecha: new Date('2025-06-01'),
        tipo: 'OPERACION_SALIDA',
        metodoPago: 'EFECTIVO_USD',
        monto: -33000,
        moneda: 'USD',
        operacionExternaId: operacionCarros.id,
        descripcion: 'INVERSION: Inversion Carros Suzuki',
      },
      {
        fecha: new Date('2025-12-15'),
        tipo: 'OPERACION_ENTRADA',
        metodoPago: 'BANESCO',
        monto: 36695,
        moneda: 'USD',
        operacionExternaId: operacionCarros.id,
        descripcion: 'Cierre INVERSION: Inversion Carros Suzuki',
      },
    ],
  });
  console.log('   - Ajustes de fondo creados');

  // 3. Registrar operacion Cambio Chile-Venezuela como completada
  console.log('\n3. Registrando operacion Cambio Chile-Venezuela (COMPLETADA)...');

  const operacionChile = await prisma.operacionExterna.create({
    data: {
      nombre: 'Cambio Chile-Venezuela - Sr Jose',
      tipo: 'CAMBIO',
      estado: 'COMPLETADA',
      cuentaOrigen: 'EFECTIVO_BS',
      montoSalida: 184464, // Aproximado en Bs (5040 * 36.6)
      monedaSalida: 'VES',
      fechaInicio: new Date('2026-03-05'),
      cuentaDestino: 'EFECTIVO_CHILE',
      montoEntrada: 5040,
      monedaEntrada: 'USD',
      fechaCierre: new Date('2026-03-05'),
      gananciaPerdida: 0, // Cambio sin ganancia directa
      notas: 'Entrega de Bs en Venezuela, recepcion de USD en Chile. Tasa aproximada: 36.6 Bs/$',
    },
  });
  console.log(`   - Operacion creada (ID: ${operacionChile.id})`);

  // Los ajustes para esta operacion ya estan reflejados en el saldo inicial de EFECTIVO_CHILE
  // y el saldo de EFECTIVO_BS viene de las ventas
  console.log('   - Nota: El saldo de EFECTIVO_CHILE ya refleja esta operacion');

  // 4. Registrar conversiones historicas de Binance P2P (opcional - para historial)
  console.log('\n4. Registrando conversiones historicas Binance P2P...');

  const conversionesHistoricas = [
    { fecha: '2023-03-21', vendedor: 'NachoFx', bs: 20000, usdt: 801, cuenta: 'SR JOSE', enBinance: false },
    { fecha: '2023-05-17', vendedor: 'Gold2003', bs: 38000, usdt: 1405.89, cuenta: 'SR JOSE', enBinance: true },
    { fecha: '2023-07-18', vendedor: 'Daenerys-Targaryen', bs: 54523, usdt: 1769.71, cuenta: 'SR JOSE', enBinance: true },
    { fecha: '2023-07-19', vendedor: 'Criptotrading', bs: 9920, usdt: 321.04, cuenta: 'SR JOSE', enBinance: true },
    { fecha: '2023-08-17', vendedor: 'Inversiones F V CA', bs: 30006, usdt: 900.00, cuenta: 'SR JOSE', enBinance: true },
    { fecha: '2023-10-05', vendedor: 'CryptoDan5', bs: 3450, usdt: 92.12, cuenta: 'ALBERTO', enBinance: true },
    { fecha: '2023-10-05', vendedor: '-Flash-XChange-', bs: 1880, usdt: 50.13, cuenta: 'WILMEN', enBinance: true },
    { fecha: '2023-10-05', vendedor: 'instacristhian', bs: 21500, usdt: 573.94, cuenta: 'WILMEN', enBinance: true },
    { fecha: '2023-10-20', vendedor: 'SrNelo_USDT', bs: 18595, usdt: 501.00, cuenta: 'WILMEN', enBinance: true },
    { fecha: '2024-09-07', vendedor: 'Wilman Sanchez', bs: 23301, usdt: 540.00, cuenta: 'ALBERTO', enBinance: true },
  ];

  let conversionesCreadas = 0;
  for (const conv of conversionesHistoricas) {
    const tasa = conv.bs / conv.usdt;
    const conversion = await prisma.conversionMoneda.create({
      data: {
        fecha: new Date(conv.fecha),
        cuentaOrigen: 'EFECTIVO_BS',
        montoOrigen: conv.bs,
        monedaOrigen: 'VES',
        cuentaDestino: 'BINANCE_USDT',
        montoDestino: conv.usdt,
        monedaDestino: 'USD',
        tasaCambio: tasa,
        notas: `Binance P2P - Vendedor: ${conv.vendedor} - Cuenta: ${conv.cuenta}${conv.enBinance ? '' : ' (ya salio de Binance)'}`,
      },
    });

    // Nota: No creamos ajustes porque el saldo de BINANCE_USDT ya fue establecido con el ajuste inicial
    conversionesCreadas++;
  }
  console.log(`   - ${conversionesCreadas} conversiones historicas registradas`);
  console.log('   - Nota: Estas conversiones son solo para historial, el saldo ya esta reflejado en el ajuste inicial');

  console.log('\n========================================');
  console.log('Importacion completada exitosamente!');
  console.log('========================================\n');

  // Resumen
  console.log('RESUMEN:');
  console.log('--------');
  console.log('Saldos iniciales:');
  console.log('  - BINANCE_USDT: $6,153.83');
  console.log('  - EFECTIVO_CHILE: $5,040.00');
  console.log('\nOperaciones externas:');
  console.log('  - Inversion Carros Suzuki: COMPLETADA (+$3,695 ganancia)');
  console.log('  - Cambio Chile-Venezuela: COMPLETADA');
  console.log('\nConversiones historicas: 10 registros de Binance P2P');
  console.log('\nProximo paso: Verificar en el dashboard de finanzas que las cuentas');
  console.log('BINANCE_USDT y EFECTIVO_CHILE aparecen con los saldos correctos.');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('Error durante la importacion:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
