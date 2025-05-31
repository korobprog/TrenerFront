import prisma, { withPrisma } from '../prisma';
import crypto from 'crypto';

/**
 * Получает настройки API из базы данных
 * @param {string} userId - ID пользователя (опционально)
 * @returns {Promise<Object>} - Объект с настройками API
 */
async function getApiSettings(userId = null) {
  console.log('Начало получения настроек API Claude', { userId });

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
          hasApiKey: !!userSettings?.apiKey,
          apiType: userSettings?.apiType,
        });

        // Подробное логирование условий для использования пользовательских настроек
        console.log(
          'Проверка условий для использования пользовательских настроек:',
          {
            userSettingsExist: !!userSettings,
            useCustomApi: userSettings?.useCustomApi,
            hasApiKey: !!userSettings?.apiKey,
            apiType: userSettings?.apiType,
            isAnthropic: userSettings?.apiType === 'anthropic',
            allConditionsMet: !!(
              userSettings &&
              userSettings.useCustomApi &&
              userSettings.apiKey &&
              userSettings.apiType === 'anthropic'
            ),
          }
        );

        // Если пользовательские настройки существуют и useCustomApi = true, используем их
        if (
          userSettings &&
          userSettings.useCustomApi &&
          userSettings.apiKey &&
          userSettings.apiType === 'anthropic'
        ) {
          console.log(
            `Используются пользовательские настройки API для пользователя: ${userId}`
          );

          // Расшифровываем API ключ
          const apiKey = decryptApiKey(userSettings.apiKey);
          console.log('API ключ успешно расшифрован:', !!apiKey);

          return {
            apiKey: apiKey,
            baseUrl: userSettings.baseUrl || 'https://api.anthropic.com',
            model: userSettings.selectedModel || 'claude-3-haiku-20240307',
            temperature: 0.7,
            maxTokensPerQuestion: 4000,
            maxQuestionsPerDay: 10,
            isActive: true,
          };
        } else {
          console.log(
            'Не используются пользовательские настройки API, причина:',
            {
              userSettingsExist: !!userSettings,
              useCustomApiEnabled: userSettings
                ? userSettings.useCustomApi
                : false,
              hasApiKey: userSettings ? !!userSettings.apiKey : false,
              isAnthropicType: userSettings
                ? userSettings.apiType === 'anthropic'
                : false,
            }
          );
        }
      }

      // Если пользовательские настройки не найдены или не активны, используем глобальные
      console.log('Поиск глобальных настроек API Claude');

      const settings = await prisma.interviewAssistantSettings.findFirst({
        where: { isActive: true, apiType: 'anthropic' },
      });

      console.log('Глобальные настройки API Claude:', {
        найдены: !!settings,
        hasApiKey: !!settings?.apiKey,
        isActive: settings?.isActive,
        apiType: settings?.apiType,
      });

      if (!settings) {
        console.error(
          'Глобальные настройки API Claude не найдены или неактивны'
        );
        throw new Error('Настройки API Claude не найдены или неактивны');
      }

      return {
        apiKey: decryptApiKey(settings.apiKey),
        baseUrl: settings.baseUrl || 'https://api.anthropic.com',
        model: settings.model || 'claude-3-haiku-20240307',
        temperature: settings.temperature || 0.7,
        maxTokensPerQuestion: settings.maxTokensPerQuestion || 4000,
        maxQuestionsPerDay: settings.maxQuestionsPerDay || 10,
        isActive: settings.isActive,
      };
    } catch (error) {
      console.error('Ошибка при получении настроек API Claude:', error);
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
 * Форматирует сообщения для отправки в Claude API
 * @param {string} question - Вопрос пользователя
 * @param {string} company - Название компании (опционально)
 * @param {Date} interviewDate - Дата собеседования (опционально)
 * @param {Array} chatHistory - История чата (опционально)
 * @returns {Array} - Массив сообщений для API Claude
 */
function formatMessages(
  question,
  company = null,
  interviewDate = null,
  chatHistory = []
) {
  // Создаем системное сообщение
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

  // Формируем массив сообщений
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
 * Генерирует хэш вопроса для использования в кэшировании
 * @param {string} question - Вопрос пользователя
 * @returns {string} - Хэш вопроса
 */
function generateQuestionHash(question) {
  // Нормализуем вопрос (удаляем лишние пробелы, приводим к нижнему регистру)
  const normalizedQuestion = question.trim().toLowerCase();
  // Создаем хэш вопроса
  return crypto.createHash('md5').update(normalizedQuestion).digest('hex');
}

/**
 * Проверяет валидность ответа
 * @param {string} answer - Ответ для проверки
 * @returns {boolean} - true, если ответ валидный, false в противном случае
 */
function isValidAnswer(answer) {
  try {
    // Проверяем, что ответ существует и является строкой
    if (!answer || typeof answer !== 'string') {
      console.log('Ответ не существует или не является строкой');
      return false;
    }

    // Проверяем минимальную длину ответа (не менее 50 символов)
    // Это предотвратит кэширование слишком коротких или пустых ответов
    if (answer.length < 50) {
      console.log(`Ответ слишком короткий: ${answer.length} символов`);
      return false;
    }

    // Проверяем, что ответ не является JSON-строкой с пустым массивом или объектом
    if (answer.trim() === '[]' || answer.trim() === '{}') {
      console.log('Ответ является пустым JSON-массивом или объектом');
      return false;
    }

    // Проверяем, что ответ содержит осмысленный текст, а не только спецсимволы
    const textContent = answer.replace(/[^a-zA-Zа-яА-Я0-9]/g, '');
    if (textContent.length < 30) {
      console.log('Ответ содержит недостаточно текстового содержимого');
      return false;
    }

    return true;
  } catch (error) {
    console.error('Ошибка при проверке валидности ответа:', error);
    return false;
  }
}

/**
 * Получает кэшированный ответ на вопрос, если он существует, не истек и валиден
 * @param {string} question - Вопрос пользователя
 * @returns {Promise<{answer: string|null, cacheId: number|null}>} - Кэшированный ответ и ID записи в кэше или null, если кэш не найден или невалиден
 */
async function getCachedResponse(question) {
  const questionHash = generateQuestionHash(question);

  return await withPrisma(async (prisma) => {
    const cachedResponse = await prisma.interviewAssistantCache.findFirst({
      where: {
        question: questionHash,
        expiresAt: {
          gt: new Date(), // Проверяем, что кэш не истек
        },
      },
    });

    if (cachedResponse) {
      console.log(
        'Найден кэшированный ответ для вопроса:',
        question.substring(0, 50) + '...'
      );

      // Проверяем валидность ответа из кэша
      if (isValidAnswer(cachedResponse.answer)) {
        console.log('Кэшированный ответ прошел валидацию');
        return { answer: cachedResponse.answer, cacheId: cachedResponse.id };
      } else {
        console.log('Кэшированный ответ не прошел валидацию, будет удален');

        // Удаляем невалидный ответ из кэша
        await prisma.interviewAssistantCache.delete({
          where: { id: cachedResponse.id },
        });

        return { answer: null, cacheId: null };
      }
    }

    return { answer: null, cacheId: null };
  });
}

/**
 * Кэширует ответ на вопрос в базе данных, если ответ валиден
 * @param {string} question - Вопрос пользователя
 * @param {string} answer - Ответ от API
 * @returns {Promise<Object|null>} - Объект с результатом кэширования или null, если ответ невалиден
 */
async function cacheResponse(question, answer) {
  // Проверяем валидность ответа перед кэшированием
  if (!isValidAnswer(answer)) {
    console.log('Ответ не прошел валидацию и не будет кэширован');
    return null;
  }

  const questionHash = generateQuestionHash(question);

  // Устанавливаем срок действия кэша на 7 дней
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  return await withPrisma(async (prisma) => {
    try {
      // Проверяем, существует ли уже кэш для этого вопроса
      const existingCache = await prisma.interviewAssistantCache.findFirst({
        where: {
          question: questionHash,
        },
      });

      if (existingCache) {
        // Обновляем существующий кэш только если новый ответ валиден
        console.log('Обновление существующего кэша');
        return await prisma.interviewAssistantCache.update({
          where: {
            id: existingCache.id,
          },
          data: {
            answer: answer,
            expiresAt: expiresAt,
            createdAt: new Date(),
          },
        });
      } else {
        // Создаем новый кэш
        console.log('Создание нового кэша');
        return await prisma.interviewAssistantCache.create({
          data: {
            question: questionHash,
            answer: answer,
            expiresAt: expiresAt,
          },
        });
      }
    } catch (error) {
      console.error('Ошибка при кэшировании ответа:', error);
      return null;
    }
  });
}

/**
 * Логирует использование API
 * @param {string} userId - ID пользователя
 * @param {number} tokensUsed - Количество использованных токенов
 * @param {number} apiCost - Стоимость запроса к API
 * @param {string} company - Название компании (опционально)
 * @param {Date} interviewDate - Дата собеседования (опционально)
 * @returns {Promise<Object>} - Объект с результатом логирования
 */
async function logUsage(
  userId,
  tokensUsed,
  apiCost,
  company = null,
  interviewDate = null
) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return await withPrisma(async (prisma) => {
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
      return await prisma.interviewAssistantUsage.update({
        where: {
          id: existingUsage.id,
        },
        data: {
          questionsCount: existingUsage.questionsCount + 1,
          tokensUsed: existingUsage.tokensUsed + tokensUsed,
          apiCost: existingUsage.apiCost + apiCost,
          company: company || existingUsage.company,
          interviewDate: interviewDate || existingUsage.interviewDate,
        },
      });
    } else {
      // Создаем новую запись
      return await prisma.interviewAssistantUsage.create({
        data: {
          userId: userId,
          date: today,
          questionsCount: 1,
          tokensUsed: tokensUsed,
          apiCost: apiCost,
          company: company,
          interviewDate: interviewDate,
        },
      });
    }
  });
}

