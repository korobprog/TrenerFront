<<<<<<< HEAD
import { google } from 'googleapis';
import prisma from '../prisma';

// Добавляем логи для отладки проблемы с импортом prisma
console.log('tokenRefresher: Импортированный prisma:', prisma);
console.log('tokenRefresher: Тип prisma:', typeof prisma);
console.log(
  'tokenRefresher: prisma.account:',
  prisma ? prisma.account : 'prisma is undefined'
);

/**
 * Получает токены Google из базы данных для указанного пользователя
 * @param {string} userId - ID пользователя
 * @returns {Promise<Object|null>} - Объект с токенами или null, если токены не найдены
 */
async function getGoogleTokensFromDB(userId) {
  try {
    console.log(
      'tokenRefresher: Вызов getGoogleTokensFromDB для userId:',
      userId
    );
    console.log('tokenRefresher: prisma доступен:', !!prisma);
    console.log(
      'tokenRefresher: prisma.account доступен:',
      prisma && !!prisma.account
    );

    // Ищем аккаунт Google для указанного пользователя
    const account = await prisma.account.findFirst({
      where: {
        userId: userId,
        provider: 'google',
      },
    });

    if (!account || !account.refresh_token) {
      console.log(`Токены Google не найдены для пользователя ${userId}`);
      return null;
    }

    return {
      access_token: account.access_token,
      refresh_token: account.refresh_token,
      expires_at: account.expires_at ? account.expires_at * 1000 : null, // Конвертируем в миллисекунды
    };
  } catch (error) {
    console.error('Ошибка при получении токенов из базы данных:', error);
    throw error;
  }
}

/**
 * Обновляет токены Google в базе данных
 * @param {string} userId - ID пользователя
 * @param {string} accessToken - Новый access token
 * @param {number} expiresAt - Время истечения токена в секундах от эпохи
 * @returns {Promise<Object>} - Обновленный объект аккаунта
 */
