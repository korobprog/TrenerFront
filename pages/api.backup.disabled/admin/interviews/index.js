import {
  withAdminAuth,
  logAdminAction,
} from '../../../../lib/middleware/adminAuth';
import prisma from '../../../../lib/prisma';

/**
 * Обработчик API запросов для управления собеседованиями (список)
 * @param {Object} req - HTTP запрос
 * @param {Object} res - HTTP ответ
 */
async function handler(req, res) {
  // Обработка GET запроса - получение списка собеседований
  if (req.method === 'GET') {
    try {
      // Получаем параметры запроса для фильтрации и пагинации
      const {
        page = 1,
        limit = 10,
        status,
        interviewerId,
        intervieweeId,
        startDate,
        endDate,
        sortBy = 'scheduledTime',
        sortOrder = 'desc',
      } = req.query;

      // Преобразуем параметры в нужные типы
      const pageNum = parseInt(page, 10);
      const limitNum = parseInt(limit, 10);
      const skip = (pageNum - 1) * limitNum;

      // Формируем условия фильтрации
      const where = {};

      // Фильтрация по статусу
      if (status) {
        where.status = status;
      }

      // Фильтрация по интервьюеру
      if (interviewerId) {
        where.interviewerId = interviewerId;
      }

      // Фильтрация по интервьюируемому
      if (intervieweeId) {
        where.intervieweeId = intervieweeId;
      }

      // Фильтрация по диапазону дат
      if (startDate || endDate) {
        where.scheduledTime = {};

        if (startDate) {
          where.scheduledTime.gte = new Date(startDate);
        }

        if (endDate) {
          where.scheduledTime.lte = new Date(endDate);
        }
      }

      // Определяем порядок сортировки
      const orderBy = {};
      orderBy[sortBy] = sortOrder;

      // Получаем общее количество собеседований с учетом фильтров
      const totalInterviews = await prisma.mockInterview.count({ where });

      // Получаем собеседования с учетом фильтров, пагинации и сортировки
      const interviews = await prisma.mockInterview.findMany({
        where,
        include: {
          interviewer: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
          interviewee: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
          interviewFeedback: {
            select: {
              id: true,
              technicalScore: true,
              interviewerRating: true,
              isAccepted: true,
            },
          },
        },
        orderBy,
        skip,
        take: limitNum,
      });

      // Логируем действие администратора
      await logAdminAction(
        req.admin.id,
        'view_interviews',
        'interview',
        'all',
        { filters: req.query }
      );

      // Возвращаем результат
      return res.status(200).json({
        interviews,
        pagination: {
          total: totalInterviews,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(totalInterviews / limitNum),
        },
      });
    } catch (error) {
      console.error('Ошибка при получении списка собеседований:', error);
      return res
        .status(500)
        .json({ message: 'Ошибка сервера при получении списка собеседований' });
    }
  }

  // Если метод запроса не поддерживается
  return res.status(405).json({ message: 'Метод не поддерживается' });
}

export default withAdminAuth(handler);
