const http = require('http');

console.log('🔍 Тестирование исправления middleware superAdminAuth...');

// Функция для выполнения HTTP запроса
function makeRequest(options) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data,
        });
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    // Устанавливаем таймаут
    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

async function testStatisticsEndpoint() {
  try {
    console.log('📡 Тестируем endpoint /api/admin/statistics...');

    const response = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/admin/statistics',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log('✅ Ответ получен:');
    console.log('📊 Status Code:', response.statusCode);
    console.log('📄 Response Body:', response.body);

    // Проверяем, что это корректная ошибка авторизации, а не ошибка сервера
    if (response.statusCode === 401) {
      console.log(
        '✅ Middleware работает корректно - возвращает 401 Unauthorized'
      );
      try {
        const jsonResponse = JSON.parse(response.body);
        if (jsonResponse.message) {
          console.log('✅ Сообщение об ошибке:', jsonResponse.message);
        }
      } catch (e) {
        console.log('⚠️  Ответ не в формате JSON');
      }
    } else if (response.statusCode === 500) {
      console.log(
        '❌ Ошибка сервера 500 - возможно, проблема все еще существует'
      );
      console.log('📄 Детали ошибки:', response.body);
    } else {
      console.log('ℹ️  Неожиданный статус код:', response.statusCode);
    }
  } catch (error) {
    console.error('❌ Ошибка при тестировании:', error.message);

    if (error.message === 'Request timeout') {
      console.log('⏰ Запрос завис - возможно, проблема в middleware или API');
    }
  }
}

// Запускаем тест
testStatisticsEndpoint();
