// Используем CommonJS для импорта модулей
const prismaModule = require('../prismaCommonJS');
const prisma = prismaModule.default;
const { withPrisma } = prismaModule;
const crypto = require('crypto');

/**
 * Получает настройки API из базы данных
 * @param {string} userId - ID пользователя (опционально)
 * @returns {Promise<Object>} - Объект с настройками API
 */
async function getApiSettings(userId = null) {
  console.log('Начало получения настроек API LangDock', { userId });

  return await withPrisma(async (prisma) => {
    try {
      // Если передан userId, сначала проверяем наличие пользовательских настроек
      if (userId) {
        console.log(
          `Проверка пользовательских настроек API для пользователя: ${userId}`
        );

        const userSettings = await prisma.userApiSettings.findUnique({
          where: { userId: userId },
        });

        console.log('Пользовательские настройки API:', {
          найдены: !!userSettings,
          useCustomApi: userSettings?.useCustomApi,
          hasApiKey: !!userSettings?.langdockApiKey,
          apiType: userSettings?.apiType,
        });

        // Если пользовательские настройки существуют и useCustomApi = true, используем их
        if (
          userSettings &&
          userSettings.useCustomApi &&
          userSettings.langdockApiKey
        ) {
          console.log(
            `Используются пользовательские настройки API для пользователя: ${userId}`
          );

          // Расшифровываем API ключ
          const apiKey = decryptApiKey(userSettings.langdockApiKey);

          // Определяем базовый URL в зависимости от региона
          let baseUrl = userSettings.langdockBaseUrl;
          console.log('Исходный базовый URL пользователя:', {
            baseUrl: baseUrl,
            langdockRegion: userSettings.langdockRegion,
          });

          if (!baseUrl) {
            // Если URL не указан, формируем его на основе региона
            const region = userSettings.langdockRegion || 'eu';
            baseUrl = `https://api.langdock.com/anthropic/${region}`;
            console.log('Сформирован новый базовый URL на основе региона:', {
              region: region,
              baseUrl: baseUrl,
            });
          } else if (
            baseUrl === 'https://api.langdock.com/assistant/v1/chat/completions'
          ) {
            // Если используется старый URL, формируем новый на основе региона
            const region = userSettings.langdockRegion || 'eu';
            const oldUrl = baseUrl;
            baseUrl = `https://api.langdock.com/anthropic/${region}`;
            console.log('Обновлен устаревший базовый URL:', {
              oldUrl: oldUrl,
              newUrl: baseUrl,
              region: region,
            });
          }

          return {
            apiKey: apiKey,
            baseUrl: baseUrl,
            apiType: 'langdock',
            langdockAssistantId: userSettings.langdockAssistantId,
            langdockRegion: userSettings.langdockRegion || 'eu',
            model: 'claude-3-opus-20240229', // Модель Claude по умолчанию
            maxTokensPerQuestion: 4000, // Используем значение по умолчанию
            maxQuestionsPerDay: 10, // Используем значение по умолчанию
            isActive: true,
          };
        }
      }

      // Если пользовательские настройки не найдены или не активны, используем глобальные
      console.log('Поиск глобальных настроек API');

      const settings = await prisma.interviewAssistantSettings.findFirst({
        where: { isActive: true, apiType: 'langdock' },
      });

      console.log('Глобальные настройки API LangDock:', {
        найдены: !!settings,
        hasApiKey: !!settings?.apiKey,
        isActive: settings?.isActive,
        apiType: settings?.apiType,
        langdockAssistantId: settings?.langdockAssistantId,
        langdockRegion: settings?.langdockRegion,
      });

      if (!settings) {
        console.error(
          'Глобальные настройки API LangDock не найдены или неактивны'
        );
        throw new Error('Настройки API LangDock не найдены или неактивны');
      }

      // Определяем базовый URL в зависимости от региона
      let baseUrl = settings.langdockBaseUrl;
      console.log('Исходный базовый URL глобальных настроек:', {
        baseUrl: baseUrl,
        langdockRegion: settings.langdockRegion,
      });

      if (!baseUrl) {
        // Если URL не указан, формируем его на основе региона
        const region = settings.langdockRegion || 'eu';
        baseUrl = `https://api.langdock.com/anthropic/${region}`;
        console.log('Сформирован новый базовый URL на основе региона:', {
          region: region,
          baseUrl: baseUrl,
        });
      } else if (
        baseUrl === 'https://api.langdock.com/assistant/v1/chat/completions'
      ) {
        // Если используется старый URL, формируем новый на основе региона
        const region = settings.langdockRegion || 'eu';
        const oldUrl = baseUrl;
        baseUrl = `https://api.langdock.com/anthropic/${region}`;
        console.log('Обновлен устаревший базовый URL:', {
          oldUrl: oldUrl,
          newUrl: baseUrl,
          region: region,
        });
      }

      return {
        ...settings,
        baseUrl: baseUrl,
        model: 'claude-3-opus-20240229', // Модель Claude по умолчанию
      };
    } catch (error) {
      console.error('Ошибка при получении настроек API LangDock:', error);
      console.error('Детали ошибки:', {
        message: error.message,
        stack: error.stack,
      });
      throw error;
    }
  });
}

