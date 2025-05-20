<<<<<<< HEAD
import { getServerSession } from 'next-auth/next';
import { authOptions } from './[...nextauth]';
import { refreshTokenIfNeeded } from '../../../lib/utils/tokenRefresher';
import prisma from '../../../lib/prisma';
=======
import { refreshTokenIfNeeded } from '../../../lib/utils/tokenRefresher';
>>>>>>> 077838ba75b141eded3ed5dc28fbb94584f109f4

/**
 * API-маршрут для обновления Google токенов
 * @param {Object} req - HTTP запрос
 * @param {Object} res - HTTP ответ
 */
export default async function handler(req, res) {
<<<<<<< HEAD
  console.log('API refresh-google-token: Начало обработки запроса');

  // Разрешаем только POST запросы
  if (req.method !== 'POST') {
    console.log('API refresh-google-token: Метод не разрешен:', req.method);
=======
  // Разрешаем только POST запросы
  if (req.method !== 'POST') {
>>>>>>> 077838ba75b141eded3ed5dc28fbb94584f109f4
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
<<<<<<< HEAD
    // Получаем сессию пользователя
    console.log('API refresh-google-token: Получение сессии пользователя');
    const session = await getServerSession(req, res, authOptions);
    console.log(
      'API refresh-google-token: Сессия получена:',
      session ? 'Да' : 'Нет'
    );

    if (!session) {
      console.log(
        'API refresh-google-token: Сессия отсутствует, требуется авторизация'
      );
      return res.status(401).json({ error: 'Необходима авторизация' });
    }

    const userId = session.user.id;
    console.log('API refresh-google-token: ID пользователя:', userId);

    // Проверяем, есть ли у пользователя аккаунт Google
    console.log(
      'API refresh-google-token: Поиск аккаунта Google для пользователя'
    );
    const googleAccount = await prisma.account.findFirst({
      where: {
        userId: userId,
        provider: 'google',
      },
    });
    console.log(
      'API refresh-google-token: Аккаунт Google найден:',
      googleAccount ? 'Да' : 'Нет'
    );

    if (!googleAccount) {
      console.log(
        'API refresh-google-token: Google аккаунт не найден для пользователя',
        userId
      );
      return res.status(404).json({
        success: false,
        error: 'Google аккаунт не найден для данного пользователя',
      });
    }

    // Обновляем токен, передавая userId
    console.log(
      'API refresh-google-token: Вызов refreshTokenIfNeeded для пользователя',
      userId
    );
    const tokens = await refreshTokenIfNeeded({ userId, expiryThreshold: 300 });
    console.log('API refresh-google-token: Токены успешно обновлены');

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
=======
    // Обновляем токен
    const tokens = await refreshTokenIfNeeded();
>>>>>>> 077838ba75b141eded3ed5dc28fbb94584f109f4

    // Возвращаем успешный ответ
    return res.status(200).json({
      success: true,
      message: 'Токены успешно обновлены',
<<<<<<< HEAD
      expiry_date: expiryDateISO,
      expires_in_seconds: expiresInSeconds,
    });
  } catch (error) {
    console.error(
      'API refresh-google-token: Ошибка при обновлении токенов:',
      error
    );
    console.error('API refresh-google-token: Стек ошибки:', error.stack);

    // Добавляем дополнительную информацию об ошибке
    let errorDetails = {
      message: error.message,
      name: error.name,
      code: error.code || 'unknown',
    };

    console.log('API refresh-google-token: Детали ошибки:', errorDetails);

    return res.status(500).json({
      success: false,
      error: error.message,
      errorDetails: errorDetails,
=======
      expiry_date: new Date(tokens.expiry_date).toISOString(),
      expires_in_seconds: Math.floor((tokens.expiry_date - Date.now()) / 1000),
    });
  } catch (error) {
    console.error('Ошибка при обновлении токенов:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
>>>>>>> 077838ba75b141eded3ed5dc28fbb94584f109f4
    });
  }
}
