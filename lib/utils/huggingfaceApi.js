import prisma, { withPrisma } from '../prisma';
import crypto from 'crypto';

/**
 * Получает настройки API из базы данных
 * @param {string} userId - ID пользователя (опционально)
 * @returns {Promise<Object>} - Объект с настройками API
 */
async function getApiSettings(userId = null) {
  console.log('Начало получения настроек API Hugging Face', { userId });

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
          hasApiKey: !!userSettings?.huggingfaceApiKey,
          apiType: userSettings?.apiType,
        });

        // Подробное логирование условий для использования пользовательских настроек
        console.log(
          'Проверка условий для использования пользовательских настроек:',
          {
            userSettingsExist: !!userSettings,
            useCustomApi: userSettings?.useCustomApi,
            hasApiKey: !!userSettings?.huggingfaceApiKey,
            apiType: userSettings?.apiType,
            isHuggingFace: userSettings?.apiType === 'huggingface',
            allConditionsMet: !!(
              userSettings &&
              userSettings.useCustomApi &&
              userSettings.huggingfaceApiKey &&
              userSettings.apiType === 'huggingface'
            ),
          }
        );

        // Если пользовательские настройки существуют и useCustomApi = true, используем их
        if (
          userSettings &&
          userSettings.useCustomApi &&
          userSettings.huggingfaceApiKey &&
          userSettings.apiType === 'huggingface'
        ) {
          console.log(
            `Используются пользовательские настройки API для пользователя: ${userId}`
          );

          // Расшифровываем API ключ
          const apiKey = decryptApiKey(userSettings.huggingfaceApiKey);
          console.log('API ключ успешно расшифрован:', !!apiKey);

          return {
            apiKey: apiKey,
            baseUrl:
              userSettings.huggingfaceBaseUrl ||
              'https://api-inference.huggingface.co/models',
            model:
              userSettings.huggingfaceModel || 'meta-llama/Llama-2-7b-chat-hf',
            temperature: userSettings.huggingfaceTemperature || 0.7,
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
              hasApiKey: userSettings
                ? !!userSettings.huggingfaceApiKey
                : false,
              isHuggingFaceType: userSettings
                ? userSettings.apiType === 'huggingface'
                : false,
            }
          );
        }
      }

      // Если пользовательские настройки не найдены или не активны, используем глобальные
      console.log('Поиск глобальных настроек API Hugging Face');

      const settings = await prisma.interviewAssistantSettings.findFirst({
        where: { isActive: true, apiType: 'huggingface' },
      });

      console.log('Глобальные настройки API Hugging Face:', {
        найдены: !!settings,
        hasApiKey: !!settings?.huggingfaceApiKey,
        isActive: settings?.isActive,
        apiType: settings?.apiType,
      });

      if (!settings) {
        console.error(
          'Глобальные настройки API Hugging Face не найдены или неактивны'
        );
        throw new Error('Настройки API Hugging Face не найдены или неактивны');
      }

      return {
        apiKey: decryptApiKey(settings.huggingfaceApiKey),
        baseUrl:
          settings.huggingfaceBaseUrl ||
          'https://api-inference.huggingface.co/models',
        model: settings.huggingfaceModel || 'meta-llama/Llama-2-7b-chat-hf',
        temperature: settings.huggingfaceTemperature || 0.7,
        maxTokensPerQuestion: settings.maxTokensPerQuestion || 512,
        maxQuestionsPerDay: settings.maxQuestionsPerDay || 10,
        isActive: settings.isActive,
      };
    } catch (error) {
      console.error('Ошибка при получении настроек API Hugging Face:', error);
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
 * Форматирует сообщения для отправки в Hugging Face Inference API
 * @param {string} question - Вопрос пользователя
 * @param {string} company - Название компании (опционально)
 * @param {Date} interviewDate - Дата собеседования (опционально)
 * @returns {Object} - Объект с форматированным запросом для API
 */
function formatMessages(
  question,
  company = null,
  interviewDate = null,
  model = null,
  chatHistory = []
) {
  // Проверяем, является ли модель starcoder2-7b
  const isStarcoder = model && model.includes('starcoder2');

  if (isStarcoder) {
    // Формат для модели starcoder2-7b в режиме чата
    // Поскольку starcoder2-7b не является инструкционной моделью,
    // мы используем формат, который имитирует диалог через комментарии и код

    let prompt = '';

    // Добавляем историю чата, если она есть
    if (chatHistory && chatHistory.length > 0) {
      for (const message of chatHistory) {
        if (message.role === 'user') {
          prompt += `// Пользователь: ${message.content}\n\n`;
        } else if (message.role === 'assistant') {
          prompt += `/* Ассистент:\n${message.content}\n*/\n\n`;
        }
      }
    }

    // Добавляем текущий вопрос
    prompt += `// Пользователь: ${question}\n`;

    // Добавляем контекст о компании и дате собеседования
    if (company) {
      prompt += `// Контекст: Подготовка к собеседованию в компанию "${company}"`;

      if (interviewDate) {
        const formattedDate = new Date(interviewDate).toLocaleDateString(
          'ru-RU',
          {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          }
        );
        prompt += `, запланировано на ${formattedDate}`;
      }

      prompt += `\n`;
    }

    // Добавляем начало ответа ассистента
    prompt += `\n/* Ассистент (отвечает на вопрос по программированию):\n`;

    return prompt;
  } else {
    // Стандартный формат для инструкционных моделей (Llama, Mistral и т.д.)
    let prompt = `<s>[INST] Ты - опытный Frontend разработчик, отвечающий на вопросы по собеседованию.
Дай подробный, но лаконичный ответ, включающий примеры кода, где это уместно.
Структурируй ответ с использованием маркдауна для лучшей читаемости.

Вопрос: ${question}`;

    // Добавляем информацию о компании и дате собеседования, если они указаны
    if (company) {
      prompt += `\n\nЯ готовлюсь к собеседованию в компанию "${company}".`;

      if (interviewDate) {
        const formattedDate = new Date(interviewDate).toLocaleDateString(
          'ru-RU',
          {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          }
        );
        prompt += ` Собеседование запланировано на ${formattedDate}.`;
      }

      prompt += ` Учитывай это при ответе, особенно если вопрос связан с технологиями или подходами, которые могут быть специфичны для этой компании.`;
    }

    prompt += ' [/INST]</s>';

    return prompt;
  }
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
 * Парсит ответ от Hugging Face Inference API
 * @param {Object} response - Ответ от API
 * @returns {Object} - Объект с распарсенным ответом и метаданными
 */
function parseResponse(response, isStarcoder = false) {
  try {
    console.log('Парсинг ответа от Hugging Face API');

    // Проверяем наличие необходимых полей в ответе
    if (!response || !Array.isArray(response) || response.length === 0) {
      console.error(
        'Некорректный формат ответа от Hugging Face API:',
        response
      );
      throw new Error('Некорректный формат ответа от Hugging Face API');
    }

    // Извлекаем текст ответа
    let answerText = response[0]?.generated_text || '';

    // Для модели starcoder2-7b требуется специальная обработка ответа в формате чата
    if (isStarcoder) {
      // Проверяем, содержит ли ответ закрывающий комментарий
      const hasClosingComment = answerText.includes('*/');

      if (hasClosingComment) {
        // Извлекаем только содержимое между /* и */
        const match = answerText.match(/\/\* Ассистент[^]*?(?=\*\/)/);
        if (match) {
          answerText = match[0].replace(/\/\* Ассистент[^]*?:\n/, '').trim();
        } else {
          // Если не удалось найти точное соответствие, используем более общий подход
          answerText = answerText.split('/*')[1].split('*/')[0].trim();
          // Удаляем первую строку, если она содержит "Ассистент"
          const lines = answerText.split('\n');
          if (lines[0].includes('Ассистент')) {
            answerText = lines.slice(1).join('\n').trim();
          }
        }
      } else {
        // Если нет закрывающего комментария, просто очищаем начало
        answerText = answerText.replace(/\/\* Ассистент[^]*?:\n/, '').trim();
      }

      // Форматируем ответ для лучшей читаемости
      // Определяем, содержит ли ответ код
      const containsCode =
        answerText.includes('```') ||
        answerText.includes('function ') ||
        answerText.includes('class ') ||
        answerText.includes('const ') ||
        answerText.includes('let ') ||
        answerText.includes('var ') ||
        answerText.includes('import ') ||
        answerText.includes('export ');

      // Если ответ не содержит блоки кода и похож на код, оборачиваем его
      if (containsCode && !answerText.includes('```')) {
        answerText = '```\n' + answerText + '\n```';
      }

      // Если ответ пустой или слишком короткий, добавляем сообщение
      if (!answerText || answerText.length < 50) {
        answerText =
          (answerText ? '```\n' + answerText + '\n```\n\n' : '') +
          'Модель starcoder2-7b специализируется на генерации кода. Для получения более подробных ответов на общие вопросы рекомендуется использовать другие модели, такие как Llama-2 или Mistral.';
      }
    }
    console.log(
      'Извлеченный текст ответа:',
      answerText.substring(0, 100) + '...'
    );

    // Примерная оценка использования токенов
    // В будущем можно добавить более точный расчет, если API будет предоставлять эту информацию
    const inputTokens = Math.ceil(JSON.stringify(response).length / 4);
    const outputTokens = Math.ceil(answerText.length / 4);
    const totalTokens = inputTokens + outputTokens;

    // Рассчитываем примерную стоимость запроса
    // Цены могут меняться, поэтому это приблизительная оценка
    // Hugging Face Inference API имеет разные цены в зависимости от модели
    // Здесь используем примерную оценку для моделей Llama
    const apiCost = totalTokens * 0.000002; // Примерная оценка

    return {
      answer: answerText,
      tokensUsed: totalTokens,
      apiCost: apiCost,
      inputTokens: inputTokens,
      outputTokens: outputTokens,
    };
  } catch (error) {
    console.error('Ошибка при парсинге ответа от Hugging Face API:', error);
    throw new Error(`Ошибка при парсинге ответа: ${error.message}`);
  }
}

/**
 * Проверяет, не превышен ли лимит запросов для пользователя
 * @param {string} userId - ID пользователя
 * @returns {Promise<boolean>} - true, если лимит не превышен, false в противном случае
 */
async function checkUserLimits(userId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return await withPrisma(async (prisma) => {
    // Получаем настройки API
    const settings = await prisma.interviewAssistantSettings.findFirst({
      where: { isActive: true, apiType: 'huggingface' },
    });

    if (!settings) {
      throw new Error('Настройки API не найдены или неактивны');
    }

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

    // Если статистики нет или количество вопросов меньше лимита, возвращаем true
    if (!usage || usage.questionsCount < settings.maxQuestionsPerDay) {
      return true;
    }

    return false;
  });
}

/**
 * Основная функция для получения ответа на вопрос
 * @param {string} question - Вопрос пользователя
 * @param {string} userId - ID пользователя
 * @param {string} category - Категория вопроса (опционально)
 * @param {string} company - Название компании (опционально)
 * @param {Date} interviewDate - Дата собеседования (опционально)
 * @param {boolean} forceRefresh - Принудительно запросить новый ответ, игнорируя кэш
 * @returns {Promise<Object>} - Объект с ответом и метаданными
 */
/**
 * Проверяет доступность модели Hugging Face перед отправкой основного запроса
 * @param {string} baseUrl - Базовый URL API с моделью
 * @param {string} apiKey - API ключ
 * @returns {Promise<boolean>} - true, если модель доступна, false в противном случае
 */
async function checkModelAvailability(baseUrl, apiKey) {
  try {
    console.log(`Проверка доступности модели: ${baseUrl}`);

    // Отправляем POST запрос с минимальным промптом для проверки доступности
    // POST более надежен, чем HEAD, так как некоторые API могут не поддерживать HEAD
    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        inputs: 'Hello',
        parameters: {
          max_new_tokens: 5,
        },
      }),
    });

    console.log('Результат проверки доступности модели:', {
      url: baseUrl,
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries([...response.headers.entries()]),
    });

    // Если получили ответ 200 OK, модель доступна
    if (response.ok) {
      return true;
    }

    // Если получили 404 Not Found или другую ошибку, модель недоступна
    console.log(`Модель недоступна: ${baseUrl}, статус: ${response.status}`);
    return false;
  } catch (error) {
    console.error('Ошибка при проверке доступности модели:', {
      url: baseUrl,
      error: error.message,
      stack: error.stack,
    });
    return false;
  }
}

