import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * API роут для управления настройками API пользователя
 * GET /api/user/api-settings - получить настройки API пользователя
 * PUT /api/user/api-settings - обновить настройки API пользователя
 */
export default async function handler(req, res) {
  try {
    // Получаем сессию пользователя
    const session = await getServerSession(req, res, authOptions);

    if (!session || !session.user) {
      return res.status(401).json({ error: 'Не авторизован' });
    }

    // Получаем пользователя из базы данных
    const user = await prisma.user.findUnique({
      where: {
        email: session.user.email,
      },
      select: {
        id: true,
        email: true,
        name: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    if (req.method === 'GET') {
      return await handleGetSettings(req, res, user.id);
    } else if (req.method === 'PUT') {
      return await handleUpdateSettings(req, res, user.id);
    } else {
      return res.status(405).json({ error: 'Метод не поддерживается' });
    }
  } catch (error) {
    console.error('Ошибка в API роуте настроек:', error);
    return res.status(500).json({
      error: 'Внутренняя ошибка сервера',
      details:
        process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Обработчик GET запроса - получение настроек API пользователя
 */
async function handleGetSettings(req, res, userId) {
  try {
    // Получаем настройки API пользователя
    let apiSettings = await prisma.userApiSettings.findUnique({
      where: {
        userId: userId,
      },
    });

    // Если настройки не найдены, создаем запись с настройками по умолчанию
    if (!apiSettings) {
      apiSettings = await prisma.userApiSettings.create({
        data: {
          userId: userId,
          useCustomApi: false,
          apiType: 'anthropic',
          baseUrl: 'https://api.anthropic.com',
          langdockBaseUrl:
            'https://api.langdock.com/assistant/v1/chat/completions',
          langdockRegion: 'eu',
          geminiBaseUrl: 'https://generativelanguage.googleapis.com',
          geminiModel: 'gemini-1.5-pro',
          geminiTemperature: 0.7,
          huggingfaceBaseUrl: 'https://api-inference.huggingface.co/models',
          huggingfaceModel: 'meta-llama/Llama-2-7b-chat-hf',
          huggingfaceTemperature: 0.7,
          huggingfaceMaxTokens: 4000,
          openRouterBaseUrl: 'https://openrouter.ai/api/v1',
          openRouterModel: 'google/gemma-3-12b-it:free',
          openRouterTemperature: 0.7,
          openRouterMaxTokens: 4000,
        },
      });
    }

    // Преобразуем данные для фронтенда
    const responseData = {
      apiKey: apiSettings.apiKey || '',
      baseUrl: apiSettings.baseUrl || 'https://api.anthropic.com',
      usePersonalSettings: apiSettings.useCustomApi || false,
      apiType: apiSettings.apiType || 'anthropic',
      langdockApiKey: apiSettings.langdockApiKey || '',
      langdockAssistantId: apiSettings.langdockAssistantId || '',
      langdockBaseUrl:
        apiSettings.langdockBaseUrl ||
        'https://api.langdock.com/assistant/v1/chat/completions',
      langdockRegion: apiSettings.langdockRegion || 'eu',
      geminiApiKey: apiSettings.geminiApiKey || '',
      geminiModel: apiSettings.geminiModel || 'gemini-1.5-pro',
      geminiBaseUrl:
        apiSettings.geminiBaseUrl ||
        'https://generativelanguage.googleapis.com',
      geminiTemperature: apiSettings.geminiTemperature || 0.7,
      huggingfaceApiKey: apiSettings.huggingfaceApiKey || '',
      huggingfaceModel:
        apiSettings.huggingfaceModel || 'meta-llama/Llama-2-7b-chat-hf',
      huggingfaceBaseUrl:
        apiSettings.huggingfaceBaseUrl ||
        'https://api-inference.huggingface.co/models',
      huggingfaceTemperature: apiSettings.huggingfaceTemperature || 0.7,
      huggingfaceMaxTokens: apiSettings.huggingfaceMaxTokens || 4000,
      openRouterApiKey: apiSettings.openRouterApiKey || '',
      openRouterModel:
        apiSettings.openRouterModel || 'google/gemma-3-12b-it:free',
      openRouterBaseUrl:
        apiSettings.openRouterBaseUrl || 'https://openrouter.ai/api/v1',
      openRouterTemperature: apiSettings.openRouterTemperature || 0.7,
      openRouterMaxTokens: apiSettings.openRouterMaxTokens || 4000,
    };

    console.log('Настройки API успешно получены для пользователя:', userId);
    return res.status(200).json(responseData);
  } catch (error) {
    console.error('Ошибка при получении настроек API:', error);
    throw error;
  }
}

/**
 * Обработчик PUT запроса - обновление настроек API пользователя
 */
async function handleUpdateSettings(req, res, userId) {
  try {
    const {
      useCustomApi,
      apiType,
      apiKey,
      baseUrl,
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

    // Валидация входных данных
    if (typeof useCustomApi !== 'boolean') {
      return res
        .status(400)
        .json({ error: 'Поле useCustomApi должно быть булевым значением' });
    }

    if (!apiType || typeof apiType !== 'string') {
      return res
        .status(400)
        .json({ error: 'Поле apiType обязательно и должно быть строкой' });
    }

    const validApiTypes = [
      'anthropic',
      'langdock',
      'gemini',
      'huggingface',
      'openrouter',
    ];
    if (!validApiTypes.includes(apiType)) {
      return res.status(400).json({
        error: `Недопустимый тип API. Допустимые значения: ${validApiTypes.join(
          ', '
        )}`,
      });
    }

    // Валидация обязательных полей в зависимости от типа API
    if (useCustomApi) {
      if (apiType === 'anthropic' && !apiKey) {
        return res
          .status(400)
          .json({ error: 'API ключ обязателен для Anthropic API' });
      }
      if (apiType === 'langdock' && !langdockApiKey) {
        return res
          .status(400)
          .json({ error: 'API ключ обязателен для LangDock API' });
      }
      if (apiType === 'gemini' && !geminiApiKey) {
        return res
          .status(400)
          .json({ error: 'API ключ обязателен для Gemini API' });
      }
      if (apiType === 'huggingface' && !huggingfaceApiKey) {
        return res
          .status(400)
          .json({ error: 'API ключ обязателен для Hugging Face API' });
      }
      if (apiType === 'openrouter' && !openRouterApiKey) {
        return res
          .status(400)
          .json({ error: 'API ключ обязателен для OpenRouter API' });
      }
    }

    // Подготавливаем данные для обновления
    const updateData = {
      useCustomApi: useCustomApi,
      apiType: apiType,
      updatedAt: new Date(),
    };

    // Добавляем поля в зависимости от типа API
    if (apiType === 'anthropic') {
      updateData.apiKey = apiKey || null;
      updateData.baseUrl = baseUrl || 'https://api.anthropic.com';
    } else if (apiType === 'langdock') {
      updateData.langdockApiKey = langdockApiKey || null;
      updateData.langdockAssistantId = langdockAssistantId || null;
      updateData.langdockBaseUrl =
        langdockBaseUrl ||
        'https://api.langdock.com/assistant/v1/chat/completions';
      updateData.langdockRegion = langdockRegion || 'eu';
    } else if (apiType === 'gemini') {
      updateData.geminiApiKey = geminiApiKey || null;
      updateData.geminiModel = geminiModel || 'gemini-1.5-pro';
      updateData.geminiBaseUrl =
        geminiBaseUrl || 'https://generativelanguage.googleapis.com';
      updateData.geminiTemperature = geminiTemperature || 0.7;
    } else if (apiType === 'huggingface') {
      updateData.huggingfaceApiKey = huggingfaceApiKey || null;
      updateData.huggingfaceModel =
        huggingfaceModel || 'meta-llama/Llama-2-7b-chat-hf';
      updateData.huggingfaceBaseUrl =
        huggingfaceBaseUrl || 'https://api-inference.huggingface.co/models';
      updateData.huggingfaceTemperature = huggingfaceTemperature || 0.7;
      updateData.huggingfaceMaxTokens = huggingfaceMaxTokens || 4000;
    } else if (apiType === 'openrouter') {
      updateData.openRouterApiKey = openRouterApiKey || null;
      updateData.openRouterModel =
        openRouterModel || 'google/gemma-3-12b-it:free';
      updateData.openRouterBaseUrl =
        openRouterBaseUrl || 'https://openrouter.ai/api/v1';
      updateData.openRouterTemperature = openRouterTemperature || 0.7;
      updateData.openRouterMaxTokens = openRouterMaxTokens || 4000;
    }

    // Обновляем или создаем настройки API
    const apiSettings = await prisma.userApiSettings.upsert({
      where: {
        userId: userId,
      },
      update: updateData,
      create: {
        userId: userId,
        ...updateData,
      },
    });

    // Преобразуем данные для ответа
    const responseSettings = {
      apiKey: apiSettings.apiKey || '',
      baseUrl: apiSettings.baseUrl || 'https://api.anthropic.com',
      usePersonalSettings: apiSettings.useCustomApi || false,
      apiType: apiSettings.apiType || 'anthropic',
      langdockApiKey: apiSettings.langdockApiKey || '',
      langdockAssistantId: apiSettings.langdockAssistantId || '',
      langdockBaseUrl:
        apiSettings.langdockBaseUrl ||
        'https://api.langdock.com/assistant/v1/chat/completions',
      langdockRegion: apiSettings.langdockRegion || 'eu',
      geminiApiKey: apiSettings.geminiApiKey || '',
      geminiModel: apiSettings.geminiModel || 'gemini-1.5-pro',
      geminiBaseUrl:
        apiSettings.geminiBaseUrl ||
        'https://generativelanguage.googleapis.com',
      geminiTemperature: apiSettings.geminiTemperature || 0.7,
      huggingfaceApiKey: apiSettings.huggingfaceApiKey || '',
      huggingfaceModel:
        apiSettings.huggingfaceModel || 'meta-llama/Llama-2-7b-chat-hf',
      huggingfaceBaseUrl:
        apiSettings.huggingfaceBaseUrl ||
        'https://api-inference.huggingface.co/models',
      huggingfaceTemperature: apiSettings.huggingfaceTemperature || 0.7,
      huggingfaceMaxTokens: apiSettings.huggingfaceMaxTokens || 4000,
      openRouterApiKey: apiSettings.openRouterApiKey || '',
      openRouterModel:
        apiSettings.openRouterModel || 'google/gemma-3-12b-it:free',
      openRouterBaseUrl:
        apiSettings.openRouterBaseUrl || 'https://openrouter.ai/api/v1',
      openRouterTemperature: apiSettings.openRouterTemperature || 0.7,
      openRouterMaxTokens: apiSettings.openRouterMaxTokens || 4000,
    };

    console.log('Настройки API успешно обновлены для пользователя:', userId);
    return res.status(200).json({
      message: 'Настройки API успешно сохранены',
      settings: responseSettings,
    });
  } catch (error) {
    console.error('Ошибка при обновлении настроек API:', error);
    throw error;
  }
}
