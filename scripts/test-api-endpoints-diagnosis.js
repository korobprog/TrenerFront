#!/usr/bin/env node

/**
 * Диагностический скрипт для проверки API эндпоинтов mock-interviews
 * Проверяет доступность и корректность ответов API
 */

const http = require('http');
const https = require('https');

const BASE_URL = 'http://localhost:3000';

// Функция для выполнения HTTP запроса
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;

    const req = protocol.request(
      url,
      {
        method: options.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'API-Diagnosis-Script',
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

// Функция для анализа ответа
function analyzeResponse(response, endpoint) {
  console.log(`\n=== АНАЛИЗ ЭНДПОИНТА: ${endpoint} ===`);
  console.log(`Статус: ${response.status} ${response.statusText}`);
  console.log(`Content-Type: ${response.contentType}`);
  console.log(`Размер ответа: ${response.body.length} байт`);

  // Проверяем, является ли ответ HTML
  const isHTML =
    response.body.trim().startsWith('<!DOCTYPE') ||
    response.body.trim().startsWith('<html') ||
    response.contentType.includes('text/html');

  if (isHTML) {
    console.log('❌ ПРОБЛЕМА: API возвращает HTML вместо JSON!');
    console.log('Первые 200 символов ответа:');
    console.log(response.body.substring(0, 200) + '...');

    // Ищем признаки Next.js ошибки
    if (
      response.body.includes('404') ||
      response.body.includes('This page could not be found')
    ) {
      console.log('🔍 ДИАГНОЗ: 404 - Эндпоинт не найден');
    } else if (
      response.body.includes('500') ||
      response.body.includes('Internal Server Error')
    ) {
      console.log('🔍 ДИАГНОЗ: 500 - Внутренняя ошибка сервера');
    } else if (
      response.body.includes('_next') ||
      response.body.includes('__NEXT_DATA__')
    ) {
      console.log(
        '🔍 ДИАГНОЗ: Возвращается Next.js страница вместо API ответа'
      );
    }
  } else {
    try {
      const jsonData = JSON.parse(response.body);
      console.log('✅ Ответ является валидным JSON');
      console.log('Структура ответа:', Object.keys(jsonData));
    } catch (e) {
      console.log('❌ ПРОБЛЕМА: Ответ не является валидным JSON');
      console.log('Ошибка парсинга:', e.message);
      console.log('Первые 200 символов ответа:');
      console.log(response.body.substring(0, 200) + '...');
    }
  }

  return isHTML;
}

// Основная функция диагностики
async function runDiagnosis() {
  console.log('🔍 НАЧИНАЕМ ДИАГНОСТИКУ API ЭНДПОИНТОВ');
  console.log('='.repeat(50));

  const endpoints = [
    '/api/mock-interviews',
    '/api/mock-interviews?status=active',
    '/api/user/points',
    '/api/auth/session', // Дополнительная проверка сессии
  ];

  let htmlResponses = 0;
  let totalEndpoints = endpoints.length;

  for (const endpoint of endpoints) {
    try {
      const url = `${BASE_URL}${endpoint}`;
      console.log(`\n📡 Тестируем: ${url}`);

      const response = await makeRequest(url);
      const isHTML = analyzeResponse(response, endpoint);

      if (isHTML) {
        htmlResponses++;
      }
    } catch (error) {
      console.log(`\n❌ ОШИБКА при запросе к ${endpoint}:`);
      console.log(`Тип ошибки: ${error.code || error.name}`);
      console.log(`Сообщение: ${error.message}`);

      if (error.code === 'ECONNREFUSED') {
        console.log(
          '🔍 ДИАГНОЗ: Сервер не запущен или недоступен на порту 3000'
        );
      }
    }
  }

  // Итоговый анализ
  console.log('\n' + '='.repeat(50));
  console.log('📊 ИТОГОВЫЙ АНАЛИЗ:');
  console.log(`Всего протестировано эндпоинтов: ${totalEndpoints}`);
  console.log(`Эндпоинтов, возвращающих HTML: ${htmlResponses}`);

  if (htmlResponses > 0) {
    console.log('\n❌ ОБНАРУЖЕНА ПРОБЛЕМА:');
    console.log(
      `${htmlResponses} из ${totalEndpoints} эндпоинтов возвращают HTML вместо JSON`
    );
    console.log('\n🔍 ВОЗМОЖНЫЕ ПРИЧИНЫ:');
    console.log('1. API маршруты не зарегистрированы правильно в Next.js');
    console.log('2. Проблемы с маршрутизацией Next.js');
    console.log('3. Middleware перенаправляет API запросы');
    console.log('4. Ошибки в самих API обработчиках');
    console.log('5. Проблемы с авторизацией (редирект на страницу входа)');
  } else {
    console.log('\n✅ Все эндпоинты работают корректно');
  }

  // Дополнительные проверки
  console.log('\n🔧 ДОПОЛНИТЕЛЬНЫЕ ПРОВЕРКИ:');

  // Проверяем доступность главной страницы
  try {
    const mainPageResponse = await makeRequest(`${BASE_URL}/`);
    console.log(`Главная страница (${BASE_URL}/): ${mainPageResponse.status}`);
  } catch (error) {
    console.log(`Главная страница недоступна: ${error.message}`);
  }

  // Проверяем доступность страницы mock-interviews
  try {
    const mockInterviewsPageResponse = await makeRequest(
      `${BASE_URL}/mock-interviews`
    );
    console.log(
      `Страница mock-interviews: ${mockInterviewsPageResponse.status}`
    );
  } catch (error) {
    console.log(`Страница mock-interviews недоступна: ${error.message}`);
  }
}

// Запускаем диагностику
runDiagnosis().catch(console.error);
