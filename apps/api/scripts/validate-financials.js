const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== VALIDANDO DATOS FINANCIEROS ===\n');

  // 1. Total ventas (tabla ventas)
  const ventasTabla = await prisma.venta.aggregate({
    _sum: { total: true },
    _count: true,
  });
  console.log('--- TABLA VENTAS ---');
  console.log('Total ventas:', Number(ventasTabla._sum.total || 0).toFixed(2));
  console.log('Cantidad:', ventasTabla._count);

  // 2. Total transacciones SALIDA (legacy)
  const transaccionesSalida = await prisma.transaccion.aggregate({
    where: { tipo: 'SALIDA' },
    _sum: { total: true },
    _count: true,
  });
  console.log('\n--- TRANSACCIONES SALIDA (Legacy) ---');
  console.log('Total:', Number(transaccionesSalida._sum.total || 0).toFixed(2));
  console.log('Cantidad:', transaccionesSalida._count);

  // 3. Total combinado
  const totalVentas = Number(ventasTabla._sum.total || 0) + Number(transaccionesSalida._sum.total || 0);
  console.log('\n--- TOTAL VENTAS COMBINADO ---');
  console.log('$', totalVentas.toFixed(2));

  // 4. Gastos
  const gastos = await prisma.gasto.aggregate({
    _sum: { monto: true },
    _count: true,
  });
  console.log('\n--- GASTOS ---');
  console.log('Total gastos:', Number(gastos._sum.monto || 0).toFixed(2));
  console.log('Cantidad:', gastos._count);

  // 5. Balance neto
  const balance = totalVentas - Number(gastos._sum.monto || 0);
  console.log('\n--- BALANCE NETO ---');
  console.log('Ventas - Gastos =', balance.toFixed(2));

  // 6. Revisar qué endpoint usa el dashboard para finanzas
  console.log('\n--- DETALLE POR MES (transacciones) ---');
  const ventasPorMes = await prisma.$queryRaw`
    SELECT
      mes, anio,
      SUM(total) as total_ventas,
      COUNT(*) as cantidad
    FROM transacciones
    WHERE tipo = 'SALIDA' AND mes IS NOT NULL
    GROUP BY mes, anio
    ORDER BY anio DESC, mes DESC
    LIMIT 12
  `;
  ventasPorMes.forEach(v => {
    console.log(`${v.mes}/${v.anio}: $${Number(v.total_ventas).toFixed(2)} (${v.cantidad} ventas)`);
  });

  // 7. Verificar el servicio de finanzas
  console.log('\n--- VERIFICANDO CÁLCULO DEL DASHBOARD ---');

  // Simular lo que hace el endpoint de finanzas
  const inicioMes = new Date();
  inicioMes.setDate(1);
  inicioMes.setHours(0, 0, 0, 0);

  const ventasMes = await prisma.venta.aggregate({
    where: { fecha: { gte: inicioMes } },
    _sum: { total: true },
  });

  const gastosMes = await prisma.gasto.aggregate({
    where: { fecha: { gte: inicioMes } },
    _sum: { monto: true },
  });

  console.log('Ventas del mes (dic):', Number(ventasMes._sum.total || 0).toFixed(2));
  console.log('Gastos del mes (dic):', Number(gastosMes._sum.monto || 0).toFixed(2));

  await prisma.$disconnect();
}

main().catch(console.error);
