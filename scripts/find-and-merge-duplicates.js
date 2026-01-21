const https = require('https');

// Credenciales actualizadas
const loginData = JSON.stringify({
  email: '***EMAIL_REMOVED***',
  password: '***PASSWORD_REMOVED***'
});

const loginOptions = {
  hostname: 'elevashop-api.onrender.com',
  port: 443,
  path: '/api/v1/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': loginData.length
  }
};

console.log('Conectando a la API de producción...');

const loginReq = https.request(loginOptions, (res) => {
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => {
    try {
      const result = JSON.parse(body);
      if (result.access_token) {
        console.log('✓ Autenticación exitosa\n');
        getClients(result.access_token);
      } else {
        console.error('Error de login:', body);
      }
    } catch (e) {
      console.error('Error parseando respuesta:', body);
    }
  });
});

loginReq.on('error', (e) => {
  console.error('Error de conexión:', e.message);
});

loginReq.write(loginData);
loginReq.end();

function normalizeString(str) {
  return str
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Quitar acentos
    .replace(/[.,\-_'"]/g, ' ')       // Reemplazar puntuación con espacios
    .replace(/\s+/g, ' ')             // Múltiples espacios a uno
    .replace(/\b(ca|c\.a|c\.a\.|sa|s\.a|s\.a\.|srl|s\.r\.l)\b/gi, '') // Quitar sufijos de empresa
    .replace(/\b(sr|sra|dr|dra|ing|lic)\b/gi, '') // Quitar títulos
    .trim();
}

function getClients(token) {
  const options = {
    hostname: 'elevashop-api.onrender.com',
    port: 443,
    path: '/api/v1/clientes?limit=1000',
    method: 'GET',
    headers: {
      'Authorization': 'Bearer ' + token
    }
  };

  https.get(options, (res) => {
    let body = '';
    res.on('data', (chunk) => body += chunk);
    res.on('end', () => {
      try {
        const result = JSON.parse(body);
        const clientes = result.clientes || result.data || result;

        if (!Array.isArray(clientes)) {
          console.error('Respuesta inesperada:', JSON.stringify(result).substring(0, 200));
          return;
        }

        console.log('Total clientes en BD:', clientes.length);
        console.log('Clientes activos:', clientes.filter(c => c.activo).length);
        console.log('\n' + '='.repeat(60));
        console.log('ANÁLISIS DE DUPLICADOS');
        console.log('='.repeat(60) + '\n');

        // Agrupar por nombre normalizado
        const groups = {};
        clientes.forEach(c => {
          if (!c.activo) return; // Solo clientes activos

          const key = normalizeString(c.nombre);
          if (!groups[key]) groups[key] = [];
          groups[key].push({
            id: c.id,
            nombre: c.nombre,
            nombreNormalizado: c.nombreNormalizado,
            totalCompras: parseFloat(c.totalCompras) || 0,
            cantidadOrdenes: c.cantidadOrdenes || 0,
            telefono: c.telefono,
            email: c.email,
            createdAt: c.createdAt
          });
        });

        // Filtrar solo grupos con duplicados
        const duplicateGroups = Object.entries(groups)
          .filter(([k, v]) => v.length > 1)
          .map(([key, clients]) => {
            // Ordenar: el que tiene más compras o más antiguo será el principal
            clients.sort((a, b) => {
              if (b.totalCompras !== a.totalCompras) return b.totalCompras - a.totalCompras;
              if (b.cantidadOrdenes !== a.cantidadOrdenes) return b.cantidadOrdenes - a.cantidadOrdenes;
              return new Date(a.createdAt) - new Date(b.createdAt);
            });
            return { key, clients, principal: clients[0], duplicados: clients.slice(1) };
          })
          .sort((a, b) => b.clients.length - a.clients.length);

        if (duplicateGroups.length === 0) {
          console.log('✓ No se encontraron clientes duplicados');
          return;
        }

        console.log(`Grupos de duplicados encontrados: ${duplicateGroups.length}`);
        console.log(`Total clientes duplicados: ${duplicateGroups.reduce((sum, g) => sum + g.duplicados.length, 0)}`);
        console.log('\n');

        // Mostrar cada grupo
        duplicateGroups.forEach((group, idx) => {
          console.log(`${idx + 1}. "${group.key}" (${group.clients.length} registros)`);
          console.log(`   PRINCIPAL → ID ${group.principal.id}: "${group.principal.nombre}"`);
          console.log(`              Compras: $${group.principal.totalCompras.toFixed(2)} | Órdenes: ${group.principal.cantidadOrdenes}`);

          group.duplicados.forEach(dup => {
            console.log(`   DUPLICADO → ID ${dup.id}: "${dup.nombre}"`);
            console.log(`              Compras: $${dup.totalCompras.toFixed(2)} | Órdenes: ${dup.cantidadOrdenes}`);
          });
          console.log('');
        });

        // Generar datos para el script de merge
        console.log('\n' + '='.repeat(60));
        console.log('DATOS PARA UNIFICACIÓN');
        console.log('='.repeat(60) + '\n');

        const mergeData = duplicateGroups.map(g => ({
          principalId: g.principal.id,
          principalNombre: g.principal.nombre,
          duplicadosIds: g.duplicados.map(d => d.id),
          duplicadosNombres: g.duplicados.map(d => d.nombre)
        }));

        console.log('const MERGE_DATA = ' + JSON.stringify(mergeData, null, 2) + ';');
        console.log('\n// Total de operaciones de merge:', mergeData.length);
        console.log('// IDs a desactivar:', mergeData.flatMap(m => m.duplicadosIds));

      } catch (e) {
        console.error('Error procesando datos:', e.message);
        console.error('Body:', body.substring(0, 500));
      }
    });
  }).on('error', (e) => {
    console.error('Error HTTP:', e.message);
  });
}