/**
 * Сохраняет вопрос и ответ в истории пользователя
 * @param {string} userId - ID пользователя
 * @param {string} question - Вопрос пользователя
 * @param {string} answer - Ответ от API
 * @param {string} category - Категория вопроса (опционально)
 * @param {string} company - Название компании (опционально)
 * @param {Date} interviewDate - Дата собеседования (опционально)
 * @returns {Promise<Object>} - Объект с результатом сохранения
 */
async function saveQuestionAnswer(
  userId,
  question,
  answer,
  category = null,
  company = null,
  interviewDate = null
) {
  return await withPrisma(async (prisma) => {
    return await prisma.interviewAssistantQA.create({
      data: {
        userId: userId,
        question: question,
        answer: answer,
        category: category,
        company: company,
        interviewDate: interviewDate,
      },
    });
  });
}

/**
 * Проверяет лимиты пользователя
 * @param {string} userId - ID пользователя
 * @returns {Promise<boolean>} - true, если лимиты не превышены, иначе выбрасывает ошибку
 */
async function checkUserLimits(userId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return await withPrisma(async (prisma) => {
    // Получаем настройки API
    const settings = await getApiSettings(userId);

    // Получаем статистику использования за сегодня
    const usage = await prisma.interviewAssistantUsage.findFirst({
      where: {
        userId: userId,
        date: {
          gte: today,
          lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
        },
      },
    });

    // Если нет записей об использовании или количество вопросов меньше лимита, разрешаем запрос
    if (!usage || usage.questionsCount < settings.maxQuestionsPerDay) {
      return true;
    }

    // Если лимит превышен, выбрасываем ошибку
    throw new Error(
      `Превышен дневной лимит запросов к API (${settings.maxQuestionsPerDay})`
    );
  });
}

