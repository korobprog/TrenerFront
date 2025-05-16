import { getSession } from 'next-auth/react';
import prisma from '../../../../lib/prisma';

export default async function handler(req, res) {
  const session = await getSession({ req });

  if (!session) {
    return res.status(401).json({ message: 'Необходима авторизация' });
  }

  // Получаем ID собеседования из URL
  const { id } = req.query;

  // Обработка POST запроса - создание отзыва
  if (req.method === 'POST') {
    const { technicalScore, feedback } = req.body;

    // Проверка наличия обязательных полей
    if (!technicalScore || !feedback) {
      return res
        .status(400)
        .json({ message: 'Необходимо указать оценку и отзыв' });
    }

    // Проверка валидности оценки (от 1 до 5)
    if (technicalScore < 1 || technicalScore > 5) {
      return res.status(400).json({ message: 'Оценка должна быть от 1 до 5' });
    }

    try {
      // Проверяем, существует ли собеседование и является ли текущий пользователь интервьюером
      const interview = await prisma.mockInterview.findUnique({
        where: { id },
        include: {
          interviewFeedback: true,
        },
      });

      if (!interview) {
        return res.status(404).json({ message: 'Собеседование не найдено' });
      }

      if (interview.interviewerId !== session.user.id) {
        return res
          .status(403)
          .json({ message: 'Только интервьюер может оставить отзыв' });
      }

      if (interview.status !== 'booked') {
        return res
          .status(400)
          .json({
            message:
              'Отзыв можно оставить только для забронированного собеседования',
          });
      }

      if (interview.interviewFeedback) {
        return res
          .status(400)
          .json({ message: 'Отзыв для этого собеседования уже существует' });
      }

      // Создаем отзыв
      const newFeedback = await prisma.interviewFeedback.create({
        data: {
          mockInterview: {
            connect: { id },
          },
          technicalScore,
          feedback,
          isAccepted: false,
        },
      });

      // Обновляем статус собеседования на "completed"
      await prisma.mockInterview.update({
        where: { id },
        data: {
          status: 'completed',
        },
      });

      return res.status(201).json(newFeedback);
    } catch (error) {
      console.error('Ошибка при создании отзыва:', error);
      return res
        .status(500)
        .json({ message: 'Ошибка сервера при создании отзыва' });
    }
  }

  // Обработка PUT запроса - принятие отзыва отвечающим
  if (req.method === 'PUT') {
    try {
      // Проверяем, существует ли собеседование и является ли текущий пользователь отвечающим
      const interview = await prisma.mockInterview.findUnique({
        where: { id },
        include: {
          interviewFeedback: true,
        },
      });

      if (!interview) {
        return res.status(404).json({ message: 'Собеседование не найдено' });
      }

      if (interview.intervieweeId !== session.user.id) {
        return res
          .status(403)
          .json({ message: 'Только отвечающий может принять отзыв' });
      }

      if (!interview.interviewFeedback) {
        return res.status(404).json({ message: 'Отзыв не найден' });
      }

      if (interview.interviewFeedback.isAccepted) {
        return res.status(400).json({ message: 'Отзыв уже принят' });
      }

      // Начинаем транзакцию для обновления отзыва и начисления баллов интервьюеру
      const result = await prisma.$transaction(async (prisma) => {
        // Обновляем статус отзыва на "принят"
        const updatedFeedback = await prisma.interviewFeedback.update({
          where: { mockInterviewId: id },
          data: {
            isAccepted: true,
          },
        });

        // Проверяем, есть ли у интервьюера запись о баллах
        let interviewerPoints = await prisma.userPoints.findUnique({
          where: { userId: interview.interviewerId },
        });

        // Если у интервьюера нет записи о баллах, создаем её с 1 баллом
        if (!interviewerPoints) {
          interviewerPoints = await prisma.userPoints.create({
            data: {
              userId: interview.interviewerId,
              points: 1,
            },
          });
        } else {
          // Если запись есть, начисляем 1 балл
          interviewerPoints = await prisma.userPoints.update({
            where: { userId: interview.interviewerId },
            data: {
              points: {
                increment: 1,
              },
            },
          });
        }

        return { updatedFeedback, interviewerPoints };
      });

      return res.status(200).json({
        message: 'Отзыв успешно принят, интервьюеру начислен 1 балл',
        feedback: result.updatedFeedback,
      });
    } catch (error) {
      console.error('Ошибка при принятии отзыва:', error);
      return res
        .status(500)
        .json({ message: 'Ошибка сервера при принятии отзыва' });
    }
  }

  // Если метод запроса не поддерживается
  return res.status(405).json({ message: 'Метод не поддерживается' });
}
