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
<<<<<<< HEAD
      return res.status(500).json({
        message: 'Ошибка сервера при получении информации о собеседовании',
      });
=======
      return res
        .status(500)
        .json({
          message: 'Ошибка сервера при получении информации о собеседовании',
        });
>>>>>>> 077838ba75b141eded3ed5dc28fbb94584f109f4
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
<<<<<<< HEAD

      // При обновлении собеседования
      if (
        scheduledTime !== undefined ||
        interviewerId !== undefined ||
        intervieweeId !== undefined
      ) {
        // Если есть ID события в календаре, обновляем его
        if (existingInterview.calendarEventId) {
          try {
            // Импортируем функцию для обновления событий в Google Calendar
            const {
              updateCalendarEvent,
            } = require('../../../../lib/utils/googleCalendar');

            const updatedInterviewer = interviewerId
              ? await prisma.user.findUnique({ where: { id: interviewerId } })
              : existingInterview.interviewer;

            const updatedInterviewee = intervieweeId
              ? await prisma.user.findUnique({ where: { id: intervieweeId } })
              : existingInterview.interviewee;

            const calendarResult = await updateCalendarEvent(
              existingInterview.calendarEventId,
              updatedInterviewer,
              updatedInterviewee,
              {
                ...existingInterview,
                scheduledTime: scheduledTime || existingInterview.scheduledTime,
              }
            );

            if (calendarResult.success && calendarResult.meetingLink) {
              updateData.meetingLink = calendarResult.meetingLink;
            }
          } catch (error) {
            console.error('Ошибка при обновлении события в календаре:', error);
          }
        }
      }

      // Проверяем, не является ли ссылка заглушкой test-mock-link
      if (meetingLink !== undefined) {
        if (meetingLink.includes('test-mock-link')) {
          console.log(
            'API: Обнаружена заглушка test-mock-link, создаем реальную ссылку'
          );

          // Импортируем функцию для создания событий в Google Calendar
          const {
            createCalendarEvent,
          } = require('../../../../lib/utils/googleCalendar');

          // Создаем временный объект для собеседования
          const interviewData = {
            id: existingInterview.id,
            scheduledTime: existingInterview.scheduledTime,
            meetingLink: '', // Очищаем заглушку
          };

          try {
            // Создаем новое событие в Google Calendar с реальной ссылкой
            const calendarResult = await createCalendarEvent(
              existingInterview.interviewer,
              existingInterview.interviewee,
              interviewData
            );

            if (calendarResult.success && calendarResult.meetingLink) {
              // Используем новую реальную ссылку
              updateData.meetingLink = calendarResult.meetingLink;
              // Обновляем ID события в календаре, если он есть
              if (calendarResult.eventId) {
                updateData.calendarEventId = calendarResult.eventId;
              }
            } else {
              // Если не удалось создать новую ссылку, используем предоставленную
              updateData.meetingLink = meetingLink;
            }
          } catch (error) {
            console.error('API: Ошибка при создании реальной ссылки:', error);
            // В случае ошибки используем предоставленную ссылку
            updateData.meetingLink = meetingLink;
          }
        } else {
          // Если это не заглушка, используем предоставленную ссылку
          updateData.meetingLink = meetingLink;
        }
      }
=======
      if (meetingLink !== undefined) updateData.meetingLink = meetingLink;
>>>>>>> 077838ba75b141eded3ed5dc28fbb94584f109f4

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
