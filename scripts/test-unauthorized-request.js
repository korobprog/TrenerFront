const http = require('http');

console.log('🔍 Тестирование неавторизованного запроса к API...');

function makeRequest() {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: 'localhost',
        port: 3000,
        path: '/api/admin/statistics',
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      },
      (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            body: data,
          });
        });
      }
    );

    req.on('error', (error) => {
      reject(error);
    });

    // Устанавливаем короткий таймаут для быстрой диагностики
    req.setTimeout(3000, () => {
      req.destroy();
      reject(new Error('Request timeout after 3 seconds'));
    });

    req.end();
  });
}

async function testUnauthorizedRequest() {
  try {
    console.log('📡 Отправляем неавторизованный запрос...');

    const response = await makeRequest();

    console.log('✅ Ответ получен:');
    console.log('📊 Status Code:', response.statusCode);
    console.log('📄 Response Body:', response.body);

    if (response.statusCode === 401) {
      console.log(
        '✅ Middleware корректно обрабатывает неавторизованные запросы'
      );
    } else {
      console.log('⚠️  Неожиданный статус код для неавторизованного запроса');
    }
  } catch (error) {
    console.error('❌ Ошибка при тестировании:', error.message);

    if (error.message.includes('timeout')) {
      console.log(
        '⏰ Запрос зависает - проблема в middleware при обработке неавторизованных запросов'
      );
    }
  }
}

testUnauthorizedRequest();
