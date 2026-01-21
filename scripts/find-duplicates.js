const https = require('https');

// First login to get token
const loginData = JSON.stringify({
  email: 'admin@elevashop.com',
  password: 'AdminEleva2025!'
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

const loginReq = https.request(loginOptions, (res) => {
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => {
    const result = JSON.parse(body);
    if (result.access_token) {
      console.log('Token obtenido, consultando clientes...');
      getClients(result.access_token);
    } else {
      console.error('Error login:', body);
    }
  });
});

loginReq.write(loginData);
loginReq.end();

function getClients(token) {
  const options = {
    hostname: 'elevashop-api.onrender.com',
    port: 443,
    path: '/api/v1/clientes?limit=500',
    method: 'GET',
    headers: {
      'Authorization': 'Bearer ' + token
    }
  };

  https.get(options, (res) => {
    let body = '';
    res.on('data', (chunk) => body += chunk);
    res.on('end', () => {
      const result = JSON.parse(body);
      const clientes = result.clientes || result;
      console.log('Total clientes:', clientes.length);

      // Find duplicates by normalized name
      const normalized = {};
      clientes.forEach(c => {
        if (!c.activo) return;
        const key = c.nombre.toLowerCase().trim();
        if (!normalized[key]) normalized[key] = [];
        normalized[key].push({ id: c.id, nombre: c.nombre });
      });

      const duplicates = Object.entries(normalized)
        .filter(([k, v]) => v.length > 1)
        .sort((a, b) => b[1].length - a[1].length);

      console.log('\nClientes duplicados encontrados:', duplicates.length);
      duplicates.forEach(([key, clients]) => {
        console.log(`\n${key} (x${clients.length}):`);
        clients.forEach(c => console.log(`  ID ${c.id}: ${c.nombre}`));
      });
    });
  });
}
