const http = require('http');

async function testAdminApiAccess() {
  console.log('🔍 ТЕСТИРОВАНИЕ ДОСТУПА К АДМИН API');
  console.log('===================================\n');

  const testEndpoints = [
    '/api/admin/statistics',
    '/api/admin/users',
    '/api/admin/logs',
    '/api/admin/interviews',
  ];

  for (const endpoint of testEndpoints) {
    console.log(`📡 Тестирование эндпоинта: ${endpoint}`);

    try {
      const response = await makeRequest(endpoint);
      console.log(`   Статус: ${response.statusCode}`);
      console.log(`   Заголовки: ${JSON.stringify(response.headers, null, 2)}`);

      if (response.statusCode === 404) {
        console.log('   ❌ ЭНДПОИНТ НЕ НАЙДЕН (404)');
      } else if (response.statusCode === 401) {
        console.log('   🔒 ТРЕБУЕТСЯ АВТОРИЗАЦИЯ (401)');
      } else if (response.statusCode === 403) {
        console.log('   🚫 ДОСТУП ЗАПРЕЩЕН (403)');
      } else {
        console.log('   ✅ ЭНДПОИНТ ДОСТУПЕН');
      }

      if (response.data) {
        console.log(`   Данные: ${response.data.substring(0, 200)}...`);
      }
    } catch (error) {
      console.log(`   💥 ОШИБКА: ${error.message}`);
    }

    console.log('');
  }
}

function makeRequest(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: 'GET',
      headers: {
        'User-Agent': 'Admin-API-Test/1.0',
      },
    };

    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: data,
        });
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error('Timeout'));
    });

    req.end();
  });
}

// Запуск тестирования
if (require.main === module) {
  testAdminApiAccess()
    .then(() => {
      console.log('✅ Тестирование завершено');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Ошибка при тестировании:', error);
      process.exit(1);
    });
}

module.exports = { testAdminApiAccess };
