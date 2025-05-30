const http = require('http');
const https = require('https');

// Функция для выполнения HTTP запроса
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;

    const req = protocol.request(url, options, (res) => {
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
        } catch (error) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: data,
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (options.body) {
      req.write(options.body);
    }

    req.end();
  });
}

async function testFlashcardsAPIEndpoint() {
  try {
    console.log('🔍 Тестирование API эндпоинта /api/flashcards/questions...\n');

    // Тест 1: Базовый запрос без параметров
    console.log('📋 Тест 1: Базовый запрос без авторизации');
    try {
      const response1 = await makeRequest(
        'http://localhost:3000/api/flashcards/questions'
      );
      console.log(`   Статус: ${response1.statusCode}`);
      console.log(`   Ответ: ${JSON.stringify(response1.data, null, 2)}`);
    } catch (error) {
      console.log(`   Ошибка: ${error.message}`);
    }

    // Тест 2: Запрос с параметрами
    console.log('\n📋 Тест 2: Запрос с параметрами (без авторизации)');
    try {
      const response2 = await makeRequest(
        'http://localhost:3000/api/flashcards/questions?limit=5&mode=study'
      );
      console.log(`   Статус: ${response2.statusCode}`);
      console.log(`   Ответ: ${JSON.stringify(response2.data, null, 2)}`);
    } catch (error) {
      console.log(`   Ошибка: ${error.message}`);
    }

    // Тест 3: Запрос с фильтром по теме
    console.log('\n📋 Тест 3: Запрос с фильтром по теме JavaScript');
    try {
      const response3 = await makeRequest(
        'http://localhost:3000/api/flashcards/questions?topic=JavaScript&limit=3'
      );
      console.log(`   Статус: ${response3.statusCode}`);
      console.log(`   Ответ: ${JSON.stringify(response3.data, null, 2)}`);
    } catch (error) {
      console.log(`   Ошибка: ${error.message}`);
    }

    // Тест 4: Запрос с фильтром по сложности
    console.log('\n📋 Тест 4: Запрос с фильтром по сложности easy');
    try {
      const response4 = await makeRequest(
        'http://localhost:3000/api/flashcards/questions?difficulty=easy&limit=3'
      );
      console.log(`   Статус: ${response4.statusCode}`);
      console.log(`   Ответ: ${JSON.stringify(response4.data, null, 2)}`);
    } catch (error) {
      console.log(`   Ошибка: ${error.message}`);
    }

    console.log('\n✅ Тестирование API эндпоинта завершено!');
    console.log(
      '\n📝 Примечание: Все запросы выполнены без авторизации, поэтому ожидается статус 401'
    );
  } catch (error) {
    console.error('❌ Ошибка при тестировании API эндпоинта:', error);
  }
}

// Проверяем, запущен ли сервер
async function checkServerStatus() {
  try {
    console.log('🔍 Проверка статуса сервера...');
    const response = await makeRequest('http://localhost:3000/api/health');
    console.log(`✅ Сервер доступен (статус: ${response.statusCode})`);
    return true;
  } catch (error) {
    console.log(
      '❌ Сервер недоступен. Убедитесь, что Next.js сервер запущен на порту 3000'
    );
    console.log('   Запустите: npm run dev');
    return false;
  }
}

async function main() {
  const serverRunning = await checkServerStatus();
  if (serverRunning) {
    await testFlashcardsAPIEndpoint();
  }
}

main();
