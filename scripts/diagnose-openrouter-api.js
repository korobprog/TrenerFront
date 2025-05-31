/**
 * Диагностический скрипт для проверки OpenRouter API и цепочки запросов
 * Проверяет настройки, API ключи, и тестирует полный цикл запросов
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function diagnoseOpenRouterAPI() {
  console.log('=== ДИАГНОСТИКА OPENROUTER API ===');

  try {
    // 1. Проверяем глобальные настройки OpenRouter
    console.log('\n🔍 ТЕСТ 1: Проверка глобальных настроек OpenRouter');
    const globalSettings = await prisma.interviewAssistantSettings.findMany({
      where: { apiType: 'openrouter' },
    });

    console.log(
      `📊 Найдено глобальных настроек OpenRouter: ${globalSettings.length}`
    );

    if (globalSettings.length > 0) {
      globalSettings.forEach((setting, index) => {
        console.log(`  ${index + 1}. ID: ${setting.id}`);
        console.log(`     Активна: ${setting.isActive}`);
        console.log(`     API тип: ${setting.apiType}`);
        console.log(`     Есть API ключ: ${!!setting.openRouterApiKey}`);
        console.log(
          `     Base URL: ${setting.openRouterBaseUrl || 'не указан'}`
        );
        console.log(`     Модель: ${setting.openRouterModel || 'не указана'}`);
        console.log(
          `     Температура: ${setting.openRouterTemperature || 'не указана'}`
        );
        console.log(
          `     Макс токенов: ${setting.openRouterMaxTokens || 'не указано'}`
        );
        console.log(
          `     Макс вопросов в день: ${
            setting.maxQuestionsPerDay || 'не указано'
          }`
        );
      });
    } else {
      console.log('❌ Глобальные настройки OpenRouter не найдены');
    }

    // 2. Проверяем активные настройки OpenRouter
    console.log('\n🔍 ТЕСТ 2: Проверка активных настроек OpenRouter');
    const activeSettings = await prisma.interviewAssistantSettings.findFirst({
      where: {
        isActive: true,
        apiType: 'openrouter',
      },
    });

    if (activeSettings) {
      console.log('✅ Найдены активные настройки OpenRouter:');
      console.log(`   ID: ${activeSettings.id}`);
      console.log(`   Есть API ключ: ${!!activeSettings.openRouterApiKey}`);
      console.log(`   Base URL: ${activeSettings.openRouterBaseUrl}`);
      console.log(`   Модель: ${activeSettings.openRouterModel}`);
      console.log(`   Температура: ${activeSettings.openRouterTemperature}`);
      console.log(`   Макс токенов: ${activeSettings.openRouterMaxTokens}`);
      console.log(
        `   Макс вопросов в день: ${activeSettings.maxQuestionsPerDay}`
      );
    } else {
      console.log('❌ Активные настройки OpenRouter не найдены');
    }

    // 3. Проверяем пользовательские настройки OpenRouter
    console.log('\n🔍 ТЕСТ 3: Проверка пользовательских настроек OpenRouter');
    const userSettings = await prisma.userApiSettings.findMany({
      where: {
        apiType: 'openrouter',
        useCustomApi: true,
      },
    });

    console.log(
      `📊 Найдено пользовательских настроек OpenRouter: ${userSettings.length}`
    );

    if (userSettings.length > 0) {
      userSettings.forEach((setting, index) => {
        console.log(`  ${index + 1}. Пользователь ID: ${setting.userId}`);
        console.log(`     Использует кастомный API: ${setting.useCustomApi}`);
        console.log(`     API тип: ${setting.apiType}`);
        console.log(`     Есть API ключ: ${!!setting.openRouterApiKey}`);
        console.log(
          `     Base URL: ${setting.openRouterBaseUrl || 'не указан'}`
        );
        console.log(`     Модель: ${setting.openRouterModel || 'не указана'}`);
      });
    } else {
      console.log('ℹ️ Пользовательские настройки OpenRouter не найдены');
    }

    // 4. Проверяем кэш ответов
    console.log('\n🔍 ТЕСТ 4: Проверка кэша ответов');
    const cacheCount = await prisma.interviewAssistantCache.count();
    console.log(`📊 Записей в кэше: ${cacheCount}`);

    if (cacheCount > 0) {
      const recentCache = await prisma.interviewAssistantCache.findMany({
        take: 3,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          question: true,
          answer: true,
          createdAt: true,
          expiresAt: true,
        },
      });

      console.log('📝 Последние записи кэша:');
      recentCache.forEach((cache, index) => {
        console.log(`  ${index + 1}. ID: ${cache.id}`);
        console.log(`     Хэш вопроса: ${cache.question}`);
        console.log(`     Длина ответа: ${cache.answer?.length || 0} символов`);
        console.log(`     Создан: ${cache.createdAt}`);
        console.log(`     Истекает: ${cache.expiresAt}`);
      });
    }

    // 5. Проверяем статистику использования API
    console.log('\n🔍 ТЕСТ 5: Проверка статистики использования API');
    const usageCount = await prisma.interviewAssistantUsage.count();
    console.log(`📊 Записей использования API: ${usageCount}`);

    if (usageCount > 0) {
      const recentUsage = await prisma.interviewAssistantUsage.findMany({
        take: 5,
        orderBy: { date: 'desc' },
        select: {
          id: true,
          userId: true,
          date: true,
          questionsCount: true,
          tokensUsed: true,
          apiCost: true,
        },
      });

      console.log('📈 Последние записи использования:');
      recentUsage.forEach((usage, index) => {
        console.log(`  ${index + 1}. Пользователь: ${usage.userId}`);
        console.log(`     Дата: ${usage.date}`);
        console.log(`     Вопросов: ${usage.questionsCount}`);
        console.log(`     Токенов: ${usage.tokensUsed}`);
        console.log(`     Стоимость: ${usage.apiCost}`);
      });
    }

    // 6. Проверяем записи Q&A для флешкарт
    console.log('\n🔍 ТЕСТ 6: Проверка записей Q&A для флешкарт');
    const flashcardQA = await prisma.interviewAssistantQA.count({
      where: { category: 'flashcard' },
    });
    console.log(`📊 Записей Q&A для флешкарт: ${flashcardQA}`);

    if (flashcardQA > 0) {
      const recentFlashcardQA = await prisma.interviewAssistantQA.findMany({
        where: { category: 'flashcard' },
        take: 3,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          userId: true,
          question: true,
          answer: true,
          createdAt: true,
        },
      });

      console.log('📝 Последние записи Q&A для флешкарт:');
      recentFlashcardQA.forEach((qa, index) => {
        console.log(`  ${index + 1}. Пользователь: ${qa.userId}`);
        console.log(`     Вопрос: ${qa.question?.substring(0, 50)}...`);
        console.log(`     Ответ: ${qa.answer?.substring(0, 50)}...`);
        console.log(`     Создан: ${qa.createdAt}`);
      });
    }

    // 7. Проверяем переменные окружения
    console.log('\n🔍 ТЕСТ 7: Проверка переменных окружения');
    console.log(`API_KEY_SECRET установлен: ${!!process.env.API_KEY_SECRET}`);
    console.log(`NODE_ENV: ${process.env.NODE_ENV || 'не установлен'}`);

    // 8. Тестируем импорт OpenRouter API модуля
    console.log('\n🔍 ТЕСТ 8: Тестирование импорта OpenRouter API модуля');
    try {
      const openRouterModule = require('../lib/utils/openRouterApi');
      console.log('✅ OpenRouter API модуль успешно импортирован');
      console.log('📋 Доступные функции:', Object.keys(openRouterModule));

      // Тестируем функцию getApiSettings
      if (activeSettings) {
        console.log('\n🧪 Тестирование getApiSettings...');
        try {
          const settings = await openRouterModule.getApiSettings();
          console.log('✅ getApiSettings работает');
          console.log('📊 Настройки:', {
            hasApiKey: !!settings.apiKey,
            baseUrl: settings.baseUrl,
            model: settings.model,
            temperature: settings.temperature,
            maxTokensPerQuestion: settings.maxTokensPerQuestion,
            maxQuestionsPerDay: settings.maxQuestionsPerDay,
            isActive: settings.isActive,
          });
        } catch (error) {
          console.log('❌ Ошибка в getApiSettings:', error.message);
        }
      }
    } catch (error) {
      console.log('❌ Ошибка импорта OpenRouter API модуля:', error.message);
    }

    // 9. Анализ и рекомендации
    console.log('\n📋 АНАЛИЗ И РЕКОМЕНДАЦИИ:');

    const issues = [];
    const recommendations = [];

    if (!activeSettings) {
      issues.push('❌ Нет активных настроек OpenRouter API');
      recommendations.push(
        'Создать активные настройки OpenRouter в админ панели'
      );
    }

    if (activeSettings && !activeSettings.openRouterApiKey) {
      issues.push('❌ Отсутствует API ключ OpenRouter в настройках');
      recommendations.push('Добавить валидный API ключ OpenRouter в настройки');
    }

    if (cacheCount === 0) {
      issues.push('⚠️ Кэш ответов пуст');
      recommendations.push('Проверить работу кэширования ответов');
    }

    if (usageCount === 0) {
      issues.push('⚠️ Нет записей об использовании API');
      recommendations.push('Проверить логирование использования API');
    }

    if (flashcardQA === 0) {
      issues.push('⚠️ Нет записей Q&A для флешкарт');
      recommendations.push('Проверить сохранение ответов для флешкарт');
    }

    if (issues.length === 0) {
      console.log('✅ Серьезных проблем не обнаружено');
    } else {
      console.log('🚨 Обнаруженные проблемы:');
      issues.forEach((issue) => console.log(`   ${issue}`));
    }

    if (recommendations.length > 0) {
      console.log('\n💡 Рекомендации:');
      recommendations.forEach((rec) => console.log(`   ${rec}`));
    }
  } catch (error) {
    console.error('🚨 КРИТИЧЕСКАЯ ОШИБКА ДИАГНОСТИКИ:');
    console.error('   Сообщение:', error.message);
    console.error('   Стек:', error.stack);
  } finally {
    await prisma.$disconnect();
  }

  console.log('\n=== КОНЕЦ ДИАГНОСТИКИ OPENROUTER API ===');
}

// Запускаем диагностику
diagnoseOpenRouterAPI().catch(console.error);
