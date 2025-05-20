const { google } = require('googleapis');

/**
 * Создает OAuth2 клиент для работы с Google API
 * В реальном приложении нужно реализовать полный процесс OAuth2 авторизации
 * @returns {OAuth2Client} - OAuth2 клиент
 */
<<<<<<< HEAD
const {
  getAuthenticatedOAuth2Client,
  getGoogleTokensFromDB,
} = require('./tokenRefresher');

/**
 * Создает OAuth2 клиент для работы с Google API с автоматическим обновлением токенов
 * @param {string} userId - ID пользователя (если не указан, используется системный аккаунт)
 * @returns {Promise<OAuth2Client>} - OAuth2 клиент
 */
async function getOAuth2Client(userId) {
  try {
    // Получаем OAuth2 клиент с актуальными токенами
    return await getAuthenticatedOAuth2Client(userId);
  } catch (error) {
    // Проверяем, связана ли ошибка с авторизацией
    if (
      error.message.includes('invalid_grant') ||
      error.message.includes('unauthorized')
    ) {
      console.error('Ошибка авторизации Google API:', error);
      // Можно добавить механизм уведомления администратора
      throw new Error(
        'Требуется повторная авторизация в Google. Обратитесь к администратору.'
      );
    }

    // Для других ошибок пробуем использовать текущие токены
    console.error('Ошибка при получении OAuth2 клиента:', error);

=======
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
>>>>>>> 077838ba75b141eded3ed5dc28fbb94584f109f4
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

<<<<<<< HEAD
    // Если передан userId, пытаемся получить токены из базы данных
    if (userId) {
      const tokens = await getGoogleTokensFromDB(userId);
      if (tokens) {
        oauth2Client.setCredentials({
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expiry_date: tokens.expires_at,
        });
        return oauth2Client;
      }
    }

    // Если не удалось получить токены из базы данных или userId не передан,
    // используем токены из переменных окружения (для обратной совместимости)
=======
>>>>>>> 077838ba75b141eded3ed5dc28fbb94584f109f4
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
/**
 * Создает событие в Google Calendar для собеседования с механизмом повторных попыток
 * @param {Object} interviewer - Объект с данными интервьюера
 * @param {Object} interviewee - Объект с данными интервьюируемого
 * @param {Object} interview - Объект с данными о собеседовании
 * @param {number} maxRetries - Максимальное количество повторных попыток (по умолчанию 3)
 * @returns {Promise} - Промис с результатом создания события
 */
async function createCalendarEvent(
  interviewer,
  interviewee,
  interview,
  maxRetries = 3
) {
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

<<<<<<< HEAD
  // Проверяем, не является ли существующая ссылка заглушкой
  if (
    interview.meetingLink &&
    interview.meetingLink.includes('test-mock-link')
  ) {
    console.log(
      'Calendar: Обнаружена заглушка test-mock-link, создаем реальную ссылку'
    );
    // Удаляем заглушку, чтобы создать новую реальную ссылку
    interview.meetingLink = '';
  }

  // Всегда создаем реальные ссылки на Google Meet, независимо от режима
  console.log('Calendar: Создаем реальную ссылку на Google Meet');

  // Закомментировано, чтобы всегда использовать реальные ссылки
  // if (
  //   process.env.NODE_ENV === 'development' &&
  //   process.env.ENABLE_REAL_MEET_LINKS !== 'true'
  // ) {
  //   console.log('Calendar: В режиме разработки событие не создается');
  //   // Добавляем тестовую ссылку на Google Meet для тестирования
  //   const mockMeetingLink = 'https://meet.google.com/test-mock-link';
  //   console.log('Calendar: Тестовая ссылка на Google Meet:', mockMeetingLink);
  //   return {
  //     success: true,
  //     message: 'Calendar event would be created in production',
  //     mockEventId: `mock-event-${interview.id}`,
  //     meetingLink: mockMeetingLink, // Добавляем тестовую ссылку
  //   };
  // }

=======
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

>>>>>>> 077838ba75b141eded3ed5dc28fbb94584f109f4
  // Функция для создания события с повторными попытками
  async function attemptCreateEvent(retryCount = 0) {
    try {
      // Получаем OAuth2 клиент с автоматическим обновлением токена
<<<<<<< HEAD
      // Используем ID интервьюера для получения токенов из базы данных
      const oauth2Client = await getOAuth2Client(interviewer.id);
=======
      const oauth2Client = await getOAuth2Client();
>>>>>>> 077838ba75b141eded3ed5dc28fbb94584f109f4
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
            requestId: `${interview.id}-${retryCount}`, // Добавляем номер попытки к requestId
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

      // Проверяем, что ссылка на Google Meet была успешно создана
      if (!meetingLink) {
        throw new Error('Не удалось получить ссылку на Google Meet');
      }

      return {
        success: true,
        eventId: response.data.id,
        eventLink: response.data.htmlLink,
        meetingLink: meetingLink, // Добавляем ссылку на Google Meet в результат
      };
    } catch (error) {
      // Если это последняя попытка, возвращаем ошибку
      if (retryCount >= maxRetries) {
        console.error(
          `Calendar: Все попытки создания события исчерпаны (${maxRetries}):`,
          error
        );
        return {
          success: false,
          error: error.message,
          retriesExhausted: true,
        };
      }

      // Иначе делаем паузу и пробуем снова
      console.warn(
        `Calendar: Ошибка при создании события (попытка ${
          retryCount + 1
        }/${maxRetries}):`,
        error
      );
      console.log(
        `Calendar: Повторная попытка через ${(retryCount + 1) * 2} секунд...`
      );

      // Экспоненциальная задержка перед повторной попыткой
      await new Promise((resolve) =>
        setTimeout(resolve, (retryCount + 1) * 2000)
      );

      // Рекурсивно вызываем функцию с увеличенным счетчиком попыток
      return attemptCreateEvent(retryCount + 1);
    }
  }

  // Запускаем процесс создания события с повторными попытками
  return attemptCreateEvent();
}

<<<<<<< HEAD
/**
 * Извлекает ссылку на Google Meet из события календаря
 * @param {Object} event - Объект события календаря
 * @returns {string} - Ссылка на Google Meet или пустая строка
 */
function getMeetingLinkFromEvent(event) {
  if (
    event.conferenceData &&
    event.conferenceData.entryPoints &&
    event.conferenceData.entryPoints.length > 0
  ) {
    // Находим ссылку на Google Meet среди точек входа
    const meetEntryPoint = event.conferenceData.entryPoints.find(
      (entry) => entry.entryPointType === 'video'
    );
    if (meetEntryPoint) {
      return meetEntryPoint.uri;
    }
  }
  return '';
}

/**
 * Обновляет существующее событие в Google Calendar
 * @param {string} calendarEventId - ID события в Google Calendar
 * @param {Object} interviewer - Объект с данными интервьюера
 * @param {Object} interviewee - Объект с данными интервьюируемого
 * @param {Object} interview - Объект с данными о собеседовании
 * @returns {Promise} - Промис с результатом обновления события
 */
async function updateCalendarEvent(
  calendarEventId,
  interviewer,
  interviewee,
  interview
) {
  try {
    // Используем ID интервьюера для получения токенов из базы данных
    const oauth2Client = await getOAuth2Client(interviewer.id);
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // Обновляем существующее событие
    const response = await calendar.events.patch({
      calendarId: 'primary',
      eventId: calendarEventId,
      resource: {
        // Обновленные данные события
        summary: `Собеседование с ${interviewee.name}`,
        description: `Собеседование с ${interviewee.name} (${interviewee.email})`,
        start: {
          dateTime: new Date(interview.scheduledTime).toISOString(),
          timeZone: 'Europe/Moscow',
        },
        end: {
          dateTime: new Date(
            new Date(interview.scheduledTime).getTime() + 60 * 60 * 1000
          ).toISOString(),
          timeZone: 'Europe/Moscow',
        },
        attendees: [{ email: interviewer.email }, { email: interviewee.email }],
      },
      sendUpdates: 'all',
    });

    return {
      success: true,
      eventId: response.data.id,
      eventLink: response.data.htmlLink,
      meetingLink: getMeetingLinkFromEvent(response.data),
    };
  } catch (error) {
    console.error('Ошибка при обновлении события в календаре:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  createCalendarEvent,
  updateCalendarEvent,
=======
module.exports = {
  createCalendarEvent,
>>>>>>> 077838ba75b141eded3ed5dc28fbb94584f109f4
};
