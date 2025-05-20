import {
  withAdminAuth,
  logAdminAction,
} from '../../../../lib/middleware/adminAuth';
import prisma from '../../../../lib/prisma';

/**
 * Обработчик API запросов для управления конкретным собеседованием
 * @param {Object} req - HTTP запрос
 * @param {Object} res - HTTP ответ
 */
async function handler(req, res) {
  // Получаем ID собеседования из параметров запроса
  const { id } = req.query;

  // Проверяем, что ID собеседования предоставлен
  if (!id) {
    return res.status(400).json({ message: 'ID собеседования не указан' });
  }

  // Обработка GET запроса - получение детальной информации о собеседовании
  if (req.method === 'GET') {
    try {
      // Получаем собеседование из базы данных
      const interview = await prisma.mockInterview.findUnique({
        where: { id },
        include: {
          interviewer: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
              role: true,
              conductedInterviewsCount: true,
            },
          },
          interviewee: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
              role: true,
            },
          },
          interviewFeedback: true,
        },
      });

      // Если собеседование не найдено, возвращаем ошибку
      if (!interview) {
        return res.status(404).json({ message: 'Собеседование не найдено' });
      }

      // Логируем действие администратора
      await logAdminAction(
        req.admin.id,
        'view_interview_details',
        'interview',
        id,
        {}
      );

      // Возвращаем информацию о собеседовании
      return res.status(200).json(interview);
    } catch (error) {
      console.error('Ошибка при получении информации о собеседовании:', error);
      return res
        .status(500)
        .json({
          message: 'Ошибка сервера при получении информации о собеседовании',
        });
    }
  }

  // Обработка PATCH запроса - обновление информации о собеседовании
  if (req.method === 'PATCH') {
    try {
      const {
        scheduledTime,
        status,
        meetingLink,
        interviewerId,
        intervieweeId,
      } = req.body;

      // Проверяем, что собеседование существует
      const existingInterview = await prisma.mockInterview.findUnique({
        where: { id },
        include: {
          interviewer: {
            select: { id: true, name: true, email: true },
          },
          interviewee: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      if (!existingInterview) {
        return res.status(404).json({ message: 'Собеседование не найдено' });
      }

      // Формируем данные для обновления
      const updateData = {};

      if (scheduledTime !== undefined)
        updateData.scheduledTime = new Date(scheduledTime);
      if (status !== undefined) updateData.status = status;
      if (meetingLink !== undefined) updateData.meetingLink = meetingLink;

      // Обновление связей с пользователями
      if (interviewerId !== undefined) {
        updateData.interviewer = {
          connect: { id: interviewerId },
        };
      }

      if (intervieweeId !== undefined) {
        if (intervieweeId === null) {
          // Если intervieweeId равен null, отсоединяем интервьюируемого
          updateData.interviewee = {
            disconnect: true,
          };
        } else {
          // Иначе подключаем нового интервьюируемого
          updateData.interviewee = {
            connect: { id: intervieweeId },
          };
        }
      }

      // Обновляем собеседование
      const updatedInterview = await prisma.mockInterview.update({
        where: { id },
        data: updateData,
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
          interviewFeedback: true,
        },
      });

      // Логируем действие администратора
      await logAdminAction(req.admin.id, 'update_interview', 'interview', id, {
        previousData: {
          scheduledTime: existingInterview.scheduledTime,
          status: existingInterview.status,
          meetingLink: existingInterview.meetingLink,
          interviewerId: existingInterview.interviewerId,
          intervieweeId: existingInterview.intervieweeId,
        },
        updatedData: req.body,
      });

      // Возвращаем обновленную информацию о собеседовании
      return res.status(200).json(updatedInterview);
    } catch (error) {
      console.error('Ошибка при обновлении собеседования:', error);
      return res
        .status(500)
        .json({ message: 'Ошибка сервера при обновлении собеседования' });
    }
  }

  // Обработка DELETE запроса - удаление собеседования
  if (req.method === 'DELETE') {
    try {
      // Проверяем, что собеседование существует
      const existingInterview = await prisma.mockInterview.findUnique({
        where: { id },
        include: {
          interviewer: {
            select: { id: true, name: true, email: true },
          },
          interviewee: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      if (!existingInterview) {
        return res.status(404).json({ message: 'Собеседование не найдено' });
      }

      // Удаляем собеседование
      await prisma.mockInterview.delete({
        where: { id },
      });

      // Логируем действие администратора
      await logAdminAction(req.admin.id, 'delete_interview', 'interview', id, {
        deletedInterview: {
          id: existingInterview.id,
          scheduledTime: existingInterview.scheduledTime,
          status: existingInterview.status,
          interviewer: existingInterview.interviewer,
          interviewee: existingInterview.interviewee,
        },
      });

      // Возвращаем успешный ответ
      return res.status(200).json({ message: 'Собеседование успешно удалено' });
    } catch (error) {
      console.error('Ошибка при удалении собеседования:', error);
      return res
        .status(500)
        .json({ message: 'Ошибка сервера при удалении собеседования' });
    }
  }

  // Если метод запроса не поддерживается
  return res.status(405).json({ message: 'Метод не поддерживается' });
}

export default withAdminAuth(handler);
