import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';
import { getAuthenticatedOAuth2Client } from '../../lib/utils/tokenRefresher';
import { google } from 'googleapis';

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

  try {
    console.log('API create-meet: Создание Google Meet-ссылки');

    // Получаем OAuth2 клиент с актуальными токенами из базы данных
    const oauth2Client = await getAuthenticatedOAuth2Client(session.user.id);
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
    return res.status(500).json({
      success: false,
      message: 'Ошибка при создании Google Meet-ссылки',
      error: error.message,
    });
  }
}
