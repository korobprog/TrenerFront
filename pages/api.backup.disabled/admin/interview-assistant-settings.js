import {
  withAdminAuth,
  logAdminAction,
} from '../../../lib/middleware/adminAuth';
import prisma, { withPrisma } from '../../../lib/prisma';

/**
 * Обработчик API запросов для управления настройками интервью-ассистента
 * @param {Object} req - HTTP запрос
 * @param {Object} res - HTTP ответ
 */
async function handler(req, res) {
  console.log(
    'API interview-assistant-settings: Получен запрос на управление настройками'
  );
  console.log('API interview-assistant-settings: Метод запроса:', req.method);
  console.log(
    'API interview-assistant-settings: Информация об администраторе:',
    req.admin
  );

  // Обработка GET запроса - получение настроек
  if (req.method === 'GET') {
    try {
      // Получаем настройки из базы данных
      const settings = await withPrisma(async (prisma) => {
        return await prisma.interviewAssistantSettings.findFirst({
          where: {
            isActive: true,
          },
        });
      });

      // Если настройки не найдены, возвращаем настройки по умолчанию
      if (!settings) {
        return res.status(200).json({
          settings: {
            apiKey: '',
            maxQuestionsPerDay: 10,
            maxTokensPerQuestion: 4000,
            isActive: true,
            apiType: 'anthropic', // По умолчанию используем Anthropic
            langdockAssistantId: '',
            langdockBaseUrl:
              'https://api.langdock.com/assistant/v1/chat/completions',
            langdockRegion: 'eu',
          },
        });
      }

      // Логируем действие администратора
      await logAdminAction(
        req.admin.id,
        'view_interview_assistant_settings',
        'settings',
        settings.id,
        {}
      );

      // Возвращаем настройки
      return res.status(200).json({
        settings,
      });
    } catch (error) {
      // Логируем детали ошибки для диагностики
      console.error(
        'Ошибка при получении настроек интервью-ассистента:',
        error
      );
      console.error(
        'Детали ошибки при получении настроек интервью-ассистента:',
        {
          message: error.message,
          stack: error.stack,
        }
      );

      // Возвращаем более информативное сообщение об ошибке
      return res.status(500).json({
        message: 'Ошибка сервера при получении настроек интервью-ассистента',
        error: error.message,
        code: 'SETTINGS_FETCH_ERROR',
      });
    }
  }

  // Обработка PUT запроса - обновление настроек
  if (req.method === 'PUT') {
    try {
      // Получаем данные из тела запроса
      const {
        apiKey,
        maxQuestionsPerDay,
        maxTokensPerQuestion,
        isActive,
        apiType,
        langdockAssistantId,
        langdockBaseUrl,
        langdockRegion,
        // Поля для OpenRouter
        openRouterApiKey,
        openRouterBaseUrl,
        openRouterModel,
        openRouterTemperature,
        openRouterMaxTokens,
        // Поля для Gemini
        geminiApiKey,
        geminiModel,
        geminiBaseUrl,
        geminiTemperature,
      } = req.body;

      // Проверяем обязательные поля
      if (!apiKey) {
        return res.status(400).json({
          message: 'API ключ обязателен',
          code: 'MISSING_API_KEY',
        });
      }

      // Проверяем тип API
      if (
        apiType !== 'anthropic' &&
        apiType !== 'langdock' &&
        apiType !== 'gemini' &&
        apiType !== 'openrouter'
      ) {
        return res.status(400).json({
          message: 'Неверный тип API',
          code: 'INVALID_API_TYPE',
        });
      }

      // Проверяем обязательные поля для LangDock API
      if (
        apiType === 'langdock' &&
        !langdockAssistantId &&
        !process.env.DEFAULT_LANGDOCK_ASSISTANT_ID
      ) {
        return res.status(400).json({
          message:
            'ID ассистента LangDock обязателен или должен быть указан ID по умолчанию в настройках сервера',
          code: 'MISSING_LANGDOCK_ASSISTANT_ID',
        });
      }

      // Проверяем формат UUID для LangDock API
      if (apiType === 'langdock' && langdockAssistantId) {
        // Регулярное выражение для проверки формата UUID
        // Формат: 8-4-4-4-12 символов (цифры 0-9 и буквы a-f)
        const uuidRegex =
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

        if (!uuidRegex.test(langdockAssistantId)) {
          return res.status(400).json({
            message:
              'ID ассистента LangDock должен быть в формате UUID (например: 123e4567-e89b-12d3-a456-426614174000)',
            code: 'INVALID_LANGDOCK_ASSISTANT_ID_FORMAT',
          });
        }
      }

      // Проверяем, существуют ли уже настройки
      const existingSettings = await withPrisma(async (prisma) => {
        return await prisma.interviewAssistantSettings.findFirst({
          where: {
            isActive: true,
          },
        });
      });

      let updatedSettings;

      if (existingSettings) {
        // Обновляем существующие настройки
        updatedSettings = await withPrisma(async (prisma) => {
          return await prisma.interviewAssistantSettings.update({
            where: {
              id: existingSettings.id,
            },
            data: {
              apiKey,
              maxQuestionsPerDay: parseInt(maxQuestionsPerDay, 10),
              maxTokensPerQuestion: parseInt(maxTokensPerQuestion, 10),
              isActive,
              apiType,
              // Поля для LangDock
              langdockAssistantId:
                apiType === 'langdock'
                  ? langdockAssistantId ||
                    process.env.DEFAULT_LANGDOCK_ASSISTANT_ID
                  : null,
              langdockBaseUrl: apiType === 'langdock' ? langdockBaseUrl : null,
              langdockRegion: apiType === 'langdock' ? langdockRegion : null,
              // Поля для OpenRouter
              openRouterApiKey:
                apiType === 'openrouter' ? openRouterApiKey : null,
              openRouterBaseUrl:
                apiType === 'openrouter' ? openRouterBaseUrl : null,
              openRouterModel:
                apiType === 'openrouter' ? openRouterModel : null,
              openRouterTemperature:
                apiType === 'openrouter'
                  ? parseFloat(openRouterTemperature)
                  : null,
              openRouterMaxTokens:
                apiType === 'openrouter'
                  ? parseInt(openRouterMaxTokens, 10)
                  : null,
              // Поля для Gemini
              geminiApiKey: apiType === 'gemini' ? geminiApiKey : null,
              geminiModel: apiType === 'gemini' ? geminiModel : null,
              geminiBaseUrl: apiType === 'gemini' ? geminiBaseUrl : null,
              geminiTemperature:
                apiType === 'gemini' ? parseFloat(geminiTemperature) : null,
            },
          });
        });

        console.log('Настройки интервью-ассистента успешно обновлены');
      } else {
        // Создаем новые настройки
        updatedSettings = await withPrisma(async (prisma) => {
          return await prisma.interviewAssistantSettings.create({
            data: {
              apiKey,
              maxQuestionsPerDay: parseInt(maxQuestionsPerDay, 10),
              maxTokensPerQuestion: parseInt(maxTokensPerQuestion, 10),
              isActive,
              apiType,
              // Поля для LangDock
              langdockAssistantId:
                apiType === 'langdock'
                  ? langdockAssistantId ||
                    process.env.DEFAULT_LANGDOCK_ASSISTANT_ID
                  : null,
              langdockBaseUrl: apiType === 'langdock' ? langdockBaseUrl : null,
              langdockRegion: apiType === 'langdock' ? langdockRegion : null,
              // Поля для OpenRouter
              openRouterApiKey:
                apiType === 'openrouter' ? openRouterApiKey : null,
              openRouterBaseUrl:
                apiType === 'openrouter' ? openRouterBaseUrl : null,
              openRouterModel:
                apiType === 'openrouter' ? openRouterModel : null,
              openRouterTemperature:
                apiType === 'openrouter'
                  ? parseFloat(openRouterTemperature)
                  : null,
              openRouterMaxTokens:
                apiType === 'openrouter'
                  ? parseInt(openRouterMaxTokens, 10)
                  : null,
              // Поля для Gemini
              geminiApiKey: apiType === 'gemini' ? geminiApiKey : null,
              geminiModel: apiType === 'gemini' ? geminiModel : null,
              geminiBaseUrl: apiType === 'gemini' ? geminiBaseUrl : null,
              geminiTemperature:
                apiType === 'gemini' ? parseFloat(geminiTemperature) : null,
            },
          });
        });

        console.log('Настройки интервью-ассистента успешно созданы');
      }

      // Логируем действие администратора
      await logAdminAction(
        req.admin.id,
        'update_interview_assistant_settings',
        'settings',
        updatedSettings.id,
        {
          maxQuestionsPerDay,
          maxTokensPerQuestion,
          isActive,
          apiType,
          // Поля для LangDock
          langdockAssistantId:
            apiType === 'langdock'
              ? langdockAssistantId || process.env.DEFAULT_LANGDOCK_ASSISTANT_ID
              : null,
          langdockBaseUrl: apiType === 'langdock' ? langdockBaseUrl : null,
          langdockRegion: apiType === 'langdock' ? langdockRegion : null,
          // Поля для OpenRouter (без API ключа)
          openRouterBaseUrl:
            apiType === 'openrouter' ? openRouterBaseUrl : null,
          openRouterModel: apiType === 'openrouter' ? openRouterModel : null,
          openRouterTemperature:
            apiType === 'openrouter' ? openRouterTemperature : null,
          openRouterMaxTokens:
            apiType === 'openrouter' ? openRouterMaxTokens : null,
          // Поля для Gemini (без API ключа)
          geminiModel: apiType === 'gemini' ? geminiModel : null,
          geminiBaseUrl: apiType === 'gemini' ? geminiBaseUrl : null,
          geminiTemperature: apiType === 'gemini' ? geminiTemperature : null,
          // Не логируем API ключи в целях безопасности
        }
      );

      // Возвращаем обновленные настройки
      return res.status(200).json({
        message: 'Настройки интервью-ассистента успешно обновлены',
        settings: updatedSettings,
      });
    } catch (error) {
      // Логируем детали ошибки для диагностики
      console.error(
        'Ошибка при обновлении настроек интервью-ассистента:',
        error
      );
      console.error(
        'Детали ошибки при обновлении настроек интервью-ассистента:',
        {
          message: error.message,
          stack: error.stack,
        }
      );

      // Возвращаем более информативное сообщение об ошибке
      return res.status(500).json({
        message: 'Ошибка сервера при обновлении настроек интервью-ассистента',
        error: error.message,
        code: 'SETTINGS_UPDATE_ERROR',
      });
    }
  }

  // Если метод запроса не поддерживается
  return res.status(405).json({ message: 'Метод не поддерживается' });
}

export default withAdminAuth(handler);