/**
 * Функция для расшифровки API ключа
 * @param {string} encryptedApiKey - Зашифрованный API ключ
 * @returns {string} - Расшифрованный API ключ
 */
function decryptApiKey(encryptedApiKey) {
  if (!encryptedApiKey) return '';

  try {
    console.log('Начало расшифровки API ключа');

    // Проверяем формат зашифрованного ключа
    if (!encryptedApiKey.includes(':')) {
      console.error('Неверный формат зашифрованного ключа');
      return '';
    }

    // Расшифровываем API ключ
    const algorithm = 'aes-256-ctr';
    const secretKey =
      process.env.API_KEY_SECRET || 'default-secret-key-for-api-encryption';

    // Убедимся, что secretKey имеет правильную длину для алгоритма aes-256-ctr (32 байта)
    const key = crypto
      .createHash('sha256')
      .update(String(secretKey))
      .digest('base64')
      .substr(0, 32);

    const [ivHex, encryptedHex] = encryptedApiKey.split(':');

    // Проверяем, что обе части существуют
    if (!ivHex || !encryptedHex) {
      console.error(
        'Неверный формат зашифрованного ключа: отсутствует IV или зашифрованный текст'
      );
      return '';
    }

    const iv = Buffer.from(ivHex, 'hex');
    const encryptedText = Buffer.from(encryptedHex, 'hex');

    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    const decrypted = Buffer.concat([
      decipher.update(encryptedText),
      decipher.final(),
    ]);

    console.log('API ключ успешно расшифрован');
    return decrypted.toString();
  } catch (error) {
    console.error('Ошибка при расшифровке API ключа:', error);
    console.error('Детали ошибки:', {
      message: error.message,
      stack: error.stack,
    });
    return '';
  }
}

/**
 * Форматирует сообщения для отправки в LangDock Assistant API
 * @param {string} question - Вопрос пользователя
 * @param {string} company - Название компании (опционально)
 * @param {Date} interviewDate - Дата собеседования (опционально)
 * @returns {Array} - Массив сообщений для API
 */
function formatMessages(
  question,
  company = null,
  interviewDate = null,
  chatHistory = []
) {
  // Создаем системное сообщение для API Anthropic
  const systemMessage = {
    role: 'system',
    content:
      'Ты - опытный Frontend разработчик, отвечающий на вопросы по собеседованию. Дай подробный, но лаконичный ответ, включающий примеры кода, где это уместно. Структурируй ответ с использованием маркдауна для лучшей читаемости.',
  };

  // Создаем сообщение пользователя
  let userMessage = question;

  // Добавляем информацию о компании и дате собеседования, если они указаны
  if (company) {
    let contextMessage = `\n\nЯ готовлюсь к собеседованию в компанию "${company}".`;

    if (interviewDate) {
      const formattedDate = new Date(interviewDate).toLocaleDateString(
        'ru-RU',
        {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        }
      );
      contextMessage += ` Собеседование запланировано на ${formattedDate}.`;
    }

    contextMessage += ` Учитывай это при ответе, особенно если вопрос связан с технологиями или подходами, которые могут быть специфичны для этой компании.`;

    // Добавляем контекст к сообщению пользователя
    userMessage += contextMessage;
  }

  // Формируем массив сообщений для API Anthropic
  const messages = [systemMessage];

  // Добавляем историю чата, если она есть
  if (chatHistory && chatHistory.length > 0) {
    messages.push(...chatHistory);
  }

  // Добавляем текущий вопрос пользователя
  messages.push({
    role: 'user',
    content: userMessage,
  });

  return messages;
}