/**
 * Получает ответ от API Claude
 * @param {string} question - Вопрос пользователя
 * @param {string} userId - ID пользователя
 * @param {string} category - Категория вопроса (опционально)
 * @param {string} company - Название компании (опционально)
 * @param {Date} interviewDate - Дата собеседования (опционально)
 * @param {boolean} forceRefresh - Флаг принудительного обновления кэша (опционально)
 * @returns {Promise<Object>} - Объект с ответом от API
 */
async function getAnswer(
  question,
  userId,
  category = null,
  company = null,
  interviewDate = null,
  forceRefresh = false
) {
  try {
    // Проверяем лимиты пользователя
    await checkUserLimits(userId);

    // Проверяем кэш, если не требуется принудительное обновление
    if (!forceRefresh) {
      const { answer, cacheId } = await getCachedResponse(question);
      if (answer) {
        console.log('Использован кэшированный ответ');

        // Логируем использование API (с нулевой стоимостью, так как используется кэш)
        await logUsage(userId, 0, 0, company, interviewDate);

        // Сохраняем вопрос-ответ в истории пользователя
        await saveQuestionAnswer(
          userId,
          question,
          answer,
          category,
          company,
          interviewDate
        );

        return {
          answer,
          fromCache: true,
          tokensUsed: 0,
          apiCost: 0,
        };
      }
    }

    // Получаем настройки API
    const settings = await getApiSettings(userId);

    // Форматируем сообщения для API
    const messages = formatMessages(question, company, interviewDate);

    console.log('Отправка запроса к Claude API:', {
      model: settings.model,
      messagesCount: messages.length,
      maxTokens: settings.maxTokensPerQuestion,
    });

    // Отправляем запрос к API Claude
    const response = await fetch(`${settings.baseUrl}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': settings.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: settings.model,
        messages: messages,
        max_tokens: settings.maxTokensPerQuestion,
        temperature: settings.temperature,
      }),
    });

    console.log('Получен ответ от Claude API:', {
      status: response.status,
      statusText: response.statusText,
    });

    if (!response.ok) {
      console.error('Ошибка API (статус не OK):', {
        status: response.status,
        statusText: response.statusText,
      });
      throw new Error(`Ошибка API: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    console.log('Данные ответа от Claude API:', {
      id: data.id,
      model: data.model,
      type: data.type,
      role: data.role,
      contentLength: data.content ? data.content.length : 0,
      stopReason: data.stop_reason,
      usage: data.usage,
    });

    // Извлекаем ответ из ответа API
    const answer = data.content[0].text;

    // Получаем информацию об использованных токенах из ответа API
    const inputTokens = data.usage?.input_tokens || 0;
    const outputTokens = data.usage?.output_tokens || 0;
    const tokensUsed = inputTokens + outputTokens;

    // Рассчитываем стоимость запроса
    // Claude 3 Haiku: $0.25/1M токенов ввода, $1.25/1M токенов вывода
    const inputCost = (inputTokens / 1000000) * 0.25;
    const outputCost = (outputTokens / 1000000) * 1.25;
    const apiCost = inputCost + outputCost;

    // Кэшируем ответ
    await cacheResponse(question, answer);

    // Логируем использование API
    await logUsage(userId, tokensUsed, apiCost, company, interviewDate);

    // Сохраняем вопрос-ответ в истории пользователя
    await saveQuestionAnswer(
      userId,
      question,
      answer,
      category,
      company,
      interviewDate
    );

    return {
      answer,
      fromCache: false,
      tokensUsed,
      apiCost,
    };
  } catch (error) {
    console.error('Ошибка при получении ответа от API Claude:', error);
    console.error('Детали ошибки:', {
      message: error.message,
      stack: error.stack,
    });
    throw error;
  }
}

module.exports = {
  getAnswer,
  getApiSettings,
  formatMessages,
  getCachedResponse,
  cacheResponse,
  logUsage,
  saveQuestionAnswer,
  checkUserLimits,
};
