const langdockApi = require('../lib/utils/langdockApi');
const prismaModule = require('../lib/prismaCommonJS');
const prisma = prismaModule.default;
const { withPrisma } = prismaModule;

// Добавляем логирование для отладки
console.log('Импортированные модули:', {
  langdockApi: typeof langdockApi,
  prismaModule: typeof prismaModule,
  prisma: typeof prisma,
  withPrisma: typeof withPrisma,
});

/**
 * Тестовый скрипт для проверки функции getApiSettings в langdockApi.js
 * Проверяет корректность формирования базового URL на основе региона
 */
async function testGetApiSettings() {
  console.log('=== Начало тестирования getApiSettings ===');

  try {
    // Создаем тестовые глобальные настройки API для тестирования
    console.log(
      '\n--- Подготовка: Создание тестовых глобальных настроек API ---'
    );
    await withPrisma(async (prismaClient) => {
      // Проверяем, существуют ли уже настройки
      const existingSettings =
        await prismaClient.interviewAssistantSettings.findFirst({
          where: { apiType: 'langdock', isActive: true },
        });

      console.log(
        'Существующие настройки:',
        existingSettings ? 'Найдены' : 'Не найдены'
      );

      if (!existingSettings) {
        // Создаем тестовые настройки
        await prismaClient.interviewAssistantSettings.create({
          data: {
            apiKey: 'test-global-api-key',
            apiType: 'langdock',
            isActive: true,
            langdockAssistantId: 'test-assistant-id',
            langdockRegion: 'eu',
            langdockBaseUrl: '',
          },
        });
        console.log('Созданы тестовые глобальные настройки API');
      }
    });

    // Тест 1: Получение глобальных настроек API
    console.log('\n--- Тест 1: Получение глобальных настроек API ---');
    const globalSettings = await langdockApi.getApiSettings();
    console.log('Глобальные настройки API:', {
      apiType: globalSettings.apiType,
      baseUrl: globalSettings.baseUrl,
      langdockRegion: globalSettings.langdockRegion,
      model: globalSettings.model,
    });

    // Проверка корректности формирования базового URL
    if (globalSettings.baseUrl) {
      console.log('Базовый URL сформирован корректно:', globalSettings.baseUrl);

      // Проверка соответствия URL региону
      const expectedUrlPattern = `https://api.langdock.com/anthropic/${
        globalSettings.langdockRegion || 'eu'
      }`;
      if (globalSettings.baseUrl.includes(expectedUrlPattern)) {
        console.log('URL соответствует региону:', {
          region: globalSettings.langdockRegion || 'eu',
          expectedUrlPattern,
          actualUrl: globalSettings.baseUrl,
        });
      } else {
        console.warn('URL не соответствует ожидаемому шаблону:', {
          region: globalSettings.langdockRegion || 'eu',
          expectedUrlPattern,
          actualUrl: globalSettings.baseUrl,
        });
      }
    } else {
      console.error('Базовый URL не сформирован');
    }

    // Тест 2: Создание тестового пользователя с настройками API
    console.log(
      '\n--- Тест 2: Создание тестового пользователя с настройками API ---'
    );

    // Генерируем уникальный ID для тестового пользователя
    const testUserId = `test-user-${Date.now()}`;

    // Создаем тестовые настройки API для пользователя
    await withPrisma(async (prismaClient) => {
      await prismaClient.userApiSettings.create({
        data: {
          userId: testUserId,
          useCustomApi: true,
          apiType: 'langdock',
          langdockApiKey: 'test-api-key-encrypted', // В реальном сценарии должен быть зашифрован
          langdockRegion: 'us', // Указываем регион US для теста
          langdockBaseUrl: '', // Оставляем пустым, чтобы проверить автоматическое формирование
        },
      });
      console.log(
        'Создан тестовый пользователь с настройками API через withPrisma'
      );
    });

    console.log('Создан тестовый пользователь с настройками API:', {
      userId: testUserId,
      apiType: 'langdock',
      langdockRegion: 'us',
    });

    // Тест 3: Получение пользовательских настроек API
    console.log('\n--- Тест 3: Получение пользовательских настроек API ---');
    const userSettings = await langdockApi.getApiSettings(testUserId);
    console.log('Пользовательские настройки API:', {
      apiType: userSettings.apiType,
      baseUrl: userSettings.baseUrl,
      langdockRegion: userSettings.langdockRegion,
      model: userSettings.model,
    });

    // Проверка корректности формирования базового URL для пользователя
    if (userSettings.baseUrl) {
      console.log(
        'Базовый URL для пользователя сформирован корректно:',
        userSettings.baseUrl
      );

      // Проверка соответствия URL региону пользователя
      const expectedUserUrlPattern = `https://api.langdock.com/anthropic/us`;
      if (userSettings.baseUrl.includes(expectedUserUrlPattern)) {
        console.log('URL соответствует региону пользователя:', {
          region: 'us',
          expectedUrlPattern: expectedUserUrlPattern,
          actualUrl: userSettings.baseUrl,
        });
      } else {
        console.warn(
          'URL не соответствует ожидаемому шаблону для пользователя:',
          {
            region: 'us',
            expectedUrlPattern: expectedUserUrlPattern,
            actualUrl: userSettings.baseUrl,
          }
        );
      }
    } else {
      console.error('Базовый URL для пользователя не сформирован');
    }

    // Тест 4: Создание тестового пользователя с явно указанным базовым URL
    console.log(
      '\n--- Тест 4: Создание тестового пользователя с явно указанным базовым URL ---'
    );

    // Генерируем уникальный ID для второго тестового пользователя
    const testUserId2 = `test-user-${Date.now() + 1}`;

    // Создаем тестовые настройки API для пользователя с явно указанным URL
    await withPrisma(async (prismaClient) => {
      await prismaClient.userApiSettings.create({
        data: {
          userId: testUserId2,
          useCustomApi: true,
          apiType: 'langdock',
          langdockApiKey: 'test-api-key-encrypted-2', // В реальном сценарии должен быть зашифрован
          langdockRegion: 'eu', // Указываем регион EU
          langdockBaseUrl: 'https://custom.api.langdock.com/v1', // Указываем кастомный URL
        },
      });
      console.log(
        'Создан тестовый пользователь с явно указанным URL через withPrisma'
      );
    });

    console.log('Создан тестовый пользователь с явно указанным URL:', {
      userId: testUserId2,
      apiType: 'langdock',
      langdockRegion: 'eu',
      langdockBaseUrl: 'https://custom.api.langdock.com/v1',
    });

    // Тест 5: Получение пользовательских настроек API с явно указанным URL
    console.log(
      '\n--- Тест 5: Получение пользовательских настроек API с явно указанным URL ---'
    );
    const userSettings2 = await langdockApi.getApiSettings(testUserId2);
    console.log('Пользовательские настройки API с явно указанным URL:', {
      apiType: userSettings2.apiType,
      baseUrl: userSettings2.baseUrl,
      langdockRegion: userSettings2.langdockRegion,
      model: userSettings2.model,
    });

    // Проверка, что базовый URL не был изменен
    if (userSettings2.baseUrl === 'https://custom.api.langdock.com/v1') {
      console.log(
        'Базовый URL для пользователя сохранен без изменений:',
        userSettings2.baseUrl
      );
    } else {
      console.warn('Базовый URL для пользователя был изменен:', {
        expectedUrl: 'https://custom.api.langdock.com/v1',
        actualUrl: userSettings2.baseUrl,
      });
    }

    // Тест 6: Создание тестового пользователя со старым форматом URL
    console.log(
      '\n--- Тест 6: Создание тестового пользователя со старым форматом URL ---'
    );

    // Генерируем уникальный ID для третьего тестового пользователя
    const testUserId3 = `test-user-${Date.now() + 2}`;

    // Создаем тестовые настройки API для пользователя со старым форматом URL
    await withPrisma(async (prismaClient) => {
      await prismaClient.userApiSettings.create({
        data: {
          userId: testUserId3,
          useCustomApi: true,
          apiType: 'langdock',
          langdockApiKey: 'test-api-key-encrypted-3', // В реальном сценарии должен быть зашифрован
          langdockRegion: 'us', // Указываем регион US
          langdockBaseUrl:
            'https://api.langdock.com/assistant/v1/chat/completions', // Старый формат URL
        },
      });
      console.log(
        'Создан тестовый пользователь со старым форматом URL через withPrisma'
      );
    });

    console.log('Создан тестовый пользователь со старым форматом URL:', {
      userId: testUserId3,
      apiType: 'langdock',
      langdockRegion: 'us',
      langdockBaseUrl: 'https://api.langdock.com/assistant/v1/chat/completions',
    });

    // Тест 7: Получение пользовательских настроек API со старым форматом URL
    console.log(
      '\n--- Тест 7: Получение пользовательских настроек API со старым форматом URL ---'
    );
    const userSettings3 = await langdockApi.getApiSettings(testUserId3);
    console.log('Пользовательские настройки API со старым форматом URL:', {
      apiType: userSettings3.apiType,
      baseUrl: userSettings3.baseUrl,
      langdockRegion: userSettings3.langdockRegion,
      model: userSettings3.model,
    });

    // Проверка, что базовый URL был обновлен
    const expectedUpdatedUrl = `https://api.langdock.com/anthropic/us`;
    if (userSettings3.baseUrl === expectedUpdatedUrl) {
      console.log('Базовый URL для пользователя был корректно обновлен:', {
        oldUrl: 'https://api.langdock.com/assistant/v1/chat/completions',
        newUrl: userSettings3.baseUrl,
      });
    } else {
      console.warn('Базовый URL для пользователя не был обновлен корректно:', {
        oldUrl: 'https://api.langdock.com/assistant/v1/chat/completions',
        expectedUrl: expectedUpdatedUrl,
        actualUrl: userSettings3.baseUrl,
      });
    }

    // Очистка тестовых данных
    console.log('\n--- Очистка тестовых данных ---');
    await withPrisma(async (prismaClient) => {
      await prismaClient.userApiSettings.deleteMany({
        where: {
          userId: {
            in: [testUserId, testUserId2, testUserId3],
          },
        },
      });
      console.log('Тестовые данные удалены через withPrisma');
    });

    console.log('\n=== Тестирование getApiSettings завершено успешно ===');
  } catch (error) {
    console.error('Ошибка при тестировании getApiSettings:', error);
    console.error('Детали ошибки:', {
      message: error.message,
      stack: error.stack,
    });
  } finally {
    // Закрываем соединение с базой данных
    console.log('Закрытие соединения с базой данных...');
    try {
      // Используем withPrisma для корректного закрытия соединения
      await withPrisma(async () => {
        console.log('Соединение закрыто через withPrisma');
      });
    } catch (error) {
      console.error('Ошибка при закрытии соединения:', error);
    }
  }
}

// Запускаем тестирование
testGetApiSettings()
  .then(() => {
    console.log('Тестирование завершено');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Ошибка при выполнении тестирования:', error);
    process.exit(1);
  });
