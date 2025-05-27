const axios = require('axios');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Конфигурация тестирования
const BASE_URL = 'http://localhost:3000';
const API_ENDPOINT = '/api/flashcards/questions';

// Тестовые данные
const TEST_CASES = [
  {
    name: 'Базовый запрос без параметров',
    params: {},
    expectedStatus: 200,
    description: 'Должен вернуть 10 вопросов по умолчанию',
  },
  {
    name: 'Запрос с лимитом',
    params: { limit: 5 },
    expectedStatus: 200,
    description: 'Должен вернуть максимум 5 вопросов',
  },
  {
    name: 'Запрос с большим лимитом',
    params: { limit: 100 },
    expectedStatus: 200,
    description: 'Должен ограничить до 50 вопросов максимум',
  },
  {
    name: 'Фильтр по сложности - easy',
    params: { difficulty: 'easy', limit: 3 },
    expectedStatus: 200,
    description: 'Должен вернуть только легкие вопросы',
  },
  {
    name: 'Фильтр по сложности - medium',
    params: { difficulty: 'medium', limit: 3 },
    expectedStatus: 200,
    description: 'Должен вернуть только средние вопросы',
  },
  {
    name: 'Фильтр по сложности - hard',
    params: { difficulty: 'hard', limit: 3 },
    expectedStatus: 200,
    description: 'Должен вернуть только сложные вопросы',
  },
  {
    name: 'Неверная сложность',
    params: { difficulty: 'invalid' },
    expectedStatus: 400,
    description: 'Должен вернуть ошибку валидации',
  },
  {
    name: 'Режим study',
    params: { mode: 'study', limit: 3 },
    expectedStatus: 200,
    description: 'Должен работать в режиме изучения',
  },
  {
    name: 'Режим review',
    params: { mode: 'review', limit: 3 },
    expectedStatus: 200,
    description: 'Должен работать в режиме повторения',
  },
  {
    name: 'Режим exam',
    params: { mode: 'exam', limit: 3 },
    expectedStatus: 200,
    description: 'Должен работать в режиме экзамена',
  },
  {
    name: 'Неверный режим',
    params: { mode: 'invalid' },
    expectedStatus: 400,
    description: 'Должен вернуть ошибку валидации режима',
  },
  {
    name: 'Фильтр по теме',
    params: { topic: 'JavaScript', limit: 3 },
    expectedStatus: 200,
    description: 'Должен фильтровать по теме',
  },
  {
    name: 'Исключение отвеченных вопросов',
    params: { excludeAnswered: 'true', limit: 3 },
    expectedStatus: 200,
    description: 'Должен исключить отвеченные вопросы',
  },
  {
    name: 'Комбинированные фильтры',
    params: {
      difficulty: 'medium',
      mode: 'study',
      limit: 5,
      excludeAnswered: 'false',
    },
    expectedStatus: 200,
    description: 'Должен работать с несколькими фильтрами',
  },
];

// Функция для создания тестовой сессии (имитация авторизации)
async function createTestSession() {
  // Для тестирования нужно будет использовать реальную сессию
  // Здесь мы просто проверим, что API требует авторизацию
  return null;
}

// Функция для выполнения HTTP запроса
async function makeRequest(params = {}) {
  try {
    const url = new URL(API_ENDPOINT, BASE_URL);
    Object.keys(params).forEach((key) => {
      if (params[key] !== undefined) {
        url.searchParams.append(key, params[key]);
      }
    });

    console.log(`🔗 Запрос: ${url.toString()}`);

    const response = await axios.get(url.toString(), {
      timeout: 10000,
      validateStatus: () => true, // Не бросать ошибку для статусов 4xx/5xx
    });

    return {
      status: response.status,
      data: response.data,
      headers: response.headers,
    };
  } catch (error) {
    console.error(`❌ Ошибка запроса:`, error.message);
    return {
      status: 0,
      error: error.message,
    };
  }
}

// Функция для проверки структуры ответа
function validateResponseStructure(data, testCase) {
  const errors = [];

  if (testCase.expectedStatus === 200) {
    // Проверяем успешный ответ
    if (!data.questions) {
      errors.push('Отсутствует поле questions');
    } else if (!Array.isArray(data.questions)) {
      errors.push('Поле questions должно быть массивом');
    } else {
      // Проверяем структуру вопросов
      data.questions.forEach((question, index) => {
        const requiredFields = ['id', 'questionText', 'topic', 'difficulty'];
        requiredFields.forEach((field) => {
          if (question[field] === undefined) {
            errors.push(`Вопрос ${index}: отсутствует поле ${field}`);
          }
        });

        // Проверяем, что текст вопроса не пустой
        if (!question.questionText || question.questionText.trim() === '') {
          errors.push(`Вопрос ${index}: пустой текст вопроса`);
        }
      });
    }

    if (!data.sessionId) {
      errors.push('Отсутствует sessionId');
    }

    if (data.totalAvailable === undefined) {
      errors.push('Отсутствует totalAvailable');
    }

    if (!data.mode) {
      errors.push('Отсутствует mode');
    }

    if (!data.filters) {
      errors.push('Отсутствует filters');
    }
  } else {
    // Проверяем ответ с ошибкой
    if (!data.message) {
      errors.push('Отсутствует сообщение об ошибке');
    }
  }

  return errors;
}

