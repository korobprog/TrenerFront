const http = require('http');

console.log('=== ТЕСТ АУТЕНТИФИКАЦИИ И СЕТЕВЫХ ЗАПРОСОВ ===');

function testEndpoint(url, description) {
  return new Promise((resolve) => {
    console.log(`🌐 Тестируем: ${description}`);
    console.log(`🔗 URL: ${url}`);

    const req = http.get(url, (res) => {
      console.log(`📊 Статус: ${res.statusCode}`);
      console.log(`📋 Заголовки:`, Object.keys(res.headers));

      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log(`✅ ${description} - работает`);
        } else {
          console.log(`❌ ${description} - ошибка ${res.statusCode}`);
          if (data) {
            console.log(`📄 Ответ: ${data.substring(0, 200)}...`);
          }
        }
        resolve();
      });
    });

    req.on('error', (error) => {
      console.log(`❌ ${description} - сетевая ошибка: ${error.message}`);
      resolve();
    });

    req.setTimeout(5000, () => {
      console.log(`⏰ ${description} - таймаут`);
      req.destroy();
      resolve();
    });
  });
}

async function runTests() {
  // Тестируем основные эндпоинты
  await testEndpoint('http://localhost:3000', 'Главная страница');
  await testEndpoint(
    'http://localhost:3000/api/flashcards/questions',
    'API флеш-карточек (без авторизации)'
  );
  await testEndpoint(
    'http://localhost:3000/flashcards',
    'Страница флеш-карточек'
  );

  console.log('\n=== ПРОВЕРКА ПЕРЕМЕННЫХ ОКРУЖЕНИЯ ===');

  // Проверяем критические переменные окружения
  const envVars = [
    'NEXTAUTH_SECRET',
    'NEXTAUTH_URL',
    'DATABASE_URL',
    'NODE_ENV',
  ];

  envVars.forEach((varName) => {
    const value = process.env[varName];
    if (value) {
      console.log(`✅ ${varName}: установлена (${value.length} символов)`);
    } else {
      console.log(`❌ ${varName}: НЕ УСТАНОВЛЕНА`);
    }
  });

  console.log('\n=== КОНЕЦ ТЕСТОВ ===');
}

runTests().catch(console.error);
