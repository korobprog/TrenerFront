import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import prisma from '../../../prisma/client';
import crypto from 'crypto';

/**
 * Функция для шифрования API ключа
 * @param {string} apiKey - API ключ для шифрования
 * @returns {string} - Зашифрованный API ключ
 */
function encryptApiKey(apiKey) {
  if (!apiKey) return null;

  try {
    // Используем простое шифрование с помощью crypto
    // В реальном приложении следует использовать более надежное шифрование
    // и хранить ключ шифрования в переменных окружения
    const algorithm = 'aes-256-ctr';
    const secretKey =
      process.env.API_KEY_SECRET || 'default-secret-key-for-api-encryption';

    // Убедимся, что secretKey имеет правильную длину для алгоритма aes-256-ctr (32 байта)
    const key = crypto
      .createHash('sha256')
      .update(String(secretKey))
      .digest('base64')
      .substr(0, 32);

    const iv = crypto.randomBytes(16);

    const cipher = crypto.createCipheriv(algorithm, key, iv);
    const encrypted = Buffer.concat([cipher.update(apiKey), cipher.final()]);

    return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
  } catch (error) {
    console.error('Ошибка при шифровании API ключа:', error);
    return null;
  }
}

/**
 * Функция для расшифровки API ключа
 * @param {string} encryptedApiKey - Зашифрованный API ключ
 * @returns {string} - Расшифрованный API ключ
 */
function decryptApiKey(encryptedApiKey) {
  if (!encryptedApiKey) return '';

  try {
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

    return decrypted.toString();
  } catch (error) {
    console.error('Ошибка при расшифровке API ключа:', error);
    return '';
  }
}

/**
 * Обработчик API запросов для управления настройками API пользователя
 * @param {Object} req - HTTP запрос
 * @param {Object} res - HTTP ответ
 */
