/**
 * Script para crear usuario admin Sheila Briceno
 */

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('=== Creando usuario admin Sheila Briceno ===\n');

  // Verificar roles existentes
  const roles = await prisma.rol.findMany();
  console.log('Roles existentes:', roles.map(r => `${r.id}: ${r.nombre}`).join(', ') || 'Ninguno');

  // Buscar o crear rol SUPER_ADMIN
  let rolAdmin = await prisma.rol.findFirst({
    where: {
      OR: [
        { nombre: 'SUPER_ADMIN' },
        { nombre: 'ADMIN' },
        { nombre: 'Administrador' }
      ]
    }
  });

  if (!rolAdmin) {
    console.log('Creando rol SUPER_ADMIN...');
    rolAdmin = await prisma.rol.create({
      data: {
        nombre: 'SUPER_ADMIN',
        descripcion: 'Super Administrador con acceso total al sistema',
        permisos: [
          'usuarios:read', 'usuarios:write', 'usuarios:delete',
          'productos:read', 'productos:write', 'productos:delete',
          'ventas:read', 'ventas:write', 'ventas:delete',
          'inventario:read', 'inventario:write', 'inventario:delete',
          'reportes:read', 'reportes:write',
          'configuracion:read', 'configuracion:write',
          'importaciones:read', 'importaciones:write',
          'clientes:read', 'clientes:write', 'clientes:delete',
          'gastos:read', 'gastos:write', 'gastos:delete',
          '*' // Acceso total
        ]
      }
    });
    console.log('Rol SUPER_ADMIN creado con ID:', rolAdmin.id);
  } else {
    console.log('Usando rol existente:', rolAdmin.nombre, '(ID:', rolAdmin.id + ')');
  }

  // Verificar si el usuario ya existe
  const existingUser = await prisma.usuario.findUnique({
    where: { email: '***EMAIL_REMOVED***' }
  });

  if (existingUser) {
    console.log('\nEl usuario ***EMAIL_REMOVED*** ya existe (ID:', existingUser.id + ')');
    console.log('Actualizando a rol SUPER_ADMIN...');

    await prisma.usuario.update({
      where: { id: existingUser.id },
      data: { rolId: rolAdmin.id, activo: true }
    });
    console.log('Usuario actualizado correctamente.');
    return;
  }

  // Crear usuario
  const password = '***PASSWORD_REMOVED***'; // Contraseña temporal
  const hashedPassword = await bcrypt.hash(password, 10);

  const usuario = await prisma.usuario.create({
    data: {
      email: '***EMAIL_REMOVED***',
      passwordHash: hashedPassword,
      nombreCompleto: 'Sheila Briceno',
      rolId: rolAdmin.id,
      activo: true
    },
    include: { rol: true }
  });

  console.log('\n=== Usuario creado exitosamente ===');
  console.log('ID:', usuario.id);
  console.log('Nombre:', usuario.nombreCompleto);
  console.log('Email:', usuario.email);
  console.log('Rol:', usuario.rol.nombre);
  console.log('Contraseña temporal:', password);
  console.log('\n¡Recuerda cambiar la contraseña después del primer login!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
