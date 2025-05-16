import { unstable_getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import prisma from '../../../../lib/prisma';

export default async function handler(req, res) {
  console.log('API Book: Получен запрос на запись на собеседование');
  console.log('API Book: Метод запроса:', req.method);
  console.log('API Book: Параметры запроса:', req.query);
  console.log('API Book: Заголовки запроса:', req.headers);

  // Используем unstable_getServerSession вместо getSession для согласованности
  const session = await unstable_getServerSession(req, res, authOptions);
  console.log('API Book: Сессия пользователя:', session);

  if (!session) {
    console.log('API Book: Сессия отсутствует, возвращаем 401');
    return res.status(401).json({ message: 'Необходима авторизация' });
  }

  // Получаем ID собеседования из URL
  const { id } = req.query;

  // Обработка только POST запросов
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Метод не поддерживается' });
  }

  try {
    console.log('API Book: ID собеседования:', id);
    console.log('API Book: ID пользователя:', session.user.id);

    // Проверяем, существует ли собеседование и доступно ли оно для записи
    const interview = await prisma.mockInterview.findUnique({
      where: { id },
      include: {
        interviewer: true,
      },
    });

    console.log(
      'API Book: Найденное собеседование:',
      interview
        ? {
            id: interview.id,
            status: interview.status,
            interviewerId: interview.interviewerId,
            scheduledTime: interview.scheduledTime,
          }
        : 'не найдено'
    );

    if (!interview) {
      console.log('API Book: Собеседование не найдено');
      return res.status(404).json({ message: 'Собеседование не найдено' });
    }

    if (interview.status !== 'pending') {
      console.log('API Book: Собеседование уже забронировано или завершено');
      return res
        .status(400)
        .json({ message: 'Это собеседование уже забронировано или завершено' });
    }

    if (interview.interviewerId === session.user.id) {
      console.log(
        'API Book: Пользователь пытается записаться на собственное собеседование'
      );
      return res.status(400).json({
        message: 'Вы не можете записаться на собственное собеседование',
      });
    }

    // Проверяем, есть ли у пользователя достаточно баллов
    const userPoints = await prisma.userPoints.findUnique({
      where: { userId: session.user.id },
    });

    console.log('API Book: Баллы пользователя:', userPoints);

    // Если у пользователя нет записи о баллах, создаем её с 0 баллами
    if (!userPoints) {
      console.log(
        'API Book: У пользователя нет записи о баллах, создаем с 0 баллами'
      );
      await prisma.userPoints.create({
        data: {
          userId: session.user.id,
          points: 0,
        },
      });
      return res.status(400).json({
        message: 'У вас недостаточно баллов для записи на собеседование',
      });
    }

    // Проверяем, достаточно ли баллов (нужно минимум 1)
    if (userPoints.points < 1) {
      console.log(
        'API Book: У пользователя недостаточно баллов:',
        userPoints.points
      );
      return res.status(400).json({
        message: 'У вас недостаточно баллов для записи на собеседование',
      });
    }

    console.log(
      'API Book: У пользователя достаточно баллов:',
      userPoints.points
    );

    // Начинаем транзакцию для обновления собеседования и списания баллов
    const result = await prisma.$transaction([
      // Обновляем статус собеседования и добавляем отвечающего
      prisma.mockInterview.update({
        where: { id },
        data: {
          status: 'booked',
          interviewee: {
            connect: { id: session.user.id },
          },
        },
      }),
      // Списываем 1 балл у пользователя
      prisma.userPoints.update({
        where: { userId: session.user.id },
        data: {
          points: {
            decrement: 1,
          },
        },
      }),
    ]);

    return res.status(200).json({
      message: 'Вы успешно записались на собеседование',
      interview: result[0],
    });
  } catch (error) {
    console.error('Ошибка при записи на собеседование:', error);
    return res
      .status(500)
      .json({ message: 'Ошибка сервера при записи на собеседование' });
  }
}