// Функция для проверки логики фильтрации
function validateFilters(data, params) {
  const errors = [];

  if (!data.questions || !Array.isArray(data.questions)) {
    return ['Нет данных для проверки фильтров'];
  }

  // Проверяем лимит
  if (params.limit) {
    const expectedLimit = Math.min(parseInt(params.limit), 50);
    if (data.questions.length > expectedLimit) {
      errors.push(
        `Превышен лимит: получено ${data.questions.length}, ожидалось максимум ${expectedLimit}`
      );
    }
  }

  // Проверяем фильтр по сложности
  if (params.difficulty) {
    const wrongDifficulty = data.questions.find(
      (q) => q.difficulty !== params.difficulty
    );
    if (wrongDifficulty) {
      errors.push(
        `Найден вопрос с неправильной сложностью: ${wrongDifficulty.difficulty} вместо ${params.difficulty}`
      );
    }
  }

  // Проверяем фильтр по теме
  if (params.topic) {
    const wrongTopic = data.questions.find((q) => q.topic !== params.topic);
    if (wrongTopic) {
      errors.push(
        `Найден вопрос с неправильной темой: ${wrongTopic.topic} вместо ${params.topic}`
      );
    }
  }

  // Проверяем режим в ответе
  if (params.mode && data.mode !== params.mode) {
    errors.push(
      `Неправильный режим в ответе: ${data.mode} вместо ${params.mode}`
    );
  }

  return errors;
}

// Основная функция тестирования
async function runTests() {
  console.log('🚀 Начинаем комплексное тестирование API флеш-карточек');
  console.log('='.repeat(60));

  // Сначала проверим подключение к базе данных
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

    // Получаем примеры вопросов для анализа
    const sampleQuestions = await prisma.question.findMany({
      take: 5,
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
        `  ${i + 1}. [${q.difficulty}] ${q.topic}: ${q.text?.substring(
          0,
          50
        )}...`
      );
    });

    // Получаем уникальные темы и сложности
    const topics = await prisma.question.findMany({
      select: { topic: true },
      distinct: ['topic'],
      where: { topic: { not: null } },
    });

    const difficulties = await prisma.question.findMany({
      select: { difficulty: true },
      distinct: ['difficulty'],
      where: { difficulty: { not: null } },
    });

    console.log(`📈 Доступные темы: ${topics.map((t) => t.topic).join(', ')}`);
    console.log(
      `📊 Доступные сложности: ${difficulties
        .map((d) => d.difficulty)
        .join(', ')}`
    );
  } catch (error) {
    console.error('❌ Ошибка подключения к БД:', error.message);
    return;
  }

  console.log('\n🧪 Запуск тестов API...');
  console.log('='.repeat(60));

  let passedTests = 0;
  let totalTests = TEST_CASES.length;

  for (let i = 0; i < TEST_CASES.length; i++) {
    const testCase = TEST_CASES[i];
    console.log(`\n🔬 Тест ${i + 1}/${totalTests}: ${testCase.name}`);
    console.log(`📝 Описание: ${testCase.description}`);
    console.log(`🎯 Параметры:`, testCase.params);

    const response = await makeRequest(testCase.params);

    console.log(`📊 Статус ответа: ${response.status}`);

    // Проверяем статус код
    if (response.status === testCase.expectedStatus) {
      console.log(`✅ Статус код корректный`);
    } else {
      console.log(
        `❌ Неожиданный статус код: получен ${response.status}, ожидался ${testCase.expectedStatus}`
      );
      if (response.data) {
        console.log(`📄 Ответ:`, JSON.stringify(response.data, null, 2));
      }
      continue;
    }

    // Для успешных ответов проверяем структуру
    if (response.status === 200 && response.data) {
      const structureErrors = validateResponseStructure(
        response.data,
        testCase
      );
      if (structureErrors.length === 0) {
        console.log(`✅ Структура ответа корректная`);
      } else {
        console.log(`❌ Ошибки структуры:`, structureErrors);
        continue;
      }

      // Проверяем логику фильтрации
      const filterErrors = validateFilters(response.data, testCase.params);
      if (filterErrors.length === 0) {
        console.log(`✅ Фильтрация работает корректно`);
      } else {
        console.log(`❌ Ошибки фильтрации:`, filterErrors);
        continue;
      }

      // Выводим краткую информацию о результате
      console.log(`📊 Получено вопросов: ${response.data.questions.length}`);
      console.log(`📊 Всего доступно: ${response.data.totalAvailable}`);
      console.log(`📊 Режим: ${response.data.mode}`);

      if (response.data.questions.length > 0) {
        const firstQuestion = response.data.questions[0];
        console.log(
          `📋 Первый вопрос: [${firstQuestion.difficulty}] ${
            firstQuestion.topic
          }: ${firstQuestion.questionText?.substring(0, 50)}...`
        );
      }
    }

    console.log(`✅ Тест пройден успешно`);
    passedTests++;
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 РЕЗУЛЬТАТЫ ТЕСТИРОВАНИЯ');
  console.log('='.repeat(60));
  console.log(`✅ Пройдено тестов: ${passedTests}/${totalTests}`);
  console.log(
    `📊 Процент успеха: ${Math.round((passedTests / totalTests) * 100)}%`
  );

  if (passedTests === totalTests) {
    console.log('🎉 Все тесты пройдены успешно! API работает корректно.');
  } else {
    console.log(
      `⚠️ ${
        totalTests - passedTests
      } тестов не прошли. Требуется дополнительная диагностика.`
    );
  }

  console.log('\n🔍 ДИАГНОСТИЧЕСКАЯ ИНФОРМАЦИЯ:');
  console.log(
    '- API эндпоинт требует авторизации (статус 401 ожидаем для неавторизованных запросов)'
  );
  console.log(
    '- Исправление синтаксиса Prisma на строке 73 должно решить проблему с загрузкой'
  );
  console.log(
    '- Все фильтры и параметры должны работать согласно документации'
  );
  console.log(
    '- Fallback механизм должен возвращать общие вопросы при отсутствии результатов'
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