/**
 * Получает резервную модель, если основная недоступна
 * @returns {string} - Имя резервной модели
 */
function getFallbackModels() {
  // Расширенный список резервных моделей в порядке предпочтения
  // Включает как большие, так и маленькие модели для повышения шансов найти доступную
  const fallbackModels = [
    'bigcode/starcoder2-7b', // Легковесная модель для программирования с поддержкой русского языка
    'mistralai/Mistral-7B-Instruct-v0.2',
    'meta-llama/Llama-2-7b-chat-hf',
    'gpt2',
    'distilgpt2',
    'facebook/bart-base',
    'google/flan-t5-small',
    'gpt2-medium',
    'EleutherAI/gpt-neo-125M',
    'microsoft/DialoGPT-small',
    'bert-base-uncased',
  ];

  // Возвращаем весь список моделей для последовательной проверки
  return fallbackModels;
}

async function getAnswer(
  question,
  userId,
  category = null,
  company = null,
  interviewDate = null,
  forceRefresh = false,
  chatHistory = []
) {
  try {
    // Проверяем, не превышен ли лимит запросов для пользователя
    const isWithinLimits = await checkUserLimits(userId);
    if (!isWithinLimits) {
      throw new Error('Превышен дневной лимит запросов к API');
    }

    // Проверяем наличие кэшированного ответа, если не требуется принудительное обновление
    let cachedResponse = null;
    if (!forceRefresh) {
      cachedResponse = await getCachedResponse(question);
    }

    if (cachedResponse && cachedResponse.answer) {
      // Сохраняем вопрос и ответ в истории пользователя
      await saveQuestionAnswer(
        userId,
        question,
        cachedResponse.answer,
        category,
        company,
        interviewDate
      );

      // Логируем использование кэша (с минимальными затратами токенов)
      await logUsage(userId, 0, 0, company, interviewDate);

      return {
        answer: cachedResponse.answer,
        fromCache: true,
        tokensUsed: 0,
        apiCost: 0,
      };
    }

    // Получаем настройки API с учетом пользовательских настроек
    const settings = await getApiSettings(userId);

    // Получаем модель из настроек
    const model = settings.model;

    // Форматируем промпт для API с учетом компании, даты собеседования, модели и истории чата
    const prompt = formatMessages(
      question,
      company,
      interviewDate,
      model,
      chatHistory
    );

    // Определяем базовый URL для API и модель
    let baseUrl = `${settings.baseUrl}/${settings.model}`;
    console.log(`Используется базовый URL API: ${baseUrl}`);

    // Проверяем доступность основной модели
    let isModelAvailable = await checkModelAvailability(
      baseUrl,
      settings.apiKey
    );

    // Если основная модель недоступна, последовательно пробуем резервные модели
    if (!isModelAvailable) {
      console.log(
        `Основная модель недоступна: ${settings.model}. Пробуем резервные модели.`
      );

      // Получаем список резервных моделей
      const fallbackModels = getFallbackModels();
      let foundAvailableModel = false;

      // Перебираем все резервные модели, пока не найдем доступную
      for (const fallbackModel of fallbackModels) {
        console.log(`Проверяем резервную модель: ${fallbackModel}`);
        const fallbackUrl = `${settings.baseUrl}/${fallbackModel}`;

        // Проверяем доступность текущей резервной модели
        const isFallbackAvailable = await checkModelAvailability(
          fallbackUrl,
          settings.apiKey
        );

        if (isFallbackAvailable) {
          console.log(`Найдена доступная резервная модель: ${fallbackModel}`);
          baseUrl = fallbackUrl;
          foundAvailableModel = true;
          break;
        }
      }

      // Если ни одна модель не доступна, возвращаем локальный резервный ответ
      if (!foundAvailableModel) {
        console.log(
          'Все модели недоступны, используем локальный резервный ответ'
        );
        const fallbackAnswer =
          'Извините, в данный момент сервис генерации ответов недоступен. Пожалуйста, попробуйте позже или обратитесь в поддержку.';

        // Сохраняем информацию об ошибке
        await saveQuestionAnswer(
          userId,
          question,
          fallbackAnswer,
          category,
          company,
          interviewDate
        );

        return {
          answer: fallbackAnswer,
          fromCache: false,
          tokensUsed: 0,
          apiCost: 0,
          error: 'API недоступно',
        };
      }
    }

    // Отправляем запрос к Hugging Face Inference API
    console.log('Отправка запроса к Hugging Face API:', {
      baseUrl,
      hasApiKey: !!settings.apiKey,
      apiKeyPrefix: settings.apiKey
        ? settings.apiKey.substring(0, 5) + '...'
        : '',
      promptLength: prompt.length,
      promptPreview: prompt.substring(0, 50) + '...',
      temperature: settings.temperature || 0.7,
      maxTokens: settings.maxTokensPerQuestion || 512,
    });

    // Выполняем запрос к API
    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${settings.apiKey}`,
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          temperature: isStarcoder ? 0.2 : settings.temperature || 0.7, // Более низкая температура для starcoder2-7b
          max_new_tokens: isStarcoder
            ? 1024
            : settings.maxTokensPerQuestion || 512, // Больше токенов для starcoder2-7b
          return_full_text: false,
          top_p: isStarcoder ? 0.95 : 1.0, // Добавляем top_p для starcoder2-7b
          do_sample: true, // Включаем семплирование для более разнообразных ответов
        },
      }),
    });

    // Проверяем статус ответа
    console.log('Получен ответ от Hugging Face API:', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries([...response.headers.entries()]),
    });

    // Сначала проверяем статус ответа перед попыткой парсинга
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Ошибка API (статус не OK):', {
        status: response.status,
        statusText: response.statusText,
        errorText: errorText,
      });
      throw new Error(
        `Ошибка API (${response.status}): ${errorText || response.statusText}`
      );
    }

    // Получаем данные ответа - читаем тело ответа только один раз
    let responseData;
    let responseText;

    try {
      // Клонируем ответ, чтобы иметь возможность прочитать тело в разных форматах
      const responseClone = response.clone();

      // Пытаемся прочитать как JSON
      try {
        responseText = await responseClone.text();
        console.log(
          'Текст ответа от API (первые 100 символов):',
          responseText.substring(0, 100) +
            (responseText.length > 100 ? '...' : '')
        );

        // Проверяем, что текст ответа не пустой и похож на JSON
        if (
          !responseText ||
          responseText.trim() === '' ||
          (responseText.trim() !== 'Not Found' &&
            !responseText.trim().startsWith('{') &&
            !responseText.trim().startsWith('['))
        ) {
          throw new Error(`Получен некорректный ответ: ${responseText}`);
        }

        // Если ответ "Not Found", выбрасываем специфическую ошибку
        if (responseText.trim() === 'Not Found') {
          throw new Error(`Модель не найдена: ${baseUrl}`);
        }

        // Парсим JSON
        responseData = JSON.parse(responseText);

        console.log('Данные ответа от Hugging Face API (JSON):', {
          dataType: typeof responseData,
          isArray: Array.isArray(responseData),
          length: Array.isArray(responseData) ? responseData.length : 0,
          firstItem:
            Array.isArray(responseData) && responseData.length > 0
              ? { hasGeneratedText: !!responseData[0]?.generated_text }
              : null,
        });
      } catch (jsonError) {
        console.error('Ошибка при парсинге JSON ответа:', {
          error: jsonError.message,
          responseText: responseText,
        });
        throw new Error(
          `Ошибка при парсинге JSON ответа: ${jsonError.message}, текст ответа: ${responseText}`
        );
      }
    } catch (error) {
      console.error('Ошибка при чтении ответа:', {
        message: error.message,
        stack: error.stack,
      });
      throw new Error(`Ошибка при чтении ответа: ${error.message}`);
    }

    // Если ответ успешный, но данные не удалось прочитать как JSON
    if (!responseData) {
      throw new Error('Не удалось получить данные от API в формате JSON');
    }

    // Используем полученные данные
    const data = responseData;

    // Парсим ответ с учетом типа модели
    const isStarcoder = settings.model && settings.model.includes('starcoder2');
    const parsedResponse = parseResponse(data, isStarcoder);

    // Если это starcoder2-7b, добавляем информацию о модели в ответ
    if (isStarcoder && !parsedResponse.answer.includes('starcoder2-7b')) {
      parsedResponse.modelInfo =
        'Ответ сгенерирован моделью starcoder2-7b, специализирующейся на программировании.';
    }

    // Кэшируем ответ
    await cacheResponse(question, parsedResponse.answer);

    // Сохраняем вопрос и ответ в истории пользователя с информацией о компании и дате собеседования
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
      inputTokens: parsedResponse.inputTokens,
      outputTokens: parsedResponse.outputTokens,
    };
  } catch (error) {
    console.error('Ошибка при получении ответа от API:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });
    throw new Error(`Ошибка при получении ответа: ${error.message}`);
  }
}

module.exports = {
  getAnswer,
  formatMessages,
  parseResponse,
  cacheResponse,
  getCachedResponse,
  logUsage,
  saveQuestionAnswer,
  checkUserLimits,
  getApiSettings,
  isValidAnswer,
  generateQuestionHash,
  decryptApiKey,
};
