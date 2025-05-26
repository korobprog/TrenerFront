import { getSession } from 'next-auth/react';
import prisma from '../../../../lib/prisma';

export default async function handler(req, res) {
  const session = await getSession({ req });

  if (!session) {
    return res.status(401).json({ message: 'Необходима авторизация' });
  }

  // Получаем ID собеседования из URL
  const { id } = req.query;

  // Обработка GET запроса - получение информации о собеседовании
  if (req.method === 'GET') {
    try {
      const interview = await prisma.mockInterview.findUnique({
        where: { id },
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

      if (!interview) {
        return res.status(404).json({ message: 'Собеседование не найдено' });
      }

      // Проверяем, имеет ли пользователь доступ к этому собеседованию
      // Доступ имеют интервьюер и отвечающий
      if (
        interview.interviewerId !== session.user.id &&
        interview.intervieweeId !== session.user.id
      ) {
        return res
          .status(403)
          .json({ message: 'У вас нет доступа к этому собеседованию' });
      }

      return res.status(200).json(interview);
    } catch (error) {
      console.error('Ошибка при получении информации о собеседовании:', error);
      return res.status(500).json({
        message: 'Ошибка сервера при получении информации о собеседовании',
      });
    }
  }

  // Обработка PUT запроса - обновление информации о собеседовании
  if (req.method === 'PUT') {
    // Проверяем, является ли пользователь интервьюером
    const interview = await prisma.mockInterview.findUnique({
      where: { id },
    });

    if (!interview) {
      return res.status(404).json({ message: 'Собеседование не найдено' });
    }

    if (interview.interviewerId !== session.user.id) {
      return res.status(403).json({
        message: 'Только интервьюер может обновлять информацию о собеседовании',
      });
    }

    // Получаем данные для обновления
    const { scheduledTime, meetingLink, status } = req.body;

    // Проверяем, что собеседование можно обновить
    if (interview.status === 'completed') {
      return res
        .status(400)
        .json({ message: 'Нельзя обновить завершенное собеседование' });
    }

    try {
      const updatedInterview = await prisma.mockInterview.update({
        where: { id },
        data: {
          ...(scheduledTime && { scheduledTime: new Date(scheduledTime) }),
          ...(meetingLink && { meetingLink }),
          ...(status && { status }),
        },
      });

      return res.status(200).json(updatedInterview);
    } catch (error) {
      console.error('Ошибка при обновлении собеседования:', error);
      return res
        .status(500)
        .json({ message: 'Ошибка сервера при обновлении собеседования' });
    }
  }

  // Обработка DELETE запроса - отмена собеседования
  if (req.method === 'DELETE') {
    // Проверяем, является ли пользователь интервьюером
    const interview = await prisma.mockInterview.findUnique({
      where: { id },
    });

    if (!interview) {
      return res.status(404).json({ message: 'Собеседование не найдено' });
    }

    if (interview.interviewerId !== session.user.id) {
      return res
        .status(403)
        .json({ message: 'Только интервьюер может отменить собеседование' });
    }

    // Проверяем, что собеседование можно отменить
    if (interview.status === 'completed') {
      return res
        .status(400)
        .json({ message: 'Нельзя отменить завершенное собеседование' });
    }

    try {
      // Если собеседование уже забронировано, возвращаем баллы отвечающему
      if (interview.status === 'booked' && interview.intervieweeId) {
        // Начинаем транзакцию для обновления статуса и возврата баллов
        await prisma.$transaction(async (prisma) => {
          // Обновляем статус собеседования на "cancelled"
          await prisma.mockInterview.update({
            where: { id },
            data: {
              status: 'cancelled',
            },
          });

          // Проверяем, есть ли у отвечающего запись о баллах
          const intervieweePoints = await prisma.userPoints.findUnique({
            where: { userId: interview.intervieweeId },
          });

          if (intervieweePoints) {
            // Возвращаем 1 потраченный балл + 1 балл компенсации
            await prisma.userPoints.update({
              where: { userId: interview.intervieweeId },
              data: {
                points: {
                  increment: 2,
                },
              },
            });

            // Создаем запись в истории транзакций
            await prisma.pointsTransaction.create({
              data: {
                userId: interview.intervieweeId,
                amount: 2,
                type: 'cancellation',
                description: 'Компенсация за отмену собеседования',
              },
            });
          }
        });
      } else {
        // Если собеседование не забронировано, просто обновляем статус
        await prisma.mockInterview.update({
          where: { id },
          data: {
            status: 'cancelled',
          },
        });
      }

      return res
        .status(200)
        .json({ message: 'Собеседование успешно отменено' });
    } catch (error) {
      console.error('Ошибка при отмене собеседования:', error);
      return res
        .status(500)
        .json({ message: 'Ошибка сервера при отмене собеседования' });
    }
  }

  // Если метод запроса не поддерживается
  return res.status(405).json({ message: 'Метод не поддерживается' });
}
