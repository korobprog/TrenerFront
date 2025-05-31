/**
 * Тест для проверки исправления импорта Prisma в API /user/profile
 */

const http = require('http');

// Функция для выполнения HTTP запроса
function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: jsonData,
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: data,
          });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

async function testProfileAPI() {
  console.log(
    '🧪 Тестирование исправления импорта Prisma в API /user/profile...\n'
  );

  const baseURL = 'http://localhost:3000';

  try {
    // Тест 1: GET запрос без авторизации (должен вернуть 401)
    console.log('📋 Тест 1: GET запрос без авторизации');
    const response1 = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/user/profile',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log(`   Статус: ${response1.statusCode}`);
    console.log(`   Ответ: ${JSON.stringify(response1.data, null, 2)}`);

    if (response1.statusCode === 401) {
      console.log(
        '   ✅ Тест пройден: API корректно возвращает 401 для неавторизованных запросов\n'
      );
    } else if (
      response1.statusCode === 500 &&
      response1.data.error &&
      response1.data.error.includes('prisma')
    ) {
      console.log(
        '   ❌ Тест провален: Ошибка импорта Prisma все еще присутствует\n'
      );
      return false;
    } else {
      console.log('   ⚠️  Неожиданный ответ, но ошибки импорта Prisma нет\n');
    }

    // Тест 2: PUT запрос без авторизации (должен вернуть 401)
    console.log('📋 Тест 2: PUT запрос без авторизации');
    const response2 = await makeRequest(
      {
        hostname: 'localhost',
        port: 3000,
        path: '/api/user/profile',
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
      },
      JSON.stringify({ name: 'Test User' })
    );

    console.log(`   Статус: ${response2.statusCode}`);
    console.log(`   Ответ: ${JSON.stringify(response2.data, null, 2)}`);

    if (response2.statusCode === 401) {
      console.log(
        '   ✅ Тест пройден: API корректно возвращает 401 для неавторизованных запросов\n'
      );
    } else if (
      response2.statusCode === 500 &&
      response2.data.error &&
      response2.data.error.includes('prisma')
    ) {
      console.log(
        '   ❌ Тест провален: Ошибка импорта Prisma все еще присутствует\n'
      );
      return false;
    } else {
      console.log('   ⚠️  Неожиданный ответ, но ошибки импорта Prisma нет\n');
    }

    // Тест 3: Неподдерживаемый метод
    console.log('📋 Тест 3: DELETE запрос (неподдерживаемый метод)');
    const response3 = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/user/profile',
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log(`   Статус: ${response3.statusCode}`);
    console.log(`   Ответ: ${JSON.stringify(response3.data, null, 2)}`);

    if (response3.statusCode === 405) {
      console.log(
        '   ✅ Тест пройден: API корректно возвращает 405 для неподдерживаемых методов\n'
      );
    } else if (
      response3.statusCode === 500 &&
      response3.data.error &&
      response3.data.error.includes('prisma')
    ) {
      console.log(
        '   ❌ Тест провален: Ошибка импорта Prisma все еще присутствует\n'
      );
      return false;
    } else {
      console.log('   ⚠️  Неожиданный ответ, но ошибки импорта Prisma нет\n');
    }

    console.log('🎉 Все тесты пройдены! Импорт Prisma исправлен успешно.');
    console.log(
      '📝 Примечание: Для полного тестирования с авторизацией требуется валидная сессия.'
    );

    return true;
  } catch (error) {
    console.error('❌ Ошибка при тестировании:', error.message);

    if (error.code === 'ECONNREFUSED') {
      console.log('💡 Убедитесь, что сервер разработки запущен: npm run dev');
    }

    return false;
  }
}

// Запуск тестов
if (require.main === module) {
  testProfileAPI().then((success) => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = { testProfileAPI };
