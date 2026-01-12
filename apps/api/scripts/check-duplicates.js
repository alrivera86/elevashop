const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const clientes = await prisma.cliente.findMany({
    where: { activo: true },
    select: { id: true, nombre: true, nombreNormalizado: true, totalCompras: true, cantidadOrdenes: true },
    orderBy: { nombreNormalizado: 'asc' },
  });

  console.log('=== BUSCANDO CLIENTES DUPLICADOS ===');
  console.log('Total clientes:', clientes.length);

  // Agrupar por nombre normalizado
  const grupos = {};
  clientes.forEach(c => {
    const key = c.nombreNormalizado.toLowerCase().trim();
    if (!grupos[key]) grupos[key] = [];
    grupos[key].push(c);
  });

  // Mostrar solo los duplicados
  const duplicados = Object.entries(grupos).filter(([_, arr]) => arr.length > 1);
  console.log('Grupos de duplicados encontrados:', duplicados.length);

  duplicados.slice(0, 25).forEach(([nombre, arr]) => {
    console.log('\n--- "' + nombre + '" ---');
    arr.forEach(c => {
      console.log('  ID:', c.id, '| Nombre:', c.nombre, '| Ordenes:', c.cantidadOrdenes, '| Total: $' + Number(c.totalCompras));
    });
  });

  if (duplicados.length > 25) {
    console.log('\n... y', duplicados.length - 25, 'grupos más');
  }

  // Resumen de impacto
  let totalDuplicadosParaEliminar = 0;
  duplicados.forEach(([_, arr]) => {
    totalDuplicadosParaEliminar += arr.length - 1; // Mantener 1, eliminar el resto
  });
  console.log('\n=== RESUMEN ===');
  console.log('Clientes únicos reales:', clientes.length - totalDuplicadosParaEliminar);
  console.log('Clientes duplicados para fusionar:', totalDuplicadosParaEliminar);

  await prisma.$disconnect();
}

main().catch(console.error);
