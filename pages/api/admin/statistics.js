import {
  withAdminAuth,
  logAdminAction,
} from '../../../lib/middleware/adminAuth';
import prisma, { withPrisma } from '../../../lib/prisma';

/**
 * Обработчик API запросов для получения статистики системы
 * @param {Object} req - HTTP запрос
 * @param {Object} res - HTTP ответ
 */
async function handler(req, res) {
  console.log('API statistics: Получен запрос на статистику');
  console.log('API statistics: Метод запроса:', req.method);
  console.log('API statistics: Параметры запроса:', req.query);
  console.log('API statistics: Информация об администраторе:', req.admin);

  // Обработка GET запроса - получение статистики
  if (req.method === 'GET') {
    try {
      // Получаем параметры запроса
      const { startDate, endDate } = req.query;
      console.log('API statistics: Параметры фильтрации по дате:', {
        startDate,
        endDate,
      });

      // Формируем условия фильтрации по дате
      const dateFilter = {};

      if (startDate || endDate) {
        dateFilter.date = {};

        if (startDate) {
          dateFilter.date.gte = new Date(startDate);
        }

        if (endDate) {
          dateFilter.date.lte = new Date(endDate);
        }
      }

      // Получаем статистику из базы данных
      const statistics = await withPrisma(async (prisma) => {
        return await prisma.systemStatistics.findMany({
          where: dateFilter,
          orderBy: {
            date: 'desc',
          },
        });
      });

      // Получаем общую статистику с использованием одного соединения
      const counts = await withPrisma(async (prisma) => {
        const [
          totalUsers,
          totalInterviews,
          completedInterviews,
          pendingInterviews,
          bookedInterviews,
          cancelledInterviews,
          noShowInterviews,
          adminUsers,
          regularUsers,
          blockedUsers,
          violationsCount,
        ] = await Promise.all([
          prisma.user.count(),
          prisma.mockInterview.count(),
          prisma.mockInterview.count({
            where: { status: 'completed' },
          }),
          prisma.mockInterview.count({
            where: { status: 'pending' },
          }),
          prisma.mockInterview.count({
            where: { status: 'booked' },
          }),
          prisma.mockInterview.count({
            where: { status: 'cancelled' },
          }),
          prisma.mockInterview.count({
            where: { status: 'no_show' },
          }),
          prisma.user.count({
            where: { role: 'admin' },
          }),
          prisma.user.count({
            where: { role: 'user' },
          }),
          prisma.user.count({
            where: { isBlocked: true },
          }),
          prisma.userViolation.count(),
        ]);

        return {
          totalUsers,
          totalInterviews,
          completedInterviews,
          pendingInterviews,
          bookedInterviews,
          cancelledInterviews,
          noShowInterviews,
          adminUsers,
          regularUsers,
          blockedUsers,
          violationsCount,
        };
      });

      // Получаем статистику по баллам и отзывам
      const aggregates = await withPrisma(async (prisma) => {
        const [pointsStats, pointsSpentStats, feedbackStats] =
          await Promise.all([
            prisma.pointsTransaction.aggregate({
              _sum: {
                amount: true,
              },
              where: {
                amount: { gt: 0 },
              },
            }),
            prisma.pointsTransaction.aggregate({
              _sum: {
                amount: true,
              },
              where: {
                amount: { lt: 0 },
              },
            }),
            prisma.interviewFeedback.aggregate({
              _avg: {
                technicalScore: true,
                interviewerRating: true,
              },
              _count: true,
            }),
          ]);

        return {
          pointsStats,
          pointsSpentStats,
          feedbackStats,
        };
      });

      // Извлекаем значения из результатов
      const {
        totalUsers,
        totalInterviews,
        completedInterviews,
        pendingInterviews,
        bookedInterviews,
        cancelledInterviews,
        noShowInterviews,
        adminUsers,
        regularUsers,
        blockedUsers,
        violationsCount,
      } = counts;

      const { pointsStats, pointsSpentStats, feedbackStats } = aggregates;

      // Формируем объект с общей статистикой
      const summary = {
        users: {
          total: totalUsers,
          admins: adminUsers,
          regular: regularUsers,
          blocked: blockedUsers,
        },
        interviews: {
          total: totalInterviews,
          completed: completedInterviews,
          pending: pendingInterviews,
          booked: bookedInterviews,
          cancelled: cancelledInterviews,
          noShow: noShowInterviews,
        },
        points: {
          totalIssued: pointsStats._sum.amount || 0,
          totalSpent: Math.abs(pointsSpentStats._sum.amount || 0),
        },
        feedback: {
          count: feedbackStats._count,
          averageTechnicalScore: feedbackStats._avg.technicalScore || 0,
          averageInterviewerRating: feedbackStats._avg.interviewerRating || 0,
        },
        violations: {
          count: violationsCount,
        },
      };

      // Получаем последние логи действий администраторов
      const recentLogs = await withPrisma(async (prisma) => {
        return await prisma.adminActionLog.findMany({
          take: 10,
          orderBy: {
            createdAt: 'desc',
          },
          include: {
            admin: {
              select: {
                name: true,
              },
            },
          },
        });
      });

      // Преобразуем логи в удобный формат
      const formattedLogs = recentLogs.map((log) => ({
        id: log.id,
        adminName: log.admin?.name || 'Администратор',
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        createdAt: log.createdAt,
      }));

      // Логируем действие администратора
      await logAdminAction(req.admin.id, 'view_statistics', 'system', 'all', {
        filters: req.query,
      });

      // Возвращаем результат
      return res.status(200).json({
        statistics,
        summary,
        recentLogs: formattedLogs,
      });
    } catch (error) {
      console.error('Ошибка при получении статистики:', error);
      return res
        .status(500)
        .json({ message: 'Ошибка сервера при получении статистики' });
    }
  }

  // Если метод запроса не поддерживается
  return res.status(405).json({ message: 'Метод не поддерживается' });
}

export default withAdminAuth(handler);
