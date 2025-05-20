/**
 * Тестовый скрипт для проверки работы OpenRouter API с моделью google/gemma-3-12b-it:free
 *
 * Этот скрипт отправляет тестовый запрос к OpenRouter API и выводит результат в консоль.
 * Он использует функции из модуля openRouterApi.js для взаимодействия с API.
 *
 * Запуск: node scripts/test-openrouter-api.js
 */

// Импортируем необходимые модули
const openRouterApi = require('../lib/utils/openRouterApi');
const { withPrisma } = require('../lib/prismaCommonJS');

// Добавляем логирование для отладки
console.log('Импортированные модули:', {
  openRouterApi: typeof openRouterApi,
  withPrisma: typeof withPrisma,
});

/**
 * Основная функция для тестирования OpenRouter API
 */
async function testOpenRouterApi() {
  console.log('=== Начало тестирования OpenRouter API ===');
  console.log('Модель: google/gemma-3-12b-it:free');

  try {
    // Тест 1: Получение настроек API
    console.log('\n--- Тест 1: Получение настроек API ---');
    const settings = await openRouterApi.getApiSettings();
    console.log('Настройки API:', {
      baseUrl: settings.baseUrl,
      model: settings.model,
      temperature: settings.temperature,
      maxTokensPerQuestion: settings.maxTokensPerQuestion,
      isActive: settings.isActive,
    });

    // Проверяем, что API активен
    if (!settings.isActive) {
      throw new Error('API неактивен. Проверьте настройки в базе данных.');
    }

    // Проверяем, что модель соответствует ожидаемой
    console.log(`Используемая модель: ${settings.model}`);
    if (settings.model !== 'google/gemma-3-12b-it:free') {
      console.warn(
        'Предупреждение: Используемая модель отличается от ожидаемой (google/gemma-3-12b-it:free)'
      );
    }

    // Тест 2: Отправка тестового запроса к API
    console.log('\n--- Тест 2: Отправка тестового запроса к API ---');

    // Создаем тестовый вопрос
    const testQuestion = 'Что такое React и какие его основные преимущества?';
    console.log(`Тестовый вопрос: "${testQuestion}"`);

    // Создаем тестового пользователя
    const testUserId = `test-user-${Date.now()}`;

    // Отправляем запрос к API
    console.log('Отправка запроса к OpenRouter API...');
    const result = await openRouterApi.getAnswer(
      testQuestion,
      testUserId,
      'frontend', // категория
      'TestCompany', // название компании
      new Date(), // дата собеседования
      true // принудительное обновление кэша
    );

    // Выводим результат
    console.log('\n--- Результат запроса ---');
    console.log('Статус: Успешно');
    console.log(`Ответ из кэша: ${result.fromCache ? 'Да' : 'Нет'}`);
    console.log(`Использовано токенов: ${result.tokensUsed}`);
    console.log(`Стоимость запроса: ${result.apiCost}`);
    console.log('\nОтвет API:');
    console.log('----------------------------');
    console.log(result.answer);
    console.log('----------------------------');

    // Тест 3: Проверка кэширования
    console.log('\n--- Тест 3: Проверка кэширования ---');
    console.log(
      'Повторная отправка того же запроса (должен использоваться кэш)...'
    );

    const cachedResult = await openRouterApi.getAnswer(
      testQuestion,
      testUserId,
      'frontend',
      'TestCompany',
      new Date(),
      false // не обновляем кэш
    );

    console.log(`Ответ из кэша: ${cachedResult.fromCache ? 'Да' : 'Нет'}`);
    console.log(`Использовано токенов: ${cachedResult.tokensUsed}`);

    if (cachedResult.fromCache) {
      console.log('Кэширование работает корректно');
    } else {
      console.warn('Предупреждение: Ответ не был получен из кэша');
    }

    // Очистка тестовых данных
    console.log('\n--- Очистка тестовых данных ---');
    await withPrisma(async (prismaClient) => {
      // Удаляем записи об использовании API
      await prismaClient.interviewAssistantUsage.deleteMany({
        where: {
          userId: testUserId,
        },
      });

      // Удаляем записи вопросов-ответов
      await prismaClient.interviewAssistantQA.deleteMany({
        where: {
          userId: testUserId,
        },
      });

      console.log('Тестовые данные удалены');
    });

    console.log('\n=== Тестирование OpenRouter API завершено успешно ===');
  } catch (error) {
    console.error('Ошибка при тестировании OpenRouter API:', error);
    console.error('Детали ошибки:', {
      message: error.message,
      stack: error.stack,
    });
  } finally {
    // Закрываем соединение с базой данных
    console.log('Закрытие соединения с базой данных...');
    try {
      await withPrisma(async () => {
        console.log('Соединение закрыто');
      });
    } catch (error) {
      console.error('Ошибка при закрытии соединения:', error);
    }
  }
}

// Запускаем тестирование
testOpenRouterApi()
  .then(() => {
    console.log('Тестирование завершено');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Ошибка при выполнении тестирования:', error);
    process.exit(1);
  });
