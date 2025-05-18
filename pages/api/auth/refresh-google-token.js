import { refreshTokenIfNeeded } from '../../../lib/utils/tokenRefresher';

/**
 * API-маршрут для обновления Google токенов
 * @param {Object} req - HTTP запрос
 * @param {Object} res - HTTP ответ
 */
export default async function handler(req, res) {
  // Разрешаем только POST запросы
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // Обновляем токен
    const tokens = await refreshTokenIfNeeded();

    // Проверяем корректность значения expiry_date
    let expiryDateISO;
    let expiresInSeconds;

    try {
      // Пытаемся создать объект Date и получить ISO строку
      expiryDateISO = new Date(parseInt(tokens.expiry_date)).toISOString();
      expiresInSeconds = Math.floor((tokens.expiry_date - Date.now()) / 1000);
    } catch (error) {
      // В случае ошибки используем текущее время + 1 час
      const defaultExpiryTime = Date.now() + 3600 * 1000;
      expiryDateISO = new Date(defaultExpiryTime).toISOString();
      expiresInSeconds = 3600;
      console.log('Использовано значение по умолчанию для expiry_date');
    }

    // Возвращаем успешный ответ
    return res.status(200).json({
      success: true,
      message: 'Токены успешно обновлены',
      expiry_date: expiryDateISO,
      expires_in_seconds: expiresInSeconds,
    });
  } catch (error) {
    console.error('Ошибка при обновлении токенов:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}
