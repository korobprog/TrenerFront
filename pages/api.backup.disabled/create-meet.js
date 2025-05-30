import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';
import { getAuthenticatedOAuth2Client } from '../../lib/utils/tokenRefresher';
import { google } from 'googleapis';

/**
 * Валидация ссылки на Google Meet
 * @param {string} link - Ссылка для проверки
 * @returns {boolean} Результат валидации
 */
function isValidGoogleMeetLink(link) {
  if (!link) return false;

  // Проверяем, что ссылка содержит meet.google.com
  const meetRegex = /meet\.google\.com/i;
  return meetRegex.test(link);
}

/**
 * API-роут для создания Google Meet-ссылок
 * @param {Object} req - Объект запроса
 * @param {Object} res - Объект ответа
 * @returns {Promise<Object>} Ответ с ссылкой на Google Meet
 */
export default async function handler(req, res) {
  console.log('API create-meet: Получен запрос на создание Google Meet-ссылки');
  console.log('API create-meet: Метод запроса:', req.method);

  // Проверяем метод запроса
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Метод не поддерживается' });
  }

  // Получаем сессию пользователя
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    console.log('API create-meet: Сессия отсутствует, возвращаем 401');
    return res.status(401).json({ message: 'Необходима авторизация' });
  }

  // Получаем данные из тела запроса
  const { manualLink, skipAutoCreation } = req.body || {};

  // Если передана ручная ссылка, проверяем её валидность
  if (manualLink) {
    console.log('API create-meet: Получена ручная ссылка на Google Meet');

    // Валидируем ссылку
    if (!isValidGoogleMeetLink(manualLink)) {
      console.error(
        'API create-meet: Некорректная ссылка на Google Meet:',
        manualLink
      );
      return res.status(400).json({
        success: false,
        message:
          'Некорректная ссылка на Google Meet. Ссылка должна содержать meet.google.com',
        error: 'invalid_meet_link',
      });
    }

    console.log('API create-meet: Ручная ссылка на Google Meet валидна');
    return res.status(200).json({
      success: true,
      meetingLink: manualLink,
      isManual: true,
    });
  }

  // Если указано пропустить автоматическое создание, возвращаем статус, что нужна ручная ссылка
  if (skipAutoCreation) {
    console.log('API create-meet: Автоматическое создание ссылки отключено');
    return res.status(200).json({
      success: false,
      message:
        'Автоматическое создание ссылки отключено. Пожалуйста, введите ссылку вручную.',
      needsManualLink: true,
    });
  }

  try {
    console.log('API create-meet: Создание Google Meet-ссылки');
    console.log('API create-meet: ID пользователя:', session.user.id);

    // Проверяем наличие Refresh Token в базе данных
    console.log('API create-meet: Проверка наличия Refresh Token');
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient({
      log: ['error', 'warn'],
    });

    try {
      const account = await prisma.account.findFirst({
        where: {
          userId: session.user.id,
          provider: 'google',
        },
      });

      // При получении аккаунта из базы данных
      console.log('Детальная информация о найденном аккаунте:');
      console.log('- userId из сессии:', session.user.id);
      console.log('- email из сессии:', session.user.email);
      console.log('- Найден аккаунт:', !!account);
      if (account) {
        console.log('- ID аккаунта:', account.id);
        console.log('- Provider:', account.provider);
        console.log('- Наличие refresh_token:', !!account.refresh_token);
        console.log('- Наличие access_token:', !!account.access_token);
        console.log('- expires_at:', account.expires_at);
      }

      if (!account || !account.refresh_token) {
        console.error(
          'API create-meet: Отсутствует Refresh Token для пользователя',
          session.user.id
        );
        await prisma.$disconnect();
        return res.status(401).json({
          success: false,
          message:
            'Для создания Google Meet-ссылки необходимо заново авторизоваться через Google',
          error: 'missing_refresh_token',
        });
      }

      console.log('API create-meet: Refresh Token найден');
      await prisma.$disconnect();
    } catch (dbError) {
      console.error(
        'API create-meet: Ошибка при проверке Refresh Token:',
        dbError
      );
      try {
        await prisma.$disconnect();
      } catch (disconnectError) {
        console.error(
          'API create-meet: Ошибка при отключении от базы данных:',
          disconnectError
        );
      }
      throw dbError;
    }

    // Получаем OAuth2 клиент с актуальными токенами из базы данных
    console.log('API create-meet: Получение OAuth2 клиента');

    // Перед получением OAuth2 клиента
    console.log(
      'API create-meet: Детальная информация перед получением OAuth2 клиента:'
    );
    console.log('- userId:', session.user.id);
    console.log('- email:', session.user.email);
    console.log('- Текущее время:', new Date().toISOString());

    // Проверяем состояние токенов в базе данных
    const tokenInfo = await prisma.account.findFirst({
      where: {
        userId: session.user.id,
        provider: 'google',
      },
      select: {
        refresh_token: true,
        access_token: true,
        expires_at: true,
      },
    });

    console.log('- Состояние токенов в базе данных:');
    console.log(
      '  - refresh_token:',
      tokenInfo?.refresh_token ? 'Присутствует' : 'Отсутствует'
    );
    console.log(
      '  - access_token:',
      tokenInfo?.access_token ? 'Присутствует' : 'Отсутствует'
    );
    console.log(
      '  - expires_at:',
      tokenInfo?.expires_at
        ? new Date(tokenInfo.expires_at * 1000).toISOString()
        : 'Не задано'
    );

    const oauth2Client = await getAuthenticatedOAuth2Client(session.user.id);
    console.log('API create-meet: OAuth2 клиент получен успешно');
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // Создаем временные данные для события
    const startTime = new Date(Date.now() + 3600000); // Текущее время + 1 час
    const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // +1 час от начала

    // Создаем событие
    const event = {
      summary: `Собеседование (${session.user.name})`,
      description: `Собеседование, созданное пользователем ${session.user.name} (${session.user.email})`,
      start: {
        dateTime: startTime.toISOString(),
        timeZone: 'Europe/Moscow',
      },
      end: {
        dateTime: endTime.toISOString(),
        timeZone: 'Europe/Moscow',
      },
      // Добавляем ссылку на Google Meet
      conferenceData: {
        createRequest: {
          requestId: `meet-${Date.now()}`,
          conferenceSolutionKey: { type: 'hangoutsMeet' },
        },
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 }, // За 24 часа
          { method: 'popup', minutes: 30 }, // За 30 минут
        ],
      },
    };

    // Создаем событие в календаре
    const response = await calendar.events.insert({
      calendarId: 'primary',
      resource: event,
      conferenceDataVersion: 1, // Для создания Google Meet
    });

    console.log('API create-meet: Событие создано:', response.data.id);

    // Получаем ссылку на Google Meet из созданного события
    let meetingLink = '';
    if (
      response.data.conferenceData &&
      response.data.conferenceData.entryPoints &&
      response.data.conferenceData.entryPoints.length > 0
    ) {
      // Находим ссылку на Google Meet среди точек входа
      const meetEntryPoint = response.data.conferenceData.entryPoints.find(
        (entry) => entry.entryPointType === 'video'
      );
      if (meetEntryPoint) {
        meetingLink = meetEntryPoint.uri;
        console.log(
          'API create-meet: Получена ссылка на Google Meet:',
          meetingLink
        );
      }
    }

    // Проверяем, что ссылка на Google Meet была успешно создана
    if (!meetingLink) {
      throw new Error('Не удалось получить ссылку на Google Meet');
    }

    return res.status(200).json({
      success: true,
      eventId: response.data.id,
      eventLink: response.data.htmlLink,
      meetingLink: meetingLink,
    });
  } catch (error) {
    console.error(
      'API create-meet: Ошибка при создании Google Meet-ссылки:',
      error
    );

    // Расширенное логирование ошибки
    console.error('API create-meet: Детали ошибки:', {
      name: error.name,
      message: error.message,
      code: error.code,
      status: error.status,
      stack: error.stack,
      response: error.response
        ? JSON.stringify(error.response.data)
        : 'нет данных',
    });

    // Проверяем, является ли ошибка invalid_grant
    const isInvalidGrant =
      error.message && error.message.includes('invalid_grant');

    // Расширенное логирование для ошибки invalid_grant
    if (isInvalidGrant) {
      console.log('API create-meet: Детали ошибки invalid_grant:', {
        message: error.message,
        response: error.response ? error.response.data : null,
        stack: error.stack,
      });
      console.log(
        'API create-meet: Обнаружена ошибка invalid_grant, требуется повторная авторизация'
      );
      return res.status(401).json({
        success: false,
        message: 'Не удалось автоматически создать ссылку на Google Meet',
        error: 'invalid_grant',
        needsManualLink: true,
        needsOAuthUrl: true, // Оставляем для обратной совместимости
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Ошибка при создании Google Meet-ссылки',
      error: error.message,
    });
  }
}