export default async function handler(req, res) {
  // Добавляем детальные логи для отладки запроса
  console.log('API user/api-settings: Детали запроса', {
    method: req.method,
    query: JSON.stringify(req.query),
    cookies: req.headers.cookie,
  });

  // Проверяем авторизацию пользователя
  const session = await getServerSession(req, res, authOptions);

  // Добавляем детальные логи для отладки сессии
  console.log('API user/api-settings: Детали сессии', {
    id: session?.user?.id,
    email: session?.user?.email,
    role: session?.user?.role,
    timestamp: session?.timestamp,
  });

  if (!session) {
    console.log('API user/api-settings: Сессия отсутствует, возвращаем 401');
    return res.status(401).json({ message: 'Необходима авторизация' });
  }

  // Обработка GET запроса - получение настроек API пользователя
  if (req.method === 'GET') {
    try {
      console.log('Получение настроек API для пользователя:', session.user.id);

      // Проверяем наличие общего ключа API
      const globalApiSettings =
        await prisma.interviewAssistantSettings.findFirst({
          where: { isActive: true },
        });

      console.log(
        'Глобальные настройки API:',
        globalApiSettings ? 'найдены' : 'не найдены'
      );

      // Получаем настройки API пользователя из базы данных
      // Добавляем обработку ошибок и повторные попытки
      let apiSettings = null;
      let retryCount = 3;

      while (retryCount > 0) {
        try {
          // Используем prisma напрямую вместо withPrisma
          apiSettings = await prisma.userApiSettings.findUnique({
            where: { userId: session.user.id },
          });
          break; // Если успешно, выходим из цикла
        } catch (retryError) {
          retryCount--;
          console.error(
            `Ошибка при получении настроек API, попытка ${3 - retryCount}/3:`,
            retryError
          );

          if (retryCount === 0) {
            throw retryError; // Если все попытки исчерпаны, пробрасываем ошибку
          }

          // Ждем перед следующей попыткой
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }

      // Если настройки не найдены, возвращаем настройки по умолчанию
      if (!apiSettings) {
        console.log(
          'Настройки API не найдены, возвращаем настройки по умолчанию'
        );

        // Проверяем наличие глобального ключа API
        if (!globalApiSettings) {
          console.error(
            'Глобальный ключ API не найден. Это может вызвать проблемы при использовании API.'
          );
        }

        // Добавляем все необходимые поля в настройки по умолчанию
        const defaultSettings = {
          apiKey: '',
          baseUrl: '',
          usePersonalSettings: false,
          apiType: 'gemini',
          langdockApiKey: '',
          langdockAssistantId: '',
          langdockBaseUrl:
            'https://api.langdock.com/assistant/v1/chat/completions',
          langdockRegion: 'eu',
          geminiApiKey: '',
          geminiModel: 'gemini-1.5-pro',
          geminiBaseUrl: 'https://generativelanguage.googleapis.com',
          geminiTemperature: 0.7,
          huggingfaceApiKey: '',
          huggingfaceModel: 'meta-llama/Llama-2-7b-chat-hf',
          huggingfaceBaseUrl: 'https://api-inference.huggingface.co/models',
          huggingfaceTemperature: 0.7,
          huggingfaceMaxTokens: 4000,
          openRouterApiKey: '',
          openRouterModel: 'google/gemma-3-12b-it:free',
          openRouterBaseUrl: 'https://openrouter.ai/api/v1',
          openRouterTemperature: 0.7,
          openRouterMaxTokens: 4000,
        };

        console.log('Возвращаем настройки по умолчанию:', defaultSettings);
        return res.status(200).json(defaultSettings);
      }

      console.log('Настройки API успешно получены');

      // Подготавливаем данные для ответа
      const responseData = {
        apiKey: apiSettings.apiKey ? decryptApiKey(apiSettings.apiKey) : '',
        baseUrl: apiSettings.baseUrl || '',
        usePersonalSettings: apiSettings.useCustomApi === true, // Явно преобразуем в boolean
        apiType: apiSettings.apiType || 'anthropic',
        langdockApiKey: apiSettings.langdockApiKey
          ? decryptApiKey(apiSettings.langdockApiKey)
          : '',
        langdockAssistantId: apiSettings.langdockAssistantId || '',
        langdockBaseUrl:
          apiSettings.langdockBaseUrl ||
          'https://api.langdock.com/assistant/v1/chat/completions',
        langdockRegion: apiSettings.langdockRegion || 'eu',
        geminiApiKey: apiSettings.geminiApiKey
          ? decryptApiKey(apiSettings.geminiApiKey)
          : '',
        geminiModel: apiSettings.geminiModel || 'gemini-1.5-pro',
        geminiBaseUrl:
          apiSettings.geminiBaseUrl ||
          'https://generativelanguage.googleapis.com',
        geminiTemperature: apiSettings.geminiTemperature || 0.7,
        huggingfaceApiKey: apiSettings.huggingfaceApiKey
          ? decryptApiKey(apiSettings.huggingfaceApiKey)
          : '',
        huggingfaceModel:
          apiSettings.huggingfaceModel || 'meta-llama/Llama-2-7b-chat-hf',
        huggingfaceBaseUrl:
          apiSettings.huggingfaceBaseUrl ||
          'https://api-inference.huggingface.co/models',
        huggingfaceTemperature: apiSettings.huggingfaceTemperature || 0.7,
        huggingfaceMaxTokens: apiSettings.huggingfaceMaxTokens || 4000,
        openRouterApiKey: apiSettings.openRouterApiKey
          ? decryptApiKey(apiSettings.openRouterApiKey)
          : '',
        openRouterModel:
          apiSettings.openRouterModel || 'google/gemma-3-12b-it:free',
        openRouterBaseUrl:
          apiSettings.openRouterBaseUrl || 'https://openrouter.ai/api/v1',
        openRouterTemperature: apiSettings.openRouterTemperature || 0.7,
        openRouterMaxTokens: apiSettings.openRouterMaxTokens || 4000,
      };

      console.log('Возвращаем настройки API пользователя:', {
        usePersonalSettings: responseData.usePersonalSettings,
        apiType: responseData.apiType,
        hasApiKey: !!responseData.apiKey,
        hasLangdockApiKey: !!responseData.langdockApiKey,
        hasGeminiApiKey: !!responseData.geminiApiKey,
        hasHuggingfaceApiKey: !!responseData.huggingfaceApiKey,
        hasOpenRouterApiKey: !!responseData.openRouterApiKey,
        hasGeminiApiKey: !!responseData.geminiApiKey,
        hasOpenRouterApiKey: !!responseData.openRouterApiKey,
      });

      // Возвращаем настройки API пользователя
      return res.status(200).json(responseData);
    } catch (error) {
      console.error('Ошибка при получении настроек API пользователя:', error);
      console.error('Детали ошибки при получении настроек API пользователя:', {
        message: error.message,
        stack: error.stack,
      });

      return res.status(500).json({
        message: 'Ошибка сервера при получении настроек API пользователя',
        error: error.message,
        code: 'API_SETTINGS_FETCH_ERROR',
      });
    }
  }

  // Обработка PUT запроса - обновление настроек API пользователя
  if (req.method === 'PUT') {
    try {
      console.log('Обновление настроек API для пользователя:', session.user.id);

      // Получаем данные из тела запроса
      const {
        apiKey,
        baseUrl,
        useCustomApi,
        apiType,
        langdockApiKey,
        langdockAssistantId,
        langdockBaseUrl,
        langdockRegion,
        geminiApiKey,
        geminiModel,
        geminiBaseUrl,
        geminiTemperature,
        huggingfaceApiKey,
        huggingfaceModel,
        huggingfaceBaseUrl,
        huggingfaceTemperature,
        huggingfaceMaxTokens,
        openRouterApiKey,
        openRouterModel,
        openRouterBaseUrl,
        openRouterTemperature,
        openRouterMaxTokens,
      } = req.body;

      // Используем useCustomApi вместо usePersonalSettings
      const usePersonalSettings = useCustomApi === true;

      // Проверяем обязательные поля, если включено использование персональных настроек
      if (usePersonalSettings) {
        if (apiType === 'anthropic' && !apiKey) {
          return res.status(400).json({
            message:
              'API ключ Anthropic обязателен при использовании персональных настроек Anthropic API',
            code: 'MISSING_ANTHROPIC_API_KEY',
          });
        }

        if (apiType === 'langdock' && !langdockApiKey) {
          return res.status(400).json({
            message:
              'API ключ LangDock обязателен при использовании персональных настроек LangDock API',
            code: 'MISSING_LANGDOCK_API_KEY',
          });
        }

        if (apiType === 'gemini' && !geminiApiKey) {
          return res.status(400).json({
            message:
              'API ключ Google Gemini обязателен при использовании персональных настроек Gemini API',
            code: 'MISSING_GEMINI_API_KEY',
          });
        }

        if (apiType === 'huggingface' && !huggingfaceApiKey) {
          return res.status(400).json({
            message:
              'API ключ Hugging Face обязателен при использовании персональных настроек Hugging Face API',
            code: 'MISSING_HUGGINGFACE_API_KEY',
          });
        }

        if (apiType === 'openrouter' && !openRouterApiKey) {
          console.log('Ошибка валидации: отсутствует API ключ OpenRouter', {
            apiType,
            hasOpenRouterApiKey: !!openRouterApiKey,
            requestBody: JSON.stringify(req.body),
          });
          return res.status(400).json({
            message:
              'API ключ OpenRouter обязателен при использовании персональных настроек OpenRouter API',
            code: 'MISSING_OPENROUTER_API_KEY',
          });
        }
      }

      // Проверяем, существуют ли уже настройки API пользователя
      const existingSettings = await prisma.userApiSettings.findUnique({
        where: { userId: session.user.id },
      });

      let updatedSettings;

      // Шифруем API ключи перед сохранением
      const encryptedApiKey =
        usePersonalSettings && apiType === 'anthropic' && apiKey
          ? encryptApiKey(apiKey)
          : null;

      const encryptedLangdockApiKey =
        usePersonalSettings && apiType === 'langdock' && langdockApiKey
          ? encryptApiKey(langdockApiKey)
          : null;

      const encryptedGeminiApiKey =
        usePersonalSettings && apiType === 'gemini' && geminiApiKey
          ? encryptApiKey(geminiApiKey)
          : null;

      const encryptedHuggingfaceApiKey =
        usePersonalSettings && apiType === 'huggingface' && huggingfaceApiKey
          ? encryptApiKey(huggingfaceApiKey)
          : null;

      console.log('Обработка OpenRouter API ключа:', {
        usePersonalSettings,
        apiType,
        hasOpenRouterApiKey: !!openRouterApiKey,
      });

      const encryptedOpenRouterApiKey =
        usePersonalSettings && apiType === 'openrouter' && openRouterApiKey
          ? encryptApiKey(openRouterApiKey)
          : null;

      // Подготавливаем данные для обновления
      const updateData = {
        useCustomApi: usePersonalSettings === true, // Явно преобразуем в boolean
        apiType: apiType || 'anthropic',
      };

      // Добавляем соответствующие поля в зависимости от типа API
      if (apiType === 'anthropic') {
        updateData.apiKey = encryptedApiKey;
        updateData.baseUrl = baseUrl || null;
        // Сохраняем предыдущие настройки LangDock, если они были
        if (existingSettings && existingSettings.langdockApiKey) {
          updateData.langdockApiKey = existingSettings.langdockApiKey;
          updateData.langdockAssistantId = existingSettings.langdockAssistantId;
          updateData.langdockBaseUrl = existingSettings.langdockBaseUrl;
        }
        // Сохраняем предыдущие настройки Gemini, если они были
        if (existingSettings && existingSettings.geminiApiKey) {
          updateData.geminiApiKey = existingSettings.geminiApiKey;
          updateData.geminiModel = existingSettings.geminiModel;
          updateData.geminiBaseUrl = existingSettings.geminiBaseUrl;
          updateData.geminiTemperature = existingSettings.geminiTemperature;
        }
      } else if (apiType === 'langdock') {
        updateData.langdockApiKey = encryptedLangdockApiKey;
        updateData.langdockAssistantId = langdockAssistantId || null;
        updateData.langdockBaseUrl = langdockBaseUrl || null;
        updateData.langdockRegion = langdockRegion || 'eu';
        // Сохраняем предыдущие настройки Anthropic, если они были
        if (existingSettings && existingSettings.apiKey) {
          updateData.apiKey = existingSettings.apiKey;
          updateData.baseUrl = existingSettings.baseUrl;
        }
        // Сохраняем предыдущие настройки Gemini, если они были
        if (existingSettings && existingSettings.geminiApiKey) {
          updateData.geminiApiKey = existingSettings.geminiApiKey;
          updateData.geminiModel = existingSettings.geminiModel;
          updateData.geminiBaseUrl = existingSettings.geminiBaseUrl;
          updateData.geminiTemperature = existingSettings.geminiTemperature;
        }
      } else if (apiType === 'gemini') {
        updateData.geminiApiKey = encryptedGeminiApiKey;
        updateData.geminiModel = geminiModel || 'gemini-1.5-pro';
        updateData.geminiBaseUrl = geminiBaseUrl || null;
        updateData.geminiTemperature = geminiTemperature || 0.7;
        // Сохраняем предыдущие настройки Anthropic, если они были
        if (existingSettings && existingSettings.apiKey) {
          updateData.apiKey = existingSettings.apiKey;
          updateData.baseUrl = existingSettings.baseUrl;
        }
        // Сохраняем предыдущие настройки LangDock, если они были
        if (existingSettings && existingSettings.langdockApiKey) {
          updateData.langdockApiKey = existingSettings.langdockApiKey;
          updateData.langdockAssistantId = existingSettings.langdockAssistantId;
          updateData.langdockBaseUrl = existingSettings.langdockBaseUrl;
        }
        // Сохраняем предыдущие настройки Hugging Face, если они были
        if (existingSettings && existingSettings.huggingfaceApiKey) {
          updateData.huggingfaceApiKey = existingSettings.huggingfaceApiKey;
          updateData.huggingfaceModel = existingSettings.huggingfaceModel;
          updateData.huggingfaceBaseUrl = existingSettings.huggingfaceBaseUrl;
          updateData.huggingfaceTemperature =
            existingSettings.huggingfaceTemperature;
          updateData.huggingfaceMaxTokens =
            existingSettings.huggingfaceMaxTokens;
        }
      } else if (apiType === 'huggingface') {
        updateData.huggingfaceApiKey = encryptedHuggingfaceApiKey;
        updateData.huggingfaceModel =
          huggingfaceModel || 'meta-llama/Llama-2-7b-chat-hf';
        updateData.huggingfaceBaseUrl = huggingfaceBaseUrl || null;
        updateData.huggingfaceTemperature = huggingfaceTemperature || 0.7;
        updateData.huggingfaceMaxTokens = huggingfaceMaxTokens || 4000;
        // Сохраняем предыдущие настройки Anthropic, если они были
        if (existingSettings && existingSettings.apiKey) {
          updateData.apiKey = existingSettings.apiKey;
          updateData.baseUrl = existingSettings.baseUrl;
        }
        // Сохраняем предыдущие настройки LangDock, если они были
        if (existingSettings && existingSettings.langdockApiKey) {
          updateData.langdockApiKey = existingSettings.langdockApiKey;
          updateData.langdockAssistantId = existingSettings.langdockAssistantId;
          updateData.langdockBaseUrl = existingSettings.langdockBaseUrl;
        }
        // Сохраняем предыдущие настройки Gemini, если они были
        if (existingSettings && existingSettings.geminiApiKey) {
          updateData.geminiApiKey = existingSettings.geminiApiKey;
          updateData.geminiModel = existingSettings.geminiModel;
          updateData.geminiBaseUrl = existingSettings.geminiBaseUrl;
          updateData.geminiTemperature = existingSettings.geminiTemperature;
        }
      } else if (apiType === 'openrouter') {
        updateData.openRouterApiKey = encryptedOpenRouterApiKey;
        updateData.openRouterModel =
          openRouterModel || 'google/gemma-3-12b-it:free';
        updateData.openRouterBaseUrl = openRouterBaseUrl || null;
        updateData.openRouterTemperature = openRouterTemperature || 0.7;
        updateData.openRouterMaxTokens = openRouterMaxTokens || 4000;
        // Сохраняем предыдущие настройки Anthropic, если они были
        if (existingSettings && existingSettings.apiKey) {
          updateData.apiKey = existingSettings.apiKey;
          updateData.baseUrl = existingSettings.baseUrl;
        }
        // Сохраняем предыдущие настройки LangDock, если они были
        if (existingSettings && existingSettings.langdockApiKey) {
          updateData.langdockApiKey = existingSettings.langdockApiKey;
          updateData.langdockAssistantId = existingSettings.langdockAssistantId;
          updateData.langdockBaseUrl = existingSettings.langdockBaseUrl;
        }
        // Сохраняем предыдущие настройки Gemini, если они были
        if (existingSettings && existingSettings.geminiApiKey) {
          updateData.geminiApiKey = existingSettings.geminiApiKey;
          updateData.geminiModel = existingSettings.geminiModel;
          updateData.geminiBaseUrl = existingSettings.geminiBaseUrl;
          updateData.geminiTemperature = existingSettings.geminiTemperature;
        }
        // Сохраняем предыдущие настройки Hugging Face, если они были
        if (existingSettings && existingSettings.huggingfaceApiKey) {
          updateData.huggingfaceApiKey = existingSettings.huggingfaceApiKey;
          updateData.huggingfaceModel = existingSettings.huggingfaceModel;
          updateData.huggingfaceBaseUrl = existingSettings.huggingfaceBaseUrl;
          updateData.huggingfaceTemperature =
            existingSettings.huggingfaceTemperature;
          updateData.huggingfaceMaxTokens =
            existingSettings.huggingfaceMaxTokens;
        }
      }

      if (existingSettings) {
        // Обновляем существующие настройки
        updatedSettings = await prisma.userApiSettings.update({
          where: {
            userId: session.user.id,
          },
          data: updateData,
        });

        console.log('Настройки API пользователя успешно обновлены:', {
          userId: session.user.id,
          useCustomApi: updateData.useCustomApi,
          apiType: updateData.apiType,
          hasApiKey: !!updateData.apiKey,
          hasLangdockApiKey: !!updateData.langdockApiKey,
          hasOpenRouterApiKey: !!updateData.openRouterApiKey,
        });
      } else {
        // Создаем новые настройки
        updatedSettings = await prisma.userApiSettings.create({
          data: {
            userId: session.user.id,
            ...updateData,
          },
        });

        console.log('Настройки API пользователя успешно созданы:', {
          userId: session.user.id,
          useCustomApi: updateData.useCustomApi,
          apiType: updateData.apiType,
          hasApiKey: !!updateData.apiKey,
          hasLangdockApiKey: !!updateData.langdockApiKey,
          hasOpenRouterApiKey: !!updateData.openRouterApiKey,
        });
      }

      // Возвращаем обновленные настройки API пользователя
      return res.status(200).json({
        message: 'Настройки API пользователя успешно обновлены',
        settings: {
          apiKey: apiType === 'anthropic' ? apiKey || '' : '',
          baseUrl: baseUrl || '',
          usePersonalSettings: updateData.useCustomApi, // Используем значение из updateData
          apiType,
          langdockApiKey: apiType === 'langdock' ? langdockApiKey || '' : '',
          langdockAssistantId: langdockAssistantId || '',
          langdockBaseUrl: langdockBaseUrl || '',
          langdockRegion: langdockRegion || 'eu',
          geminiApiKey: apiType === 'gemini' ? geminiApiKey || '' : '',
          geminiModel: geminiModel || 'gemini-1.5-pro',
          geminiBaseUrl: geminiBaseUrl || '',
          geminiTemperature: geminiTemperature || 0.7,
          huggingfaceApiKey:
            apiType === 'huggingface' ? huggingfaceApiKey || '' : '',
          huggingfaceModel: huggingfaceModel || 'meta-llama/Llama-2-7b-chat-hf',
          huggingfaceBaseUrl: huggingfaceBaseUrl || '',
          huggingfaceTemperature: huggingfaceTemperature || 0.7,
          huggingfaceMaxTokens: huggingfaceMaxTokens || 4000,
          openRouterApiKey:
            apiType === 'openrouter' ? openRouterApiKey || '' : '',
          openRouterModel: openRouterModel || 'google/gemma-3-12b-it:free',
          openRouterBaseUrl:
            openRouterBaseUrl || 'https://openrouter.ai/api/v1',
          openRouterTemperature: openRouterTemperature || 0.7,
          openRouterMaxTokens: openRouterMaxTokens || 4000,
        },
      });
    } catch (error) {
      console.error('Ошибка при обновлении настроек API пользователя:', error);
      console.error('Детали ошибки при обновлении настроек API пользователя:', {
        message: error.message,
        stack: error.stack,
      });

      return res.status(500).json({
        message: 'Ошибка сервера при обновлении настроек API пользователя',
        error: error.message,
        code: 'API_SETTINGS_UPDATE_ERROR',
      });
    }
  }

  // Если метод запроса не поддерживается
  return res.status(405).json({ message: 'Метод не поддерживается' });
}
