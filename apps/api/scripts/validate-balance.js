const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== VALIDANDO BALANCE (como lo calcula el endpoint) ===\n');

  // 1. Utilidad acumulada de transacciones
  const utilidadTotal = await prisma.transaccion.aggregate({
    _sum: { utilidad: true, total: true },
    _count: true,
  });
  console.log('--- TRANSACCIONES ---');
  console.log('Total ventas (transacciones):', Number(utilidadTotal._sum.total || 0).toFixed(2));
  console.log('Utilidad acumulada:', Number(utilidadTotal._sum.utilidad || 0).toFixed(2));
  console.log('Cantidad:', utilidadTotal._count);

  // 2. Valor inventario
  const valorInventario = await prisma.$queryRaw`
    SELECT COALESCE(SUM(stock_actual * precio_elevapartes), 0) as valor
    FROM productos
    WHERE activo = true
  `;
  console.log('\n--- VALOR INVENTARIO ---');
  console.log('Valor a precio venta:', Number(valorInventario[0]?.valor || 0).toFixed(2));

  // 3. Balance como lo calcula el endpoint
  const utilidad = Number(utilidadTotal._sum.utilidad) || 0;
  const inventario = Number(valorInventario[0]?.valor) || 0;
  const balance = utilidad + inventario;

  console.log('\n--- BALANCE (cálculo del endpoint) ---');
  console.log('Utilidad acumulada:', utilidad.toFixed(2));
  console.log('+ Valor inventario:', inventario.toFixed(2));
  console.log('= BALANCE:', balance.toFixed(2));

  // 4. También revisar gastos totales
  const gastosTotal = await prisma.gasto.aggregate({
    _sum: { monto: true },
  });
  console.log('\n--- GASTOS TOTALES ---');
  console.log('Total gastos:', Number(gastosTotal._sum.monto || 0).toFixed(2));

  // 5. Balance neto (restando gastos)
  const balanceNeto = balance - Number(gastosTotal._sum.monto || 0);
  console.log('\n--- BALANCE NETO (si restamos gastos) ---');
  console.log('Balance - Gastos:', balanceNeto.toFixed(2));

  // 6. Ver detalle de utilidad por transacción
  console.log('\n--- DETALLE UTILIDAD POR TRANSACCIÓN (últimas 10) ---');
  const ultTransacciones = await prisma.transaccion.findMany({
    take: 10,
    orderBy: { id: 'desc' },
    select: { id: true, mes: true, anio: true, total: true, utilidad: true },
  });
  ultTransacciones.forEach(t => {
    console.log(`ID:${t.id} | ${t.mes}/${t.anio} | Venta:$${Number(t.total || 0).toFixed(2)} | Utilidad:$${Number(t.utilidad || 0).toFixed(2)}`);
  });

  await prisma.$disconnect();
}

main().catch(console.error);
