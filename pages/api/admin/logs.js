import {
  withAdminAuth,
  logAdminAction,
} from '../../../lib/middleware/adminAuth';
import prisma from '../../../lib/prisma';

/**
 * Обработчик API запросов для получения логов административных действий
 * @param {Object} req - HTTP запрос
 * @param {Object} res - HTTP ответ
 */
async function handler(req, res) {
  // Обработка GET запроса - получение логов
  if (req.method === 'GET') {
    try {
      // Получаем параметры запроса для фильтрации и пагинации
      const {
        page = 1,
        limit = 20,
        adminId,
        action,
        entityType,
        entityId,
        startDate,
        endDate,
        sortBy = 'createdAt',
        sortOrder = 'desc',
      } = req.query;

      // Преобразуем параметры в нужные типы
      const pageNum = parseInt(page, 10);
      const limitNum = parseInt(limit, 10);
      const skip = (pageNum - 1) * limitNum;

      // Формируем условия фильтрации
      const where = {};

      // Фильтрация по администратору
      if (adminId) {
        where.adminId = adminId;
      }

      // Фильтрация по типу действия
      if (action) {
        where.action = action;
      }

      // Фильтрация по типу сущности
      if (entityType) {
        where.entityType = entityType;
      }

      // Фильтрация по ID сущности
      if (entityId) {
        where.entityId = entityId;
      }

      // Фильтрация по диапазону дат
      if (startDate || endDate) {
        where.createdAt = {};

        if (startDate) {
          where.createdAt.gte = new Date(startDate);
        }

        if (endDate) {
          where.createdAt.lte = new Date(endDate);
        }
      }

      // Определяем порядок сортировки
      const orderBy = {};
      orderBy[sortBy] = sortOrder;

      // Получаем общее количество логов с учетом фильтров
      const totalLogs = await prisma.adminActionLog.count({ where });

      // Получаем логи с учетом фильтров, пагинации и сортировки
      const logs = await prisma.adminActionLog.findMany({
        where,
        include: {
          admin: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
        orderBy,
        skip,
        take: limitNum,
      });

      // Получаем список уникальных типов действий для фильтрации
      const actionTypes = await prisma.adminActionLog.groupBy({
        by: ['action'],
        _count: true,
        orderBy: {
          _count: {
            action: 'desc',
          },
        },
      });

      // Получаем список уникальных типов сущностей для фильтрации
      const entityTypes = await prisma.adminActionLog.groupBy({
        by: ['entityType'],
        _count: true,
        orderBy: {
          _count: {
            entityType: 'desc',
          },
        },
      });

      // Получаем список администраторов для фильтрации
      const admins = await prisma.user.findMany({
        where: {
          role: 'admin',
        },
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      });

      // Логируем действие администратора
      await logAdminAction(req.admin.id, 'view_admin_logs', 'log', 'all', {
        filters: JSON.stringify(req.query),
      });

      // Возвращаем результат
      return res.status(200).json({
        logs,
        pagination: {
          total: totalLogs,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(totalLogs / limitNum),
        },
        filters: {
          actionTypes: actionTypes.map((item) => item.action),
          entityTypes: entityTypes.map((item) => item.entityType),
          admins,
        },
      });
    } catch (error) {
      console.error('Ошибка при получении логов:', error);
      return res
        .status(500)
        .json({ message: 'Ошибка сервера при получении логов' });
    }
  }

  // Если метод запроса не поддерживается
  return res.status(405).json({ message: 'Метод не поддерживается' });
}

export default withAdminAuth(handler);
