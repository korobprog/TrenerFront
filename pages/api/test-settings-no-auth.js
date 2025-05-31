/**
 * Тестовая версия API эндпоинта настроек интервью-ассистента БЕЗ middleware
 * для изоляции проблемы с ошибкой 500
 */

import prisma, { withPrisma } from '../../lib/prisma';

export default async function handler(req, res) {
  console.log('🔍 ТЕСТ БЕЗ AUTH: Получен запрос на управление настройками');
  console.log('🔍 ТЕСТ БЕЗ AUTH: Метод запроса:', req.method);

  // Обработка GET запроса - получение настроек
  if (req.method === 'GET') {
    try {
      console.log('🔍 ТЕСТ БЕЗ AUTH: Попытка получить настройки...');

      // Получаем настройки из базы данных
      const settings = await withPrisma(async (prisma) => {
        return await prisma.interviewAssistantSettings.findFirst({
          where: {
            isActive: true,
          },
        });
      });

      console.log(
        '🔍 ТЕСТ БЕЗ AUTH: Настройки получены:',
        settings ? 'найдены' : 'не найдены'
      );

      // Если настройки не найдены, возвращаем настройки по умолчанию
      if (!settings) {
        console.log('🔍 ТЕСТ БЕЗ AUTH: Возвращаем настройки по умолчанию');
        return res.status(200).json({
          settings: {
            maxQuestionsPerDay: 10,
            maxTokensPerQuestion: 4000,
            isActive: true,
            apiType: 'openrouter',
            openRouterApiKey: '',
            openRouterBaseUrl: 'https://openrouter.ai/api/v1',
            openRouterModel: 'google/gemma-3-12b-it:free',
            openRouterTemperature: 0.7,
            openRouterMaxTokens: 4000,
          },
        });
      }

      // Возвращаем настройки
      return res.status(200).json({
        settings,
      });
    } catch (error) {
      console.error('🔍 ТЕСТ БЕЗ AUTH: Ошибка при получении настроек:', error);
      console.error('🔍 ТЕСТ БЕЗ AUTH: Детали ошибки:', {
        message: error.message,
        stack: error.stack,
      });

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
      console.log('🔍 ТЕСТ БЕЗ AUTH: Начало обработки PUT запроса');
      console.log(
        '🔍 ТЕСТ БЕЗ AUTH: Тело запроса:',
        JSON.stringify(req.body, null, 2)
      );

      // Получаем данные из тела запроса
      const {
        maxQuestionsPerDay,
        maxTokensPerQuestion,
        isActive,
        openRouterApiKey,
        openRouterBaseUrl,
        openRouterModel,
        openRouterTemperature,
        openRouterMaxTokens,
      } = req.body;

      console.log('🔍 ТЕСТ БЕЗ AUTH: Извлеченные поля:');
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
        openRouterApiKey ? '[СКРЫТ]' : 'отсутствует'
      );

      // Принудительно устанавливаем тип API как OpenRouter
      const apiType = 'openrouter';
      const apiKey = openRouterApiKey;

      // Проверяем обязательные поля для OpenRouter
      if (!openRouterApiKey) {
        console.log('🔍 ТЕСТ БЕЗ AUTH: Отсутствует openRouterApiKey');
        return res.status(400).json({
          message: 'OpenRouter API ключ обязателен',
          code: 'MISSING_OPENROUTER_API_KEY',
        });
      }

      if (!openRouterModel) {
        console.log('🔍 ТЕСТ БЕЗ AUTH: Отсутствует openRouterModel');
        return res.status(400).json({
          message: 'Модель OpenRouter обязательна',
          code: 'MISSING_OPENROUTER_MODEL',
        });
      }

      // Безопасное преобразование типов данных
      const convertedMaxQuestionsPerDay = parseInt(maxQuestionsPerDay, 10);
      const convertedMaxTokensPerQuestion = parseInt(maxTokensPerQuestion, 10);
      const convertedOpenRouterTemperature = parseFloat(openRouterTemperature);
      const convertedOpenRouterMaxTokens = parseInt(openRouterMaxTokens, 10);

      if (isNaN(convertedMaxQuestionsPerDay)) {
        return res.status(400).json({
          message: 'Некорректное значение maxQuestionsPerDay',
          code: 'INVALID_MAX_QUESTIONS_PER_DAY',
        });
      }

      console.log('🔍 ТЕСТ БЕЗ AUTH: Проверяем существующие настройки...');

      // Проверяем, существуют ли уже настройки
      const existingSettings = await withPrisma(async (prisma) => {
        return await prisma.interviewAssistantSettings.findFirst({
          where: {
            isActive: true,
          },
        });
      });

      console.log(
        '🔍 ТЕСТ БЕЗ AUTH: Существующие настройки:',
        existingSettings ? 'найдены' : 'не найдены'
      );

      let updatedSettings;

      if (existingSettings) {
        console.log('🔍 ТЕСТ БЕЗ AUTH: Обновляем существующие настройки...');
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

        console.log('🔍 ТЕСТ БЕЗ AUTH: Настройки успешно обновлены');
      } else {
        console.log('🔍 ТЕСТ БЕЗ AUTH: Создаем новые настройки...');
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

        console.log('🔍 ТЕСТ БЕЗ AUTH: Настройки успешно созданы');
      }

      // Возвращаем обновленные настройки
      return res.status(200).json({
        message: 'Настройки интервью-ассистента успешно обновлены',
        settings: updatedSettings,
      });
    } catch (error) {
      console.error('🔍 ТЕСТ БЕЗ AUTH: Ошибка при обновлении настроек:', error);
      console.error('🔍 ТЕСТ БЕЗ AUTH: Детали ошибки:', {
        message: error.message,
        stack: error.stack,
      });

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
