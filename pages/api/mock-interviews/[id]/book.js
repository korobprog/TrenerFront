import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import prisma from '../../../../lib/prisma';

export default async function handler(req, res) {
  // Поддерживаем только POST метод для записи на собеседование
  if (req.method !== 'POST') {
    console.log(
      `API mock-interviews/[id]/book: Неподдерживаемый метод ${req.method}`
    );
    return res.status(405).json({
      message: 'Метод не поддерживается',
      allowedMethods: ['POST'],
    });
  }

  try {
    // Получаем ID интервью из параметров запроса
    const { id } = req.query;

    console.log(
      `API mock-interviews/[id]/book: Запрос записи на интервью с ID: ${id}`
    );

    // Валидация ID
    if (!id || typeof id !== 'string') {
      console.log('API mock-interviews/[id]/book: Некорректный ID интервью');
      return res.status(400).json({
        message: 'Некорректный ID интервью',
      });
    }

    // Проверяем аутентификацию с детальным логированием
    const timestamp = new Date().toISOString();
    console.log(
      `[BOOK_DEBUG] ${timestamp} Проверка аутентификации для записи на интервью ${id}`
    );

    const session = await getServerSession(req, res, authOptions);

    // Детальное логирование состояния сессии
    try {
      console.log(`[BOOK_DEBUG] ${timestamp} Состояние сессии:`, {
        hasSession: !!session,
        hasUser: !!session?.user,
        hasUserId: !!session?.user?.id,
        sessionStructure: session
          ? {
              user: session.user
                ? {
                    id: session.user.id || 'отсутствует',
                    email: session.user.email || 'отсутствует',
                    name: session.user.name || 'отсутствует',
                    role: session.user.role || 'отсутствует',
                    provider: session.user.provider || 'отсутствует',
                  }
                : 'объект user отсутствует',
              timestamp: session.timestamp || 'отсутствует',
            }
          : 'сессия полностью отсутствует',
      });
    } catch (logError) {
      console.error(
        `[BOOK_DEBUG] ${timestamp} Ошибка логирования сессии:`,
        logError
      );
    }

    if (!session || !session.user) {
      console.log(
        `[BOOK_DEBUG] ${timestamp} Пользователь не авторизован - отказ в доступе`
      );
      console.log('API mock-interviews/[id]/book: Пользователь не авторизован');
      return res.status(401).json({
        message: 'Необходима авторизация для записи на собеседование',
      });
    }

    // Дополнительная проверка ID пользователя
    if (!session.user.id) {
      console.log(
        `[BOOK_DEBUG] ${timestamp} ID пользователя отсутствует в сессии`
      );
      return res.status(401).json({
        message: 'Некорректная сессия пользователя - отсутствует ID',
      });
    }

    console.log(`[BOOK_DEBUG] ${timestamp} Пользователь успешно авторизован`);
    console.log(
      `API mock-interviews/[id]/book: Пользователь авторизован: ${
        session?.user?.email || 'email не указан'
      } (ID: ${session?.user?.id || 'ID не указан'})`
    );

    // Получаем интервью для проверки доступности
    console.log(
      'API mock-interviews/[id]/book: Получение данных интервью из базы данных'
    );
    const interview = await prisma.mockInterview.findUnique({
      where: {
        id: id,
      },
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

    // Проверяем, существует ли интервью
    if (!interview) {
      console.log(
        `API mock-interviews/[id]/book: Интервью с ID ${id} не найдено`
      );
      return res.status(404).json({
        message: 'Интервью не найдено',
      });
    }

    console.log(
      `API mock-interviews/[id]/book: Интервью найдено. Статус: ${interview.status}, Интервьюер: ${interview.interviewerId}, Интервьюируемый: ${interview.intervieweeId}`
    );

    // Проверяем, что пользователь не является интервьюером
    if (interview.interviewerId === session?.user?.id) {
      console.log(
        `API mock-interviews/[id]/book: Пользователь ${
          session?.user?.id || 'неизвестный'
        } является интервьюером и не может записаться на собственное интервью`
      );
      return res.status(400).json({
        message: 'Вы не можете записаться на собственное интервью',
      });
    }

    // Проверяем, что интервью доступно для записи
    if (interview.status !== 'pending') {
      console.log(
        `API mock-interviews/[id]/book: Интервью ${id} недоступно для записи. Статус: ${interview.status}`
      );
      return res.status(400).json({
        message: 'Интервью недоступно для записи',
        currentStatus: interview.status,
      });
    }

    // Проверяем, что на интервью еще никто не записан
    if (interview.intervieweeId) {
      console.log(
        `API mock-interviews/[id]/book: На интервью ${id} уже записан пользователь ${interview.intervieweeId}`
      );
      return res.status(400).json({
        message: 'На это интервью уже записан другой пользователь',
      });
    }

    // Проверяем, что интервью запланировано на будущее время
    const now = new Date();
    if (interview.scheduledTime <= now) {
      console.log(
        `API mock-interviews/[id]/book: Интервью ${id} запланировано на прошедшее время: ${interview.scheduledTime}`
      );
      return res.status(400).json({
        message: 'Нельзя записаться на интервью, которое уже прошло',
      });
    }

    // Проверяем баллы пользователя перед записью
    const userId = session?.user?.id;
    if (!userId) {
      console.log(
        `[BOOK_DEBUG] ${timestamp} ID пользователя недоступен для проверки баллов`
      );
      return res.status(401).json({
        message: 'Некорректная сессия пользователя',
      });
    }

    console.log(
      `API mock-interviews/[id]/book: Проверка баллов пользователя ${userId}`
    );

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { userPoints: true },
    });

    const currentPoints = user?.userPoints?.points || 0;
    if (!user || currentPoints < 1) {
      console.log(
        `API mock-interviews/[id]/book: Недостаточно баллов у пользователя ${userId}. Текущие баллы: ${currentPoints}`
      );
      return res.status(400).json({
        message:
          'Недостаточно баллов для записи на собеседование. Необходимо минимум 1 балл',
        currentPoints: currentPoints,
      });
    }

    // Записываем пользователя на интервью и списываем балл в транзакции
    console.log(
      `API mock-interviews/[id]/book: Запись пользователя ${userId} на интервью ${id} и списание 1 балла`
    );

    const result = await prisma.$transaction(async (tx) => {
      // Повторно проверяем баллы пользователя внутри транзакции для предотвращения race conditions
      const userInTransaction = await tx.user.findUnique({
        where: { id: userId },
        include: { userPoints: true },
      });

      const transactionPoints = userInTransaction?.userPoints?.points || 0;
      if (!userInTransaction || transactionPoints < 1) {
        throw new Error('INSUFFICIENT_POINTS');
      }

      // Проверяем, что интервью все еще доступно для записи
      const interviewInTransaction = await tx.mockInterview.findUnique({
        where: { id: id },
        select: { status: true, intervieweeId: true },
      });

      if (
        !interviewInTransaction ||
        interviewInTransaction.status !== 'pending' ||
        interviewInTransaction.intervieweeId
      ) {
        throw new Error('INTERVIEW_NOT_AVAILABLE');
      }

      // Обновляем интервью
      const updatedInterview = await tx.mockInterview.update({
        where: { id: id },
        data: {
          intervieweeId: userId,
          status: 'scheduled',
          updatedAt: new Date(),
        },
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

      // Списываем 1 балл у пользователя через UserPoints
      const updatedUserPoints = await tx.userPoints.upsert({
        where: { userId: userId },
        update: {
          points: {
            decrement: 1,
          },
        },
        create: {
          userId: userId,
          points: 0, // Если записи нет, создаем с 0 баллов (недостаточно для операции)
        },
        select: { points: true },
      });

      // Проверяем, что баллы не ушли в минус
      if (updatedUserPoints.points < 0) {
        throw new Error('INSUFFICIENT_POINTS');
      }

      // Создаем запись в истории баллов для отслеживания транзакции
      try {
        await tx.pointsTransaction.create({
          data: {
            userId: userId,
            amount: -1,
            type: 'spent',
            description: `Списание 1 балла за запись на интервью ${id}`,
          },
        });
      } catch (historyError) {
        console.warn(
          `API mock-interviews/[id]/book: Не удалось создать запись в истории баллов:`,
          historyError.message
        );
        // Не прерываем транзакцию, так как это не критично
      }

      console.log(
        `API mock-interviews/[id]/book: Балл успешно списан. Остаток баллов: ${updatedUserPoints.points}`
      );

      return updatedInterview;
    });

    const updatedInterview = result;

    console.log(
      `API mock-interviews/[id]/book: Пользователь успешно записан на интервью ${id}`
    );

    // Создаем событие в календаре (если необходимо)
    try {
      await prisma.customCalendarEvent.create({
        data: {
          title: `Собеседование с ${
            interview.interviewer.name || interview.interviewer.email
          }`,
          description: `Запланированное собеседование`,
          startTime: interview.scheduledTime,
          endTime: new Date(interview.scheduledTime.getTime() + 60 * 60 * 1000), // +1 час
          userId: userId,
          eventType: 'interview',
          mockInterviewId: id,
        },
      });
      console.log(
        `API mock-interviews/[id]/book: Событие календаря создано для интервью ${id}`
      );
    } catch (calendarError) {
      console.warn(
        `API mock-interviews/[id]/book: Не удалось создать событие календаря для интервью ${id}:`,
        calendarError.message
      );
      // Не прерываем выполнение, так как основная операция записи прошла успешно
    }

    // Получаем актуальный баланс пользователя для ответа
    const userBalance = await prisma.user.findUnique({
      where: { id: userId },
      include: { userPoints: true },
    });

    // Возвращаем обновленные данные интервью
    const responseData = {
      ...updatedInterview,
      message: 'Вы успешно записались на собеседование',
      isCurrentUserInterviewee: true,
      currentUserRole: 'interviewee',
      pointsSpent: 1,
      remainingPoints: userBalance?.userPoints?.points || 0,
    };

    console.log(
      `API mock-interviews/[id]/book: Запись на интервью ${id} завершена успешно`
    );

    return res.status(200).json(responseData);
  } catch (error) {
    console.error(
      'API mock-interviews/[id]/book: Ошибка при записи на интервью:',
      error
    );
    console.error('API mock-interviews/[id]/book: Стек ошибки:', error.stack);

    // Логируем дополнительную информацию для отладки
    console.error('API mock-interviews/[id]/book: Детали ошибки:', {
      message: error.message,
      code: error.code,
      meta: error.meta,
    });

    // Обрабатываем специфические ошибки из транзакции
    if (error.message === 'INSUFFICIENT_POINTS') {
      console.log(
        `API mock-interviews/[id]/book: Недостаточно баллов у пользователя ${
          session?.user?.id || 'неизвестный'
        } во время транзакции`
      );
      return res.status(400).json({
        message:
          'Недостаточно баллов для записи на собеседование. Возможно, баллы были потрачены в другой операции',
        currentPoints: 0,
      });
    }

    if (error.message === 'INTERVIEW_NOT_AVAILABLE') {
      console.log(
        `API mock-interviews/[id]/book: Интервью ${id} стало недоступным во время транзакции`
      );
      return res.status(400).json({
        message:
          'Интервью больше недоступно для записи. Возможно, на него уже записался другой пользователь',
      });
    }

    // Проверяем специфические ошибки Prisma
    if (error.code === 'P2002') {
      return res.status(400).json({
        message: 'Конфликт данных при записи на интервью',
      });
    }

    if (error.code === 'P2025') {
      return res.status(404).json({
        message: 'Интервью не найдено или недоступно',
      });
    }

    // Ошибки связанные с недостаточными правами или ограничениями
    if (error.code === 'P2003') {
      return res.status(400).json({
        message: 'Нарушение ограничений базы данных при записи на интервью',
      });
    }

    return res.status(500).json({
      message: 'Внутренняя ошибка сервера при записи на интервью',
    });
  } finally {
    // Закрываем соединение с Prisma
    await prisma.$disconnect();
    console.log(
      'API mock-interviews/[id]/book: Соединение с базой данных закрыто'
    );
  }
}
