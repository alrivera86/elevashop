const fs = require('fs');
const { Client } = require('pg');

// Conexión a Neon
const client = new Client({
  connectionString: '***CREDENTIAL_REMOVED***',
});

// Normalizar nombre para comparación
function normalizarNombre(nombre) {
  return nombre
    .toUpperCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Quitar acentos
    .replace(/[.,\-_'"]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Normalizar teléfono a formato WhatsApp (+58XXXXXXXXXX)
function normalizarTelefono(telefono) {
  if (!telefono) return null;

  // Tomar solo el primer número si hay varios separados por :::
  let numero = telefono.split(':::')[0].trim();

  // Limpiar caracteres no numéricos excepto +
  numero = numero.replace(/[^\d+]/g, '');

  // Si está vacío, retornar null
  if (!numero || numero.length < 7) return null;

  // Si empieza con +58, mantenerlo
  if (numero.startsWith('+58')) {
    return numero;
  }

  // Si empieza con 58, agregar +
  if (numero.startsWith('58')) {
    return '+' + numero;
  }

  // Si empieza con 0 (formato local venezolano), convertir a +58
  if (numero.startsWith('0')) {
    return '+58' + numero.substring(1);
  }

  // Si empieza con 4 (sin 0), agregar +58
  if (numero.startsWith('4') && numero.length === 10) {
    return '+58' + numero;
  }

  // Si es número de otro país (empieza con +), mantenerlo
  if (numero.startsWith('+')) {
    return numero;
  }

  // Por defecto, asumir Venezuela
  return '+58' + numero;
}

// Parsear CSV
function parseCSV(content) {
  const lines = content.split('\n');
  const headers = lines[0].split(',');
  const contacts = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    // Parsear respetando comillas
    const values = [];
    let current = '';
    let inQuotes = false;

    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current);

    const obj = {};
    headers.forEach((h, idx) => {
      obj[h.trim()] = (values[idx] || '').trim();
    });

    contacts.push(obj);
  }

  return contacts;
}

async function main() {
  try {
    await client.connect();
    console.log('Conectado a la base de datos\n');

    // Obtener clientes de la BD
    const result = await client.query(`
      SELECT id, nombre, nombre_normalizado, telefono, email
      FROM clientes
      WHERE activo = true
      ORDER BY nombre
    `);
    const clientes = result.rows;
    console.log(`Clientes en BD: ${clientes.length}\n`);

    // Leer CSV
    const csvContent = fs.readFileSync('/home/arivera/PROYECTOS/elevashop/contacts.csv', 'utf-8');
    const contacts = parseCSV(csvContent);
    console.log(`Contactos en CSV: ${contacts.length}\n`);

    // Crear mapa de contactos por nombre normalizado
    const contactsMap = new Map();

    contacts.forEach(contact => {
      // Construir nombre completo
      let nombre = [
        contact['First Name'],
        contact['Middle Name'],
        contact['Last Name']
      ].filter(Boolean).join(' ').trim();

      // Si no hay nombre, usar Organization Name
      if (!nombre && contact['Organization Name']) {
        nombre = contact['Organization Name'];
      }

      if (!nombre) return;

      const nombreNorm = normalizarNombre(nombre);
      const telefono = contact['Phone 1 - Value'];
      const telefonoNorm = normalizarTelefono(telefono);
      const email = contact['E-mail 1 - Value'];

      if (telefonoNorm || email) {
        // Si ya existe, no sobrescribir (priorizar primer contacto)
        if (!contactsMap.has(nombreNorm)) {
          contactsMap.set(nombreNorm, {
            nombreOriginal: nombre,
            telefono: telefonoNorm,
            email: email || null
          });
        }
      }
    });

    console.log(`Contactos con datos útiles: ${contactsMap.size}\n`);
    console.log('='.repeat(70));
    console.log('COINCIDENCIAS ENCONTRADAS');
    console.log('='.repeat(70) + '\n');

    // Buscar coincidencias y actualizar
    let actualizados = 0;
    let sinCambios = 0;
    const updates = [];

    for (const cliente of clientes) {
      const nombreNorm = normalizarNombre(cliente.nombre);

      // Buscar coincidencia exacta
      let contacto = contactsMap.get(nombreNorm);

      // Si no hay coincidencia exacta, buscar parcial
      if (!contacto) {
        for (const [key, value] of contactsMap) {
          if (key.includes(nombreNorm) || nombreNorm.includes(key)) {
            // Solo si la coincidencia es significativa (más de 60% del nombre)
            const minLen = Math.min(key.length, nombreNorm.length);
            const maxLen = Math.max(key.length, nombreNorm.length);
            if (minLen / maxLen > 0.6) {
              contacto = value;
              break;
            }
          }
        }
      }

      if (contacto) {
        const nuevoTelefono = contacto.telefono;
        const telefonoActual = cliente.telefono;

        // Solo actualizar si hay teléfono nuevo y es diferente al actual
        if (nuevoTelefono && nuevoTelefono !== telefonoActual) {
          console.log(`${cliente.nombre}`);
          console.log(`  CSV: ${contacto.nombreOriginal}`);
          console.log(`  Tel actual: ${telefonoActual || '(vacío)'}`);
          console.log(`  Tel nuevo:  ${nuevoTelefono}`);
          console.log('');

          updates.push({
            id: cliente.id,
            nombre: cliente.nombre,
            telefonoAnterior: telefonoActual,
            telefonoNuevo: nuevoTelefono
          });
        } else if (nuevoTelefono === telefonoActual) {
          sinCambios++;
        }
      }
    }

    console.log('='.repeat(70));
    console.log(`\nTotal a actualizar: ${updates.length}`);
    console.log(`Ya tienen el mismo teléfono: ${sinCambios}`);
    console.log('');

    if (updates.length === 0) {
      console.log('No hay actualizaciones pendientes.');
      await client.end();
      return;
    }

    // Ejecutar actualizaciones
    console.log('Ejecutando actualizaciones...\n');

    for (const update of updates) {
      await client.query(
        'UPDATE clientes SET telefono = $1, updated_at = NOW() WHERE id = $2',
        [update.telefonoNuevo, update.id]
      );
      actualizados++;
    }

    console.log(`✓ ${actualizados} clientes actualizados con teléfono`);

    // Mostrar resumen
    console.log('\n' + '='.repeat(70));
    console.log('RESUMEN DE ACTUALIZACIONES');
    console.log('='.repeat(70) + '\n');

    updates.forEach(u => {
      console.log(`${u.nombre}: ${u.telefonoAnterior || '(vacío)'} → ${u.telefonoNuevo}`);
    });

    await client.end();

  } catch (error) {
    console.error('Error:', error);
    await client.end();
  }
}

main();
