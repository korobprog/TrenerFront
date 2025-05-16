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
    throw error;
  }
}

/**
 * Проверяет и при необходимости обновляет токен
 * @param {Object} options - Параметры
 * @param {number} options.expiryThreshold - Порог в секундах, при котором токен считается "скоро истекающим"
 * @returns {Promise<Object>} - Объект с токенами
 */
async function refreshTokenIfNeeded(options = { expiryThreshold: 300 }) {
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

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    // Устанавливаем refresh_token для получения нового access_token
    oauth2Client.setCredentials({
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
      throw error;
    }
  }

  // Если токен еще действителен, возвращаем текущие значения
  return {
    access_token: process.env.GOOGLE_ACCESS_TOKEN,
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
    expiry_date: expiryDate,
  };
}

/**
 * Получает настроенный OAuth2 клиент с актуальными токенами
 * @returns {Promise<OAuth2Client>} - Настроенный OAuth2 клиент
 */
async function getAuthenticatedOAuth2Client() {
  try {
    // Обновляем токен при необходимости
    const tokens = await refreshTokenIfNeeded();

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

module.exports = {
  refreshTokenIfNeeded,
  getAuthenticatedOAuth2Client,
};