async function updateGoogleTokensInDB(userId, accessToken, expiresAt) {
  try {
    // Обновляем токены в базе данных
    const updatedAccount = await prisma.account.updateMany({
      where: {
        userId: userId,
        provider: 'google',
      },
      data: {
        access_token: accessToken,
        expires_at: Math.floor(expiresAt / 1000), // Конвертируем в секунды для хранения в БД
      },
    });

    console.log(
      `Токены успешно обновлены в базе данных для пользователя ${userId}`
    );
    return updatedAccount;
  } catch (error) {
    console.error('Ошибка при обновлении токенов в базе данных:', error);
=======
const { google } = require('googleapis');
const fs = require('fs').promises;
const path = require('path');

/**
 * Обновляет .env.local файл с новыми значениями токенов
 * @param {string} accessToken - Новый access token
 * @param {number} expiryTime - Время истечения токена в миллисекундах
 */
async function updateEnvFile(accessToken, expiryTime) {
  try {
    const envPath = path.resolve(process.cwd(), '.env.local');
    const envContent = await fs.readFile(envPath, 'utf8');

    // Обновляем значения токенов
    const updatedContent = envContent
      .replace(/GOOGLE_ACCESS_TOKEN=.*/, `GOOGLE_ACCESS_TOKEN=${accessToken}`)
      .replace(/GOOGLE_TOKEN_EXPIRY=.*/, `GOOGLE_TOKEN_EXPIRY=${expiryTime}`);

    // Записываем обновленный файл
    await fs.writeFile(envPath, updatedContent, 'utf8');

    // Обновляем переменные окружения в текущем процессе
    process.env.GOOGLE_ACCESS_TOKEN = accessToken;
    process.env.GOOGLE_TOKEN_EXPIRY = expiryTime.toString();

    console.log('Токены успешно обновлены в .env.local');
  } catch (error) {
    console.error('Ошибка при обновлении .env.local:', error);
>>>>>>> 077838ba75b141eded3ed5dc28fbb94584f109f4
    throw error;
  }
}

/**
 * Проверяет и при необходимости обновляет токен
 * @param {Object} options - Параметры
<<<<<<< HEAD
 * @param {string} options.userId - ID пользователя
=======
>>>>>>> 077838ba75b141eded3ed5dc28fbb94584f109f4
 * @param {number} options.expiryThreshold - Порог в секундах, при котором токен считается "скоро истекающим"
 * @returns {Promise<Object>} - Объект с токенами
 */
async function refreshTokenIfNeeded(options = { expiryThreshold: 300 }) {
<<<<<<< HEAD
  console.log('tokenRefresher: Вызов refreshTokenIfNeeded с опциями:', options);

  // Проверяем, передан ли userId
  if (!options.userId) {
    // Для обратной совместимости используем токены из переменных окружения
    console.warn(
      'tokenRefresher: userId не указан, используем токены из переменных окружения (устаревший метод)'
    );

    const currentTime = Date.now();
    const expiryDate = parseInt(process.env.GOOGLE_TOKEN_EXPIRY || '0', 10);
    const thresholdTime = currentTime + options.expiryThreshold * 1000;

    console.log(
      'tokenRefresher: Текущее время:',
      new Date(currentTime).toISOString()
    );
    console.log(
      'tokenRefresher: Время истечения токена:',
      expiryDate ? new Date(expiryDate).toISOString() : 'не задано'
    );
    console.log(
      'tokenRefresher: Пороговое время:',
      new Date(thresholdTime).toISOString()
    );
    console.log(
      'tokenRefresher: Токен доступа существует:',
      !!process.env.GOOGLE_ACCESS_TOKEN
    );

    // Если токен отсутствует или скоро истечет, возвращаем ошибку
    if (
      !process.env.GOOGLE_ACCESS_TOKEN ||
      !expiryDate ||
      expiryDate < thresholdTime
    ) {
      console.error(
        'tokenRefresher: Токены в переменных окружения отсутствуют или истекли'
      );
      throw new Error(
        'Токены в переменных окружения отсутствуют или истекли. Необходимо использовать токены из базы данных.'
      );
    }

    console.log('tokenRefresher: Возвращаем токены из переменных окружения');
    // Возвращаем токены из переменных окружения
    return {
      access_token: process.env.GOOGLE_ACCESS_TOKEN,
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
      expiry_date: expiryDate,
    };
  }

  console.log(
    'tokenRefresher: Получение токенов из базы данных для пользователя',
    options.userId
  );
  // Получаем токены из базы данных
  const tokens = await getGoogleTokensFromDB(options.userId);
  console.log('tokenRefresher: Токены получены из БД:', tokens ? 'Да' : 'Нет');

  if (!tokens) {
    console.error(
      'tokenRefresher: Токены Google не найдены для пользователя',
      options.userId
    );
    throw new Error(
      `Токены Google не найдены для пользователя ${options.userId}`
    );
  }

  const currentTime = Date.now();
  const expiryDate = tokens.expires_at || 0;
  const thresholdTime = currentTime + options.expiryThreshold * 1000;

  console.log(
    'tokenRefresher: Текущее время:',
    new Date(currentTime).toISOString()
  );
  console.log(
    'tokenRefresher: Время истечения токена:',
    expiryDate ? new Date(expiryDate).toISOString() : 'не задано'
  );
  console.log(
    'tokenRefresher: Пороговое время:',
    new Date(thresholdTime).toISOString()
  );
  console.log(
    'tokenRefresher: Токен доступа существует:',
    !!tokens.access_token
  );
  console.log(
    'tokenRefresher: Токен обновления существует:',
    !!tokens.refresh_token
  );

  // Проверяем, истекает ли токен в ближайшее время
  if (!tokens.access_token || !expiryDate || expiryDate < thresholdTime) {
    console.log(
      `tokenRefresher: Токен отсутствует или скоро истечет для пользователя ${options.userId}, обновляем...`
    );

    // Проверяем наличие refresh токена
    if (!tokens.refresh_token) {
      console.error(
        `tokenRefresher: Отсутствует refresh_token для пользователя ${options.userId}`
      );
      throw new Error(
        `Отсутствует refresh_token для пользователя ${options.userId}. Невозможно обновить токен.`
      );
    }

    console.log('tokenRefresher: Создание OAuth2 клиента');
    console.log(
      'tokenRefresher: GOOGLE_CLIENT_ID существует:',
      !!process.env.GOOGLE_CLIENT_ID
    );
    console.log(
      'tokenRefresher: GOOGLE_CLIENT_SECRET существует:',
      !!process.env.GOOGLE_CLIENT_SECRET
    );
    console.log(
      'tokenRefresher: GOOGLE_REDIRECT_URI существует:',
      !!process.env.GOOGLE_REDIRECT_URI
    );

=======
  const currentTime = Date.now();
  const expiryDate = parseInt(process.env.GOOGLE_TOKEN_EXPIRY || '0', 10);

  // Проверяем, истекает ли токен в ближайшее время
  const thresholdTime = currentTime + options.expiryThreshold * 1000;

  // Если токен отсутствует или скоро истечет, обновляем его
  if (
    !process.env.GOOGLE_ACCESS_TOKEN ||
    !expiryDate ||
    expiryDate < thresholdTime
  ) {
    console.log('Токен отсутствует или скоро истечет, обновляем...');

    // Проверяем наличие refresh токена
    if (!process.env.GOOGLE_REFRESH_TOKEN) {
      throw new Error(
        'Отсутствует GOOGLE_REFRESH_TOKEN. Невозможно обновить токен.'
      );
    }

>>>>>>> 077838ba75b141eded3ed5dc28fbb94584f109f4
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    // Устанавливаем refresh_token для получения нового access_token
    oauth2Client.setCredentials({
<<<<<<< HEAD
      refresh_token: tokens.refresh_token,
    });
    console.log(
      'tokenRefresher: Учетные данные установлены для OAuth2 клиента'
    );

    try {
      console.log(
        'tokenRefresher: Запрос нового токена через refreshAccessToken'
      );
      // Запрашиваем новый токен
      const { credentials } = await oauth2Client.refreshAccessToken();
      console.log('tokenRefresher: Новый токен получен успешно');
      console.log(
        'tokenRefresher: Время жизни нового токена (секунды):',
        credentials.expires_in
      );

      // Вычисляем время истечения
      const newExpiryTime = Date.now() + credentials.expires_in * 1000;
      console.log(
        'tokenRefresher: Новое время истечения:',
        new Date(newExpiryTime).toISOString()
      );

      // Обновляем токены в базе данных
      console.log('tokenRefresher: Обновление токенов в базе данных');
      await updateGoogleTokensInDB(
        options.userId,
        credentials.access_token,
        newExpiryTime
      );
      console.log('tokenRefresher: Токены успешно обновлены в базе данных');

      return {
        access_token: credentials.access_token,
        refresh_token: tokens.refresh_token,
        expiry_date: newExpiryTime,
      };
    } catch (error) {
      console.error(
        `tokenRefresher: Ошибка при обновлении токена для пользователя ${options.userId}:`,
        error.message
      );
      console.error('tokenRefresher: Стек ошибки:', error.stack);
      console.error('tokenRefresher: Детали ошибки:', {
        name: error.name,
        code: error.code,
        status: error.status,
        response: error.response
          ? JSON.stringify(error.response.data)
          : 'нет данных',
      });
=======
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
    });

    try {
      // Запрашиваем новый токен
      const { credentials } = await oauth2Client.refreshAccessToken();

      // Вычисляем время истечения
      const newExpiryTime = Date.now() + credentials.expires_in * 1000;

      // Обновляем .env.local файл
      await updateEnvFile(credentials.access_token, newExpiryTime);

      return {
        access_token: credentials.access_token,
        refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
        expiry_date: newExpiryTime,
      };
    } catch (error) {
      console.error('Ошибка при обновлении токена:', error);
>>>>>>> 077838ba75b141eded3ed5dc28fbb94584f109f4
      throw error;
    }
  }

<<<<<<< HEAD
  console.log(
    'tokenRefresher: Токен еще действителен, возвращаем текущие значения'
  );
  // Если токен еще действителен, возвращаем текущие значения
  return tokens;
=======
  // Если токен еще действителен, возвращаем текущие значения
  return {
    access_token: process.env.GOOGLE_ACCESS_TOKEN,
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
    expiry_date: expiryDate,
  };
>>>>>>> 077838ba75b141eded3ed5dc28fbb94584f109f4
}

/**
 * Получает настроенный OAuth2 клиент с актуальными токенами
<<<<<<< HEAD
 * @param {string} userId - ID пользователя (опционально, для обратной совместимости)
 * @returns {Promise<OAuth2Client>} - Настроенный OAuth2 клиент
 */
async function getAuthenticatedOAuth2Client(userId) {
  try {
    // Обновляем токен при необходимости
    const tokens = await refreshTokenIfNeeded({ userId });
=======
 * @returns {Promise<OAuth2Client>} - Настроенный OAuth2 клиент
 */
async function getAuthenticatedOAuth2Client() {
  try {
    // Обновляем токен при необходимости
    const tokens = await refreshTokenIfNeeded();
>>>>>>> 077838ba75b141eded3ed5dc28fbb94584f109f4

    // Создаем OAuth2 клиент
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    // Устанавливаем токены
    oauth2Client.setCredentials({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expiry_date: tokens.expiry_date,
    });

    return oauth2Client;
  } catch (error) {
    console.error('Ошибка при получении OAuth2 клиента:', error);
    throw error;
  }
}

<<<<<<< HEAD
// Экспорт для ES модулей
export {
  refreshTokenIfNeeded,
  getAuthenticatedOAuth2Client,
  getGoogleTokensFromDB,
  updateGoogleTokensInDB,
};

// Экспорт для CommonJS (для обратной совместимости)
if (typeof module !== 'undefined') {
  module.exports = {
    refreshTokenIfNeeded,
    getAuthenticatedOAuth2Client,
    getGoogleTokensFromDB,
    updateGoogleTokensInDB,
  };
}
=======
module.exports = {
  refreshTokenIfNeeded,
  getAuthenticatedOAuth2Client,
};
>>>>>>> 077838ba75b141eded3ed5dc28fbb94584f109f4
