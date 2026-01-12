const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== VALIDANDO INVENTARIO ===\n');

  // 1. Productos con stock negativo
  const stockNegativo = await prisma.producto.findMany({
    where: { stockActual: { lt: 0 }, activo: true },
    select: { id: true, codigo: true, nombre: true, stockActual: true },
  });
  console.log('--- Productos con stock negativo ---');
  console.log('Cantidad:', stockNegativo.length);
  stockNegativo.forEach(p => {
    console.log('  ', p.codigo, '|', p.nombre, '| Stock:', p.stockActual);
  });

  // 2. Productos con estado incorrecto (usando Prisma)
  const todosProductos = await prisma.producto.findMany({
    where: { activo: true },
    select: { id: true, codigo: true, nombre: true, stockActual: true, stockMinimo: true, stockAdvertencia: true, estado: true },
  });

  const estadoIncorrecto = todosProductos.filter(p => {
    let estadoCorrecto;
    if (p.stockActual <= 0) estadoCorrecto = 'AGOTADO';
    else if (p.stockActual <= p.stockMinimo) estadoCorrecto = 'ALERTA';
    else if (p.stockActual <= p.stockAdvertencia) estadoCorrecto = 'ALERTA_W';
    else estadoCorrecto = 'OK';

    p.estadoCorrecto = estadoCorrecto;
    return p.estado !== estadoCorrecto;
  });

  console.log('\n--- Productos con estado incorrecto ---');
  console.log('Cantidad:', estadoIncorrecto.length);
  estadoIncorrecto.forEach(p => {
    console.log('  ', p.codigo, '| Stock:', p.stockActual, '| Estado actual:', p.estado, '| Debería ser:', p.estadoCorrecto);
  });

  // 3. Top 10 productos más vendidos (según transacciones)
  const masVendidos = await prisma.$queryRaw`
    SELECT p.codigo, p.nombre, SUM(t.cantidad) as cantidad_vendida, SUM(t.total) as total_vendido
    FROM transacciones t
    JOIN productos p ON t.producto_id = p.id
    WHERE t.tipo = 'SALIDA'
    GROUP BY p.id
    ORDER BY cantidad_vendida DESC
    LIMIT 10
  `;
  console.log('\n--- Top 10 productos más vendidos ---');
  masVendidos.forEach((p, i) => {
    console.log(`${i + 1}. ${p.codigo} | ${p.nombre} | Vendidos: ${p.cantidad_vendida} | Total: $${Number(p.total_vendido).toFixed(2)}`);
  });

  // 4. Productos sin precio de costo
  const sinCosto = await prisma.producto.count({
    where: { activo: true, precioCosto: null },
  });
  console.log('\n--- Productos sin precio de costo ---');
  console.log('Cantidad:', sinCosto);

  // 5. Productos agotados que deberían reordenarse
  const agotados = await prisma.producto.findMany({
    where: { activo: true, stockActual: { lte: 0 } },
    select: { codigo: true, nombre: true, stockActual: true },
  });
  console.log('\n--- Productos agotados ---');
  agotados.forEach(p => {
    console.log('  ', p.codigo, '|', p.nombre);
  });

  // 6. Valor total del inventario por categoría
  const valorPorCategoria = await prisma.$queryRaw`
    SELECT
      COALESCE(c.nombre, 'Sin categoría') as categoria,
      COUNT(p.id) as productos,
      SUM(p.stock_actual) as unidades,
      SUM(p.stock_actual * p.precio_elevapartes) as valor
    FROM productos p
    LEFT JOIN categorias c ON p.categoria_id = c.id
    WHERE p.activo = true
    GROUP BY c.nombre
    ORDER BY valor DESC
  `;
  console.log('\n--- Valor inventario por categoría ---');
  valorPorCategoria.forEach(c => {
    console.log('  ', c.categoria, '|', c.productos, 'productos |', c.unidades, 'unidades | $' + Number(c.valor || 0).toFixed(2));
  });

  // 7. Últimos movimientos de stock
  const ultMovimientos = await prisma.movimientoStock.findMany({
    take: 10,
    orderBy: { createdAt: 'desc' },
    include: { producto: { select: { codigo: true, nombre: true } } },
  });
  console.log('\n--- Últimos 10 movimientos de stock ---');
  ultMovimientos.forEach(m => {
    console.log(`${new Date(m.createdAt).toLocaleDateString()} | ${m.tipo} | ${m.producto.codigo} | ${m.stockAnterior} -> ${m.stockNuevo} (${m.cantidad > 0 ? '+' : ''}${m.tipo === 'ENTRADA' || m.tipo === 'DEVOLUCION' ? m.cantidad : -m.cantidad})`);
  });

  await prisma.$disconnect();
}

main().catch(console.error);
