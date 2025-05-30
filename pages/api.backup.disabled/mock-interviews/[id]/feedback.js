import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import prisma from '../../../../lib/prisma';

export default async function handler(req, res) {
  console.log('Запрос на feedback API:', {
    method: req.method,
    url: req.url,
    query: req.query,
    headers: req.headers,
    cookies: req.cookies,
  });

  // Проверяем заголовки запроса для отладки
  console.log('Feedback API: Заголовки запроса:', req.headers);
  console.log('Feedback API: Cookie:', req.headers.cookie);

  const session = await getServerSession(req, res, authOptions);
  console.log('Сессия пользователя:', session ? 'Присутствует' : 'Отсутствует');
  if (session) {
    console.log('ID пользователя в сессии:', session.user?.id);
    console.log('Детали сессии:', {
      email: session.user?.email,
      role: session.user?.role,
      timestamp: session?.timestamp,
    });
  }

  if (!session) {
    console.log('Ошибка 401: Сессия отсутствует');
    return res.status(401).json({ message: 'Необходима авторизация' });
  }

  // Получаем ID собеседования из URL
  const { id } = req.query;

  // Обработка POST запроса - создание отзыва
  if (req.method === 'POST') {
    const { technicalScore, feedback, interviewerRating } = req.body;

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

    // Проверка валидности оценки интервьюера, если она указана
    if (interviewerRating && (interviewerRating < 1 || interviewerRating > 5)) {
      return res
        .status(400)
        .json({ message: 'Оценка интервьюера должна быть от 1 до 5' });
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
        return res.status(400).json({
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
          interviewerRating,
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
      // Получаем оценку интервьюера из тела запроса
      const { interviewerRating } = req.body;

      // Проверка валидности оценки интервьюера, если она указана
      if (
        interviewerRating &&
        (interviewerRating < 1 || interviewerRating > 5)
      ) {
        return res
          .status(400)
          .json({ message: 'Оценка интервьюера должна быть от 1 до 5' });
      }

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
        // Обновляем статус отзыва на "принят" и добавляем оценку интервьюера, если она указана
        const updatedFeedback = await prisma.interviewFeedback.update({
          where: { mockInterviewId: id },
          data: {
            isAccepted: true,
            ...(interviewerRating && { interviewerRating }),
          },
        });

        // Получаем данные интервьюера
        const interviewer = await prisma.user.findUnique({
          where: { id: interview.interviewerId },
        });

        // Определяем количество баллов в зависимости от оценки
        let pointsToAward = 1; // По умолчанию 1 балл

        if (interviewerRating) {
          if (interviewerRating >= 4) {
            pointsToAward = 2; // За высокую оценку 2 балла
          } else if (interviewerRating <= 2) {
            pointsToAward = 0; // За низкую оценку 0 баллов
          }
        }

        // Обновляем счетчик проведенных собеседований
        const updatedInterviewer = await prisma.user.update({
          where: { id: interview.interviewerId },
          data: {
            conductedInterviewsCount: {
              increment: 1,
            },
          },
        });

        // Проверяем, есть ли у интервьюера запись о баллах
        let interviewerPoints = await prisma.userPoints.findUnique({
          where: { userId: interview.interviewerId },
        });

        // Если у интервьюера нет записи о баллах, создаем её с начисленными баллами
        if (!interviewerPoints) {
          interviewerPoints = await prisma.userPoints.create({
            data: {
              userId: interview.interviewerId,
              points: pointsToAward,
            },
          });
        } else {
          // Если запись есть, начисляем баллы
          interviewerPoints = await prisma.userPoints.update({
            where: { userId: interview.interviewerId },
            data: {
              points: {
                increment: pointsToAward,
              },
            },
          });
        }

        // Создаем запись в истории транзакций за проведение собеседования
        await prisma.pointsTransaction.create({
          data: {
            userId: interview.interviewerId,
            amount: pointsToAward,
            type: 'feedback',
            description: `Проведение собеседования (оценка: ${
              interviewerRating || 'не указана'
            })`,
          },
        });

        // Проверяем, нужно ли начислить бонусные баллы за регулярную активность
        if (updatedInterviewer.conductedInterviewsCount % 5 === 0) {
          // За каждые 5 проведенных собеседований начисляем 2 бонусных балла
          await prisma.userPoints.update({
            where: { userId: interview.interviewerId },
            data: {
              points: {
                increment: 2,
              },
            },
          });

          // Создаем запись в истории транзакций для бонуса
          await prisma.pointsTransaction.create({
            data: {
              userId: interview.interviewerId,
              amount: 2,
              type: 'bonus',
              description: `Бонус за проведение ${updatedInterviewer.conductedInterviewsCount} собеседований`,
            },
          });
        }

        return {
          updatedFeedback,
          interviewerPoints,
          pointsToAward,
          bonusAwarded: updatedInterviewer.conductedInterviewsCount % 5 === 0,
        };
      });

      // Формируем сообщение о результате
      let message = `Отзыв успешно принят, интервьюеру начислено ${
        result.pointsToAward
      } ${result.pointsToAward === 1 ? 'балл' : 'балла'}`;
      if (result.bonusAwarded) {
        message += ' и 2 бонусных балла за регулярную активность';
      }

      return res.status(200).json({
        message,
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
