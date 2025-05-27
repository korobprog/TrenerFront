const http = require('http');
const https = require('https');
const { URL } = require('url');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Конфигурация тестирования
const BASE_URL = 'http://localhost:3000';
const API_ENDPOINT = '/api/flashcards/questions';

// Функция для выполнения HTTP запроса
function makeRequest(params = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(API_ENDPOINT, BASE_URL);
    Object.keys(params).forEach((key) => {
      if (params[key] !== undefined) {
        url.searchParams.append(key, params[key]);
      }
    });

    console.log(`🔗 Запрос: ${url.toString()}`);

    const protocol = url.protocol === 'https:' ? https : http;

    const req = protocol.get(
      url.toString(),
      {
        timeout: 10000,
      },
      (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            const parsedData = data ? JSON.parse(data) : {};
            resolve({
              status: res.statusCode,
              data: parsedData,
              headers: res.headers,
            });
          } catch (error) {
            resolve({
              status: res.statusCode,
              data: { rawData: data },
              parseError: error.message,
            });
          }
        });
      }
    );

    req.on('error', (error) => {
      console.error(`❌ Ошибка запроса:`, error.message);
      resolve({
        status: 0,
        error: error.message,
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        status: 0,
        error: 'Timeout',
      });
    });
  });
}

// Тестовые случаи
const TEST_CASES = [
  {
    name: 'Базовый запрос без параметров',
    params: {},
    description: 'Проверка базовой функциональности API',
  },
  {
    name: 'Запрос с лимитом',
    params: { limit: 5 },
    description: 'Проверка параметра limit',
  },
  {
    name: 'Фильтр по сложности',
    params: { difficulty: 'easy', limit: 3 },
    description: 'Проверка фильтрации по сложности',
  },
  {
    name: 'Режим study',
    params: { mode: 'study', limit: 3 },
    description: 'Проверка режима изучения',
  },
  {
    name: 'Неверная сложность',
    params: { difficulty: 'invalid' },
    description: 'Проверка валидации параметров',
  },
];

