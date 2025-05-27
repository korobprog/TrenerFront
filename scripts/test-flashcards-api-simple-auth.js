/**
 * Простой тест API флешкарт без авторизации
 * Проверяет, работает ли API если убрать проверку авторизации
 */

const http = require('http');
const https = require('https');
const url = require('url');

async function makeRequest(endpoint, options = {}) {
  return new Promise((resolve, reject) => {
    const requestUrl = `http://localhost:3000${endpoint}`;
    const parsedUrl = url.parse(requestUrl);

    const requestOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || 80,
      path: parsedUrl.path,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    };

    const req = http.request(requestOptions, (res) => {
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
      req.write(JSON.stringify(options.body));
    }

    req.end();
  });
}

async function testFlashcardsAPI() {
  console.log('=== ТЕСТ API ФЛЕШКАРТ БЕЗ АВТОРИЗАЦИИ ===');

  try {
    // 1. Тест GET /api/flashcards/questions
    console.log('\n🔍 1. Тестируем GET /api/flashcards/questions');

    const questionsResponse = await makeRequest('/api/flashcards/questions');
    console.log('   - Статус код:', questionsResponse.statusCode);
    console.log('   - Ответ:', JSON.stringify(questionsResponse.data, null, 2));

    if (questionsResponse.statusCode === 401) {
      console.log('   ❌ Получен 401 - проблема с авторизацией подтверждена');
    } else if (questionsResponse.statusCode === 200) {
      console.log('   ✅ API работает без авторизации');
    } else {
      console.log('   ⚠️ Неожиданный статус код');
    }

    // 2. Тест POST /api/flashcards/generate-answer
    console.log('\n🔍 2. Тестируем POST /api/flashcards/generate-answer');

    const generateResponse = await makeRequest(
      '/api/flashcards/generate-answer',
      {
        method: 'POST',
        body: {
          questionId: 1,
          questionText: 'Что такое JavaScript?',
          context: {
            topic: 'JavaScript',
            difficulty: 'easy',
          },
        },
      }
    );

    console.log('   - Статус код:', generateResponse.statusCode);
    console.log('   - Ответ:', JSON.stringify(generateResponse.data, null, 2));

    if (generateResponse.statusCode === 401) {
      console.log('   ❌ Получен 401 - проблема с авторизацией подтверждена');
    } else if (generateResponse.statusCode === 200) {
      console.log('   ✅ API работает без авторизации');
    } else {
      console.log('   ⚠️ Неожиданный статус код');
    }

    // 3. Сравнение с рабочим API
    console.log(
      '\n🔍 3. Тестируем рабочий API /api/training/questions для сравнения'
    );

    const trainingResponse = await makeRequest('/api/training/questions');
    console.log('   - Статус код:', trainingResponse.statusCode);
    console.log('   - Ответ:', JSON.stringify(trainingResponse.data, null, 2));

    if (trainingResponse.statusCode === 401) {
      console.log('   ❌ Training API тоже требует авторизацию');
    } else if (trainingResponse.statusCode === 200) {
      console.log('   ✅ Training API работает без авторизации');
    } else {
      console.log('   ⚠️ Неожиданный статус код в Training API');
    }
  } catch (error) {
    console.error('🚨 ОШИБКА ТЕСТИРОВАНИЯ:', error.message);

    if (error.code === 'ECONNREFUSED') {
      console.log(
        '\n💡 РЕКОМЕНДАЦИЯ: Убедитесь, что сервер Next.js запущен на порту 3000'
      );
      console.log('   Запустите: npm run dev');
    }
  }

  console.log('\n=== КОНЕЦ ТЕСТИРОВАНИЯ ===');
}

// Запускаем тест
testFlashcardsAPI().catch(console.error);
