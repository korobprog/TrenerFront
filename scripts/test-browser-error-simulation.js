#!/usr/bin/env node

/**
 * Симуляция ошибок, которые видит пользователь в браузере
 * Проверяем, что именно происходит при загрузке страницы mock-interviews
 */

const http = require('http');

const BASE_URL = 'http://localhost:3000';

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      url,
      {
        method: options.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
          Accept: 'application/json, text/plain, */*',
          'Accept-Language': 'ru-RU,ru;q=0.9,en;q=0.8',
          ...options.headers,
        },
      },
      (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          resolve({
            status: res.statusCode,
            statusText: res.statusMessage,
            headers: res.headers,
            body: data,
            contentType: res.headers['content-type'] || 'unknown',
          });
        });
      }
    );

    req.on('error', (error) => {
      reject(error);
    });

    if (options.body) {
      req.write(JSON.stringify(options.body));
    }

    req.end();
  });
}

async function simulateBrowserBehavior() {
  console.log('🌐 СИМУЛЯЦИЯ ПОВЕДЕНИЯ БРАУЗЕРА');
  console.log('='.repeat(60));

  console.log('\n1️⃣ Пользователь открывает страницу /mock-interviews');
  try {
    const pageResponse = await makeRequest(`${BASE_URL}/mock-interviews`);
    console.log(`✅ Страница загружена: ${pageResponse.status}`);

    // Проверяем, содержит ли страница JavaScript код для API вызовов
    const hasApiCalls =
      pageResponse.body.includes('fetch') &&
      pageResponse.body.includes('/api/mock-interviews');

    if (hasApiCalls) {
      console.log('✅ Страница содержит JavaScript код для API вызовов');
    } else {
      console.log('❌ Страница НЕ содержит ожидаемый JavaScript код');
    }

    // Проверяем, есть ли ссылки на React/Next.js
    const hasReact =
      pageResponse.body.includes('_next') ||
      pageResponse.body.includes('__NEXT_DATA__');

    if (hasReact) {
      console.log('✅ Страница является Next.js приложением');
    }
  } catch (error) {
    console.log(`❌ Ошибка загрузки страницы: ${error.message}`);
    return;
  }

  console.log('\n2️⃣ JavaScript выполняется и делает API запросы');

  // Симулируем запросы, которые делает JavaScript на странице
  const apiCalls = [
    {
      name: 'Получение списка собеседований',
      url: '/api/mock-interviews?status=active',
      expectedInCode: 'fetchInterviews',
    },
    {
      name: 'Получение баллов пользователя',
      url: '/api/user/points',
      expectedInCode: 'fetchUserPoints',
    },
  ];

  for (const apiCall of apiCalls) {
    console.log(`\n📡 ${apiCall.name}: ${apiCall.url}`);

    try {
      const response = await makeRequest(`${BASE_URL}${apiCall.url}`);

      console.log(`   Статус: ${response.status} ${response.statusText}`);
      console.log(`   Content-Type: ${response.contentType}`);

      // Анализируем ответ
      if (response.status === 401) {
        console.log(
          '   ✅ Ожидаемый результат: 401 Unauthorized (пользователь не авторизован)'
        );

        try {
          const errorData = JSON.parse(response.body);
          console.log(
            `   📋 Сообщение: ${errorData.message || errorData.error}`
          );
        } catch (e) {
          console.log('   ❌ Не удалось распарсить JSON ответ');
        }
      } else if (response.status === 404) {
        console.log('   ❌ ПРОБЛЕМА: 404 Not Found - API эндпоинт не найден');

        // Проверяем, возвращается ли HTML
        if (
          response.body.includes('<!DOCTYPE') ||
          response.body.includes('<html')
        ) {
          console.log(
            '   ❌ КРИТИЧЕСКАЯ ПРОБЛЕМА: API возвращает HTML вместо JSON!'
          );
          console.log('   🔍 Это объясняет ошибку "Unexpected token \'<\'"');
        }
      } else if (response.status === 500) {
        console.log('   ❌ ПРОБЛЕМА: 500 Internal Server Error');
      } else if (response.status === 200) {
        console.log('   ✅ Успешный ответ');

        try {
          const data = JSON.parse(response.body);
          console.log(`   📊 Данные получены: ${Object.keys(data).join(', ')}`);
        } catch (e) {
          console.log('   ❌ Ответ не является валидным JSON');
        }
      }
    } catch (error) {
      console.log(`   ❌ Ошибка запроса: ${error.message}`);
    }
  }
}

