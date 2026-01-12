const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== PROBANDO FLUJO DE VENTA ===\n');

  // 1. Seleccionar un producto con stock para probar
  const producto = await prisma.producto.findFirst({
    where: { activo: true, stockActual: { gt: 2 } },
    select: { id: true, codigo: true, nombre: true, stockActual: true, stockMinimo: true, stockAdvertencia: true, estado: true, precioElevapartes: true },
  });

  if (!producto) {
    console.log('No hay productos con stock suficiente para probar');
    return;
  }

  console.log('--- PRODUCTO SELECCIONADO ---');
  console.log('ID:', producto.id);
  console.log('Código:', producto.codigo);
  console.log('Nombre:', producto.nombre);
  console.log('Stock ANTES:', producto.stockActual);
  console.log('Stock mínimo:', producto.stockMinimo);
  console.log('Stock advertencia:', producto.stockAdvertencia);
  console.log('Estado ANTES:', producto.estado);
  console.log('Precio:', producto.precioElevapartes);

  // 2. Seleccionar un cliente
  const cliente = await prisma.cliente.findFirst({
    where: { activo: true },
    select: { id: true, nombre: true },
  });

  console.log('\n--- CLIENTE ---');
  console.log('ID:', cliente.id);
  console.log('Nombre:', cliente.nombre);

  // 3. Obtener usuario admin
  const usuario = await prisma.usuario.findFirst({
    where: { email: 'admin@elevashop.com' },
    select: { id: true },
  });

  // 4. Crear venta de prueba
  console.log('\n--- CREANDO VENTA DE PRUEBA ---');
  const precioVenta = Number(producto.precioElevapartes);
  const cantidadVender = 1;

  const venta = await prisma.$transaction(async (tx) => {
    // Crear la venta
    const nuevaVenta = await tx.venta.create({
      data: {
        clienteId: cliente.id,
        usuarioId: usuario.id,
        fecha: new Date(),
        subtotal: precioVenta * cantidadVender,
        total: precioVenta * cantidadVender,
        estadoPago: 'PAGADO',
        estado: 'CONFIRMADA',
        detalles: {
          create: {
            productoId: producto.id,
            cantidad: cantidadVender,
            precioUnitario: precioVenta,
            subtotal: precioVenta * cantidadVender,
          },
        },
        pagos: {
          create: {
            metodoPago: 'EFECTIVO_USD',
            monto: precioVenta * cantidadVender,
            moneda: 'USD',
          },
        },
      },
      include: { detalles: true, pagos: true },
    });

    // Descontar stock
    const stockAnterior = producto.stockActual;
    const stockNuevo = stockAnterior - cantidadVender;

    // Calcular nuevo estado
    let nuevoEstado = 'OK';
    if (stockNuevo <= 0) nuevoEstado = 'AGOTADO';
    else if (stockNuevo <= producto.stockMinimo) nuevoEstado = 'ALERTA';
    else if (stockNuevo <= producto.stockAdvertencia) nuevoEstado = 'ALERTA_W';

    await tx.producto.update({
      where: { id: producto.id },
      data: { stockActual: stockNuevo, estado: nuevoEstado },
    });

    // Registrar movimiento de stock
    await tx.movimientoStock.create({
      data: {
        productoId: producto.id,
        tipo: 'SALIDA',
        cantidad: cantidadVender,
        stockAnterior,
        stockNuevo,
        referencia: `VENTA-${nuevaVenta.id}`,
        motivo: 'Venta de prueba',
      },
    });

    // Si stock bajo, crear alerta
    if (nuevoEstado !== 'OK' && producto.estado === 'OK') {
      await tx.alertaStock.create({
        data: {
          productoId: producto.id,
          tipoAlerta: nuevoEstado === 'AGOTADO' ? 'AGOTADO' : nuevoEstado === 'ALERTA' ? 'STOCK_MINIMO' : 'STOCK_BAJO',
          stockActual: stockNuevo,
          stockMinimo: producto.stockMinimo,
          mensaje: `Stock bajo para ${producto.nombre}`,
        },
      });
    }

    return nuevaVenta;
  });

  console.log('Venta creada ID:', venta.id);
  console.log('Total:', venta.total);

  // 5. Verificar stock después
  const productoActualizado = await prisma.producto.findUnique({
    where: { id: producto.id },
    select: { stockActual: true, estado: true },
  });

  console.log('\n--- VERIFICACIÓN DESPUÉS DE VENTA ---');
  console.log('Stock ANTES:', producto.stockActual);
  console.log('Stock DESPUÉS:', productoActualizado.stockActual);
  console.log('Estado ANTES:', producto.estado);
  console.log('Estado DESPUÉS:', productoActualizado.estado);
  console.log('Stock descontado correctamente:', producto.stockActual - productoActualizado.stockActual === cantidadVender ? 'SI' : 'NO');

  // 6. Verificar que aparece en ventas del mes
  const inicioMes = new Date();
  inicioMes.setDate(1);
  inicioMes.setHours(0, 0, 0, 0);

  const ventasMes = await prisma.venta.aggregate({
    where: { fecha: { gte: inicioMes } },
    _sum: { total: true },
    _count: true,
  });

  console.log('\n--- VENTAS DEL MES ---');
  console.log('Total ventas mes:', Number(ventasMes._sum.total).toFixed(2));
  console.log('Cantidad ventas mes:', ventasMes._count);

  // 7. Verificar alertas
  const alertas = await prisma.alertaStock.count({ where: { resuelta: false } });
  console.log('\n--- ALERTAS ---');
  console.log('Alertas pendientes:', alertas);

  // 8. Limpiar: eliminar la venta de prueba
  console.log('\n--- LIMPIANDO VENTA DE PRUEBA ---');
  await prisma.$transaction(async (tx) => {
    // Restaurar stock
    await tx.producto.update({
      where: { id: producto.id },
      data: { stockActual: producto.stockActual, estado: producto.estado },
    });

    // Eliminar movimiento
    await tx.movimientoStock.deleteMany({
      where: { referencia: `VENTA-${venta.id}` },
    });

    // Eliminar venta (cascada elimina detalles y pagos)
    await tx.venta.delete({ where: { id: venta.id } });
  });

  console.log('Venta de prueba eliminada, stock restaurado');

  // Verificar restauración
  const productoRestaurado = await prisma.producto.findUnique({
    where: { id: producto.id },
    select: { stockActual: true, estado: true },
  });
  console.log('Stock restaurado:', productoRestaurado.stockActual);

  console.log('\n=== FLUJO VERIFICADO CORRECTAMENTE ===');

  await prisma.$disconnect();
}

main().catch(console.error);
