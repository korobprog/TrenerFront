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
            maxQuestionsPerDay: 10,
            maxTokensPerQuestion: 4000,
            isActive: true,
            apiType: 'openrouter', // По умолчанию используем OpenRouter
            openRouterApiKey: '',
            openRouterBaseUrl: 'https://openrouter.ai/api/v1',
            openRouterModel: 'google/gemma-3-12b-it:free',
            openRouterTemperature: 0.7,
            openRouterMaxTokens: 4000,
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
      console.log('🔍 ДИАГНОСТИКА API: Начало обработки PUT запроса');
      console.log(
        '🔍 ДИАГНОСТИКА API: Тело запроса:',
        JSON.stringify(req.body, null, 2)
      );

      // Получаем данные из тела запроса
      const {
        maxQuestionsPerDay,
        maxTokensPerQuestion,
        isActive,
        // Поля для OpenRouter
        openRouterApiKey,
        openRouterBaseUrl,
        openRouterModel,
        openRouterTemperature,
        openRouterMaxTokens,
      } = req.body;

      console.log('🔍 ДИАГНОСТИКА API: Извлеченные поля:');
      console.log(
        '  - maxQuestionsPerDay:',
        maxQuestionsPerDay,
        typeof maxQuestionsPerDay
      );
      console.log(
        '  - maxTokensPerQuestion:',
        maxTokensPerQuestion,
        typeof maxTokensPerQuestion
      );
      console.log('  - isActive:', isActive, typeof isActive);
      console.log(
        '  - openRouterApiKey:',
        openRouterApiKey ? '[СКРЫТ]' : 'отсутствует',
        typeof openRouterApiKey
      );
      console.log(
        '  - openRouterBaseUrl:',
        openRouterBaseUrl,
        typeof openRouterBaseUrl
      );
      console.log(
        '  - openRouterModel:',
        openRouterModel,
        typeof openRouterModel
      );
      console.log(
        '  - openRouterTemperature:',
        openRouterTemperature,
        typeof openRouterTemperature
      );
      console.log(
        '  - openRouterMaxTokens:',
        openRouterMaxTokens,
        typeof openRouterMaxTokens
      );

      // Принудительно устанавливаем тип API как OpenRouter
      const apiType = 'openrouter';
      const apiKey = openRouterApiKey;

      console.log('🔍 ДИАГНОСТИКА API: Установленные значения:');
      console.log('  - apiType:', apiType);
      console.log('  - apiKey:', apiKey ? '[СКРЫТ]' : 'отсутствует');

      // Проверяем обязательные поля для OpenRouter
      console.log('🔍 ДИАГНОСТИКА API: Проверка обязательных полей...');

      if (!openRouterApiKey) {
        console.log('❌ ДИАГНОСТИКА API: Отсутствует openRouterApiKey');
        return res.status(400).json({
          message: 'OpenRouter API ключ обязателен',
          code: 'MISSING_OPENROUTER_API_KEY',
        });
      }

      if (!openRouterModel) {
        console.log('❌ ДИАГНОСТИКА API: Отсутствует openRouterModel');
        return res.status(400).json({
          message: 'Модель OpenRouter обязательна',
          code: 'MISSING_OPENROUTER_MODEL',
        });
      }

      console.log('✅ ДИАГНОСТИКА API: Обязательные поля присутствуют');

      // Безопасное преобразование типов данных
      console.log('🔍 ДИАГНОСТИКА API: Конвертация типов данных...');

      let convertedMaxQuestionsPerDay,
        convertedMaxTokensPerQuestion,
        convertedOpenRouterTemperature,
        convertedOpenRouterMaxTokens;

      try {
        convertedMaxQuestionsPerDay = parseInt(maxQuestionsPerDay, 10);
        if (isNaN(convertedMaxQuestionsPerDay)) {
          throw new Error('Некорректное значение maxQuestionsPerDay');
        }
        console.log(
          '✅ ДИАГНОСТИКА API: maxQuestionsPerDay конвертирован:',
          convertedMaxQuestionsPerDay
        );
      } catch (error) {
        console.log(
          '❌ ДИАГНОСТИКА API: Ошибка конвертации maxQuestionsPerDay:',
          error.message
        );
        return res.status(400).json({
          message: 'Некорректное значение maxQuestionsPerDay',
          code: 'INVALID_MAX_QUESTIONS_PER_DAY',
        });
      }

      try {
        convertedMaxTokensPerQuestion = parseInt(maxTokensPerQuestion, 10);
        if (isNaN(convertedMaxTokensPerQuestion)) {
          throw new Error('Некорректное значение maxTokensPerQuestion');
        }
        console.log(
          '✅ ДИАГНОСТИКА API: maxTokensPerQuestion конвертирован:',
          convertedMaxTokensPerQuestion
        );
      } catch (error) {
        console.log(
          '❌ ДИАГНОСТИКА API: Ошибка конвертации maxTokensPerQuestion:',
          error.message
        );
        return res.status(400).json({
          message: 'Некорректное значение maxTokensPerQuestion',
          code: 'INVALID_MAX_TOKENS_PER_QUESTION',
        });
      }

      try {
        convertedOpenRouterTemperature = parseFloat(openRouterTemperature);
        if (isNaN(convertedOpenRouterTemperature)) {
          throw new Error('Некорректное значение openRouterTemperature');
        }
        console.log(
          '✅ ДИАГНОСТИКА API: openRouterTemperature конвертирован:',
          convertedOpenRouterTemperature
        );
      } catch (error) {
        console.log(
          '❌ ДИАГНОСТИКА API: Ошибка конвертации openRouterTemperature:',
          error.message
        );
        return res.status(400).json({
          message: 'Некорректное значение openRouterTemperature',
          code: 'INVALID_OPENROUTER_TEMPERATURE',
        });
      }

      try {
        convertedOpenRouterMaxTokens = parseInt(openRouterMaxTokens, 10);
        if (isNaN(convertedOpenRouterMaxTokens)) {
          throw new Error('Некорректное значение openRouterMaxTokens');
        }
        console.log(
          '✅ ДИАГНОСТИКА API: openRouterMaxTokens конвертирован:',
          convertedOpenRouterMaxTokens
        );
      } catch (error) {
        console.log(
          '❌ ДИАГНОСТИКА API: Ошибка конвертации openRouterMaxTokens:',
          error.message
        );
        return res.status(400).json({
          message: 'Некорректное значение openRouterMaxTokens',
          code: 'INVALID_OPENROUTER_MAX_TOKENS',
        });
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
              maxQuestionsPerDay: convertedMaxQuestionsPerDay,
              maxTokensPerQuestion: convertedMaxTokensPerQuestion,
              isActive,
              apiType,
              // Поля для OpenRouter
              openRouterApiKey,
              openRouterBaseUrl,
              openRouterModel,
              openRouterTemperature: convertedOpenRouterTemperature,
              openRouterMaxTokens: convertedOpenRouterMaxTokens,
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
              maxQuestionsPerDay: convertedMaxQuestionsPerDay,
              maxTokensPerQuestion: convertedMaxTokensPerQuestion,
              isActive,
              apiType,
              // Поля для OpenRouter
              openRouterApiKey,
              openRouterBaseUrl,
              openRouterModel,
              openRouterTemperature: convertedOpenRouterTemperature,
              openRouterMaxTokens: convertedOpenRouterMaxTokens,
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
          // Поля для OpenRouter (без API ключа)
          openRouterBaseUrl,
          openRouterModel,
          openRouterTemperature,
          openRouterMaxTokens,
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
