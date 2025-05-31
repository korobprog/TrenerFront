/**
 * Диагностическая версия API эндпоинта с расширенным логированием
 * для выявления причин ошибки 500 при сохранении настроек OpenRouter
 */

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
  console.log('🔍 ДИАГНОСТИКА API: Начало обработки запроса');
  console.log('🔍 ДИАГНОСТИКА API: URL:', req.url);
  console.log('🔍 ДИАГНОСТИКА API: Метод:', req.method);
  console.log(
    '🔍 ДИАГНОСТИКА API: Заголовки:',
    JSON.stringify(req.headers, null, 2)
  );
  console.log('🔍 ДИАГНОСТИКА API: Информация об администраторе:', req.admin);

  // Обработка PUT запроса - обновление настроек
  if (req.method === 'PUT') {
    console.log('🔍 ДИАГНОСТИКА API: Обработка PUT запроса');

    try {
      console.log(
        '🔍 ДИАГНОСТИКА API: Тело запроса (raw):',
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

      // Проверяем типы данных и конвертируем
      console.log('🔍 ДИАГНОСТИКА API: Конвертация типов данных...');

      let convertedMaxQuestionsPerDay,
        convertedMaxTokensPerQuestion,
        convertedOpenRouterTemperature,
        convertedOpenRouterMaxTokens;

      try {
        convertedMaxQuestionsPerDay = parseInt(maxQuestionsPerDay, 10);
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
      console.log('🔍 ДИАГНОСТИКА API: Поиск существующих настроек...');

      let existingSettings;
      try {
        existingSettings = await withPrisma(async (prisma) => {
          console.log(
            '🔍 ДИАГНОСТИКА API: Выполняем запрос к БД для поиска настроек...'
          );
          const result = await prisma.interviewAssistantSettings.findFirst({
            where: {
              isActive: true,
            },
          });
          console.log(
            '🔍 ДИАГНОСТИКА API: Результат поиска настроек:',
            result ? 'найдены' : 'не найдены'
          );
          return result;
        });
      } catch (error) {
        console.log(
          '❌ ДИАГНОСТИКА API: Ошибка при поиске существующих настроек:',
          error.message
        );
        console.log('❌ ДИАГНОСТИКА API: Стек ошибки:', error.stack);
        throw error;
      }

      let updatedSettings;

      if (existingSettings) {
        console.log(
          '🔍 ДИАГНОСТИКА API: Обновляем существующие настройки с ID:',
          existingSettings.id
        );

        // Подготавливаем данные для обновления
        const updateData = {
          apiKey,
          maxQuestionsPerDay: convertedMaxQuestionsPerDay,
          maxTokensPerQuestion: convertedMaxTokensPerQuestion,
          isActive,
          apiType,
          // Очищаем поля других провайдеров
          langdockAssistantId: null,
          langdockBaseUrl: null,
          langdockRegion: null,
          geminiApiKey: null,
          geminiModel: null,
          geminiBaseUrl: null,
          geminiTemperature: null,
          // Поля для OpenRouter
          openRouterApiKey,
          openRouterBaseUrl,
          openRouterModel,
          openRouterTemperature: convertedOpenRouterTemperature,
          openRouterMaxTokens: convertedOpenRouterMaxTokens,
        };

        console.log(
          '🔍 ДИАГНОСТИКА API: Данные для обновления:',
          JSON.stringify(
            {
              ...updateData,
              apiKey: '[СКРЫТ]',
              openRouterApiKey: '[СКРЫТ]',
            },
            null,
            2
          )
        );

        try {
          updatedSettings = await withPrisma(async (prisma) => {
            console.log('🔍 ДИАГНОСТИКА API: Выполняем UPDATE запрос к БД...');
            const result = await prisma.interviewAssistantSettings.update({
              where: {
                id: existingSettings.id,
              },
              data: updateData,
            });
            console.log('✅ ДИАГНОСТИКА API: UPDATE запрос выполнен успешно');
            return result;
          });
        } catch (error) {
          console.log(
            '❌ ДИАГНОСТИКА API: Ошибка при обновлении настроек:',
            error.message
          );
          console.log('❌ ДИАГНОСТИКА API: Стек ошибки:', error.stack);
          console.log('❌ ДИАГНОСТИКА API: Код ошибки Prisma:', error.code);
          console.log('❌ ДИАГНОСТИКА API: Мета информация:', error.meta);
          throw error;
        }

        console.log(
          '✅ ДИАГНОСТИКА API: Настройки интервью-ассистента успешно обновлены'
        );
      } else {
        console.log('🔍 ДИАГНОСТИКА API: Создаем новые настройки');

        // Подготавливаем данные для создания
        const createData = {
          apiKey,
          maxQuestionsPerDay: convertedMaxQuestionsPerDay,
          maxTokensPerQuestion: convertedMaxTokensPerQuestion,
          isActive,
          apiType,
          // Очищаем поля других провайдеров
          langdockAssistantId: null,
          langdockBaseUrl: null,
          langdockRegion: null,
          geminiApiKey: null,
          geminiModel: null,
          geminiBaseUrl: null,
          geminiTemperature: null,
          // Поля для OpenRouter
          openRouterApiKey,
          openRouterBaseUrl,
          openRouterModel,
          openRouterTemperature: convertedOpenRouterTemperature,
          openRouterMaxTokens: convertedOpenRouterMaxTokens,
        };

        console.log(
          '🔍 ДИАГНОСТИКА API: Данные для создания:',
          JSON.stringify(
            {
              ...createData,
              apiKey: '[СКРЫТ]',
              openRouterApiKey: '[СКРЫТ]',
            },
            null,
            2
          )
        );

        try {
          updatedSettings = await withPrisma(async (prisma) => {
            console.log('🔍 ДИАГНОСТИКА API: Выполняем CREATE запрос к БД...');
            const result = await prisma.interviewAssistantSettings.create({
              data: createData,
            });
            console.log('✅ ДИАГНОСТИКА API: CREATE запрос выполнен успешно');
            return result;
          });
        } catch (error) {
          console.log(
            '❌ ДИАГНОСТИКА API: Ошибка при создании настроек:',
            error.message
          );
          console.log('❌ ДИАГНОСТИКА API: Стек ошибки:', error.stack);
          console.log('❌ ДИАГНОСТИКА API: Код ошибки Prisma:', error.code);
          console.log('❌ ДИАГНОСТИКА API: Мета информация:', error.meta);
          throw error;
        }

        console.log(
          '✅ ДИАГНОСТИКА API: Настройки интервью-ассистента успешно созданы'
        );
      }

      // Логируем действие администратора
      console.log('🔍 ДИАГНОСТИКА API: Логирование действия администратора...');
      try {
        await logAdminAction(
          req.admin.id,
          'update_interview_assistant_settings',
          'settings',
          updatedSettings.id,
          {
            maxQuestionsPerDay: convertedMaxQuestionsPerDay,
            maxTokensPerQuestion: convertedMaxTokensPerQuestion,
            isActive,
            apiType,
            // Поля для OpenRouter (без API ключа)
            openRouterBaseUrl,
            openRouterModel,
            openRouterTemperature: convertedOpenRouterTemperature,
            openRouterMaxTokens: convertedOpenRouterMaxTokens,
            // Не логируем API ключи в целях безопасности
          }
        );
        console.log('✅ ДИАГНОСТИКА API: Действие администратора залогировано');
      } catch (error) {
        console.log(
          '❌ ДИАГНОСТИКА API: Ошибка при логировании действия:',
          error.message
        );
        // Не прерываем выполнение, так как основная операция прошла успешно
      }

      // Возвращаем обновленные настройки
      console.log('🔍 ДИАГНОСТИКА API: Подготовка ответа...');
      const response = {
        message: 'Настройки интервью-ассистента успешно обновлены',
        settings: updatedSettings,
      };

      console.log('✅ ДИАГНОСТИКА API: Успешный ответ подготовлен');
      return res.status(200).json(response);
    } catch (error) {
      // Детальное логирование ошибки
      console.error(
        '🚨 ДИАГНОСТИКА API: КРИТИЧЕСКАЯ ОШИБКА при обновлении настроек'
      );
      console.error('🚨 ДИАГНОСТИКА API: Сообщение ошибки:', error.message);
      console.error('🚨 ДИАГНОСТИКА API: Стек ошибки:', error.stack);
      console.error('🚨 ДИАГНОСТИКА API: Тип ошибки:', error.constructor.name);

      if (error.code) {
        console.error('🚨 ДИАГНОСТИКА API: Код ошибки:', error.code);
      }

      if (error.meta) {
        console.error(
          '🚨 ДИАГНОСТИКА API: Мета информация:',
          JSON.stringify(error.meta, null, 2)
        );
      }

      if (error.clientVersion) {
        console.error(
          '🚨 ДИАГНОСТИКА API: Версия Prisma клиента:',
          error.clientVersion
        );
      }

      // Возвращаем более информативное сообщение об ошибке
      return res.status(500).json({
        message: 'Ошибка сервера при обновлении настроек интервью-ассистента',
        error: error.message,
        code: 'SETTINGS_UPDATE_ERROR',
        details: {
          type: error.constructor.name,
          prismaCode: error.code,
          meta: error.meta,
        },
      });
    }
  }

  // Если метод запроса не поддерживается
  console.log(
    '❌ ДИАГНОСТИКА API: Неподдерживаемый метод запроса:',
    req.method
  );
  return res.status(405).json({ message: 'Метод не поддерживается' });
}

export default withAdminAuth(handler);
