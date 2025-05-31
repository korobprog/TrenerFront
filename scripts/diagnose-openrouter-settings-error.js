/**
 * Диагностический скрипт для воспроизведения ошибки 500
 * при сохранении настроек OpenRouter API
 */

const https = require('https');
const http = require('http');

// Тестовые данные для OpenRouter
const testData = {
  maxQuestionsPerDay: 10,
  maxTokensPerQuestion: 4000,
  isActive: true,
  openRouterApiKey:
    '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',
  openRouterBaseUrl: 'https://openrouter.ai/api/v1',
  openRouterModel: 'google/gemma-3-12b-it:free',
  openRouterTemperature: 0.7,
  openRouterMaxTokens: 4000,
};

console.log('🔍 ДИАГНОСТИКА: Начинаем тестирование API настроек OpenRouter');
console.log(
  '🔍 ДИАГНОСТИКА: Тестовые данные:',
  JSON.stringify(testData, null, 2)
);

// Функция для выполнения HTTP запроса
function makeRequest(options, data) {
  return new Promise((resolve, reject) => {
    const protocol = options.port === 443 ? https : http;

    const req = protocol.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          const parsedData = JSON.parse(responseData);
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: parsedData,
          });
        } catch (error) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: responseData,
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

// Основная функция диагностики
async function diagnoseOpenRouterSettings() {
  try {
    console.log('\n📋 ЭТАП 1: Проверка доступности API эндпоинта');

    // Проверяем GET запрос (получение настроек)
    const getOptions = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/admin/interview-assistant-settings',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Cookie: 'next-auth.session-token=test-session', // Нужно будет заменить на реальный токен
      },
    };

    console.log('🔍 ДИАГНОСТИКА: Выполняем GET запрос...');
    try {
      const getResponse = await makeRequest(getOptions);
      console.log('✅ GET запрос выполнен');
      console.log('📊 Статус код:', getResponse.statusCode);
      console.log('📊 Ответ:', JSON.stringify(getResponse.data, null, 2));
    } catch (error) {
      console.log('❌ Ошибка GET запроса:', error.message);
    }

    console.log('\n📋 ЭТАП 2: Тестирование PUT запроса (сохранение настроек)');

    // Проверяем PUT запрос (сохранение настроек)
    const putOptions = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/admin/interview-assistant-settings',
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Cookie: 'next-auth.session-token=test-session', // Нужно будет заменить на реальный токен
      },
    };

    console.log('🔍 ДИАГНОСТИКА: Выполняем PUT запрос с тестовыми данными...');
    try {
      const putResponse = await makeRequest(putOptions, testData);
      console.log('📊 PUT запрос выполнен');
      console.log('📊 Статус код:', putResponse.statusCode);
      console.log('📊 Ответ:', JSON.stringify(putResponse.data, null, 2));

      if (putResponse.statusCode === 500) {
        console.log('🚨 ОБНАРУЖЕНА ОШИБКА 500!');
        console.log('🔍 Детали ошибки:', putResponse.data);
      }
    } catch (error) {
      console.log('❌ Ошибка PUT запроса:', error.message);
    }

    console.log('\n📋 ЭТАП 3: Проверка валидации данных');

    // Тестируем различные сценарии валидации
    const validationTests = [
      {
        name: 'Отсутствует openRouterApiKey',
        data: { ...testData, openRouterApiKey: undefined },
      },
      {
        name: 'Отсутствует openRouterModel',
        data: { ...testData, openRouterModel: undefined },
      },
      {
        name: 'Некорректный openRouterTemperature',
        data: { ...testData, openRouterTemperature: 'invalid' },
      },
      {
        name: 'Некорректный openRouterMaxTokens',
        data: { ...testData, openRouterMaxTokens: 'invalid' },
      },
    ];

    for (const test of validationTests) {
      console.log(`\n🧪 Тест валидации: ${test.name}`);
      try {
        const response = await makeRequest(putOptions, test.data);
        console.log('📊 Статус код:', response.statusCode);
        console.log('📊 Ответ:', JSON.stringify(response.data, null, 2));
      } catch (error) {
        console.log('❌ Ошибка теста валидации:', error.message);
      }
    }
  } catch (error) {
    console.error('🚨 КРИТИЧЕСКАЯ ОШИБКА в диагностике:', error);
  }
}

