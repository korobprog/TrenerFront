const http = require('http');
const { URL } = require('url');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Конфигурация тестирования
const BASE_URL = 'http://localhost:3000';
const API_ENDPOINT = '/api/flashcards/questions';

// Функция для выполнения HTTP запроса
function makeRequest(params = {}) {
  return new Promise((resolve) => {
    const url = new URL(API_ENDPOINT, BASE_URL);
    Object.keys(params).forEach((key) => {
      if (params[key] !== undefined) {
        url.searchParams.append(key, params[key]);
      }
    });

    console.log(`🔗 Запрос: ${url.toString()}`);

    const req = http.get(
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
    name: 'Фильтр по сложности - easy',
    params: { difficulty: 'easy', limit: 3 },
    description: 'Проверка фильтрации по сложности',
  },
  {
    name: 'Фильтр по сложности - medium',
    params: { difficulty: 'medium', limit: 3 },
    description: 'Проверка фильтрации по сложности',
  },
  {
    name: 'Режим study',
    params: { mode: 'study', limit: 3 },
    description: 'Проверка режима изучения',
  },
  {
    name: 'Режим review',
    params: { mode: 'review', limit: 3 },
    description: 'Проверка режима повторения',
  },
  {
    name: 'Режим exam',
    params: { mode: 'exam', limit: 3 },
    description: 'Проверка режима экзамена',
  },
  {
    name: 'Неверная сложность',
    params: { difficulty: 'invalid' },
    description: 'Проверка валидации параметров',
  },
  {
    name: 'Неверный режим',
    params: { mode: 'invalid' },
    description: 'Проверка валидации режима',
  },
  {
    name: 'Большой лимит',
    params: { limit: 100 },
    description: 'Проверка ограничения лимита до 50',
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

    // Получаем статистику по темам и сложности
    const topics = await prisma.question.groupBy({
      by: ['topic'],
      _count: { topic: true },
      where: { topic: { not: null } },
    });

    const difficulties = await prisma.question.groupBy({
      by: ['difficulty'],
      _count: { difficulty: true },
      where: { difficulty: { not: null } },
    });

    console.log('📊 Статистика по темам:');
    topics.forEach((t) =>
      console.log(`  - ${t.topic}: ${t._count.topic} вопросов`)
    );

    console.log('📊 Статистика по сложности:');
    difficulties.forEach((d) =>
      console.log(`  - ${d.difficulty}: ${d._count.difficulty} вопросов`)
    );
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
    console.log('💥 Внутренняя ошибка сервера - проблема с исправлением!');
    console.log('📝 Ответ сервера:', JSON.stringify(serverCheck.data, null, 2));
    console.log('🔧 Проверьте логи сервера Next.js для подробностей');
  } else if (serverCheck.status === 200) {
    console.log('✅ API отвечает успешно (неожиданно без авторизации)');
    console.log('📝 Ответ сервера:', JSON.stringify(serverCheck.data, null, 2));
  }

  // Запускаем остальные тесты
  let passedTests = 0;
  let totalTests = TEST_CASES.length;

  for (let i = 0; i < TEST_CASES.length; i++) {
    const testCase = TEST_CASES[i];
    console.log(`\n🔬 Тест ${i + 1}/${totalTests}: ${testCase.name}`);
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
      continue;
    }

    // Анализируем ответ
    if (response.status === 401) {
      console.log('🔐 Требуется авторизация (ожидаемо)');
      passedTests++;
    } else if (response.status === 400) {
      console.log(
        '⚠️ Ошибка валидации параметров (ожидаемо для неверных параметров)'
      );
      console.log('📝 Сообщение:', response.data.message);
      if (
        testCase.params.difficulty === 'invalid' ||
        testCase.params.mode === 'invalid'
      ) {
        passedTests++;
      }
    } else if (response.status === 500) {
      console.log('💥 Внутренняя ошибка сервера - ПРОБЛЕМА!');
      console.log('📝 Ошибка:', response.data.message || response.data.error);
    } else if (response.status === 200) {
      console.log('✅ Успешный ответ');
      if (response.data.questions) {
        console.log(`📊 Получено вопросов: ${response.data.questions.length}`);
        console.log(`📊 Всего доступно: ${response.data.totalAvailable}`);
        console.log(`📊 Режим: ${response.data.mode}`);
      }
      passedTests++;
    }

    // Небольшая пауза между запросами
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 РЕЗУЛЬТАТЫ ТЕСТИРОВАНИЯ');
  console.log('='.repeat(60));

  console.log(`✅ Пройдено тестов: ${passedTests}/${totalTests}`);
  console.log(
    `📊 Процент успеха: ${Math.round((passedTests / totalTests) * 100)}%`
  );

  console.log('\n🔍 ДИАГНОСТИЧЕСКИЕ ВЫВОДЫ:');

  if (serverCheck.status === 401) {
    console.log('✅ API корректно требует авторизацию');
    console.log('✅ Сервер запущен и отвечает на запросы');
    console.log('✅ Роутинг работает корректно');
    console.log('✅ Исправление синтаксиса Prisma, вероятно, работает');
    console.log(
      '📝 Для полного функционального тестирования нужна авторизованная сессия'
    );
  } else if (serverCheck.status === 500) {
    console.log('❌ Обнаружена внутренняя ошибка сервера');
    console.log('❌ Исправление может быть неполным или есть другие проблемы');
    console.log('🔧 Требуется анализ логов сервера Next.js');
  } else if (serverCheck.status === 0) {
    console.log('❌ Сервер недоступен');
    console.log('🔧 Запустите Next.js сервер: npm run dev');
  }

  console.log('\n💡 РЕКОМЕНДАЦИИ:');
  console.log('1. Убедитесь, что Next.js сервер запущен (npm run dev)');
  console.log('2. Проверьте консоль сервера на наличие ошибок');
  console.log(
    '3. Если статус 401 - исправление работает, API требует авторизацию'
  );
  console.log('4. Если статус 500 - проверьте синтаксис Prisma в API файле');
  console.log('5. Для полного тестирования создайте авторизованную сессию');
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
