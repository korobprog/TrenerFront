const { google } = require('googleapis');
const {
  getAuthenticatedOAuth2Client,
  getGoogleTokensFromDB,
} = require('./tokenRefresher');

/**
 * Получает OAuth2 клиент для работы с Gmail API с автоматическим обновлением токенов
 * @param {string} userId - ID пользователя (если не указан, используется системный аккаунт)
 * @returns {Promise<OAuth2Client>} - OAuth2 клиент
 */
async function getGmailOAuth2Client(userId) {
  try {
    // Получаем OAuth2 клиент с актуальными токенами
    return await getAuthenticatedOAuth2Client(userId);
  } catch (error) {
    // Проверяем, связана ли ошибка с авторизацией
    if (
      error.message.includes('invalid_grant') ||
      error.message.includes('unauthorized')
    ) {
      console.error('Ошибка авторизации Gmail API:', error);
      throw new Error(
        'Требуется повторная авторизация в Google. Обратитесь к администратору.'
      );
    }

    // Для других ошибок пробуем использовать текущие токены
    console.error('Ошибка при получении OAuth2 клиента для Gmail:', error);

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
 * Инициализирует Gmail API клиент
 * @param {string} userId - ID пользователя (если не указан, используется системный аккаунт)
 * @returns {Promise<Object>} - Gmail API клиент
 */
async function initializeGmailClient(userId) {
  try {
    const auth = await getGmailOAuth2Client(userId);
    return google.gmail({ version: 'v1', auth });
  } catch (error) {
    console.error('Ошибка при инициализации Gmail API клиента:', error);
    throw error;
  }
}

/**
 * Кодирует строку в base64url формат для Gmail API
 * @param {string} str - Строка для кодирования
 * @returns {string} - Закодированная строка
 */
function encodeBase64Url(str) {
  return Buffer.from(str)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Создает MIME-сообщение для отправки через Gmail API
 * @param {Object} options - Параметры сообщения
 * @param {string} options.from - Email отправителя
 * @param {string} options.to - Email получателя
 * @param {string} options.subject - Тема письма
 * @param {string} options.text - Текстовое содержимое письма
 * @param {string} options.html - HTML содержимое письма
 * @returns {string} - Закодированное MIME-сообщение
 */
function createMimeMessage(options) {
  const { from, to, subject, text, html } = options;

  // Создаем заголовки
  const headers = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: =?UTF-8?B?${Buffer.from(subject).toString('base64')}?=`,
    'MIME-Version: 1.0',
    'Content-Type: multipart/alternative; boundary="boundary_text"',
  ].join('\r\n');

  // Создаем текстовую часть
  const textPart = [
    '--boundary_text',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: quoted-printable',
    '',
    text,
  ].join('\r\n');

  // Создаем HTML часть
  const htmlPart = [
    '--boundary_text',
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: quoted-printable',
    '',
    html,
    '--boundary_text--',
  ].join('\r\n');

  // Собираем полное сообщение
  const message = [headers, '', textPart, htmlPart].join('\r\n');

  return encodeBase64Url(message);
}

/**
 * Отправляет электронное письмо через Gmail API
 * @param {Object} mailOptions - Параметры письма
 * @param {string} userId - ID пользователя (если не указан, используется системный аккаунт)
 * @param {number} maxRetries - Максимальное количество повторных попыток (по умолчанию 3)
 * @returns {Promise<Object>} - Результат отправки
 */
async function sendMailViaGmailApi(mailOptions, userId, maxRetries = 3) {
  console.log('Gmail API: Отправка письма');
  console.log('Gmail API: Получатель:', mailOptions.to);
  console.log('Gmail API: Тема:', mailOptions.subject);

  // Функция для отправки письма с повторными попытками
  async function attemptSendMail(retryCount = 0) {
    try {
      // Инициализируем Gmail API клиент
      const gmail = await initializeGmailClient(userId);

      // Создаем MIME-сообщение
      const raw = createMimeMessage({
        from: mailOptions.from,
        to: mailOptions.to,
        subject: mailOptions.subject,
        text: mailOptions.text || '',
        html: mailOptions.html || '',
      });

      // Отправляем сообщение
      const response = await gmail.users.messages.send({
        userId: 'me', // 'me' означает текущего аутентифицированного пользователя
        requestBody: {
          raw: raw,
        },
      });

      console.log('Gmail API: Письмо успешно отправлено:', response.data.id);

      return {
        success: true,
        messageId: response.data.id,
        timestamp: new Date().toISOString(),
        method: 'gmail_api',
        response: response.data,
      };
    } catch (error) {
      // Если это последняя попытка, возвращаем ошибку
      if (retryCount >= maxRetries) {
        console.error(
          `Gmail API: Все попытки отправки письма исчерпаны (${maxRetries}):`,
          error
        );
        return {
          success: false,
          error: error.message,
          retriesExhausted: true,
          timestamp: new Date().toISOString(),
          method: 'gmail_api',
          retryCount: retryCount,
          maxRetries: maxRetries,
          errorDetails: {
            code: error.code,
            status: error.status,
            statusText: error.statusText,
            response: error.response
              ? {
                  data: error.response.data,
                  status: error.response.status,
                  statusText: error.response.statusText,
                }
              : null,
          },
        };
      }

      // Иначе делаем паузу и пробуем снова
      console.warn(
        `Gmail API: Ошибка при отправке письма (попытка ${
          retryCount + 1
        }/${maxRetries}):`,
        error
      );
      console.log(
        `Gmail API: Повторная попытка через ${(retryCount + 1) * 2} секунд...`
      );

      // Экспоненциальная задержка перед повторной попыткой
      await new Promise((resolve) =>
        setTimeout(resolve, (retryCount + 1) * 2000)
      );

      // Рекурсивно вызываем функцию с увеличенным счетчиком попыток
      return attemptSendMail(retryCount + 1);
    }
  }

  // Запускаем процесс отправки письма с повторными попытками
  return attemptSendMail();
}

module.exports = {
  sendMailViaGmailApi,
  initializeGmailClient,
};