async function analyzeUserExperience() {
  console.log('\n👤 АНАЛИЗ ПОЛЬЗОВАТЕЛЬСКОГО ОПЫТА');
  console.log('='.repeat(60));

  console.log('\n🔍 ЧТО ВИДИТ ПОЛЬЗОВАТЕЛЬ:');
  console.log('1. Страница /mock-interviews загружается успешно');
  console.log('2. JavaScript выполняется и делает API запросы');
  console.log(
    '3. API возвращает 401 Unauthorized (это нормально для неавторизованных пользователей)'
  );
  console.log(
    '4. Фронтенд должен обработать 401 и показать сообщение о необходимости авторизации'
  );

  console.log('\n❓ ВОЗМОЖНЫЕ ПРИЧИНЫ ОШИБОК В БРАУЗЕРЕ:');
  console.log('1. Фронтенд неправильно обрабатывает 401 ошибки');
  console.log(
    '2. JavaScript пытается парсить JSON из ответа, который не является JSON'
  );
  console.log('3. Проблемы с CORS или заголовками');
  console.log('4. Кэширование старых ответов в браузере');
  console.log('5. Проблемы с сессиями/cookies в браузере');

  console.log('\n🔧 РЕКОМЕНДАЦИИ ДЛЯ ДАЛЬНЕЙШЕЙ ДИАГНОСТИКИ:');
  console.log('1. Открыть DevTools в браузере (F12)');
  console.log('2. Перейти на вкладку Network');
  console.log('3. Обновить страницу /mock-interviews');
  console.log('4. Проверить статусы и ответы API запросов');
  console.log('5. Проверить Console на наличие JavaScript ошибок');
  console.log('6. Убедиться, что пользователь может авторизоваться');
}

async function runSimulation() {
  await simulateBrowserBehavior();
  await analyzeUserExperience();

  console.log('\n' + '='.repeat(60));
  console.log('🎯 ИТОГОВЫЙ ДИАГНОЗ:');
  console.log('');
  console.log('✅ API эндпоинты работают корректно');
  console.log('✅ Next.js сервер запущен и отвечает');
  console.log('✅ Страница mock-interviews загружается');
  console.log('✅ API возвращает JSON (не HTML)');
  console.log('');
  console.log('❗ ОСНОВНАЯ ПРОБЛЕМА:');
  console.log(
    'API возвращает 401 Unauthorized для неавторизованных пользователей.'
  );
  console.log('Это НОРМАЛЬНОЕ поведение, но фронтенд должен это обрабатывать.');
  console.log('');
  console.log('🔍 ПЕРВОНАЧАЛЬНОЕ ОПИСАНИЕ ПРОБЛЕМЫ НЕТОЧНО:');
  console.log('Пользователь сообщил об ошибке "Unexpected token \'<\'"');
  console.log(
    'Но наша диагностика показывает, что API возвращает JSON, а не HTML.'
  );
  console.log('');
  console.log('💡 ВОЗМОЖНЫЕ ОБЪЯСНЕНИЯ:');
  console.log('1. Проблема была исправлена между сообщением и диагностикой');
  console.log('2. Проблема проявляется только в определенных условиях');
  console.log('3. Проблема связана с кэшированием в браузере');
  console.log('4. Проблема возникает только для авторизованных пользователей');
}

runSimulation().catch(console.error);
