import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../pages/api/auth/[...nextauth]';
import { withPrisma } from '../prisma';

/**
 * Middleware для проверки прав супер-администратора
 * @param {Function} handler - Обработчик API запроса
 * @returns {Function} - Обертка для обработчика с проверкой прав
 */
export function withSuperAdminAuth(handler) {
  return async (req, res) => {
    try {
      console.log('superAdminAuth: Запрос к защищенному API:', req.url);
      console.log('superAdminAuth: Метод запроса:', req.method);

      // Получаем сессию пользователя
      const session = await getServerSession(req, res, authOptions);
      console.log(
        'superAdminAuth: Сессия пользователя:',
        session ? 'получена' : 'отсутствует'
      );

      if (session) {
        console.log('superAdminAuth: Детали сессии:');
        console.log('- ID пользователя:', session.user?.id);
        console.log('- Email пользователя:', session.user?.email);
        console.log('- Имя пользователя:', session.user?.name);
        console.log('- Роль пользователя:', session.user?.role);
        console.log('- Временная метка сессии:', session.timestamp);
        console.log(
          '- Полная структура сессии:',
          JSON.stringify(session, null, 2)
        );
      } else {
        console.log('superAdminAuth: Детали запроса:');
        console.log('- Метод:', req.method);
        console.log('- URL:', req.url);
        console.log('- Заголовки:', JSON.stringify(req.headers, null, 2));
        console.log(
          '- Cookies:',
          req.cookies ? JSON.stringify(req.cookies, null, 2) : 'отсутствуют'
        );
      }

      // Если сессия отсутствует, возвращаем ошибку авторизации
      if (!session) {
        console.log(
          'superAdminAuth: Сессия отсутствует, возвращаем ошибку авторизации'
        );
        return res.status(401).json({ message: 'Необходима авторизация' });
      }

      // Получаем пользователя из базы данных для проверки роли
      console.log(
        'superAdminAuth: Запрос пользователя из базы данных с ID:',
        session.user.id
      );
      const user = await withPrisma(async (prisma) => {
        return await prisma.user.findUnique({
          where: { id: session.user.id },
          select: { id: true, role: true, isBlocked: true },
        });
      });

      console.log(
        'superAdminAuth: Результат запроса пользователя из базы данных:',
        user ? 'найден' : 'не найден'
      );
      if (user) {
        console.log(
          'superAdminAuth: Роль пользователя в базе данных:',
          user.role
        );
        console.log(
          'superAdminAuth: Статус блокировки пользователя:',
          user.isBlocked
        );
      }

      // Если пользователь не найден или заблокирован, возвращаем ошибку
      if (!user || user.isBlocked) {
        console.log(
          'superAdminAuth: Пользователь не найден или заблокирован, возвращаем ошибку доступа'
        );
        return res.status(403).json({ message: 'Доступ запрещен' });
      }

      // Проверяем, имеет ли пользователь роль супер-администратора
      if (user.role !== 'superadmin') {
        console.log(
          'superAdminAuth: Пользователь не имеет роли супер-администратора, возвращаем ошибку прав'
        );
        return res
          .status(403)
          .json({ message: 'Требуются права супер-администратора' });
      }

      console.log(
        'superAdminAuth: Проверка прав супер-администратора пройдена успешно'
      );

      // Добавляем информацию о супер-администраторе в запрос
      req.superAdmin = {
        id: user.id,
        role: user.role,
      };

      // Если все проверки пройдены, вызываем обработчик
      return handler(req, res);
    } catch (error) {
      console.error('Ошибка при проверке прав супер-администратора:', error);
      return res
        .status(500)
        .json({ message: 'Ошибка сервера при проверке прав' });
    }
  };
}

/**
 * Функция для логирования действий супер-администратора
 * @param {string} superAdminId - ID супер-администратора
 * @param {string} action - Тип действия
 * @param {string} entityType - Тип сущности
 * @param {string} entityId - ID сущности
 * @param {Object} details - Дополнительные детали действия
 * @returns {Promise<Object>} - Созданная запись лога
 */
export async function logSuperAdminAction(
  superAdminId,
  action,
  entityType,
  entityId,
  details = {}
) {
  try {
    const log = await withPrisma(async (prisma) => {
      return await prisma.adminActionLog.create({
        data: {
          adminId: superAdminId,
          action,
          entityType,
          entityId,
          details,
        },
      });
    });

    return log;
  } catch (error) {
    console.error(
      'Ошибка при логировании действия супер-администратора:',
      error
    );
    throw error;
  }
}