// Основная функция тестирования
async function runTests() {
  console.log('🚀 Начинаем тестирование API флеш-карточек');
  console.log('='.repeat(60));

  // Проверяем базу данных
  console.log('\n📊 Проверка базы данных...');
  try {
    const questionCount = await prisma.question.count();
    console.log(
      `✅ Подключение к БД успешно. Всего вопросов: ${questionCount}`
    );

    if (questionCount === 0) {
      console.log('⚠️ В базе данных нет вопросов для тестирования');
      return;
    }

    // Получаем примеры вопросов
    const sampleQuestions = await prisma.question.findMany({
      take: 3,
      select: {
        id: true,
        text: true,
        topic: true,
        difficulty: true,
      },
    });

    console.log('📋 Примеры вопросов в БД:');
    sampleQuestions.forEach((q, i) => {
      console.log(
        `  ${i + 1}. [${q.difficulty || 'N/A'}] ${q.topic || 'N/A'}: ${
          q.text?.substring(0, 50) || 'Нет текста'
        }...`
      );
    });

    // Проверяем наличие вопросов с пустым текстом (проблема, которую исправляли)
    const emptyTextCount = await prisma.question.count({
      where: {
        OR: [{ text: { equals: null } }, { text: { equals: '' } }],
      },
    });

    console.log(`🔍 Вопросов с пустым текстом: ${emptyTextCount}`);

    if (emptyTextCount > 0) {
      console.log(
        '⚠️ Найдены вопросы с пустым текстом - это может влиять на результаты API'
      );
    }
  } catch (error) {
    console.error('❌ Ошибка подключения к БД:', error.message);
    return;
  }

  console.log('\n🧪 Запуск тестов API...');
  console.log('='.repeat(60));

  // Сначала проверим, запущен ли сервер
  console.log('\n🔍 Проверка доступности сервера...');
  const serverCheck = await makeRequest();

  if (serverCheck.status === 0) {
    console.log(
      '❌ Сервер недоступен. Убедитесь, что Next.js сервер запущен на localhost:3000'
    );
    console.log('💡 Запустите: npm run dev или yarn dev');
    return;
  }

  console.log(`📊 Сервер отвечает со статусом: ${serverCheck.status}`);

  // Анализируем ответ сервера
  if (serverCheck.status === 401) {
    console.log('🔐 API требует авторизации (ожидаемое поведение)');
    console.log('📝 Ответ сервера:', JSON.stringify(serverCheck.data, null, 2));
  } else if (serverCheck.status === 405) {
    console.log('❌ Метод не поддерживается - возможно проблема с роутингом');
  } else if (serverCheck.status === 500) {
    console.log('💥 Внутренняя ошибка сервера');
    console.log('📝 Ответ сервера:', JSON.stringify(serverCheck.data, null, 2));
  } else if (serverCheck.status === 200) {
    console.log('✅ API отвечает успешно (неожиданно без авторизации)');
    console.log('📝 Ответ сервера:', JSON.stringify(serverCheck.data, null, 2));
  }

  // Запускаем остальные тесты
  for (let i = 0; i < TEST_CASES.length; i++) {
    const testCase = TEST_CASES[i];
    console.log(`\n🔬 Тест ${i + 1}/${TEST_CASES.length}: ${testCase.name}`);
    console.log(`📝 Описание: ${testCase.description}`);
    console.log(`🎯 Параметры:`, testCase.params);

    const response = await makeRequest(testCase.params);

    console.log(`📊 Статус ответа: ${response.status}`);

    if (response.error) {
      console.log(`❌ Ошибка: ${response.error}`);
      continue;
    }

    if (response.parseError) {
      console.log(`❌ Ошибка парсинга JSON: ${response.parseError}`);
      console.log(`📄 Сырые данные:`, response.data.rawData?.substring(0, 200));
      continue;
    }

    // Анализируем ответ
    if (response.status === 401) {
      console.log('🔐 Требуется авторизация (ожидаемо)');
    } else if (response.status === 400) {
      console.log('⚠️ Ошибка валидации параметров');
      console.log('📝 Сообщение:', response.data.message);
    } else if (response.status === 500) {
      console.log('💥 Внутренняя ошибка сервера');
      console.log('📝 Ошибка:', response.data.message || response.data.error);
    } else if (response.status === 200) {
      console.log('✅ Успешный ответ');
      if (response.data.questions) {
        console.log(`📊 Получено вопросов: ${response.data.questions.length}`);
        console.log(`📊 Всего доступно: ${response.data.totalAvailable}`);
        console.log(`📊 Режим: ${response.data.mode}`);
      }
    }

    // Небольшая пауза между запросами
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 РЕЗУЛЬТАТЫ ДИАГНОСТИКИ');
  console.log('='.repeat(60));

  console.log('\n🔍 КЛЮЧЕВЫЕ ВЫВОДЫ:');

  if (serverCheck.status === 401) {
    console.log('✅ API корректно требует авторизацию');
    console.log('✅ Сервер запущен и отвечает на запросы');
    console.log('✅ Роутинг работает корректно');
    console.log('📝 Для полного тестирования нужна авторизованная сессия');
  } else if (serverCheck.status === 500) {
    console.log('❌ Обнаружена внутренняя ошибка сервера');
    console.log('🔧 Требуется анализ логов сервера для диагностики');
  } else if (serverCheck.status === 0) {
    console.log('❌ Сервер недоступен');
    console.log('🔧 Запустите Next.js сервер: npm run dev');
  }

  console.log('\n💡 РЕКОМЕНДАЦИИ:');
  console.log('1. Убедитесь, что Next.js сервер запущен');
  console.log('2. Проверьте логи сервера на наличие ошибок');
  console.log('3. Для полного тестирования создайте авторизованную сессию');
  console.log(
    '4. Исправление синтаксиса Prisma должно решить проблемы с загрузкой'
  );
}

// Запуск тестирования
runTests()
  .catch((error) => {
    console.error('💥 Критическая ошибка тестирования:', error);
  })
  .finally(async () => {
    await prisma.$disconnect();
    console.log('\n🔌 Подключение к БД закрыто');
  });
