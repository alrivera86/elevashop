/**
 * Script para poblar la base de datos demo con datos ficticios
 * Ejecutar: npx ts-node demo/seed-demo.ts
 */

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Iniciando seed de datos demo...\n');

  // 1. Crear roles
  console.log('📋 Creando roles...');
  const rolAdmin = await prisma.rol.upsert({
    where: { nombre: 'ADMIN' },
    update: {},
    create: {
      nombre: 'ADMIN',
      descripcion: 'Administrador del sistema',
      permisos: ['*'],
    },
  });

  const rolVendedor = await prisma.rol.upsert({
    where: { nombre: 'VENDEDOR' },
    update: {},
    create: {
      nombre: 'VENDEDOR',
      descripcion: 'Vendedor con acceso limitado',
      permisos: ['ventas:read', 'ventas:write', 'productos:read', 'clientes:read', 'clientes:write'],
    },
  });

  // 2. Crear usuarios demo
  console.log('👤 Creando usuarios...');
  const passwordHash = await bcrypt.hash('Demo2024!', 10);

  await prisma.usuario.upsert({
    where: { email: 'admin@demo.com' },
    update: {},
    create: {
      email: 'admin@demo.com',
      passwordHash,
      nombreCompleto: 'Administrador Demo',
      rolId: rolAdmin.id,
      activo: true,
    },
  });

  await prisma.usuario.upsert({
    where: { email: 'vendedor@demo.com' },
    update: {},
    create: {
      email: 'vendedor@demo.com',
      passwordHash,
      nombreCompleto: 'Carlos Vendedor',
      rolId: rolVendedor.id,
      activo: true,
    },
  });

  // 3. Crear categorías
  console.log('📁 Creando categorías...');
  const categorias = [
    { nombre: 'Electrónica', descripcion: 'Componentes electrónicos' },
    { nombre: 'Accesorios', descripcion: 'Accesorios varios' },
    { nombre: 'Repuestos', descripcion: 'Repuestos de equipos' },
    { nombre: 'Herramientas', descripcion: 'Herramientas de trabajo' },
  ];

  const categoriasCreadas: any[] = [];
  for (const cat of categorias) {
    const categoria = await prisma.categoria.upsert({
      where: { nombre: cat.nombre },
      update: {},
      create: cat,
    });
    categoriasCreadas.push(categoria);
  }

  // 4. Crear productos demo
  console.log('📦 Creando productos...');
  const productos = [
    { codigo: 'CTRL-001', nombre: 'Controlador Digital Pro', precioMercadoLibre: 110, precioMercado: 95, precioElevapartes: 85, precioCosto: 45, stockActual: 25, categoriaId: categoriasCreadas[0].id },
    { codigo: 'CTRL-002', nombre: 'Controlador Básico', precioMercadoLibre: 75, precioMercado: 65, precioElevapartes: 55, precioCosto: 28, stockActual: 40, categoriaId: categoriasCreadas[0].id },
    { codigo: 'DISP-001', nombre: 'Display LCD 2.5"', precioMercadoLibre: 48, precioMercado: 42, precioElevapartes: 35, precioCosto: 18, stockActual: 50, categoriaId: categoriasCreadas[0].id },
    { codigo: 'DISP-002', nombre: 'Display LED 3.7"', precioMercadoLibre: 65, precioMercado: 55, precioElevapartes: 48, precioCosto: 24, stockActual: 30, categoriaId: categoriasCreadas[0].id },
    { codigo: 'SENS-001', nombre: 'Sensor de Proximidad', precioMercadoLibre: 30, precioMercado: 26, precioElevapartes: 22, precioCosto: 10, stockActual: 100, categoriaId: categoriasCreadas[0].id },
    { codigo: 'SENS-002', nombre: 'Sensor Magnético', precioMercadoLibre: 25, precioMercado: 22, precioElevapartes: 18, precioCosto: 8, stockActual: 80, categoriaId: categoriasCreadas[0].id },
    { codigo: 'CAB-001', nombre: 'Cable de Conexión 2m', precioMercadoLibre: 18, precioMercado: 15, precioElevapartes: 12, precioCosto: 5, stockActual: 200, categoriaId: categoriasCreadas[1].id },
    { codigo: 'CAB-002', nombre: 'Cable de Datos USB', precioMercadoLibre: 12, precioMercado: 10, precioElevapartes: 8, precioCosto: 3, stockActual: 150, categoriaId: categoriasCreadas[1].id },
    { codigo: 'ADAP-001', nombre: 'Adaptador Bluetooth', precioMercadoLibre: 38, precioMercado: 32, precioElevapartes: 28, precioCosto: 14, stockActual: 35, categoriaId: categoriasCreadas[1].id },
    { codigo: 'ADAP-002', nombre: 'Adaptador WiFi USB', precioMercadoLibre: 42, precioMercado: 36, precioElevapartes: 32, precioCosto: 16, stockActual: 25, categoriaId: categoriasCreadas[1].id },
    { codigo: 'REP-001', nombre: 'Placa de Control', precioMercadoLibre: 160, precioMercado: 140, precioElevapartes: 120, precioCosto: 65, stockActual: 15, categoriaId: categoriasCreadas[2].id },
    { codigo: 'REP-002', nombre: 'Fuente de Poder 12V', precioMercadoLibre: 60, precioMercado: 52, precioElevapartes: 45, precioCosto: 22, stockActual: 20, categoriaId: categoriasCreadas[2].id },
    { codigo: 'HERR-001', nombre: 'Kit de Herramientas Básico', precioMercadoLibre: 85, precioMercado: 75, precioElevapartes: 65, precioCosto: 35, stockActual: 10, categoriaId: categoriasCreadas[3].id },
    { codigo: 'HERR-002', nombre: 'Multímetro Digital', precioMercadoLibre: 72, precioMercado: 62, precioElevapartes: 55, precioCosto: 28, stockActual: 8, categoriaId: categoriasCreadas[3].id },
  ];

  const productosCreados: any[] = [];
  for (const prod of productos) {
    const producto = await prisma.producto.upsert({
      where: { codigo: prod.codigo },
      update: {},
      create: prod,
    });
    productosCreados.push(producto);
  }

  // 5. Crear clientes demo
  console.log('👥 Creando clientes...');
  const clientes = [
    { nombre: 'TECNO SERVICIOS C.A.', telefono: '0414-1234567', email: 'ventas@tecnoservicios.com', nombreNormalizado: 'TECNO SERVICIOS C.A.' },
    { nombre: 'ELECTRONICA MODERNA', telefono: '0412-9876543', email: 'compras@electronicamoderna.com', nombreNormalizado: 'ELECTRONICA MODERNA' },
    { nombre: 'DISTRIBUIDORA DELTA', telefono: '0424-5551234', email: 'pedidos@delta.com', nombreNormalizado: 'DISTRIBUIDORA DELTA' },
    { nombre: 'SERVICIOS INTEGRADOS', telefono: '0416-7778899', email: 'info@serviciosintegrados.com', nombreNormalizado: 'SERVICIOS INTEGRADOS' },
    { nombre: 'JUAN PEREZ', telefono: '0414-3332211', email: 'jperez@gmail.com', nombreNormalizado: 'JUAN PEREZ' },
    { nombre: 'MARIA GONZALEZ', telefono: '0412-4445566', email: 'mgonzalez@hotmail.com', nombreNormalizado: 'MARIA GONZALEZ' },
    { nombre: 'CARLOS RODRIGUEZ', telefono: '0424-6667788', email: 'crodriguez@gmail.com', nombreNormalizado: 'CARLOS RODRIGUEZ' },
    { nombre: 'ANA MARTINEZ', telefono: '0416-8889900', email: 'amartinez@yahoo.com', nombreNormalizado: 'ANA MARTINEZ' },
  ];

  const clientesCreados: any[] = [];
  for (const cli of clientes) {
    const existente = await prisma.cliente.findFirst({
      where: { nombreNormalizado: cli.nombreNormalizado },
    });
    if (existente) {
      clientesCreados.push(existente);
    } else {
      const cliente = await prisma.cliente.create({ data: cli });
      clientesCreados.push(cliente);
    }
  }

  // 6. Crear algunas unidades con seriales
  console.log('🔢 Creando seriales de inventario...');
  const controladorPro = productosCreados.find(p => p.codigo === 'CTRL-001');
  const displayLCD = productosCreados.find(p => p.codigo === 'DISP-001');

  if (controladorPro) {
    for (let i = 1; i <= 10; i++) {
      await prisma.unidadInventario.upsert({
        where: { serial: `CTRL-${String(i).padStart(3, '0')}` },
        update: {},
        create: {
          serial: `CTRL-${String(i).padStart(3, '0')}`,
          productoId: controladorPro.id,
          estado: 'DISPONIBLE',
          costoUnitario: 45,
          garantiaMeses: 12,
        },
      });
    }
  }

  if (displayLCD) {
    for (let i = 1; i <= 15; i++) {
      await prisma.unidadInventario.upsert({
        where: { serial: `LCD-${String(i).padStart(3, '0')}` },
        update: {},
        create: {
          serial: `LCD-${String(i).padStart(3, '0')}`,
          productoId: displayLCD.id,
          estado: 'DISPONIBLE',
          costoUnitario: 18,
          garantiaMeses: 6,
        },
      });
    }
  }

  // 7. Crear algunas ventas de ejemplo
  console.log('🛒 Creando ventas de ejemplo...');
  const adminUser = await prisma.usuario.findUnique({ where: { email: 'admin@demo.com' } });

  if (adminUser && clientesCreados.length > 0 && productosCreados.length > 0) {
    // Venta 1
    await prisma.venta.create({
      data: {
        clienteId: clientesCreados[0].id,
        usuarioId: adminUser.id,
        tipoVenta: 'VENTA',
        subtotal: 170,
        descuento: 0,
        impuesto: 0,
        total: 170,
        estadoPago: 'PAGADO',
        detalles: {
          create: [
            { productoId: productosCreados[0].id, cantidad: 2, precioUnitario: 85, subtotal: 170 },
          ],
        },
        pagos: {
          create: [
            { metodoPago: 'EFECTIVO_USD', monto: 170, moneda: 'USD' },
          ],
        },
      },
    });

    // Venta 2
    await prisma.venta.create({
      data: {
        clienteId: clientesCreados[1].id,
        usuarioId: adminUser.id,
        tipoVenta: 'VENTA',
        subtotal: 105,
        descuento: 5,
        impuesto: 0,
        total: 100,
        estadoPago: 'PAGADO',
        detalles: {
          create: [
            { productoId: productosCreados[2].id, cantidad: 3, precioUnitario: 35, subtotal: 105 },
          ],
        },
        pagos: {
          create: [
            { metodoPago: 'ZELLE', monto: 100, moneda: 'USD' },
          ],
        },
      },
    });

    // Consignación
    await prisma.venta.create({
      data: {
        clienteId: clientesCreados[2].id,
        usuarioId: adminUser.id,
        tipoVenta: 'CONSIGNACION',
        subtotal: 240,
        descuento: 0,
        impuesto: 0,
        total: 240,
        estadoPago: 'PENDIENTE',
        detalles: {
          create: [
            { productoId: productosCreados[3].id, cantidad: 5, precioUnitario: 48, subtotal: 240 },
          ],
        },
      },
    });
  }

  console.log('\n✅ Seed completado exitosamente!');
  console.log('\n📝 Credenciales de acceso:');
  console.log('   Admin:    admin@demo.com / Demo2024!');
  console.log('   Vendedor: vendedor@demo.com / Demo2024!');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
