/**
 * Минимальный тестовый API эндпоинт для проверки базовой функциональности
 * без middleware и сложной логики
 */

import prisma from '../../lib/prisma';

export default async function handler(req, res) {
  console.log('🧪 ТЕСТОВЫЙ API: Получен запрос');
  console.log('🧪 ТЕСТОВЫЙ API: Метод:', req.method);
  console.log('🧪 ТЕСТОВЫЙ API: URL:', req.url);

  if (req.method === 'GET') {
    try {
      console.log('🧪 ТЕСТОВЫЙ API: Попытка подключения к базе данных...');

      // Простой тест подключения к БД
      const testQuery = await prisma.$queryRaw`SELECT 1 as test`;
      console.log('🧪 ТЕСТОВЫЙ API: Тест подключения к БД успешен:', testQuery);

      // Попытка получить настройки
      console.log('🧪 ТЕСТОВЫЙ API: Попытка получить настройки...');
      const settings = await prisma.interviewAssistantSettings.findFirst({
        where: { isActive: true },
      });
      console.log(
        '🧪 ТЕСТОВЫЙ API: Настройки получены:',
        settings ? 'найдены' : 'не найдены'
      );

      return res.status(200).json({
        success: true,
        message: 'Тестовый API работает корректно',
        dbConnection: 'OK',
        settingsFound: !!settings,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('🧪 ТЕСТОВЫЙ API: Ошибка:', error.message);
      console.error('🧪 ТЕСТОВЫЙ API: Stack trace:', error.stack);

      return res.status(500).json({
        success: false,
        message: 'Ошибка в тестовом API',
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  if (req.method === 'POST') {
    try {
      console.log('🧪 ТЕСТОВЫЙ API: Тестирование создания настроек...');
      console.log(
        '🧪 ТЕСТОВЫЙ API: Тело запроса:',
        JSON.stringify(req.body, null, 2)
      );

      const testSettings = {
        apiKey: 'test-minimal-key',
        maxQuestionsPerDay: 5,
        maxTokensPerQuestion: 2000,
        isActive: false, // Неактивные для теста
        apiType: 'openrouter',
        openRouterApiKey: req.body.openRouterApiKey || 'test-key',
        openRouterBaseUrl: 'https://openrouter.ai/api/v1',
        openRouterModel: 'google/gemma-3-12b-it:free',
        openRouterTemperature: 0.7,
        openRouterMaxTokens: 2000,
      };

      const created = await prisma.interviewAssistantSettings.create({
        data: testSettings,
      });

      console.log('🧪 ТЕСТОВЫЙ API: Настройки созданы с ID:', created.id);

      // Сразу удаляем тестовые настройки
      await prisma.interviewAssistantSettings.delete({
        where: { id: created.id },
      });

      console.log('🧪 ТЕСТОВЫЙ API: Тестовые настройки удалены');

      return res.status(200).json({
        success: true,
        message: 'Создание и удаление настроек работает корректно',
        createdId: created.id,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('🧪 ТЕСТОВЫЙ API: Ошибка при создании:', error.message);
      console.error('🧪 ТЕСТОВЫЙ API: Stack trace:', error.stack);

      return res.status(500).json({
        success: false,
        message: 'Ошибка при создании настроек в тестовом API',
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  return res.status(405).json({
    success: false,
    message: 'Метод не поддерживается',
    allowedMethods: ['GET', 'POST'],
  });
}
