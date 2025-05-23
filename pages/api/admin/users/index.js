import {
  withAdminAuth,
  logAdminAction,
} from '../../../../lib/middleware/adminAuth';
import prisma from '../../../../lib/prisma';

/**
 * Обработчик API запросов для управления пользователями (список и создание)
 * @param {Object} req - HTTP запрос
 * @param {Object} res - HTTP ответ
 */
async function handler(req, res) {
  // Обработка GET запроса - получение списка пользователей
  if (req.method === 'GET') {
    try {
      // Получаем параметры запроса для фильтрации и пагинации
      const {
        page = 1,
        limit = 10,
        search = '',
        role,
        isBlocked,
        sortBy = 'createdAt',
        sortOrder = 'desc',
      } = req.query;

      // Преобразуем параметры в нужные типы
      const pageNum = parseInt(page, 10);
      const limitNum = parseInt(limit, 10);
      const skip = (pageNum - 1) * limitNum;

      // Формируем условия фильтрации
      const where = {};

      // Поиск по имени или email
      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ];
      }

      // Фильтрация по роли
      if (role) {
        where.role = role;
      }

      // Фильтрация по статусу блокировки
      if (isBlocked !== undefined) {
        where.isBlocked = isBlocked === 'true';
      }

      // Определяем порядок сортировки
      const orderBy = {};
      orderBy[sortBy] = sortOrder;

      // Получаем общее количество пользователей с учетом фильтров
      const totalUsers = await prisma.user.count({ where });

      // Получаем пользователей с учетом фильтров, пагинации и сортировки
      const users = await prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          role: true,
          isBlocked: true,
          createdAt: true,
          updatedAt: true,
          lastLoginAt: true,
          conductedInterviewsCount: true,
          _count: {
            select: {
              interviewerSessions: true,
              intervieweeSessions: true,
              violations: true,
            },
          },
        },
        orderBy,
        skip,
        take: limitNum,
      });

      // Логируем действие администратора
      await logAdminAction(req.admin.id, 'view_users', 'user', 'all', {
        filters: req.query,
      });

      // Возвращаем результат
      return res.status(200).json({
        users,
        pagination: {
          total: totalUsers,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(totalUsers / limitNum),
        },
      });
    } catch (error) {
      console.error('Ошибка при получении списка пользователей:', error);
      return res
        .status(500)
        .json({ message: 'Ошибка сервера при получении списка пользователей' });
    }
  }

  // Если метод запроса не поддерживается
  return res.status(405).json({ message: 'Метод не поддерживается' });
}

export default withAdminAuth(handler);
