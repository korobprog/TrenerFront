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

    // Возвращаем успешный ответ
    return res.status(200).json({
      success: true,
      message: 'Токены успешно обновлены',
      expiry_date: new Date(tokens.expiry_date).toISOString(),
      expires_in_seconds: Math.floor((tokens.expiry_date - Date.now()) / 1000),
    });
  } catch (error) {
    console.error('Ошибка при обновлении токенов:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}
