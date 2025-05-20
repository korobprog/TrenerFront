import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import prisma from '../../../prisma/client';

// Добавляем логи для отладки
console.log('API /interview-assistant/usage: Импорт prisma выполнен');
console.log(
  'API /interview-assistant/usage: prisma =',
  prisma ? 'определен' : 'не определен'
);

/**
 * API эндпоинт для получения информации о компании и дате собеседования для текущего пользователя
 *
 * @param {Object} req - HTTP запрос
 * @param {Object} res - HTTP ответ
 */
export default async function handler(req, res) {
  console.log('API /interview-assistant/usage: Начало обработки запроса');

  try {
    // Проверяем аутентификацию
    console.log('API /interview-assistant/usage: Проверка аутентификации');
    const session = await getServerSession(req, res, authOptions);
    console.log(
      'API /interview-assistant/usage: Результат аутентификации:',
      session ? 'Успешно' : 'Не аутентифицирован'
    );

    if (!session) {
      return res.status(401).json({ message: 'Необходима аутентификация' });
    }

    const userId = session.user.id;
    console.log(
      `API /interview-assistant/usage: Получение информации о компании для пользователя: ${userId}`
    );

    // Получаем информацию о компании и дате собеседования из модели InterviewAssistantUsage
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Проверяем наличие пользовательских API настроек
    console.log(
      `API /interview-assistant/usage: Поиск настроек API для пользователя: ${userId}`
    );
    let userApiSettings;
    try {
      console.log(
        'API /interview-assistant/usage: Перед вызовом prisma.userApiSettings.findUnique'
      );
      console.log(
        'API /interview-assistant/usage: prisma =',
        prisma ? 'определен' : 'не определен'
      );
      console.log(
        'API /interview-assistant/usage: prisma.userApiSettings =',
        prisma.userApiSettings ? 'определен' : 'не определен'
      );

      userApiSettings = await prisma.userApiSettings.findUnique({
        where: { userId: userId },
        select: { useCustomApi: true, apiType: true },
      });
      console.log(
        'API /interview-assistant/usage: Настройки API найдены:',
        userApiSettings
      );
    } catch (settingsError) {
      console.error(
        'API /interview-assistant/usage: Ошибка при получении настроек API:',
        settingsError
      );
      throw settingsError;
    }

    console.log(
      `Пользовательские API настройки: ${
        userApiSettings
          ? userApiSettings.useCustomApi
            ? 'активны'
            : 'неактивны'
          : 'не найдены'
      }`
    );

    console.log(
      `API /interview-assistant/usage: Поиск информации об использовании для пользователя: ${userId}`
    );
    let usage;
    try {
      usage = await prisma.interviewAssistantUsage.findFirst({
        where: {
          userId: userId,
          date: {
            gte: today,
            lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
          },
        },
        select: {
          company: true,
          interviewDate: true,
        },
      });
      console.log(
        'API /interview-assistant/usage: Информация об использовании:',
        usage
      );
    } catch (usageError) {
      console.error(
        'API /interview-assistant/usage: Ошибка при получении информации об использовании:',
        usageError
      );
      throw usageError;
    }

    // Определяем тип API
    let apiType = 'anthropic'; // По умолчанию используем Anthropic API

    if (userApiSettings?.useCustomApi) {
      // Если у пользователя есть собственные настройки, используем их
      apiType = userApiSettings.apiType || 'anthropic';
    } else {
      // Иначе используем глобальные настройки
      console.log('API /interview-assistant/usage: Поиск глобальных настроек');
      let globalSettings;
      try {
        globalSettings = await prisma.interviewAssistantSettings.findFirst({
          where: { isActive: true },
        });
        console.log(
          'API /interview-assistant/usage: Глобальные настройки:',
          globalSettings ? 'Найдены' : 'Не найдены'
        );
      } catch (globalSettingsError) {
        console.error(
          'API /interview-assistant/usage: Ошибка при получении глобальных настроек:',
          globalSettingsError
        );
        throw globalSettingsError;
      }

      if (globalSettings) {
        apiType = globalSettings.apiType || 'anthropic';
      }
    }

    // Если информация найдена, возвращаем её
    if (usage) {
      console.log(
        `Найдена информация о компании: ${
          usage.company || 'не указана'
        }, дата собеседования: ${
          usage.interviewDate || 'не указана'
        }, API: ${apiType}`
      );
      return res.status(200).json({
        company: usage.company,
        interviewDate: usage.interviewDate,
        useCustomApi: userApiSettings?.useCustomApi || false,
        apiType: apiType,
      });
    }

    // Если информация не найдена, возвращаем пустой объект
    console.log('Информация о компании не найдена');
    return res.status(200).json({
      company: null,
      interviewDate: null,
      useCustomApi: userApiSettings?.useCustomApi || false,
      apiType: apiType,
    });
  } catch (error) {
    console.error(
      'API /interview-assistant/usage: Ошибка при получении информации о компании:',
      error
    );
    console.error('API /interview-assistant/usage: Стек ошибки:', error.stack);
    return res
      .status(500)
      .json({ message: 'Внутренняя ошибка сервера', error: error.message });
  } finally {
    try {
      await prisma.$disconnect();
      console.log(
        'API /interview-assistant/usage: Соединение с базой данных закрыто'
      );
    } catch (disconnectError) {
      console.error(
        'API /interview-assistant/usage: Ошибка при закрытии соединения:',
        disconnectError
      );
    }
  }
}
