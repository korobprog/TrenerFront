import prisma, { withPrisma } from '../prisma';
import crypto from 'crypto';
import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * Получает настройки API из базы данных
 * @param {string} userId - ID пользователя (опционально)
 * @returns {Promise<Object>} - Объект с настройками API
 */
async function getApiSettings(userId = null) {
  console.log('Начало получения настроек API Gemini', { userId });

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
          hasApiKey: !!userSettings?.geminiApiKey,
          apiType: userSettings?.apiType,
        });

        // Подробное логирование условий для использования пользовательских настроек
        console.log(
          'Проверка условий для использования пользовательских настроек:',
          {
            userSettingsExist: !!userSettings,
            useCustomApi: userSettings?.useCustomApi,
            hasApiKey: !!userSettings?.geminiApiKey,
            apiType: userSettings?.apiType,
            isGemini: userSettings?.apiType === 'gemini',
            allConditionsMet: !!(
              userSettings &&
              userSettings.useCustomApi &&
              userSettings.geminiApiKey &&
              userSettings.apiType === 'gemini'
            ),
          }
        );

        // Если пользовательские настройки существуют и useCustomApi = true, используем их
        if (
          userSettings &&
          userSettings.useCustomApi &&
          userSettings.geminiApiKey &&
          userSettings.apiType === 'gemini'
        ) {
          console.log(
            `Используются пользовательские настройки API для пользователя: ${userId}`
          );

          // Расшифровываем API ключ
          const apiKey = decryptApiKey(userSettings.geminiApiKey);
          console.log('API ключ успешно расшифрован:', !!apiKey);

          return {
            apiKey: apiKey,
            baseUrl:
              userSettings.geminiBaseUrl ||
              'https://generativelanguage.googleapis.com',
            model: userSettings.geminiModel || 'gemini-1.5-pro',
            temperature: userSettings.geminiTemperature || 0.7,
            maxTokensPerQuestion: 4000, // Используем значение по умолчанию
            maxQuestionsPerDay: 10, // Используем значение по умолчанию
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
              hasApiKey: userSettings ? !!userSettings.geminiApiKey : false,
              isGeminiType: userSettings
                ? userSettings.apiType === 'gemini'
                : false,
            }
          );
        }
      }

      // Если пользовательские настройки не найдены или не активны, используем глобальные
      console.log('Поиск глобальных настроек API Gemini');

      const settings = await prisma.interviewAssistantSettings.findFirst({
        where: { isActive: true, apiType: 'gemini' },
      });

      console.log('Глобальные настройки API Gemini:', {
        найдены: !!settings,
        hasApiKey: !!settings?.geminiApiKey,
        isActive: settings?.isActive,
        apiType: settings?.apiType,
      });

      if (!settings) {
        console.error(
          'Глобальные настройки API Gemini не найдены или неактивны'
        );
        throw new Error('Настройки API Gemini не найдены или неактивны');
      }

      return {
        apiKey: decryptApiKey(settings.geminiApiKey),
        baseUrl:
          settings.geminiBaseUrl || 'https://generativelanguage.googleapis.com',
        model: settings.geminiModel || 'gemini-1.5-pro',
        temperature: settings.geminiTemperature || 0.7,
        maxTokensPerQuestion: settings.maxTokensPerQuestion || 4000,
        maxQuestionsPerDay: settings.maxQuestionsPerDay || 10,
        isActive: settings.isActive,
      };
    } catch (error) {
      console.error('Ошибка при получении настроек API Gemini:', error);
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
 * Форматирует сообщения для отправки в Google Gemini API
 * @param {string} question - Вопрос пользователя
 * @param {string} company - Название компании (опционально)
 * @param {Date} interviewDate - Дата собеседования (опционально)
 * @returns {Array} - Массив сообщений для API
 */
function formatMessages(question, company = null, interviewDate = null) {
  let systemPrompt = `Ты - опытный Frontend разработчик, отвечающий на вопросы по собеседованию.
Дай подробный, но лаконичный ответ, включающий примеры кода, где это уместно.
Структурируй ответ с использованием маркдауна для лучшей читаемости.`;

  let userMessage = `Вопрос: ${question}`;

  // Добавляем информацию о компании и дате собеседования, если они указаны
  if (company) {
    userMessage += `\n\nЯ готовлюсь к собеседованию в компанию "${company}".`;

    if (interviewDate) {
      const formattedDate = new Date(interviewDate).toLocaleDateString(
        'ru-RU',
        {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        }
      );
      userMessage += ` Собеседование запланировано на ${formattedDate}.`;
    }

    userMessage += ` Учитывай это при ответе, особенно если вопрос связан с технологиями или подходами, которые могут быть специфичны для этой компании.`;
  }

  // Формируем массив сообщений для API в формате, понятном Gemini
  return [
    { role: 'system', parts: [{ text: systemPrompt }] },
    { role: 'user', parts: [{ text: userMessage }] },
  ];
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
 * Сохраняет вопрос и ответ в базе данных
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
 * Парсит ответ от Google Gemini API
 * @param {Object} response - Ответ от API
 * @returns {Object} - Объект с распарсенным ответом и метаданными
 */
function parseResponse(response) {
  try {
    console.log('Парсинг ответа от Gemini API');

    // Проверяем наличие необходимых полей в ответе
    if (!response || !response.response || !response.response.text) {
      console.error('Некорректный формат ответа от Gemini API:', response);
      throw new Error('Некорректный формат ответа от Gemini API');
    }

    // Извлекаем текст ответа
    const answerText = response.response.text;
    console.log(
      'Извлеченный текст ответа:',
      answerText.substring(0, 100) + '...'
    );

    // Примерная оценка использования токенов
    // В будущем можно добавить более точный расчет, если API будет предоставлять эту информацию
    const promptTokens = Math.ceil(
      JSON.stringify(response.promptFeedback).length / 4
    );
    const completionTokens = Math.ceil(answerText.length / 4);
    const totalTokens = promptTokens + completionTokens;

    // Рассчитываем примерную стоимость запроса
    // Цены могут меняться, поэтому это приблизительная оценка
    const promptCost = promptTokens * 0.000001; // $0.001 за 1000 токенов ввода
    const completionCost = completionTokens * 0.000002; // $0.002 за 1000 токенов вывода
    const apiCost = promptCost + completionCost;

    return {
      answer: answerText,
      tokensUsed: totalTokens,
      apiCost: apiCost,
      promptTokens: promptTokens,
      completionTokens: completionTokens,
    };
  } catch (error) {
    console.error('Ошибка при парсинге ответа от Gemini API:', error);
    throw new Error(`Ошибка при парсинге ответа: ${error.message}`);
  }
}

/**
 * Проверяет лимиты использования API для пользователя
 * @param {string} userId - ID пользователя
 * @returns {Promise<Object>} - Объект с результатами проверки лимитов
 */
async function checkUserLimits(userId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return await withPrisma(async (prisma) => {
    // Получаем настройки API
    const settings = await getApiSettings(userId);
    const maxQuestionsPerDay = settings.maxQuestionsPerDay || 10;

    // Получаем статистику использования API пользователем за сегодня
    const usage = await prisma.interviewAssistantUsage.findFirst({
      where: {
        userId: userId,
        date: {
          gte: today,
          lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
        },
      },
    });

    // Если записи нет, значит пользователь еще не использовал API сегодня
    if (!usage) {
      return {
        questionsUsed: 0,
        questionsLimit: maxQuestionsPerDay,
        withinLimits: true,
      };
    }

    // Проверяем, не превышен ли лимит вопросов
    const withinLimits = usage.questionsCount < maxQuestionsPerDay;

    return {
      questionsUsed: usage.questionsCount,
      questionsLimit: maxQuestionsPerDay,
      withinLimits: withinLimits,
    };
  });
}

/**
 * Основная функция для получения ответа на вопрос через Google Gemini API
 * @param {string} question - Вопрос пользователя
 * @param {string} userId - ID пользователя
 * @param {string} category - Категория вопроса (опционально)
 * @param {string} company - Название компании (опционально)
 * @param {Date} interviewDate - Дата собеседования (опционально)
 * @returns {Promise<Object>} - Объект с ответом и метаданными
 */
/**
 * Функция для задержки выполнения на указанное количество миллисекунд
 * @param {number} ms - Количество миллисекунд для задержки
 * @returns {Promise<void>} - Promise, который разрешается после задержки
 */
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
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
  // Импортируем альтернативные API
  const anthropicApi = require('./anthropicApi');
  const langdockApi = require('./langdockApi');

  // Максимальное количество попыток для Gemini API
  const MAX_RETRIES = 3;
  // Начальная задержка в миллисекундах
  const INITIAL_BACKOFF = 1000;

  let retryCount = 0;
  let lastError = null;

  try {
    // Проверяем лимиты использования API
    const limits = await checkUserLimits(userId);
    if (!limits.withinLimits) {
      console.log('Превышен дневной лимит вопросов:', limits);
      return {
        answer: `Вы достигли дневного лимита вопросов (${limits.questionsLimit}). Пожалуйста, попробуйте завтра или обратитесь к администратору для увеличения лимита.`,
        fromCache: false,
        tokensUsed: 0,
        apiCost: 0,
      };
    }

    // Проверяем наличие кэшированного ответа
    const cachedResponse = await getCachedResponse(question);
    if (cachedResponse.answer) {
      console.log('Использован кэшированный ответ');

      // Логируем использование кэша
      await logUsage(userId, 0, 0, company, interviewDate);

      return {
        answer: cachedResponse.answer,
        fromCache: true,
        tokensUsed: 0,
        apiCost: 0,
        cacheId: cachedResponse.cacheId,
      };
    }

    // Получаем настройки API с учетом пользовательских настроек
    const settings = await getApiSettings(userId);

    // Проверяем наличие API ключа
    if (!settings.apiKey) {
      throw new Error('API ключ Gemini не найден в настройках');
    }

    // Функция для проверки, является ли ошибка превышением квоты
    const isQuotaExceededError = (err) => {
      return (
        err.message &&
        (err.message.includes('429') ||
          err.message.includes('Too Many Requests') ||
          err.message.includes('exceeded your current quota'))
      );
    };

    // Сначала пробуем использовать Gemini API с механизмом повторных попыток
    while (retryCount < MAX_RETRIES) {
      try {
        console.log(
          `Попытка ${
            retryCount + 1
          }/${MAX_RETRIES} получения ответа от Gemini API для вопроса:`,
          question
        );

        // Инициализируем клиент Gemini API
        const genAI = new GoogleGenerativeAI(settings.apiKey);
        const model = genAI.getGenerativeModel({
          model: settings.model || 'gemini-1.5-pro',
          generationConfig: {
            temperature: settings.temperature || 0.7,
          },
        });

        // Форматируем сообщения для API
        const messages = formatMessages(question, company, interviewDate);
        console.log(
          'Отформатированные сообщения для Gemini API:',
          JSON.stringify(messages, null, 2)
        );

        // Отправляем запрос к Gemini API
        console.log('Отправка запроса к Gemini API');
        const result = await model.generateContent({
          contents: messages,
          generationConfig: {
            temperature: settings.temperature || 0.7,
          },
        });

        // Парсим ответ
        const parsedResponse = parseResponse(result);

        // Кэшируем ответ
        await cacheResponse(question, parsedResponse.answer);

        // Сохраняем вопрос и ответ в истории пользователя
        await saveQuestionAnswer(
          userId,
          question,
          parsedResponse.answer,
          category,
          company,
          interviewDate
        );

        // Логируем использование API
        await logUsage(
          userId,
          parsedResponse.tokensUsed,
          parsedResponse.apiCost,
          company,
          interviewDate
        );

        return {
          answer: parsedResponse.answer,
          fromCache: false,
          tokensUsed: parsedResponse.tokensUsed,
          apiCost: parsedResponse.apiCost,
          apiUsed: 'gemini',
        };
      } catch (error) {
        console.error(
          `Ошибка при попытке ${
            retryCount + 1
          }/${MAX_RETRIES} использования Gemini API:`,
          error
        );
        lastError = error;

        // Проверяем, является ли ошибка превышением квоты API
        if (isQuotaExceededError(error)) {
          // Если это последняя попытка, прекращаем попытки с Gemini API
          if (retryCount === MAX_RETRIES - 1) {
            console.log(
              'Все попытки использования Gemini API исчерпаны из-за превышения квоты'
            );
            break;
          }

          // Иначе увеличиваем счетчик попыток и ждем перед следующей попыткой
          retryCount++;
          const backoffTime = INITIAL_BACKOFF * Math.pow(2, retryCount - 1);
          console.log(`Ожидание ${backoffTime}мс перед следующей попыткой...`);
          await delay(backoffTime);
        } else {
          // Если ошибка не связана с превышением квоты, просто пробрасываем её дальше
          throw error;
        }
      }
    }

    // Если мы дошли до этой точки и lastError содержит ошибку превышения квоты,
    // пробуем использовать Anthropic API
    if (lastError && isQuotaExceededError(lastError)) {
      console.log(
        'Переключение на Anthropic API из-за превышения квоты Gemini API'
      );

      try {
        // Получаем ответ от Anthropic API
        const anthropicResponse = await anthropicApi.getAnswer(
          question,
          userId,
          category,
          company,
          interviewDate
        );

        // Добавляем уведомление о переключении API в начало ответа
        const notificationPrefix =
          '**Примечание:** Из-за превышения квоты Gemini API, ответ был получен с использованием альтернативного API (Anthropic Claude). ' +
          'Качество ответа может отличаться.\n\n';

        return {
          answer: notificationPrefix + anthropicResponse.answer,
          fromCache: false,
          tokensUsed: anthropicResponse.tokensUsed,
          apiCost: anthropicResponse.apiCost,
          apiUsed: 'anthropic',
        };
      } catch (anthropicError) {
        console.error(
          'Ошибка при использовании Anthropic API:',
          anthropicError
        );

        // Если Anthropic API тоже не работает, пробуем LangDock API
        console.log('Переключение на LangDock API из-за ошибки Anthropic API');

        try {
          // Получаем ответ от LangDock API
          const langdockResponse = await langdockApi.getAnswer(
            question,
            userId,
            category,
            company,
            interviewDate
          );

          // Добавляем уведомление о переключении API в начало ответа
          const notificationPrefix =
            '**Примечание:** Из-за технических проблем с основными API, ответ был получен с использованием резервного API (LangDock). ' +
            'Качество ответа может отличаться.\n\n';

          return {
            answer: notificationPrefix + langdockResponse.answer,
            fromCache: false,
            tokensUsed: langdockResponse.tokensUsed,
            apiCost: langdockResponse.apiCost,
            apiUsed: 'langdock',
          };
        } catch (langdockError) {
          console.error(
            'Ошибка при использовании LangDock API:',
            langdockError
          );

          // Если все API не работают, возвращаем понятное сообщение об ошибке
          return {
            answer:
              '**Извините, в данный момент все доступные API недоступны.** Возможные причины:\n\n' +
              '1. Превышены квоты использования API\n' +
              '2. Временные технические проблемы с серверами API\n' +
              '3. Проблемы с сетевым подключением\n\n' +
              'Пожалуйста, попробуйте повторить запрос позже или обратитесь к администратору системы.',
            fromCache: false,
            tokensUsed: 0,
            apiCost: 0,
            apiUsed: 'none',
          };
        }
      }
    }

    // Если мы дошли до этой точки и нет ошибки превышения квоты, пробрасываем последнюю ошибку
    throw lastError || new Error('Все попытки использования API исчерпаны');
  } catch (error) {
    console.error('Ошибка при получении ответа от API:', error);
    throw new Error(`Ошибка при получении ответа: ${error.message}`);
  }
}

module.exports = {
  getApiSettings,
  formatMessages,
  parseResponse,
  getAnswer,
  getCachedResponse,
  cacheResponse,
  logUsage,
  saveQuestionAnswer,
};
