const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== VALIDANDO VENTAS ===\n');

  // 1. Total de ventas
  const totalVentas = await prisma.venta.count();
  console.log('Total ventas en tabla "ventas":', totalVentas);

  // 2. Ventas por mes
  const ventasPorMes = await prisma.$queryRaw`
    SELECT
      DATE_TRUNC('month', fecha) as mes,
      COUNT(*) as cantidad,
      SUM(total) as total
    FROM ventas
    GROUP BY DATE_TRUNC('month', fecha)
    ORDER BY mes DESC
    LIMIT 6
  `;
  console.log('\n--- Ventas por mes (últimos 6) ---');
  ventasPorMes.forEach(v => {
    console.log(`${new Date(v.mes).toLocaleDateString('es-VE', { month: 'long', year: 'numeric' })}: ${v.cantidad} ventas = $${Number(v.total).toFixed(2)}`);
  });

  // 3. Verificar que las ventas tienen detalles
  const ventasSinDetalles = await prisma.$queryRaw`
    SELECT v.id, v.numero_orden, v.total
    FROM ventas v
    LEFT JOIN ventas_detalle vd ON v.id = vd.venta_id
    WHERE vd.id IS NULL
  `;
  console.log('\n--- Ventas sin detalles ---');
  console.log('Cantidad:', ventasSinDetalles.length);
  if (ventasSinDetalles.length > 0) {
    ventasSinDetalles.slice(0, 5).forEach(v => {
      console.log('  Venta ID:', v.id, '| Total:', Number(v.total));
    });
  }

  // 4. Verificar totales de ventas vs suma de detalles
  const inconsistencias = await prisma.$queryRaw`
    SELECT
      v.id,
      v.numero_orden,
      v.total as total_venta,
      COALESCE(SUM(vd.subtotal), 0) as suma_detalles,
      v.total - COALESCE(SUM(vd.subtotal), 0) as diferencia
    FROM ventas v
    LEFT JOIN ventas_detalle vd ON v.id = vd.venta_id
    GROUP BY v.id
    HAVING ABS(v.total - COALESCE(SUM(vd.subtotal), 0)) > 0.01
  `;
  console.log('\n--- Ventas con totales inconsistentes ---');
  console.log('Cantidad:', inconsistencias.length);
  if (inconsistencias.length > 0) {
    inconsistencias.slice(0, 5).forEach(v => {
      console.log('  Venta ID:', v.id, '| Total:', Number(v.total_venta), '| Suma detalles:', Number(v.suma_detalles), '| Dif:', Number(v.diferencia));
    });
  }

  // 5. Últimas 10 ventas
  const ultimasVentas = await prisma.venta.findMany({
    take: 10,
    orderBy: { fecha: 'desc' },
    include: {
      cliente: { select: { nombre: true } },
      detalles: { include: { producto: { select: { nombre: true, codigo: true } } } },
    },
  });
  console.log('\n--- Últimas 10 ventas ---');
  ultimasVentas.forEach(v => {
    console.log(`${new Date(v.fecha).toLocaleDateString()} | ${v.cliente?.nombre || 'Sin cliente'} | $${Number(v.total)} | ${v.detalles.length} productos`);
    v.detalles.forEach(d => {
      console.log(`    - ${d.producto.codigo}: ${d.producto.nombre} x${d.cantidad} = $${Number(d.subtotal)}`);
    });
  });

  // 6. Transacciones legacy (para comparar)
  const transaccionesCount = await prisma.transaccion.count();
  const transaccionesSalida = await prisma.transaccion.count({ where: { tipo: 'SALIDA' } });
  console.log('\n--- Transacciones (tabla legacy) ---');
  console.log('Total transacciones:', transaccionesCount);
  console.log('Transacciones SALIDA (ventas):', transaccionesSalida);

  await prisma.$disconnect();
}

main().catch(console.error);
