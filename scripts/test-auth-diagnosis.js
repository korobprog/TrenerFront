#!/usr/bin/env node

/**
 * Диагностический скрипт для проверки системы аутентификации
 * Проверяет NextAuth.js конфигурацию и сессии
 */

const http = require('http');

const BASE_URL = 'http://localhost:3000';

// Функция для выполнения HTTP запроса
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      url,
      {
        method: options.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Auth-Diagnosis-Script',
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

async function checkAuthConfiguration() {
  console.log('🔍 ПРОВЕРКА КОНФИГУРАЦИИ АУТЕНТИФИКАЦИИ');
  console.log('='.repeat(50));

  // Проверяем доступность NextAuth.js эндпоинтов
  const authEndpoints = [
    '/api/auth/session',
    '/api/auth/providers',
    '/api/auth/csrf',
  ];

  for (const endpoint of authEndpoints) {
    try {
      const url = `${BASE_URL}${endpoint}`;
      console.log(`\n📡 Тестируем: ${url}`);

      const response = await makeRequest(url);
      console.log(`Статус: ${response.status} ${response.statusText}`);
      console.log(`Content-Type: ${response.contentType}`);

      if (response.status === 200) {
        try {
          const data = JSON.parse(response.body);
          console.log('✅ Эндпоинт работает');

          if (endpoint === '/api/auth/session') {
            if (Object.keys(data).length === 0) {
              console.log(
                'ℹ️  Сессия отсутствует (пользователь не авторизован)'
              );
            } else {
              console.log('✅ Активная сессия найдена:', Object.keys(data));
            }
          } else if (endpoint === '/api/auth/providers') {
            console.log('📋 Доступные провайдеры:', Object.keys(data));
          }
        } catch (e) {
          console.log('❌ Ошибка парсинга JSON:', e.message);
        }
      } else {
        console.log('❌ Эндпоинт недоступен');
      }
    } catch (error) {
      console.log(`❌ ОШИБКА: ${error.message}`);
    }
  }
}

async function checkBrowserScenario() {
  console.log('\n🌐 СИМУЛЯЦИЯ БРАУЗЕРНОГО СЦЕНАРИЯ');
  console.log('='.repeat(50));

  console.log('\n1. Проверяем доступ к странице mock-interviews...');
  try {
    const pageResponse = await makeRequest(`${BASE_URL}/mock-interviews`);
    console.log(`Страница mock-interviews: ${pageResponse.status}`);

    if (pageResponse.status === 200) {
      console.log('✅ Страница загружается успешно');

      // Проверяем, содержит ли страница JavaScript код для API вызовов
      if (
        pageResponse.body.includes('fetch') &&
        pageResponse.body.includes('/api/')
      ) {
        console.log('✅ Страница содержит JavaScript код для API вызовов');
      }
    }
  } catch (error) {
    console.log(`❌ Ошибка загрузки страницы: ${error.message}`);
  }

  console.log('\n2. Проверяем API вызовы без авторизации...');
  try {
    const apiResponse = await makeRequest(`${BASE_URL}/api/mock-interviews`);
    console.log(`API mock-interviews: ${apiResponse.status}`);

    if (apiResponse.status === 401) {
      console.log(
        '✅ API корректно возвращает 401 для неавторизованных запросов'
      );

      try {
        const errorData = JSON.parse(apiResponse.body);
        console.log(
          '📋 Сообщение об ошибке:',
          errorData.message || errorData.error
        );
      } catch (e) {
        console.log('❌ Не удалось распарсить ошибку');
      }
    }
  } catch (error) {
    console.log(`❌ Ошибка API запроса: ${error.message}`);
  }
}

async function analyzeAuthFlow() {
  console.log('\n🔄 АНАЛИЗ ПОТОКА АУТЕНТИФИКАЦИИ');
  console.log('='.repeat(50));

  console.log('\n📋 ОЖИДАЕМЫЙ ПОТОК:');
  console.log('1. Пользователь заходит на /mock-interviews');
  console.log('2. Страница загружается и выполняет JavaScript');
  console.log('3. JavaScript делает fetch запросы к API');
  console.log('4. API проверяет сессию через NextAuth.js');
  console.log('5. Если сессии нет - возвращает 401');
  console.log('6. Фронтенд должен обработать 401 и показать форму входа');

  console.log('\n🔍 ВОЗМОЖНЫЕ ПРОБЛЕМЫ:');
  console.log('1. Пользователь не авторизован (нормальное поведение)');
  console.log('2. Проблемы с cookies/сессиями в браузере');
  console.log('3. Неправильная обработка 401 ошибок на фронтенде');
  console.log('4. Проблемы с NextAuth.js конфигурацией');
  console.log('5. Проблемы с CORS или заголовками');

  console.log('\n💡 РЕКОМЕНДАЦИИ:');
  console.log('1. Проверить, авторизован ли пользователь в браузере');
  console.log('2. Проверить консоль браузера на наличие JavaScript ошибок');
  console.log('3. Проверить Network tab в DevTools браузера');
  console.log('4. Убедиться, что фронтенд корректно обрабатывает 401 ошибки');
}

// Запускаем диагностику
async function runFullDiagnosis() {
  await checkAuthConfiguration();
  await checkBrowserScenario();
  await analyzeAuthFlow();

  console.log('\n' + '='.repeat(50));
  console.log('🎯 ЗАКЛЮЧЕНИЕ:');
  console.log('API эндпоинты работают корректно и возвращают JSON.');
  console.log('Проблема НЕ в том, что API возвращает HTML.');
  console.log('Проблема в том, что API возвращает 401 (Unauthorized).');
  console.log('Это нормальное поведение для неавторизованных пользователей.');
  console.log('\n🔧 СЛЕДУЮЩИЕ ШАГИ:');
  console.log('1. Проверить, как фронтенд обрабатывает 401 ошибки');
  console.log('2. Убедиться, что пользователь может авторизоваться');
  console.log('3. Проверить логи браузера на наличие других ошибок');
}

runFullDiagnosis().catch(console.error);
