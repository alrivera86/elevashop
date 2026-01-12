const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== ELIMINANDO CLIENTES DUPLICADOS ===\n');

  // IDs de clientes duplicados a eliminar (mantener el de menor ID)
  const duplicadosAEliminar = [
    172, // HECTOR LINARES (mantener 36)
    177, // JESUS MIERES (mantener 142)
    171, // WILMAN SANCHEZ (mantener 108)
  ];

  for (const id of duplicadosAEliminar) {
    try {
      // Verificar que no tenga ventas asociadas
      const ventas = await prisma.venta.count({ where: { clienteId: id } });
      const transacciones = await prisma.transaccion.count({ where: { clienteId: id } });
      const unidades = await prisma.unidadInventario.count({ where: { clienteId: id } });

      if (ventas > 0 || transacciones > 0 || unidades > 0) {
        console.log(`Cliente ID ${id}: Tiene datos asociados (ventas: ${ventas}, trans: ${transacciones}, unidades: ${unidades}). Saltando...`);
        continue;
      }

      // Eliminar cliente
      await prisma.cliente.delete({ where: { id } });
      console.log(`Cliente ID ${id}: Eliminado correctamente`);
    } catch (error) {
      console.log(`Cliente ID ${id}: Error al eliminar -`, error.message);
    }
  }

  // Verificar resultado
  const totalClientes = await prisma.cliente.count({ where: { activo: true } });
  console.log('\nTotal clientes después de limpieza:', totalClientes);

  await prisma.$disconnect();
}

main().catch(console.error);
