const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Диагностический скрипт для проблемы с кнопкой "Загрузить ответ" ИИ
 * Проверяет все возможные источники проблемы
 */
async function diagnoseFlashcardAnswerButton() {
  console.log('🔍 === ДИАГНОСТИКА ПРОБЛЕМЫ С КНОПКОЙ "ЗАГРУЗИТЬ ОТВЕТ" ===');
  console.log('');

  try {
    // 1. Проверяем базу данных и вопросы
    console.log('📊 1. ПРОВЕРКА БАЗЫ ДАННЫХ И ВОПРОСОВ');
    console.log('─'.repeat(50));

    const totalQuestions = await prisma.question.count();
    console.log(`📝 Общее количество вопросов: ${totalQuestions}`);

    const questionsWithText = await prisma.question.count({
      where: {
        AND: [{ text: { not: null } }, { text: { not: { equals: '' } } }],
      },
    });
    console.log(`✅ Вопросов с текстом: ${questionsWithText}`);

    const questionsWithAnswers = await prisma.question.count({
      where: {
        AND: [{ answer: { not: null } }, { answer: { not: { equals: '' } } }],
      },
    });
    console.log(`💬 Вопросов с готовыми ответами: ${questionsWithAnswers}`);

    if (questionsWithText > 0) {
      const sampleQuestion = await prisma.question.findFirst({
        where: {
          AND: [{ text: { not: null } }, { text: { not: { equals: '' } } }],
        },
        select: {
          id: true,
          text: true,
          answer: true,
          topic: true,
          difficulty: true,
        },
      });

      console.log(`🔍 Пример вопроса для тестирования:`);
      console.log(`   ID: ${sampleQuestion.id}`);
      console.log(`   Текст: ${sampleQuestion.text.substring(0, 100)}...`);
      console.log(`   Есть ответ: ${!!sampleQuestion.answer}`);
      console.log(`   Тема: ${sampleQuestion.topic || 'не указана'}`);
      console.log(`   Сложность: ${sampleQuestion.difficulty || 'не указана'}`);
    }
    console.log('');

    // 2. Проверяем настройки OpenRouter API
    console.log('🔧 2. ПРОВЕРКА НАСТРОЕК OPENROUTER API');
    console.log('─'.repeat(50));

    const globalSettings = await prisma.interviewAssistantSettings.findFirst({
      where: {
        isActive: true,
        apiType: 'openrouter',
      },
    });

    if (globalSettings) {
      console.log('✅ Глобальные настройки OpenRouter найдены:');
      console.log(`   API Type: ${globalSettings.apiType}`);
      console.log(`   Активны: ${globalSettings.isActive}`);
      console.log(`   Есть API ключ: ${!!globalSettings.openRouterApiKey}`);
      console.log(
        `   Модель: ${globalSettings.openRouterModel || 'не указана'}`
      );
      console.log(
        `   Base URL: ${globalSettings.openRouterBaseUrl || 'не указан'}`
      );
      console.log(
        `   Макс. токенов: ${
          globalSettings.openRouterMaxTokens || 'не указано'
        }`
      );
      console.log(
        `   Макс. вопросов в день: ${
          globalSettings.maxQuestionsPerDay || 'не указано'
        }`
      );
    } else {
      console.log(
        '❌ Глобальные настройки OpenRouter НЕ НАЙДЕНЫ или неактивны'
      );
      console.log('   Это может быть основной причиной проблемы!');
    }
    console.log('');

    // 3. Проверяем пользовательские настройки API
    console.log('👤 3. ПРОВЕРКА ПОЛЬЗОВАТЕЛЬСКИХ НАСТРОЕК API');
    console.log('─'.repeat(50));

    const userApiSettings = await prisma.userApiSettings.findMany({
      where: {
        useCustomApi: true,
        apiType: 'openrouter',
      },
      take: 5,
    });

    console.log(
      `📊 Пользователей с настройками OpenRouter: ${userApiSettings.length}`
    );

    if (userApiSettings.length > 0) {
      userApiSettings.forEach((setting, index) => {
        console.log(`   ${index + 1}. Пользователь ${setting.userId}:`);
        console.log(`      Использует кастомный API: ${setting.useCustomApi}`);
        console.log(`      Есть API ключ: ${!!setting.openRouterApiKey}`);
        console.log(`      Модель: ${setting.openRouterModel || 'не указана'}`);
      });
    } else {
      console.log(
        'ℹ️  Пользователи с кастомными настройками OpenRouter не найдены'
      );
    }
    console.log('');

    // 4. Проверяем использование API за сегодня
    console.log('📈 4. ПРОВЕРКА ИСПОЛЬЗОВАНИЯ API ЗА СЕГОДНЯ');
    console.log('─'.repeat(50));

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

    const todayUsage = await prisma.interviewAssistantUsage.findMany({
      where: {
        date: {
          gte: today,
          lt: tomorrow,
        },
      },
      orderBy: {
        questionsCount: 'desc',
      },
      take: 5,
    });

    console.log(`📊 Записей использования за сегодня: ${todayUsage.length}`);

    if (todayUsage.length > 0) {
      console.log('🔝 Топ пользователей по использованию:');
      todayUsage.forEach((usage, index) => {
        console.log(`   ${index + 1}. Пользователь ${usage.userId}:`);
        console.log(`      Вопросов: ${usage.questionsCount}`);
        console.log(`      Токенов: ${usage.tokensUsed}`);
        console.log(`      Стоимость: $${usage.apiCost}`);
      });
    } else {
      console.log('ℹ️  Использование API за сегодня не зафиксировано');
    }
    console.log('');

    // 5. Проверяем кэш ответов
    console.log('💾 5. ПРОВЕРКА КЭША ОТВЕТОВ');
    console.log('─'.repeat(50));

    const totalCacheEntries = await prisma.interviewAssistantCache.count();
    console.log(`📊 Общее количество записей в кэше: ${totalCacheEntries}`);

    const validCacheEntries = await prisma.interviewAssistantCache.count({
      where: {
        expiresAt: {
          gt: new Date(),
        },
      },
    });
    console.log(`✅ Действительных записей в кэше: ${validCacheEntries}`);

    const expiredCacheEntries = totalCacheEntries - validCacheEntries;
    console.log(`⏰ Истекших записей в кэше: ${expiredCacheEntries}`);

    if (validCacheEntries > 0) {
      const recentCache = await prisma.interviewAssistantCache.findMany({
        where: {
          expiresAt: {
            gt: new Date(),
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 3,
      });

      console.log('🔍 Последние записи в кэше:');
      recentCache.forEach((cache, index) => {
        console.log(
          `   ${index + 1}. Создан: ${cache.createdAt.toLocaleString()}`
        );
        console.log(`      Истекает: ${cache.expiresAt.toLocaleString()}`);
        console.log(
          `      Длина ответа: ${cache.answer?.length || 0} символов`
        );
      });
    }
    console.log('');

    // 6. Проверяем переменные окружения
    console.log('🌍 6. ПРОВЕРКА ПЕРЕМЕННЫХ ОКРУЖЕНИЯ');
    console.log('─'.repeat(50));

    const envVars = {
      API_KEY_SECRET: !!process.env.API_KEY_SECRET,
      DATABASE_URL: !!process.env.DATABASE_URL,
      NEXTAUTH_SECRET: !!process.env.NEXTAUTH_SECRET,
      NEXTAUTH_URL: !!process.env.NEXTAUTH_URL,
      NODE_ENV: process.env.NODE_ENV,
    };

    Object.entries(envVars).forEach(([key, value]) => {
      const status = typeof value === 'boolean' ? (value ? '✅' : '❌') : '✅';
      const displayValue =
        typeof value === 'boolean'
          ? value
            ? 'установлена'
            : 'НЕ УСТАНОВЛЕНА'
          : value;
      console.log(`   ${status} ${key}: ${displayValue}`);
    });
    console.log('');

    // 7. Проверяем историю вопросов-ответов
    console.log('📚 7. ПРОВЕРКА ИСТОРИИ ВОПРОСОВ-ОТВЕТОВ');
    console.log('─'.repeat(50));

    const totalQA = await prisma.interviewAssistantQA.count();
    console.log(`📊 Общее количество записей Q&A: ${totalQA}`);

    const flashcardQA = await prisma.interviewAssistantQA.count({
      where: {
        category: 'flashcard',
      },
    });
    console.log(`🎯 Записей Q&A для флешкарт: ${flashcardQA}`);

    if (flashcardQA > 0) {
      const recentFlashcardQA = await prisma.interviewAssistantQA.findMany({
        where: {
          category: 'flashcard',
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 3,
        select: {
          userId: true,
          question: true,
          answer: true,
          createdAt: true,
        },
      });

      console.log('🔍 Последние записи Q&A для флешкарт:');
      recentFlashcardQA.forEach((qa, index) => {
        console.log(`   ${index + 1}. Пользователь: ${qa.userId}`);
        console.log(`      Создан: ${qa.createdAt.toLocaleString()}`);
        console.log(`      Вопрос: ${qa.question.substring(0, 50)}...`);
        console.log(`      Есть ответ: ${!!qa.answer}`);
        console.log(`      Длина ответа: ${qa.answer?.length || 0} символов`);
      });
    }
    console.log('');

    // 8. ИТОГОВАЯ ДИАГНОСТИКА
    console.log('🎯 8. ИТОГОВАЯ ДИАГНОСТИКА И РЕКОМЕНДАЦИИ');
    console.log('─'.repeat(50));

    const issues = [];
    const recommendations = [];

    if (totalQuestions === 0) {
      issues.push('❌ В базе данных нет вопросов');
      recommendations.push('Добавить вопросы в базу данных');
    }

    if (questionsWithText === 0) {
      issues.push('❌ Нет вопросов с текстом');
      recommendations.push('Проверить качество данных в таблице questions');
    }

    if (!globalSettings) {
      issues.push('❌ Отсутствуют глобальные настройки OpenRouter API');
      recommendations.push('Настроить OpenRouter API в админ-панели');
    }

    if (globalSettings && !globalSettings.openRouterApiKey) {
      issues.push('❌ Отсутствует API ключ OpenRouter');
      recommendations.push('Добавить действительный API ключ OpenRouter');
    }

    if (!process.env.API_KEY_SECRET) {
      issues.push('❌ Отсутствует переменная окружения API_KEY_SECRET');
      recommendations.push('Установить переменную окружения API_KEY_SECRET');
    }

    if (flashcardQA === 0 && totalQA > 0) {
      issues.push(
        '⚠️  Нет записей Q&A для флешкарт, но есть для других категорий'
      );
      recommendations.push('Проверить логику сохранения ответов для флешкарт');
    }

    if (issues.length === 0) {
      console.log('✅ КРИТИЧЕСКИХ ПРОБЛЕМ НЕ ОБНАРУЖЕНО');
      console.log('');
      console.log('🔍 Возможные причины проблемы:');
      console.log('   1. Проблемы с сетевым подключением к OpenRouter API');
      console.log('   2. Превышение лимитов API');
      console.log('   3. Проблемы с фронтенд-логикой обработки ответов');
      console.log('   4. Проблемы с авторизацией пользователя');
      console.log('');
      console.log('🛠️  Рекомендации для дальнейшей диагностики:');
      console.log('   1. Проверить логи браузера на наличие ошибок JavaScript');
      console.log('   2. Проверить Network tab в DevTools при нажатии кнопки');
      console.log('   3. Добавить дополнительное логирование в API endpoints');
      console.log('   4. Протестировать API напрямую через curl или Postman');
    } else {
      console.log('🚨 ОБНАРУЖЕНЫ КРИТИЧЕСКИЕ ПРОБЛЕМЫ:');
      issues.forEach((issue) => console.log(`   ${issue}`));
      console.log('');
      console.log('🛠️  РЕКОМЕНДАЦИИ ПО ИСПРАВЛЕНИЮ:');
      recommendations.forEach((rec) => console.log(`   ✅ ${rec}`));
    }

    console.log('');
    console.log('🔍 === КОНЕЦ ДИАГНОСТИКИ ===');
  } catch (error) {
    console.error('🚨 КРИТИЧЕСКАЯ ОШИБКА ПРИ ДИАГНОСТИКЕ:');
    console.error('   Сообщение:', error.message);
    console.error('   Стек:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

// Запускаем диагностику
diagnoseFlashcardAnswerButton();
