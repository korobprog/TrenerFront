import {
  withAdminAuth,
  logAdminAction,
} from '../../../lib/middleware/adminAuth';
import { withPrisma } from '../../../lib/prisma';

/**
 * API эндпоинт для получения статистики системы
 * Доступен администраторам и супер-администраторам
 */
async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Метод не поддерживается' });
  }

  try {
    // Проверяем, что middleware установил информацию об администраторе
    if (!req.admin || !req.admin.id) {
      console.error('Admin Statistics API: req.admin не установлен middleware');
      return res.status(500).json({
        success: false,
        message: 'Ошибка авторизации: информация об администраторе отсутствует',
      });
    }

    console.log(
      'Admin Statistics API: Запрос статистики от администратора:',
      req.admin.id
    );

    const statistics = await withPrisma(async (prisma) => {
      // Получаем общее количество пользователей
      const totalUsers = await prisma.user.count();

      // Получаем количество активных собеседований
      const activeInterviews = await prisma.mockInterview.count({
        where: {
          status: {
            in: ['pending', 'confirmed', 'in_progress'],
          },
        },
      });

      // Получаем статистику по ролям
      const roleStats = await prisma.user.groupBy({
        by: ['role'],
        _count: {
          role: true,
        },
      });

      // Получаем количество собеседований по статусам
      const interviewStats = await prisma.mockInterview.groupBy({
        by: ['status'],
        _count: {
          status: true,
        },
      });

      // Получаем количество новых пользователей за последние 30 дней
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const newUsersLast30Days = await prisma.user.count({
        where: {
          createdAt: {
            gte: thirtyDaysAgo,
          },
        },
      });

      // Получаем количество заблокированных пользователей
      const blockedUsers = await prisma.user.count({
        where: {
          isBlocked: true,
        },
      });

      // Получаем общую статистику по очкам
      const pointsStats = await prisma.userPoints.aggregate({
        _sum: {
          points: true,
        },
        _avg: {
          points: true,
        },
        _count: {
          points: true,
        },
      });

      // Получаем количество административных действий за последние 7 дней
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const recentAdminActions = await prisma.adminActionLog.count({
        where: {
          createdAt: {
            gte: sevenDaysAgo,
          },
        },
      });

      return {
        users: {
          total: totalUsers,
          newLast30Days: newUsersLast30Days,
          blocked: blockedUsers,
          byRole: roleStats.reduce((acc, stat) => {
            acc[stat.role] = stat._count.role;
            return acc;
          }, {}),
        },
        interviews: {
          active: activeInterviews,
          byStatus: interviewStats.reduce((acc, stat) => {
            acc[stat.status] = stat._count.status;
            return acc;
          }, {}),
        },
        points: {
          totalIssued: pointsStats._sum.points || 0,
          averagePerUser: Math.round(pointsStats._avg.points || 0),
          usersWithPoints: pointsStats._count.points || 0,
        },
        adminActivity: {
          actionsLast7Days: recentAdminActions,
        },
      };
    });

    // Логируем действие администратора
    await logAdminAction(
      req.admin.id,
      'VIEW_STATISTICS',
      'SYSTEM',
      'statistics',
      { timestamp: new Date().toISOString() }
    );

    console.log('Admin Statistics API: Статистика успешно получена');
    console.log('🔍 ДИАГНОСТИКА API: Возвращаемая структура данных:', {
      success: true,
      data: statistics,
    });
    console.log('🔍 ДИАГНОСТИКА API: statistics объект:', statistics);
    console.log(
      '🔍 ДИАГНОСТИКА API: Ключи statistics:',
      Object.keys(statistics)
    );

    return res.status(200).json({
      success: true,
      data: statistics,
    });
  } catch (error) {
    console.error(
      'Admin Statistics API: Ошибка при получении статистики:',
      error
    );
    return res.status(500).json({
      success: false,
      message: 'Ошибка при получении статистики системы',
    });
  }
}

export default withAdminAuth(handler);
