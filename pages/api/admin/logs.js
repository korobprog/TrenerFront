import {
  withAdminAuth,
  logAdminAction,
} from '../../../lib/middleware/adminAuth';
import { withPrisma } from '../../../lib/prisma';

/**
 * API эндпоинт для просмотра логов администратора
 * Доступен администраторам и супер-администраторам
 */
async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Метод не поддерживается' });
  }

  try {
    console.log(
      'Admin Logs API: Запрос логов от администратора:',
      req.admin.id
    );

    const {
      page = 1,
      limit = 50,
      adminId = '',
      action = '',
      entityType = '',
      dateFrom = '',
      dateTo = '',
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    console.log('Admin Logs API: Параметры запроса:', {
      page: pageNum,
      limit: limitNum,
      adminId,
      action,
      entityType,
      dateFrom,
      dateTo,
    });

    const logs = await withPrisma(async (prisma) => {
      // Строим условия фильтрации
      const where = {};

      if (adminId && adminId !== 'all') {
        where.adminId = adminId;
      }

      if (action && action !== 'all') {
        where.action = action;
      }

      if (entityType && entityType !== 'all') {
        where.entityType = entityType;
      }

      // Фильтрация по датам
      if (dateFrom || dateTo) {
        where.createdAt = {};
        if (dateFrom) {
          where.createdAt.gte = new Date(dateFrom);
        }
        if (dateTo) {
          const endDate = new Date(dateTo);
          endDate.setHours(23, 59, 59, 999); // Конец дня
          where.createdAt.lte = endDate;
        }
      }

      // Получаем логи с информацией об администраторах
      const [logsList, totalCount] = await Promise.all([
        prisma.adminActionLog.findMany({
          where,
          include: {
            admin: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
          skip,
          take: limitNum,
        }),
        prisma.adminActionLog.count({ where }),
      ]);

      // Получаем статистику по действиям
      const actionStats = await prisma.adminActionLog.groupBy({
        by: ['action'],
        _count: {
          action: true,
        },
        where: dateFrom || dateTo ? where : {},
      });

      // Получаем статистику по администраторам
      const adminStats = await prisma.adminActionLog.groupBy({
        by: ['adminId'],
        _count: {
          adminId: true,
        },
        where: dateFrom || dateTo ? where : {},
      });

      return {
        logs: logsList,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: totalCount,
          pages: Math.ceil(totalCount / limitNum),
        },
        statistics: {
          actionStats: actionStats.reduce((acc, stat) => {
            acc[stat.action] = stat._count.action;
            return acc;
          }, {}),
          adminStats: adminStats.reduce((acc, stat) => {
            acc[stat.adminId] = stat._count.adminId;
            return acc;
          }, {}),
        },
      };
    });

    // Получаем список всех администраторов для фильтра
    const admins = await withPrisma(async (prisma) => {
      return await prisma.user.findMany({
        where: {
          role: {
            in: ['admin', 'superadmin'],
          },
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
        orderBy: {
          name: 'asc',
        },
      });
    });

    // Логируем действие администратора
    await logAdminAction(req.admin.id, 'VIEW_LOGS', 'ADMIN_LOG', 'list', {
      filters: { adminId, action, entityType, dateFrom, dateTo },
      pagination: { page: pageNum, limit: limitNum },
    });

    console.log(
      'Admin Logs API: Логи успешно получены, количество:',
      logs.logs.length
    );
    return res.status(200).json({
      success: true,
      data: {
        ...logs,
        admins,
      },
    });
  } catch (error) {
    console.error('Admin Logs API: Ошибка при получении логов:', error);
    return res.status(500).json({
      success: false,
      message: 'Ошибка при получении логов администратора',
    });
  }
}

export default withAdminAuth(handler);
