const langdockApi = require('../lib/utils/langdockApi');
const dotenv = require('dotenv');

// Загружаем переменные окружения из .env.development
dotenv.config({ path: '.env.development' });

/**
 * Тестовый скрипт для комплексной проверки интеграции LangDock API
 * Проверяет полный цикл работы с API: получение настроек, форматирование сообщений,
 * отправку запроса и парсинг ответа
 */
async function testLangDockIntegration() {
  console.log(
    '=== Начало комплексного тестирования интеграции LangDock API ==='
  );

  try {
    // Тест 1: Получение настроек API
    console.log('\n--- Тест 1: Получение настроек API ---');
    const settings = await langdockApi.getApiSettings();
    console.log('Настройки API:', {
      apiType: settings.apiType,
      baseUrl: settings.baseUrl,
      langdockRegion: settings.langdockRegion,
      model: settings.model,
      hasApiKey: !!settings.apiKey,
    });

    // Проверка наличия необходимых настроек
    if (!settings.apiKey) {
      console.error('API ключ отсутствует в настройках');
      return;
    }

    if (!settings.baseUrl) {
      console.error('Базовый URL отсутствует в настройках');
      return;
    }

    // Тест 2: Форматирование сообщений
    console.log('\n--- Тест 2: Форматирование сообщений ---');
    const question = 'Что такое React и какие его основные преимущества?';
    const company = 'Тестовая Компания';
    const interviewDate = new Date();

    const messages = langdockApi.formatMessages(
      question,
      company,
      interviewDate
    );
    console.log(
      'Форматированные сообщения:',
      JSON.stringify(messages, null, 2)
    );

    // Проверка корректности форматирования сообщений
    if (!Array.isArray(messages)) {
      console.error('Сообщения должны быть массивом');
      return;
    }

    if (messages.length < 2) {
      console.error(
        'Сообщения должны содержать как минимум системное сообщение и сообщение пользователя'
      );
      return;
    }

    if (messages[0].role !== 'system') {
      console.error('Первое сообщение должно быть системным');
      return;
    }

    if (messages[messages.length - 1].role !== 'user') {
      console.error('Последнее сообщение должно быть от пользователя');
      return;
    }

    // Тест 3: Отправка запроса к API и парсинг ответа
    console.log('\n--- Тест 3: Отправка запроса к API и парсинг ответа ---');
    console.log('Отправка запроса к LangDock API (Anthropic):', {
      baseUrl: settings.baseUrl,
      model: settings.model,
      messagesCount: messages.length,
    });

    try {
      // Отправляем запрос к API
      const response = await fetch(settings.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${settings.apiKey}`,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: settings.model,
          messages: messages,
          max_tokens: settings.maxTokensPerQuestion || 4000,
          temperature: 0.7,
        }),
      });

      // Проверяем статус ответа
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Ошибка при запросе к LangDock API (Anthropic):', {
          status: response.status,
          statusText: response.statusText,
          errorText: errorText,
        });
        return;
      }

      // Получаем ответ
      const responseData = await response.json();
      console.log('Получен ответ от LangDock API (Anthropic):', {
        id: responseData.id,
        model: responseData.model,
        contentType: Array.isArray(responseData.content)
          ? 'array'
          : typeof responseData.content,
        contentLength: Array.isArray(responseData.content)
          ? responseData.content.length
          : typeof responseData.content === 'string'
          ? responseData.content.length
          : 'unknown',
        hasUsage: !!responseData.usage,
      });

      // Парсим ответ
      const parsedResponse = langdockApi.parseResponse(responseData);
      console.log('Распарсенный ответ:', {
        answerLength: parsedResponse.answer.length,
        answerPreview: parsedResponse.answer.substring(0, 100) + '...',
        tokensUsed: parsedResponse.tokensUsed,
        inputTokens: parsedResponse.inputTokens,
        outputTokens: parsedResponse.outputTokens,
        apiCost: parsedResponse.apiCost,
      });

      // Тест 4: Полный цикл получения ответа через getAnswer
      console.log(
        '\n--- Тест 4: Полный цикл получения ответа через getAnswer ---'
      );
      const fullResult = await langdockApi.getAnswer(
        'Какие основные хуки в React и для чего они используются?',
        'test-user-id',
        'react',
        'Тестовая Компания',
        new Date()
      );

      console.log('Результат полного цикла getAnswer:', {
        answerLength: fullResult.answer.length,
        answerPreview: fullResult.answer.substring(0, 100) + '...',
        fromCache: fullResult.fromCache,
        tokensUsed: fullResult.tokensUsed,
        apiCost: fullResult.apiCost,
      });

      console.log(
        '\n=== Комплексное тестирование интеграции LangDock API завершено успешно ==='
      );
    } catch (error) {
      console.error('Ошибка при отправке запроса к API:', error);
      console.error('Детали ошибки:', {
        message: error.message,
        stack: error.stack,
      });
    }
  } catch (error) {
    console.error(
      'Ошибка при комплексном тестировании интеграции LangDock API:',
      error
    );
    console.error('Детали ошибки:', {
      message: error.message,
      stack: error.stack,
    });
  }
}

// Запускаем тестирование
testLangDockIntegration()
  .then(() => {
    console.log('Тестирование завершено');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Ошибка при выполнении тестирования:', error);
    process.exit(1);
  });
