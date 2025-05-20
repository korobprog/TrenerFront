import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../pages/api/auth/[...nextauth]';
import prisma, { withPrisma } from '../prisma';

/**
 * Middleware для проверки административных прав пользователя
 * @param {Function} handler - Обработчик API запроса
 * @returns {Function} - Обертка для обработчика с проверкой прав
 */
export function withAdminAuth(handler) {
  return async (req, res) => {
    try {
      console.log('adminAuth: Запрос к защищенному API:', req.url);
      console.log('adminAuth: Метод запроса:', req.method);
      console.log('adminAuth: Заголовки запроса:', req.headers);

      // Получаем сессию пользователя
      const session = await getServerSession(req, res, authOptions);
      console.log(
        'adminAuth: Сессия пользователя:',
        session ? 'получена' : 'отсутствует'
      );

      if (session) {
        console.log('adminAuth: ID пользователя в сессии:', session.user?.id);
        console.log(
          'adminAuth: Роль пользователя в сессии:',
          session.user?.role
        );
        console.log(
          'adminAuth: Полная информация о пользователе в сессии:',
          JSON.stringify(session.user)
        );
      }

      // Если сессия отсутствует, возвращаем ошибку авторизации
      if (!session) {
        console.log(
          'adminAuth: Сессия отсутствует, возвращаем ошибку авторизации'
        );
        return res.status(401).json({ message: 'Необходима авторизация' });
      }

      // Получаем пользователя из базы данных для проверки роли
      console.log(
        'adminAuth: Запрос пользователя из базы данных с ID:',
        session.user.id
      );
      const user = await withPrisma(async (prisma) => {
        return await prisma.user.findUnique({
          where: { id: session.user.id },
          select: { id: true, role: true, isBlocked: true },
        });
      });

      console.log(
        'adminAuth: Результат запроса пользователя из базы данных:',
        user ? 'найден' : 'не найден'
      );
      if (user) {
        console.log('adminAuth: Роль пользователя в базе данных:', user.role);
        console.log(
          'adminAuth: Статус блокировки пользователя:',
          user.isBlocked
        );
      }

      // Если пользователь не найден или заблокирован, возвращаем ошибку
      if (!user || user.isBlocked) {
        console.log(
          'adminAuth: Пользователь не найден или заблокирован, возвращаем ошибку доступа'
        );
        return res.status(403).json({ message: 'Доступ запрещен' });
      }

<<<<<<< HEAD
      // Проверяем, имеет ли пользователь роль администратора или супер-администратора
      if (user.role !== 'admin' && user.role !== 'superadmin') {
        console.log(
          'adminAuth: Пользователь не имеет необходимых прав, возвращаем ошибку прав'
=======
      // Проверяем, имеет ли пользователь роль администратора
      if (user.role !== 'admin') {
        console.log(
          'adminAuth: Пользователь не имеет роли администратора, возвращаем ошибку прав'
>>>>>>> 077838ba75b141eded3ed5dc28fbb94584f109f4
        );
        return res
          .status(403)
          .json({ message: 'Требуются права администратора' });
      }

      console.log('adminAuth: Проверка прав администратора пройдена успешно');

      // Добавляем информацию об администраторе в запрос
      req.admin = {
        id: user.id,
        role: user.role,
      };

      // Если все проверки пройдены, вызываем обработчик
      return handler(req, res);
    } catch (error) {
      console.error('Ошибка при проверке административных прав:', error);
      return res
        .status(500)
        .json({ message: 'Ошибка сервера при проверке прав' });
    }
  };
}

/**
 * Функция для логирования административных действий
 * @param {string} adminId - ID администратора
 * @param {string} action - Тип действия
 * @param {string} entityType - Тип сущности
 * @param {string} entityId - ID сущности
 * @param {Object} details - Дополнительные детали действия
 * @returns {Promise<Object>} - Созданная запись лога
 */
export async function logAdminAction(
  adminId,
  action,
  entityType,
  entityId,
  details = {}
) {
  try {
    const log = await withPrisma(async (prisma) => {
      return await prisma.adminActionLog.create({
        data: {
          adminId,
          action,
          entityType,
          entityId,
          details,
        },
      });
    });

    return log;
  } catch (error) {
    console.error('Ошибка при логировании административного действия:', error);
    throw error;
  }
}
