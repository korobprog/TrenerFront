import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import prisma from '../../../lib/prisma';

export default async function handler(req, res) {
  try {
    // Получаем сессию пользователя
    const session = await getServerSession(req, res, authOptions);

    if (!session?.user?.id) {
      return res.status(401).json({
        error: 'Необходима авторизация',
      });
    }

    const userId = session.user.id;

    if (req.method === 'GET') {
      // Получение настроек аутентификации
      try {
        let authSettings = await prisma.userAuthSettings.findUnique({
          where: { userId },
        });

        // Если настройки не найдены, создаем их с значениями по умолчанию
        if (!authSettings) {
          authSettings = await prisma.userAuthSettings.create({
            data: {
              userId,
              enableEmailAuth: true,
              enableGoogleAuth: true,
              enableGithubAuth: true,
              enableCredentialsAuth: true,
              requireTwoFactor: false,
              sessionTimeout: 24,
            },
          });
        }

        return res.status(200).json({
          success: true,
          data: authSettings,
        });
      } catch (error) {
        console.error('Ошибка при получении настроек аутентификации:', error);
        return res.status(500).json({
          error: 'Ошибка при получении настроек аутентификации',
        });
      }
    }

    if (req.method === 'PUT') {
      // Обновление настроек аутентификации
      try {
        const {
          enableEmailAuth,
          enableGoogleAuth,
          enableGithubAuth,
          enableCredentialsAuth,
          requireTwoFactor,
          sessionTimeout,
        } = req.body;

        // Валидация данных
        if (
          typeof enableEmailAuth !== 'boolean' ||
          typeof enableGoogleAuth !== 'boolean' ||
          typeof enableGithubAuth !== 'boolean' ||
          typeof enableCredentialsAuth !== 'boolean' ||
          typeof requireTwoFactor !== 'boolean'
        ) {
          return res.status(400).json({
            error: 'Неверный формат данных',
          });
        }

        // Проверяем, что хотя бы один способ входа остается включенным
        if (
          !enableEmailAuth &&
          !enableGoogleAuth &&
          !enableGithubAuth &&
          !enableCredentialsAuth
        ) {
          return res.status(400).json({
            error: 'Необходимо оставить включенным хотя бы один способ входа',
          });
        }

        // Валидация времени жизни сессии
        if (sessionTimeout && (sessionTimeout < 1 || sessionTimeout > 168)) {
          // от 1 часа до 7 дней
          return res.status(400).json({
            error: 'Время жизни сессии должно быть от 1 до 168 часов',
          });
        }

        // Обновляем или создаем настройки
        const authSettings = await prisma.userAuthSettings.upsert({
          where: { userId },
          update: {
            enableEmailAuth,
            enableGoogleAuth,
            enableGithubAuth,
            enableCredentialsAuth,
            requireTwoFactor,
            sessionTimeout: sessionTimeout || 24,
          },
          create: {
            userId,
            enableEmailAuth,
            enableGoogleAuth,
            enableGithubAuth,
            enableCredentialsAuth,
            requireTwoFactor,
            sessionTimeout: sessionTimeout || 24,
          },
        });

        return res.status(200).json({
          success: true,
          message: 'Настройки аутентификации успешно обновлены',
          data: authSettings,
        });
      } catch (error) {
        console.error('Ошибка при обновлении настроек аутентификации:', error);
        return res.status(500).json({
          error: 'Ошибка при обновлении настроек аутентификации',
        });
      }
    }

    // Метод не поддерживается
    return res.status(405).json({
      error: 'Метод не поддерживается',
    });
  } catch (error) {
    console.error('Общая ошибка в API настроек аутентификации:', error);
    return res.status(500).json({
      error: 'Внутренняя ошибка сервера',
    });
  }
}
