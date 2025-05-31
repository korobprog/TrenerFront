import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import prisma from '../../../lib/prisma';

export default async function handler(req, res) {
  // Поддерживаем только GET метод
  if (req.method !== 'GET') {
    console.log(
      `API mock-interviews/[id]: Неподдерживаемый метод ${req.method}`
    );
    return res.status(405).json({
      message: 'Метод не поддерживается',
      allowedMethods: ['GET'],
    });
  }

  try {
    // Получаем ID интервью из параметров запроса
    const { id } = req.query;

    console.log(
      `API mock-interviews/[id]: Запрос деталей интервью с ID: ${id}`
    );

    // Валидация ID
    if (!id || typeof id !== 'string') {
      console.log('API mock-interviews/[id]: Некорректный ID интервью');
      return res.status(400).json({
        message: 'Некорректный ID интервью',
      });
    }

    // Проверяем аутентификацию
    console.log('API mock-interviews/[id]: Проверка аутентификации');
    const session = await getServerSession(req, res, authOptions);

    if (!session || !session.user) {
      console.log('API mock-interviews/[id]: Пользователь не авторизован');
      return res.status(401).json({
        message: 'Необходима авторизация',
      });
    }

    console.log(
      `API mock-interviews/[id]: Пользователь авторизован: ${session.user.email} (ID: ${session.user.id})`
    );

    // Получаем детали интервью с включением связанных данных
    console.log(
      'API mock-interviews/[id]: Получение деталей интервью из базы данных'
    );
    const interview = await prisma.mockInterview.findUnique({
      where: {
        id: id,
      },
      include: {
        // Данные интервьюера
        interviewer: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        // Данные интервьюируемого (может быть null)
        interviewee: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        // Обратная связь по интервью
        interviewFeedback: {
          select: {
            id: true,
            technicalScore: true,
            feedback: true,
            isAccepted: true,
            interviewerRating: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        // Данные видеокомнаты
        videoRoom: {
          select: {
            id: true,
            code: true,
            name: true,
            isActive: true,
          },
        },
      },
    });

    // Проверяем, существует ли интервью
    if (!interview) {
      console.log(`API mock-interviews/[id]: Интервью с ID ${id} не найдено`);
      return res.status(404).json({
        message: 'Интервью не найдено',
      });
    }

    console.log(
      `API mock-interviews/[id]: Интервью найдено. Интервьюер: ${interview.interviewerId}, Интервьюируемый: ${interview.intervieweeId}`
    );

    // Проверяем права доступа - пользователь должен быть участником интервью
    const isInterviewer = interview.interviewerId === session.user.id;
    const isInterviewee = interview.intervieweeId === session.user.id;
    const hasAccess = isInterviewer || isInterviewee;

    if (!hasAccess) {
      console.log(
        `API mock-interviews/[id]: Пользователь ${session.user.id} не имеет доступа к интервью ${id}`
      );
      console.log(
        `API mock-interviews/[id]: Интервьюер: ${interview.interviewerId}, Интервьюируемый: ${interview.intervieweeId}`
      );
      return res.status(403).json({
        message: 'Доступ запрещен. Вы не являетесь участником этого интервью',
      });
    }

    console.log(
      `API mock-interviews/[id]: Доступ разрешен. Роль пользователя: ${
        isInterviewer ? 'интервьюер' : 'интервьюируемый'
      }`
    );

    // Добавляем дополнительные поля для удобства фронтенда
    const responseData = {
      ...interview,
      // Флаги для определения роли текущего пользователя
      isCurrentUserInterviewer: isInterviewer,
      isCurrentUserInterviewee: isInterviewee,
      // Статус участия текущего пользователя
      currentUserRole: isInterviewer ? 'interviewer' : 'interviewee',
    };

    console.log(
      `API mock-interviews/[id]: Успешно получены детали интервью ${id}`
    );
    console.log(
      `API mock-interviews/[id]: Статус интервью: ${interview.status}`
    );
    console.log(
      `API mock-interviews/[id]: Тип видеосвязи: ${interview.videoType}`
    );
    console.log(
      `API mock-interviews/[id]: Наличие обратной связи: ${
        interview.interviewFeedback ? 'да' : 'нет'
      }`
    );

    return res.status(200).json(responseData);
  } catch (error) {
    console.error(
      'API mock-interviews/[id]: Ошибка при получении деталей интервью:',
      error
    );
    console.error('API mock-interviews/[id]: Стек ошибки:', error.stack);

    // Логируем дополнительную информацию для отладки
    console.error('API mock-interviews/[id]: Детали ошибки:', {
      message: error.message,
      code: error.code,
      meta: error.meta,
    });

    return res.status(500).json({
      message: 'Внутренняя ошибка сервера при получении деталей интервью',
    });
  } finally {
    // Закрываем соединение с Prisma
    await prisma.$disconnect();
    console.log('API mock-interviews/[id]: Соединение с базой данных закрыто');
  }
}
