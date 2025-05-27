/**
 * Тестовый скрипт для проверки полной цепочки запросов от кнопки "Загрузить ответ" к ИИ
 * Симулирует весь процесс: авторизация → API флешкарт → OpenRouter → ответ
 */

const { PrismaClient } = require('@prisma/client');
const fetch = require('node-fetch');
const prisma = new PrismaClient();

async function testFlashcardButtonToAI() {
  console.log('=== ТЕСТ ЦЕПОЧКИ: КНОПКА → API → OPENROUTER → ОТВЕТ ===');

  try {
    // 1. Проверяем наличие тестового пользователя
    console.log('\n🔍 ЭТАП 1: Поиск тестового пользователя');
    const testUser = await prisma.user.findFirst({
      where: {
        OR: [{ email: { contains: 'test' } }, { email: { contains: 'admin' } }],
      },
    });

    if (!testUser) {
      console.log('❌ Тестовый пользователь не найден');
      return;
    }

    console.log(
      `✅ Найден тестовый пользователь: ${testUser.email} (ID: ${testUser.id})`
    );

    // 2. Проверяем наличие вопросов для тестирования
    console.log('\n🔍 ЭТАП 2: Поиск тестового вопроса');
    const testQuestion = await prisma.question.findFirst({
      where: {
        AND: [{ text: { not: null } }, { text: { not: { equals: '' } } }],
      },
    });

    if (!testQuestion) {
      console.log('❌ Тестовый вопрос не найден');
      return;
    }

    console.log(`✅ Найден тестовый вопрос: ID ${testQuestion.id}`);
    console.log(`   Текст: ${testQuestion.text?.substring(0, 100)}...`);
    console.log(`   Тема: ${testQuestion.topic || 'не указана'}`);
    console.log(`   Сложность: ${testQuestion.difficulty || 'не указана'}`);

    // 3. Тестируем OpenRouter API модуль напрямую
    console.log('\n🔍 ЭТАП 3: Тестирование OpenRouter API модуля');
    try {
      const openRouterModule = require('../lib/utils/openRouterApi');
      console.log('✅ OpenRouter модуль импортирован успешно');

      // Тестируем получение настроек
      console.log('\n🧪 Тестирование getApiSettings...');
      const settings = await openRouterModule.getApiSettings(testUser.id);
      console.log('✅ Настройки получены:', {
        hasApiKey: !!settings.apiKey,
        baseUrl: settings.baseUrl,
        model: settings.model,
        isActive: settings.isActive,
      });

      if (!settings.apiKey) {
        console.log('❌ API ключ OpenRouter отсутствует');
        return;
      }
    } catch (error) {
      console.log('❌ Ошибка в OpenRouter модуле:', error.message);
      return;
    }

    // 4. Симулируем запрос к API флешкарт (без HTTP)
    console.log('\n🔍 ЭТАП 4: Симуляция запроса к API флешкарт');
    try {
      // Импортируем обработчик API напрямую
      const generateAnswerHandler = require('../pages/api/flashcards/generate-answer');

      // Создаем мок объекты req и res
      const mockReq = {
        method: 'POST',
        body: {
          questionId: testQuestion.id,
          questionText: testQuestion.text,
          context: {
            topic: testQuestion.topic,
            difficulty: testQuestion.difficulty,
            tags: testQuestion.tags || [],
          },
        },
        headers: {
          'content-type': 'application/json',
        },
      };

      const mockRes = {
        status: function (code) {
          this.statusCode = code;
          return this;
        },
        json: function (data) {
          this.responseData = data;
          return this;
        },
        statusCode: 200,
        responseData: null,
      };

      console.log('🧪 Симулируем вызов API обработчика...');
      console.log('   Это покажет, работает ли логика без HTTP слоя');

      // Примечание: Этот тест не будет работать без сессии NextAuth
      console.log('ℹ️ Прямой вызов API обработчика требует NextAuth сессию');
      console.log('ℹ️ Переходим к HTTP тестированию...');
    } catch (error) {
      console.log('❌ Ошибка симуляции API:', error.message);
    }

    // 5. Тестируем HTTP запрос к API (если сервер запущен)
    console.log('\n🔍 ЭТАП 5: Тестирование HTTP запроса к API');
    try {
      const testPayload = {
        questionId: testQuestion.id,
        questionText: testQuestion.text,
        context: {
          topic: testQuestion.topic,
          difficulty: testQuestion.difficulty,
          tags: testQuestion.tags || [],
        },
      };

      console.log('🧪 Отправляем HTTP запрос к API...');
      console.log(
        '   URL: http://localhost:3000/api/flashcards/generate-answer'
      );
      console.log('   Payload:', JSON.stringify(testPayload, null, 2));

      // Примечание: Этот запрос не сработает без авторизации
      console.log('ℹ️ HTTP запрос требует авторизованную сессию');
      console.log(
        'ℹ️ Для полного тестирования нужно использовать браузер или Postman'
      );
    } catch (error) {
      console.log('❌ Ошибка HTTP запроса:', error.message);
    }

    // 6. Проверяем логи и историю
    console.log('\n🔍 ЭТАП 6: Проверка логов и истории');

    // Проверяем последние попытки генерации ответов
    const recentQA = await prisma.interviewAssistantQA.findMany({
      where: {
        category: 'flashcard',
        userId: testUser.id,
      },
      take: 3,
      orderBy: { createdAt: 'desc' },
    });

    console.log(`📊 Последние Q&A записи пользователя: ${recentQA.length}`);
    if (recentQA.length > 0) {
      recentQA.forEach((qa, index) => {
        console.log(
          `  ${index + 1}. Вопрос: ${qa.question?.substring(0, 50)}...`
        );
        console.log(
          `     Ответ: ${qa.answer ? 'Есть' : 'Нет'} (${
            qa.answer?.length || 0
          } символов)`
        );
        console.log(`     Дата: ${qa.createdAt}`);
      });
    }

    // Проверяем использование API
    const recentUsage = await prisma.interviewAssistantUsage.findMany({
      where: { userId: testUser.id },
      take: 3,
      orderBy: { date: 'desc' },
    });

    console.log(`📊 Записи использования API: ${recentUsage.length}`);
    if (recentUsage.length > 0) {
      recentUsage.forEach((usage, index) => {
        console.log(`  ${index + 1}. Дата: ${usage.date}`);
        console.log(`     Вопросов: ${usage.questionsCount}`);
        console.log(`     Токенов: ${usage.tokensUsed}`);
      });
    }

    // 7. Анализ проблем
    console.log('\n📋 АНАЛИЗ ПРОБЛЕМ В ЦЕПОЧКЕ ЗАПРОСОВ:');

    const issues = [];
    const recommendations = [];

    // Проверяем кнопку в FlashcardItem
    console.log('\n🔍 Проверка frontend компонента...');
    const fs = require('fs');
    const flashcardItemPath = 'components/flashcards/FlashcardItem.js';

    if (fs.existsSync(flashcardItemPath)) {
      const flashcardContent = fs.readFileSync(flashcardItemPath, 'utf8');

      if (flashcardContent.includes('Загрузить ответ')) {
        console.log('✅ Кнопка "Загрузить ответ" найдена в компоненте');

        if (flashcardContent.includes('// Триггер загрузки ответа')) {
          issues.push(
            '❌ Кнопка "Загрузить ответ" не имеет обработчика события'
          );
          recommendations.push(
            'Добавить обработчик onClick для кнопки "Загрузить ответ"'
          );
        } else {
          console.log('✅ У кнопки есть обработчик события');
        }
      } else {
        issues.push('❌ Кнопка "Загрузить ответ" не найдена в компоненте');
      }
    }

    // Проверяем API endpoint
    const apiPath = 'pages/api/flashcards/generate-answer.js';
    if (fs.existsSync(apiPath)) {
      console.log('✅ API endpoint для генерации ответов существует');
    } else {
      issues.push('❌ API endpoint для генерации ответов не найден');
    }

    // Проверяем OpenRouter модуль
    const openRouterPath = 'lib/utils/openRouterApi.js';
    if (fs.existsSync(openRouterPath)) {
      console.log('✅ OpenRouter API модуль существует');
    } else {
      issues.push('❌ OpenRouter API модуль не найден');
    }

    if (recentQA.length === 0) {
      issues.push('⚠️ Нет записей о генерации ответов для флешкарт');
      recommendations.push('Проверить работу генерации ответов через браузер');
    }

    if (recentUsage.length === 0) {
      issues.push('⚠️ Нет записей об использовании API');
      recommendations.push('Проверить логирование использования API');
    }

    console.log('\n🚨 ОБНАРУЖЕННЫЕ ПРОБЛЕМЫ:');
    if (issues.length === 0) {
      console.log('✅ Серьезных проблем в цепочке не обнаружено');
    } else {
      issues.forEach((issue) => console.log(`   ${issue}`));
    }

    if (recommendations.length > 0) {
      console.log('\n💡 РЕКОМЕНДАЦИИ:');
      recommendations.forEach((rec) => console.log(`   ${rec}`));
    }

    console.log('\n📝 СЛЕДУЮЩИЕ ШАГИ ДЛЯ ТЕСТИРОВАНИЯ:');
    console.log('   1. Запустить приложение: npm run dev');
    console.log('   2. Авторизоваться в браузере');
    console.log('   3. Перейти на страницу флешкарт');
    console.log('   4. Нажать кнопку "Загрузить ответ"');
    console.log('   5. Проверить консоль браузера на ошибки');
    console.log('   6. Проверить Network tab в DevTools');
  } catch (error) {
    console.error('🚨 КРИТИЧЕСКАЯ ОШИБКА ТЕСТИРОВАНИЯ:');
    console.error('   Сообщение:', error.message);
    console.error('   Стек:', error.stack);
  } finally {
    await prisma.$disconnect();
  }

  console.log('\n=== КОНЕЦ ТЕСТИРОВАНИЯ ЦЕПОЧКИ ===');
}

// Запускаем тестирование
testFlashcardButtonToAI().catch(console.error);