// Функция для проверки подключения к базе данных
async function checkDatabaseConnection() {
  console.log('\n📋 ЭТАП 4: Проверка подключения к базе данных');

  try {
    // Импортируем Prisma клиент
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    console.log('🔍 ДИАГНОСТИКА: Проверяем подключение к БД...');

    // Проверяем подключение
    await prisma.$connect();
    console.log('✅ Подключение к базе данных успешно');

    // Проверяем существование таблицы InterviewAssistantSettings
    console.log(
      '🔍 ДИАГНОСТИКА: Проверяем таблицу InterviewAssistantSettings...'
    );
    const settingsCount = await prisma.interviewAssistantSettings.count();
    console.log(
      '📊 Количество записей в InterviewAssistantSettings:',
      settingsCount
    );

    // Получаем схему таблицы
    const existingSettings =
      await prisma.interviewAssistantSettings.findFirst();
    if (existingSettings) {
      console.log(
        '📊 Пример существующей записи:',
        JSON.stringify(existingSettings, null, 2)
      );
    } else {
      console.log('📊 Таблица пуста');
    }

    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Ошибка подключения к базе данных:', error.message);
    console.error('❌ Детали ошибки:', error);
  }
}

// Функция для проверки структуры данных
function validateDataStructure() {
  console.log('\n📋 ЭТАП 5: Проверка структуры данных');

  const requiredFields = [
    'maxQuestionsPerDay',
    'maxTokensPerQuestion',
    'isActive',
    'openRouterApiKey',
    'openRouterBaseUrl',
    'openRouterModel',
    'openRouterTemperature',
    'openRouterMaxTokens',
  ];

  console.log('🔍 ДИАГНОСТИКА: Проверяем наличие обязательных полей...');

  const missingFields = requiredFields.filter((field) => !(field in testData));
  if (missingFields.length > 0) {
    console.log('❌ Отсутствуют поля:', missingFields);
  } else {
    console.log('✅ Все обязательные поля присутствуют');
  }

  console.log('🔍 ДИАГНОСТИКА: Проверяем типы данных...');

  const typeChecks = [
    {
      field: 'maxQuestionsPerDay',
      expected: 'number',
      actual: typeof testData.maxQuestionsPerDay,
    },
    {
      field: 'maxTokensPerQuestion',
      expected: 'number',
      actual: typeof testData.maxTokensPerQuestion,
    },
    {
      field: 'isActive',
      expected: 'boolean',
      actual: typeof testData.isActive,
    },
    {
      field: 'openRouterApiKey',
      expected: 'string',
      actual: typeof testData.openRouterApiKey,
    },
    {
      field: 'openRouterTemperature',
      expected: 'number',
      actual: typeof testData.openRouterTemperature,
    },
    {
      field: 'openRouterMaxTokens',
      expected: 'number',
      actual: typeof testData.openRouterMaxTokens,
    },
  ];

  typeChecks.forEach((check) => {
    if (check.expected === check.actual) {
      console.log(
        `✅ ${check.field}: ${check.actual} (ожидается ${check.expected})`
      );
    } else {
      console.log(
        `❌ ${check.field}: ${check.actual} (ожидается ${check.expected})`
      );
    }
  });
}

// Запуск диагностики
async function runDiagnosis() {
  console.log(
    '🚀 ЗАПУСК ДИАГНОСТИКИ ОШИБКИ 500 ПРИ СОХРАНЕНИИ НАСТРОЕК OPENROUTER'
  );
  console.log('='.repeat(80));

  validateDataStructure();
  await checkDatabaseConnection();
  await diagnoseOpenRouterSettings();

  console.log('\n' + '='.repeat(80));
  console.log('🏁 ДИАГНОСТИКА ЗАВЕРШЕНА');
  console.log('\n📋 РЕКОМЕНДАЦИИ:');
  console.log('1. Проверьте логи сервера в терминале разработки');
  console.log('2. Убедитесь, что у пользователя есть права администратора');
  console.log('3. Проверьте корректность сессии аутентификации');
  console.log('4. Убедитесь, что все поля OpenRouter корректно обрабатываются');
}

// Запускаем диагностику
runDiagnosis().catch(console.error);
