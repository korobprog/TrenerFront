import {
  withAdminAuth,
  logAdminAction,
} from '../../../lib/middleware/adminAuth';
import { withPrisma } from '../../../lib/prisma';

/**
 * API эндпоинт для управления собеседованиями
 * Доступен администраторам и супер-администраторам
 */
async function handler(req, res) {
  try {
    console.log(
      'Admin Interviews API: Запрос от администратора:',
      req.admin.id,
      'Метод:',
      req.method
    );

    switch (req.method) {
      case 'GET':
        return await handleGetInterviews(req, res);
      case 'PUT':
        return await handleUpdateInterview(req, res);
      case 'DELETE':
        return await handleDeleteInterview(req, res);
      default:
        return res.status(405).json({ message: 'Метод не поддерживается' });
    }
  } catch (error) {
    console.error('Admin Interviews API: Общая ошибка:', error);
    return res.status(500).json({
      success: false,
      message: 'Внутренняя ошибка сервера',
    });
  }
}

/**
 * Получение списка всех собеседований
 */
async function handleGetInterviews(req, res) {
  try {
    const {
      page = 1,
      limit = 20,
      status = '',
      interviewerId = '',
      intervieweeId = '',
      dateFrom = '',
      dateTo = '',
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    console.log('Admin Interviews API: Параметры запроса:', {
      page: pageNum,
      limit: limitNum,
      status,
      interviewerId,
      intervieweeId,
      dateFrom,
      dateTo,
    });

    const interviews = await withPrisma(async (prisma) => {
      // Строим условия фильтрации
      const where = {};

      if (status && status !== 'all') {
        where.status = status;
      }

      if (interviewerId && interviewerId !== 'all') {
        where.interviewerId = interviewerId;
      }

      if (intervieweeId && intervieweeId !== 'all') {
        where.intervieweeId = intervieweeId;
      }

      // Фильтрация по датам
      if (dateFrom || dateTo) {
        where.scheduledTime = {};
        if (dateFrom) {
          where.scheduledTime.gte = new Date(dateFrom);
        }
        if (dateTo) {
          const endDate = new Date(dateTo);
          endDate.setHours(23, 59, 59, 999); // Конец дня
          where.scheduledTime.lte = endDate;
        }
      }

      // Получаем собеседования с информацией об участниках
      const [interviewsList, totalCount] = await Promise.all([
        prisma.mockInterview.findMany({
          where,
          include: {
            interviewer: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
            },
            interviewee: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
            },
            interviewFeedback: {
              select: {
                id: true,
                technicalScore: true,
                feedback: true,
                isAccepted: true,
                interviewerRating: true,
              },
            },
          },
          orderBy: {
            scheduledTime: 'desc',
          },
          skip,
          take: limitNum,
        }),
        prisma.mockInterview.count({ where }),
      ]);

      // Получаем статистику по статусам
      const statusStats = await prisma.mockInterview.groupBy({
        by: ['status'],
        _count: {
          status: true,
        },
        where: dateFrom || dateTo ? where : {},
      });

      return {
        interviews: interviewsList,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: totalCount,
          pages: Math.ceil(totalCount / limitNum),
        },
        statistics: {
          statusStats: statusStats.reduce((acc, stat) => {
            acc[stat.status] = stat._count.status;
            return acc;
          }, {}),
        },
      };
    });

    // Получаем список пользователей для фильтров
    const users = await withPrisma(async (prisma) => {
      return await prisma.user.findMany({
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
    await logAdminAction(req.admin.id, 'VIEW_INTERVIEWS', 'INTERVIEW', 'list', {
      filters: { status, interviewerId, intervieweeId, dateFrom, dateTo },
      pagination: { page: pageNum, limit: limitNum },
    });

    console.log(
      'Admin Interviews API: Собеседования успешно получены, количество:',
      interviews.interviews.length
    );
    return res.status(200).json({
      success: true,
      data: {
        ...interviews,
        users,
      },
    });
  } catch (error) {
    console.error(
      'Admin Interviews API: Ошибка при получении собеседований:',
      error
    );
    return res.status(500).json({
      success: false,
      message: 'Ошибка при получении списка собеседований',
    });
  }
}

/**
 * Изменение статуса собеседования
 */
async function handleUpdateInterview(req, res) {
  try {
    const { interviewId, status } = req.body;

    if (!interviewId) {
      return res.status(400).json({
        success: false,
        message: 'ID собеседования обязателен',
      });
    }

    // Валидация статуса
    const validStatuses = [
      'pending',
      'confirmed',
      'in_progress',
      'completed',
      'cancelled',
      'no_show',
    ];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Недопустимый статус собеседования',
      });
    }

    console.log('Admin Interviews API: Обновление собеседования:', {
      interviewId,
      status,
    });

    const updatedInterview = await withPrisma(async (prisma) => {
      // Проверяем, что собеседование существует
      const existingInterview = await prisma.mockInterview.findUnique({
        where: { id: interviewId },
        select: {
          id: true,
          status: true,
          scheduledTime: true,
          interviewerId: true,
          intervieweeId: true,
        },
      });

      if (!existingInterview) {
        throw new Error('Собеседование не найдено');
      }

      // Обновляем собеседование
      const interview = await prisma.mockInterview.update({
        where: { id: interviewId },
        data: { status },
        include: {
          interviewer: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          interviewee: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      return { interview, previousStatus: existingInterview.status };
    });

    // Логируем действие администратора
    await logAdminAction(
      req.admin.id,
      'UPDATE_INTERVIEW_STATUS',
      'INTERVIEW',
      interviewId,
      {
        newStatus: status,
        previousStatus: updatedInterview.previousStatus,
        interviewerId: updatedInterview.interview.interviewerId,
        intervieweeId: updatedInterview.interview.intervieweeId,
      }
    );

    console.log(
      'Admin Interviews API: Собеседование успешно обновлено:',
      interviewId
    );
    return res.status(200).json({
      success: true,
      data: updatedInterview.interview,
      message: 'Статус собеседования успешно обновлен',
    });
  } catch (error) {
    console.error(
      'Admin Interviews API: Ошибка при обновлении собеседования:',
      error
    );
    return res.status(500).json({
      success: false,
      message: error.message || 'Ошибка при обновлении собеседования',
    });
  }
}

/**
 * Удаление собеседования
 */
async function handleDeleteInterview(req, res) {
  try {
    const { interviewId } = req.body;

    if (!interviewId) {
      return res.status(400).json({
        success: false,
        message: 'ID собеседования обязателен',
      });
    }

    console.log('Admin Interviews API: Удаление собеседования:', interviewId);

    const deletedInterview = await withPrisma(async (prisma) => {
      // Проверяем, что собеседование существует
      const existingInterview = await prisma.mockInterview.findUnique({
        where: { id: interviewId },
        include: {
          interviewer: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          interviewee: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      if (!existingInterview) {
        throw new Error('Собеседование не найдено');
      }

      // Удаляем собеседование (каскадное удаление настроено в схеме)
      await prisma.mockInterview.delete({
        where: { id: interviewId },
      });

      return existingInterview;
    });

    // Логируем действие администратора
    await logAdminAction(
      req.admin.id,
      'DELETE_INTERVIEW',
      'INTERVIEW',
      interviewId,
      {
        deletedInterview: {
          status: deletedInterview.status,
          scheduledTime: deletedInterview.scheduledTime,
          interviewerId: deletedInterview.interviewerId,
          intervieweeId: deletedInterview.intervieweeId,
          interviewer: deletedInterview.interviewer,
          interviewee: deletedInterview.interviewee,
        },
      }
    );

    console.log(
      'Admin Interviews API: Собеседование успешно удалено:',
      interviewId
    );
    return res.status(200).json({
      success: true,
      message: 'Собеседование успешно удалено',
    });
  } catch (error) {
    console.error(
      'Admin Interviews API: Ошибка при удалении собеседования:',
      error
    );
    return res.status(500).json({
      success: false,
      message: error.message || 'Ошибка при удалении собеседования',
    });
  }
}

export default withAdminAuth(handler);