/**
 * Парсит ответ от LangDock Assistant API
 * @param {Object} response - Ответ от API
 * @returns {Object} - Объект с распарсенным ответом и метаданными
 */
function parseResponse(response) {
  try {
    console.log(
      'Полный ответ от LangDock API (Anthropic):',
      JSON.stringify(response, null, 2)
    );

    // Проверяем наличие необходимых полей в ответе для формата Anthropic API
    if (!response || !response.content) {
      console.error(
        'Некорректный формат ответа от LangDock API (Anthropic):',
        response
      );
      throw new Error('Некорректный формат ответа от LangDock API (Anthropic)');
    }

    // Извлекаем текст ответа из формата Anthropic API
    console.log(
      'Содержимое ответа:',
      JSON.stringify(response.content, null, 2)
    );

    // Извлекаем текст из ответа
    let answerText = '';
    console.log('Тип содержимого ответа:', {
      isArray: Array.isArray(response.content),
      type: typeof response.content,
      contentLength: response.content
        ? Array.isArray(response.content)
          ? response.content.length
          : response.content.length
        : 0,
    });

    if (Array.isArray(response.content)) {
      // Если content - это массив, собираем текст из всех элементов типа 'text'
      console.log('Обработка массива content:', {
        contentLength: response.content.length,
        contentTypes: response.content.map((item) => item.type).join(', '),
        textItemsCount: response.content.filter((item) => item.type === 'text')
          .length,
      });

      answerText = response.content
        .filter((item) => item.type === 'text')
        .map((item) => item.text)
        .join('\n');
    } else if (typeof response.content === 'string') {
      // Если content - это строка, используем её напрямую
      console.log('Обработка строкового content:', {
        contentLength: response.content.length,
        contentPreview: response.content.substring(0, 50) + '...',
      });

      answerText = response.content;
    } else {
      console.error('Неизвестный формат содержимого ответа:', response.content);
      console.error('Детали неизвестного формата:', {
        contentType: typeof response.content,
        hasContent: !!response.content,
        responseKeys: Object.keys(response).join(', '),
      });

      throw new Error(
        'Неизвестный формат содержимого ответа от LangDock API (Anthropic)'
      );
    }

    console.log('Извлеченный текст ответа:', answerText);

    // Получаем информацию об использовании токенов из ответа API, если она доступна
    let inputTokens = 0;
    let outputTokens = 0;

    console.log('Проверка наличия информации о токенах:', {
      hasUsage: !!response.usage,
      usageFields: response.usage
        ? Object.keys(response.usage).join(', ')
        : 'нет',
    });

    if (response.usage) {
      inputTokens = response.usage.input_tokens || 0;
      outputTokens = response.usage.output_tokens || 0;
      console.log('Информация о токенах из API:', {
        inputTokens,
        outputTokens,
        totalTokens: inputTokens + outputTokens,
      });
    } else {
      // Если информация о токенах не предоставлена API, делаем примерную оценку
      const contentLength = JSON.stringify(response.content).length;
      const answerLength = answerText.length;

      inputTokens = Math.ceil(contentLength / 4);
      outputTokens = Math.ceil(answerLength / 4);

      console.log('Примерная оценка токенов:', {
        contentLength,
        answerLength,
        estimatedInputTokens: inputTokens,
        estimatedOutputTokens: outputTokens,
        tokensRatio: (contentLength / 4).toFixed(2) + ' токенов/символ',
      });
    }

    const tokensUsed = inputTokens + outputTokens;

    // Рассчитываем примерную стоимость запроса для моделей Claude
    // Цены могут меняться, поэтому это приблизительная оценка
    const inputCost = inputTokens * 0.000003; // $0.003 за 1000 токенов ввода для Claude
    const outputCost = outputTokens * 0.000015; // $0.015 за 1000 токенов вывода для Claude
    const apiCost = inputCost + outputCost;

    console.log('Расчет стоимости запроса:', {
      inputCost: inputCost.toFixed(6),
      outputCost: outputCost.toFixed(6),
      totalCost: apiCost.toFixed(6),
      inputTokens,
      outputTokens,
      tokensUsed,
    });

    return {
      answer: answerText,
      tokensUsed: tokensUsed,
      apiCost: apiCost,
      inputTokens: inputTokens,
      outputTokens: outputTokens,
    };
  } catch (error) {
    console.error('Ошибка при парсинге ответа от LangDock API:', error);
    throw new Error(`Ошибка при парсинге ответа: ${error.message}`);
  }
}

