const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== CÁLCULO EXACTO DEL DASHBOARD ===\n');

  // 1. Balance Total (como getBalanceTotal)
  const [utilidadTotal, valorInventario] = await Promise.all([
    prisma.transaccion.aggregate({
      _sum: { utilidad: true },
    }),
    prisma.$queryRaw`
      SELECT COALESCE(SUM(stock_actual * precio_elevapartes), 0) as valor
      FROM productos
      WHERE activo = true
    `,
  ]);

  const utilidad = Number(utilidadTotal._sum.utilidad) || 0;
  const inventario = Number(valorInventario[0]?.valor) || 0;
  const balance = utilidad + inventario;

  console.log('--- BALANCE (Dashboard) ---');
  console.log('Utilidad acumulada:', utilidad.toFixed(2));
  console.log('Valor inventario:', inventario.toFixed(2));
  console.log('BALANCE:', balance.toFixed(2));

  // 2. Ventas totales (transacciones + ventas)
  const [transaccionesSalida, ventasTabla] = await Promise.all([
    prisma.transaccion.aggregate({
      where: { tipo: 'SALIDA' },
      _sum: { total: true },
    }),
    prisma.venta.aggregate({
      _sum: { total: true },
    }),
  ]);

  const totalTransacciones = Number(transaccionesSalida._sum.total) || 0;
  const totalVentas = Number(ventasTabla._sum.total) || 0;
  const ventasCombinadas = totalTransacciones + totalVentas;

  console.log('\n--- VENTAS TOTALES ---');
  console.log('Transacciones (legacy):', totalTransacciones.toFixed(2));
  console.log('Ventas (nuevo):', totalVentas.toFixed(2));
  console.log('TOTAL VENTAS:', ventasCombinadas.toFixed(2));

  // 3. Gastos totales
  const gastosTotal = await prisma.gasto.aggregate({
    _sum: { monto: true },
  });
  const gastos = Number(gastosTotal._sum.monto) || 0;

  console.log('\n--- GASTOS ---');
  console.log('Total gastos:', gastos.toFixed(2));

  // 4. Balance neto
  const balanceNeto = balance - gastos;
  console.log('\n--- BALANCE NETO ---');
  console.log('Balance - Gastos:', balanceNeto.toFixed(2));

  // 5. Resumen
  console.log('\n========================================');
  console.log('RESUMEN COMPARATIVO:');
  console.log('========================================');
  console.log('Usuario reporta ventas totales: $388,349');
  console.log('Sistema calcula ventas totales: $' + ventasCombinadas.toFixed(2));
  console.log('Diferencia: $' + (388349 - ventasCombinadas).toFixed(2));
  console.log('');
  console.log('Usuario reporta balance neto: $190,930');
  console.log('Sistema calcula balance neto: $' + balanceNeto.toFixed(2));
  console.log('Diferencia: $' + (190930 - balanceNeto).toFixed(2));

  // 6. Posible explicación
  console.log('\n--- ANÁLISIS DE DIFERENCIAS ---');

  // Ver si hay ventas que no tienen utilidad calculada
  const ventasSinUtilidad = await prisma.venta.aggregate({
    _sum: { total: true },
    _count: true,
  });
  console.log('Ventas sin utilidad calculada:', ventasSinUtilidad._count, '- Total:', Number(ventasSinUtilidad._sum.total || 0).toFixed(2));

  // Margen promedio de transacciones
  const margenPromedio = await prisma.transaccion.aggregate({
    _avg: { utilidad: true, total: true },
  });
  const porcentajeMargen = (Number(margenPromedio._avg.utilidad) / Number(margenPromedio._avg.total)) * 100;
  console.log('Margen promedio transacciones:', porcentajeMargen.toFixed(1) + '%');

  // Si aplicamos ese margen a ventas tabla
  const utilidadEstimadaVentas = totalVentas * (porcentajeMargen / 100);
  console.log('Utilidad estimada ventas tabla:', utilidadEstimadaVentas.toFixed(2));

  const balanceCorregido = utilidad + utilidadEstimadaVentas + inventario - gastos;
  console.log('\nBalance corregido (incluyendo utilidad estimada ventas):', balanceCorregido.toFixed(2));

  await prisma.$disconnect();
}

main().catch(console.error);
