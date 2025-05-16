const { google } = require('googleapis');

/**
 * Создает OAuth2 клиент для работы с Google API
 * В реальном приложении нужно реализовать полный процесс OAuth2 авторизации
 * @returns {OAuth2Client} - OAuth2 клиент
 */
const { getAuthenticatedOAuth2Client } = require('./tokenRefresher');

/**
 * Создает OAuth2 клиент для работы с Google API с автоматическим обновлением токенов
 * @returns {Promise<OAuth2Client>} - OAuth2 клиент
 */
async function getOAuth2Client() {
  try {
    // Получаем OAuth2 клиент с актуальными токенами
    return await getAuthenticatedOAuth2Client();
  } catch (error) {
    console.error('Ошибка при получении OAuth2 клиента:', error);

    // Если не удалось обновить токены, пробуем использовать текущие
    const credentials = {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      redirectUri:
        process.env.GOOGLE_REDIRECT_URI ||
        'http://localhost:3000/api/auth/callback/google',
    };

    const oauth2Client = new google.auth.OAuth2(
      credentials.clientId,
      credentials.clientSecret,
      credentials.redirectUri
    );

    if (process.env.GOOGLE_ACCESS_TOKEN) {
      oauth2Client.setCredentials({
        access_token: process.env.GOOGLE_ACCESS_TOKEN,
        refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
        expiry_date: parseInt(process.env.GOOGLE_TOKEN_EXPIRY || '0', 10),
      });
    }

    return oauth2Client;
  }
}

/**
 * Создает событие в Google Calendar для собеседования
 * @param {Object} interviewer - Объект с данными интервьюера
 * @param {Object} interviewee - Объект с данными интервьюируемого
 * @param {Object} interview - Объект с данными о собеседовании
 * @returns {Promise} - Промис с результатом создания события
 */
async function createCalendarEvent(interviewer, interviewee, interview) {
  console.log('Calendar: Создание события для собеседования');
  console.log('Calendar: Интервьюер:', interviewer.name, interviewer.email);
  console.log(
    'Calendar: Интервьюируемый:',
    interviewee.name,
    interviewee.email
  );
  console.log(
    'Calendar: Собеседование:',
    interview.id,
    interview.scheduledTime
  );

  // В режиме разработки просто логируем, что событие было бы создано
  if (process.env.NODE_ENV === 'development') {
    console.log('Calendar: В режиме разработки событие не создается');
    // Добавляем тестовую ссылку на Google Meet для тестирования
    const mockMeetingLink = 'https://meet.google.com/test-mock-link';
    console.log('Calendar: Тестовая ссылка на Google Meet:', mockMeetingLink);
    return {
      success: true,
      message: 'Calendar event would be created in production',
      mockEventId: `mock-event-${interview.id}`,
      meetingLink: mockMeetingLink, // Добавляем тестовую ссылку
    };
  }

  try {
    // Получаем OAuth2 клиент с автоматическим обновлением токена
    const oauth2Client = await getOAuth2Client();

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // Время начала и окончания собеседования (1 час)
    const startTime = new Date(interview.scheduledTime);
    const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // +1 час

    // Создаем событие
    const event = {
      summary: `Собеседование с ${interviewee.name}`,
      description: `Собеседование с ${interviewee.name} (${interviewee.email}).\n\nСсылка на встречу: ${interview.meetingLink}`,
      start: {
        dateTime: startTime.toISOString(),
        timeZone: 'Europe/Moscow', // Можно настроить через переменные окружения
      },
      end: {
        dateTime: endTime.toISOString(),
        timeZone: 'Europe/Moscow', // Можно настроить через переменные окружения
      },
      attendees: [{ email: interviewer.email }, { email: interviewee.email }],
      // Добавляем ссылку на Google Meet
      conferenceData: {
        createRequest: {
          requestId: interview.id,
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
      calendarId: 'primary', // Используем основной календарь пользователя
      resource: event,
      sendUpdates: 'all', // Отправляем уведомления всем участникам
      conferenceDataVersion: 1, // Для создания Google Meet
    });

    console.log('Calendar: Событие создано:', response.data.id);

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
        console.log('Calendar: Получена ссылка на Google Meet:', meetingLink);
      }
    }

    return {
      success: true,
      eventId: response.data.id,
      eventLink: response.data.htmlLink,
      meetingLink: meetingLink, // Добавляем ссылку на Google Meet в результат
    };
  } catch (error) {
    console.error('Calendar: Ошибка при создании события:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  createCalendarEvent,
};