/**
 * Основная функция для получения ответа на вопрос через LangDock API
 * @param {string} question - Вопрос пользователя
 * @param {string} userId - ID пользователя
 * @param {string} category - Категория вопроса (опционально)
 * @param {string} company - Название компании (опционально)
 * @param {Date} interviewDate - Дата собеседования (опционально)
 * @returns {Promise<Object>} - Объект с ответом и метаданными
 */
async function getAnswer(
  question,
  userId,
  category = null,
  company = null,
  interviewDate = null
) {
  try {
    // Получаем настройки API с учетом пользовательских настроек
    const settings = await getApiSettings(userId);

    // Форматируем сообщения для API с учетом компании и даты собеседования
    const messages = formatMessages(question, company, interviewDate);

    // Используем базовый URL из настроек
    const baseUrl = settings.baseUrl;
    console.log(
      `Используется базовый URL LangDock API (Anthropic): ${baseUrl}`
    );

    // Определяем модель Claude для использования
    const model = settings.model || 'claude-3-opus-20240229';
    console.log(`Используется модель: ${model}`);

    // Отправляем запрос к LangDock API (Anthropic)
    console.log('Отправка запроса к LangDock API (Anthropic):', {
      baseUrl,
      model,
      messagesCount: messages.length,
    });

    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${settings.apiKey}`,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: model,
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
      throw new Error(
        `Ошибка при запросе к LangDock API (Anthropic): ${response.status} ${response.statusText}`
      );
    }

    // Парсим ответ
    const responseData = await response.json();
    console.log('Получен ответ от LangDock API (Anthropic)');
    const parsedResponse = parseResponse(responseData);

    // Сохраняем вопрос и ответ в истории пользователя
    await withPrisma(async (prisma) => {
      await prisma.interviewAssistantQA.create({
        data: {
          userId: userId,
          question: question,
          answer: parsedResponse.answer,
          category: category,
          company: company,
          interviewDate: interviewDate,
        },
      });
    });

    // Логируем использование API
    await withPrisma(async (prisma) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Проверяем, существует ли уже запись для этого пользователя на сегодня
      const existingUsage = await prisma.interviewAssistantUsage.findFirst({
        where: {
          userId: userId,
          date: {
            gte: today,
            lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
          },
        },
      });

      if (existingUsage) {
        // Обновляем существующую запись
        await prisma.interviewAssistantUsage.update({
          where: {
            id: existingUsage.id,
          },
          data: {
            questionsCount: existingUsage.questionsCount + 1,
            tokensUsed: existingUsage.tokensUsed + parsedResponse.tokensUsed,
            apiCost: existingUsage.apiCost + parsedResponse.apiCost,
            company: company || existingUsage.company,
            interviewDate: interviewDate || existingUsage.interviewDate,
          },
        });
      } else {
        // Создаем новую запись
        await prisma.interviewAssistantUsage.create({
          data: {
            userId: userId,
            date: today,
            questionsCount: 1,
            tokensUsed: parsedResponse.tokensUsed,
            apiCost: parsedResponse.apiCost,
            company: company,
            interviewDate: interviewDate,
          },
        });
      }
    });

    return {
      answer: parsedResponse.answer,
      fromCache: false,
      tokensUsed: parsedResponse.tokensUsed,
      apiCost: parsedResponse.apiCost,
    };
  } catch (error) {
    console.error('Ошибка при получении ответа от LangDock API:', error);
    throw new Error(`Ошибка при получении ответа: ${error.message}`);
  }
}

module.exports = {
  getApiSettings,
  formatMessages,
  parseResponse,
  getAnswer,
};
