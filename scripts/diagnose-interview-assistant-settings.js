/**
 * Диагностический скрипт для проверки API эндпоинта настроек интервью-ассистента
 * Проверяет все возможные источники ошибки 500
 */

const { PrismaClient } = require('@prisma/client');

async function diagnoseInterviewAssistantSettings() {
  console.log(
    '🔍 ДИАГНОСТИКА: Начинаем проверку API эндпоинта настроек интервью-ассистента'
  );
  console.log('='.repeat(80));

  // 1. Проверка подключения к базе данных
  console.log('\n1️⃣ ПРОВЕРКА ПОДКЛЮЧЕНИЯ К БАЗЕ ДАННЫХ');
  console.log('-'.repeat(50));

  let prisma;
  try {
    prisma = new PrismaClient({
      log: ['error', 'warn', 'info', 'query'],
    });

    console.log('✅ PrismaClient создан успешно');

    // Проверяем подключение
    await prisma.$connect();
    console.log('✅ Подключение к базе данных установлено');

    // Тестовый запрос
    const testQuery = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('✅ Тестовый запрос выполнен успешно:', testQuery);
  } catch (error) {
    console.error('❌ ОШИБКА подключения к базе данных:', error.message);
    console.error('Детали ошибки:', error);
    return;
  }

  // 2. Проверка существования модели InterviewAssistantSettings
  console.log('\n2️⃣ ПРОВЕРКА МОДЕЛИ InterviewAssistantSettings');
  console.log('-'.repeat(50));

  try {
    // Проверяем, существует ли таблица
    const tableExists = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'InterviewAssistantSettings'
      );
    `;
    console.log(
      '✅ Таблица InterviewAssistantSettings существует:',
      tableExists[0].exists
    );

    // Проверяем структуру таблицы
    const tableStructure = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'InterviewAssistantSettings' 
      ORDER BY ordinal_position;
    `;
    console.log('✅ Структура таблицы InterviewAssistantSettings:');
    tableStructure.forEach((col) => {
      console.log(
        `   - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`
      );
    });
  } catch (error) {
    console.error('❌ ОШИБКА при проверке модели:', error.message);
    console.error('Детали ошибки:', error);
  }

  // 3. Проверка операций CRUD с моделью
  console.log('\n3️⃣ ПРОВЕРКА ОПЕРАЦИЙ CRUD');
  console.log('-'.repeat(50));

  try {
    // Попытка получить настройки
    console.log('Попытка получить существующие настройки...');
    const existingSettings = await prisma.interviewAssistantSettings.findFirst({
      where: { isActive: true },
    });
    console.log('✅ Запрос findFirst выполнен успешно');
    console.log(
      'Результат:',
      existingSettings ? 'настройки найдены' : 'настройки не найдены'
    );

    if (existingSettings) {
      console.log('Существующие настройки:');
      console.log('  - ID:', existingSettings.id);
      console.log('  - API Type:', existingSettings.apiType);
      console.log(
        '  - Max Questions Per Day:',
        existingSettings.maxQuestionsPerDay
      );
      console.log('  - Is Active:', existingSettings.isActive);
    }

    // Попытка создать тестовые настройки
    console.log('\nПопытка создать тестовые настройки...');
    const testSettings = {
      apiKey: 'test-key-for-diagnosis',
      maxQuestionsPerDay: 10,
      maxTokensPerQuestion: 4000,
      isActive: false, // Делаем неактивными, чтобы не конфликтовать с реальными
      apiType: 'openrouter',
      openRouterApiKey: 'test-openrouter-key',
      openRouterBaseUrl: 'https://openrouter.ai/api/v1',
      openRouterModel: 'google/gemma-3-12b-it:free',
      openRouterTemperature: 0.7,
      openRouterMaxTokens: 4000,
    };

    const createdSettings = await prisma.interviewAssistantSettings.create({
      data: testSettings,
    });
    console.log('✅ Создание тестовых настроек выполнено успешно');
    console.log('Созданные настройки ID:', createdSettings.id);

    // Попытка обновить тестовые настройки
    console.log('\nПопытка обновить тестовые настройки...');
    const updatedSettings = await prisma.interviewAssistantSettings.update({
      where: { id: createdSettings.id },
      data: {
        maxQuestionsPerDay: 15,
        openRouterTemperature: 0.8,
      },
    });
    console.log('✅ Обновление тестовых настроек выполнено успешно');
    console.log('Обновленные значения:');
    console.log(
      '  - Max Questions Per Day:',
      updatedSettings.maxQuestionsPerDay
    );
    console.log(
      '  - OpenRouter Temperature:',
      updatedSettings.openRouterTemperature
    );

    // Удаляем тестовые настройки
    console.log('\nУдаление тестовых настроек...');
    await prisma.interviewAssistantSettings.delete({
      where: { id: createdSettings.id },
    });
    console.log('✅ Удаление тестовых настроек выполнено успешно');
  } catch (error) {
    console.error('❌ ОШИБКА при выполнении CRUD операций:', error.message);
    console.error('Детали ошибки:', error);
    console.error('Stack trace:', error.stack);
  }

  // 4. Проверка импортов и зависимостей
  console.log('\n4️⃣ ПРОВЕРКА ИМПОРТОВ И ЗАВИСИМОСТЕЙ');
  console.log('-'.repeat(50));

  try {
    // Проверяем импорт withAdminAuth
    console.log('Проверка импорта withAdminAuth...');
    const { withAdminAuth } = require('./lib/middleware/adminAuth');
    console.log('✅ withAdminAuth импортирован успешно:', typeof withAdminAuth);

    // Проверяем импорт logAdminAction
    console.log('Проверка импорта logAdminAction...');
    const { logAdminAction } = require('./lib/middleware/adminAuth');
    console.log(
      '✅ logAdminAction импортирован успешно:',
      typeof logAdminAction
    );

    // Проверяем импорт withPrisma
    console.log('Проверка импорта withPrisma...');
    const { withPrisma } = require('./lib/prismaCommonJS');
    console.log('✅ withPrisma импортирован успешно:', typeof withPrisma);

    // Тестируем withPrisma
    console.log('Тестирование withPrisma...');
    const testResult = await withPrisma(async (prisma) => {
      return await prisma.$queryRaw`SELECT 'withPrisma test' as result`;
    });
    console.log('✅ withPrisma работает корректно:', testResult);
  } catch (error) {
    console.error('❌ ОШИБКА при проверке импортов:', error.message);
    console.error('Детали ошибки:', error);
  }

  // 5. Симуляция API запроса
  console.log('\n5️⃣ СИМУЛЯЦИЯ API ЗАПРОСА');
  console.log('-'.repeat(50));

  try {
    console.log('Симуляция PUT запроса с тестовыми данными...');

    const testRequestBody = {
      maxQuestionsPerDay: 10,
      maxTokensPerQuestion: 4000,
      isActive: true,
      openRouterApiKey: 'test-api-key',
      openRouterBaseUrl: 'https://openrouter.ai/api/v1',
      openRouterModel: 'google/gemma-3-12b-it:free',
      openRouterTemperature: 0.7,
      openRouterMaxTokens: 4000,
    };

    console.log(
      'Тестовые данные запроса:',
      JSON.stringify(testRequestBody, null, 2)
    );

    // Проверяем валидацию данных
    console.log('Проверка валидации данных...');

    // Проверяем обязательные поля
    if (!testRequestBody.openRouterApiKey) {
      throw new Error('OpenRouter API ключ обязателен');
    }
    if (!testRequestBody.openRouterModel) {
      throw new Error('Модель OpenRouter обязательна');
    }
    console.log('✅ Валидация обязательных полей пройдена');

    // Проверяем конвертацию типов
    const convertedMaxQuestionsPerDay = parseInt(
      testRequestBody.maxQuestionsPerDay,
      10
    );
    const convertedMaxTokensPerQuestion = parseInt(
      testRequestBody.maxTokensPerQuestion,
      10
    );
    const convertedOpenRouterTemperature = parseFloat(
      testRequestBody.openRouterTemperature
    );
    const convertedOpenRouterMaxTokens = parseInt(
      testRequestBody.openRouterMaxTokens,
      10
    );

    if (isNaN(convertedMaxQuestionsPerDay)) {
      throw new Error('Некорректное значение maxQuestionsPerDay');
    }
    if (isNaN(convertedMaxTokensPerQuestion)) {
      throw new Error('Некорректное значение maxTokensPerQuestion');
    }
    if (isNaN(convertedOpenRouterTemperature)) {
      throw new Error('Некорректное значение openRouterTemperature');
    }
    if (isNaN(convertedOpenRouterMaxTokens)) {
      throw new Error('Некорректное значение openRouterMaxTokens');
    }

    console.log('✅ Конвертация типов данных выполнена успешно');
    console.log('Конвертированные значения:');
    console.log(
      '  - maxQuestionsPerDay:',
      convertedMaxQuestionsPerDay,
      typeof convertedMaxQuestionsPerDay
    );
    console.log(
      '  - maxTokensPerQuestion:',
      convertedMaxTokensPerQuestion,
      typeof convertedMaxTokensPerQuestion
    );
    console.log(
      '  - openRouterTemperature:',
      convertedOpenRouterTemperature,
      typeof convertedOpenRouterTemperature
    );
    console.log(
      '  - openRouterMaxTokens:',
      convertedOpenRouterMaxTokens,
      typeof convertedOpenRouterMaxTokens
    );
  } catch (error) {
    console.error('❌ ОШИБКА при симуляции API запроса:', error.message);
    console.error('Детали ошибки:', error);
  }

  // 6. Проверка переменных окружения
  console.log('\n6️⃣ ПРОВЕРКА ПЕРЕМЕННЫХ ОКРУЖЕНИЯ');
  console.log('-'.repeat(50));

  console.log('DATABASE_URL определен:', !!process.env.DATABASE_URL);
  console.log('NODE_ENV:', process.env.NODE_ENV);
  console.log('NEXTAUTH_SECRET определен:', !!process.env.NEXTAUTH_SECRET);
  console.log('NEXTAUTH_URL:', process.env.NEXTAUTH_URL);

  // Закрываем соединение
  await prisma.$disconnect();
  console.log('\n✅ Диагностика завершена. Соединение с базой данных закрыто.');

  console.log('\n' + '='.repeat(80));
  console.log('🎯 РЕЗЮМЕ ДИАГНОСТИКИ');
  console.log('='.repeat(80));
  console.log('Если все проверки прошли успешно, проблема может быть в:');
  console.log('1. Middleware аутентификации (withAdminAuth)');
  console.log('2. Логах сервера Next.js (проверьте терминал с npm run dev)');
  console.log('3. Конфликте между ES и CommonJS модулями');
  console.log('4. Проблемах с сессией пользователя');
  console.log(
    '\nДля дальнейшей диагностики проверьте логи сервера в терминале.'
  );
}

// Запускаем диагностику
diagnoseInterviewAssistantSettings().catch((error) => {
  console.error('💥 КРИТИЧЕСКАЯ ОШИБКА при диагностике:', error);
  process.exit(1);
});
