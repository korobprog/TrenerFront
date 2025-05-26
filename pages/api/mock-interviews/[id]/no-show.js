import { getSession } from 'next-auth/react';
import prisma from '../../../../lib/prisma';

export default async function handler(req, res) {
  const session = await getSession({ req });

  if (!session) {
    return res.status(401).json({ message: 'Необходима авторизация' });
  }

  // Получаем ID собеседования из URL
  const { id } = req.query;

  // Обработка только POST запросов
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Метод не поддерживается' });
  }

  try {
    // Получаем информацию о собеседовании
    const interview = await prisma.mockInterview.findUnique({
      where: { id },
    });

    if (!interview) {
      return res.status(404).json({ message: 'Собеседование не найдено' });
    }

    // Проверяем, является ли пользователь участником собеседования
    if (
      interview.interviewerId !== session.user.id &&
      interview.intervieweeId !== session.user.id
    ) {
      return res
        .status(403)
        .json({ message: 'У вас нет доступа к этому собеседованию' });
    }

    // Проверяем, что собеседование в статусе "booked"
    if (interview.status !== 'booked') {
      return res.status(400).json({
        message:
          'Отметить неявку можно только для забронированного собеседования',
      });
    }

    // Проверяем, что запланированное время собеседования уже прошло
    const currentTime = new Date();
    if (currentTime < new Date(interview.scheduledTime)) {
      return res.status(400).json({
        message:
          'Отметить неявку можно только после запланированного времени собеседования',
      });
    }

    // Получаем информацию о том, кто не явился
    const { noShowType } = req.body;

    if (
      !noShowType ||
      (noShowType !== 'interviewer' && noShowType !== 'interviewee')
    ) {
      return res.status(400).json({
        message:
          'Необходимо указать, кто не явился (interviewer или interviewee)',
      });
    }

    // Определяем ID пользователя, который не явился
    const noShowUserId =
      noShowType === 'interviewer'
        ? interview.interviewerId
        : interview.intervieweeId;

    // Начинаем транзакцию для обновления статуса и обработки баллов
    await prisma.$transaction(async (prisma) => {
      // Обновляем статус собеседования на "no_show"
      await prisma.mockInterview.update({
        where: { id },
        data: {
          status: 'no_show',
        },
      });

      // Создаем запись о нарушении для пользователя, который не явился
      await prisma.userViolation.create({
        data: {
          userId: noShowUserId,
          type: 'no_show',
          description: 'Неявка на собеседование без предупреждения',
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 дней
        },
      });

      // Если не явился интервьюер, возвращаем баллы отвечающему
      if (noShowType === 'interviewer' && interview.intervieweeId) {
        // Проверяем, есть ли у отвечающего запись о баллах
        const intervieweePoints = await prisma.userPoints.findUnique({
          where: { userId: interview.intervieweeId },
        });

        if (intervieweePoints) {
          // Возвращаем отвечающему 2 балла (1 потраченный + 1 компенсация)
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
              type: 'no_show',
              description: 'Компенсация за неявку интервьюера',
            },
          });
        }
      }
      // Если не явился отвечающий, баллы не возвращаем
      // В будущем здесь можно добавить штраф
    });

    return res.status(200).json({ message: 'Неявка успешно отмечена' });
  } catch (error) {
    console.error('Ошибка при отметке неявки:', error);
    return res
      .status(500)
      .json({ message: 'Ошибка сервера при отметке неявки' });
  }
}
