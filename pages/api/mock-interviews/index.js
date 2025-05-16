import { unstable_getServerSession, getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import prisma from '../../../lib/prisma';
import { createCalendarEvent } from '../../../lib/utils/googleCalendar';

export default async function handler(req, res) {
  console.log('API: Получен запрос на создание/получение собеседований');
  console.log('API: Метод запроса:', req.method);
  console.log('API: Тело запроса:', req.body);

  // Проверяем заголовки запроса для отладки
  console.log('API: Заголовки запроса:', req.headers);

  // Добавляем логи для отладки
  console.log('API: Пробуем получить сессию через unstable_getServerSession');
  const session = await unstable_getServerSession(req, res, authOptions);
  console.log('API: Сессия пользователя (unstable_getServerSession):', session);

  // Пробуем также получить сессию через getServerSession для сравнения
  console.log('API: Пробуем получить сессию через getServerSession');
  const sessionNew = await getServerSession(req, res, authOptions);
  console.log('API: Сессия пользователя (getServerSession):', sessionNew);

  // Проверяем cookie для отладки
  console.log('API: Cookie:', req.headers.cookie);

  if (!session) {
    console.log('API: Сессия отсутствует, возвращаем 401');
    return res.status(401).json({ message: 'Необходима авторизация' });
  }

  // Обработка GET запроса - получение списка собеседований
  if (req.method === 'GET') {
    try {
      console.log('API: Получение списка собеседований');
      console.log('API: ID текущего пользователя:', session.user.id);

      // Проверим, есть ли собеседования, на которые записался текущий пользователь
      const bookedInterviews = await prisma.mockInterview.findMany({
        where: {
          intervieweeId: session.user.id,
          status: 'booked',
        },
        include: {
          interviewer: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
      });

      console.log(
        'API: Собеседования, на которые записался текущий пользователь:',
        bookedInterviews.map((interview) => ({
          id: interview.id,
          scheduledTime: interview.scheduledTime,
          status: interview.status,
          interviewerId: interview.interviewerId,
        }))
      );

      // Сначала получим все собеседования, созданные текущим пользователем
      const userCreatedInterviews = await prisma.mockInterview.findMany({
        where: {
          interviewerId: session.user.id,
        },
        include: {
          interviewer: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
      });

      console.log(
        'API: Собеседования, созданные текущим пользователем:',
        userCreatedInterviews.map((interview) => ({
          id: interview.id,
          scheduledTime: interview.scheduledTime,
          status: interview.status,
        }))
      );

      console.log(
        'API: ID текущего пользователя для проверки:',
        session.user.id
      );

      // Получаем все собеседования со статусом "pending" (ожидающие)
      // и информацией об интервьюере
      const otherInterviews = await prisma.mockInterview.findMany({
        where: {
          status: 'pending',
          // Получаем собеседования, созданные другими пользователями
          interviewerId: {
            not: session.user.id,
          },
        },
        include: {
          interviewer: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
        orderBy: {
          scheduledTime: 'asc',
        },
      });

      console.log(
        'API: Количество собеседований других пользователей:',
        otherInterviews.length
      );

      // Добавляем маркер isCreatedByCurrentUser к каждому собеседованию
      const userInterviewsWithMarker = userCreatedInterviews.map(
        (interview) => ({
          ...interview,
          isCreatedByCurrentUser: true,
        })
      );

      const otherInterviewsWithMarker = otherInterviews.map((interview) => ({
        ...interview,
        isCreatedByCurrentUser: false,
      }));

      // Добавляем маркер к собеседованиям, на которые записался пользователь
      const bookedInterviewsWithMarker = bookedInterviews.map((interview) => ({
        ...interview,
        isCreatedByCurrentUser: false,
        isBookedByCurrentUser: true,
      }));

      // Объединяем все типы собеседований
      const allInterviews = [
        ...userInterviewsWithMarker,
        ...otherInterviewsWithMarker,
        ...bookedInterviewsWithMarker,
      ];

      // Сортируем все собеседования по времени
      allInterviews.sort(
        (a, b) => new Date(a.scheduledTime) - new Date(b.scheduledTime)
      );

      console.log(
        'API: Общее количество собеседований для отображения:',
        allInterviews.length
      );

      // Выводим первые несколько собеседований для проверки маркера isCreatedByCurrentUser
      console.log(
        'API: Примеры собеседований с маркером:',
        allInterviews.slice(0, 3).map((interview) => ({
          id: interview.id,
          scheduledTime: interview.scheduledTime,
          interviewerId: interview.interviewerId,
          isCreatedByCurrentUser: interview.isCreatedByCurrentUser,
        }))
      );

      return res.status(200).json(allInterviews);
    } catch (error) {
      console.error('Ошибка при получении собеседований:', error);
      return res
        .status(500)
        .json({ message: 'Ошибка сервера при получении собеседований' });
    }
  }

  // Обработка POST запроса - создание нового собеседования
  if (req.method === 'POST') {
    const { scheduledTime } = req.body;

    // Проверка наличия обязательных полей
    if (!scheduledTime) {
      return res
        .status(400)
        .json({ message: 'Необходимо указать время собеседования' });
    }

    try {
      // Получаем данные текущего пользователя (интервьюера)
      const interviewer = {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
      };

      // Создаем временный объект для интервьюируемого (будет заполнен при бронировании)
      const interviewee = {
        id: null,
        name: 'TBD',
        email: 'tbd@example.com',
      };

      // Создаем временный объект для собеседования
      const interviewData = {
        id: `temp-${Date.now()}`, // Временный ID для создания события
        scheduledTime: new Date(scheduledTime),
      };

      // Создаем событие в Google Calendar с автоматическим созданием ссылки на Google Meet
      console.log('API: Создание события в Google Calendar');
      console.log('API: Данные интервьюера:', interviewer);
      console.log('API: Данные интервьюируемого:', interviewee);
      console.log('API: Данные собеседования:', interviewData);

      const calendarResult = await createCalendarEvent(
        interviewer,
        interviewee,
        interviewData
      );

      console.log('API: Результат создания события:', calendarResult);
      console.log(
        'API: Получена ссылка на Google Meet:',
        calendarResult.meetingLink
      );

      // Проверяем успешность создания события и наличие ссылки на Google Meet
      if (!calendarResult.success) {
        throw new Error('Не удалось создать событие в Google Calendar');
      }

      // Получаем ссылку на Google Meet из результата
      const meetingLink = calendarResult.meetingLink || '';

      // Если не удалось получить ссылку на Google Meet, возвращаем ошибку
      if (!meetingLink) {
        console.warn('API: Не удалось получить ссылку на Google Meet');
      }

      // Логируем данные перед созданием собеседования
      console.log('API: Данные для создания собеседования:', {
        interviewerId: session.user.id,
        scheduledTime: new Date(scheduledTime),
        meetingLink: meetingLink,
        status: 'pending',
        calendarEventId: calendarResult.eventId || null,
      });

      // Проверяем схему модели MockInterview
      console.log('API: Проверка схемы модели MockInterview');

      // Создаем новое собеседование с полученной ссылкой на Google Meet
      const newInterview = await prisma.mockInterview.create({
        data: {
          interviewer: {
            connect: { id: session.user.id },
          },
          scheduledTime: new Date(scheduledTime),
          meetingLink: meetingLink,
          status: 'pending',
          // Сохраняем ID события в Google Calendar для возможности обновления в будущем
          calendarEventId: calendarResult.eventId || null,
        },
      });

      return res.status(201).json({
        ...newInterview,
        meetingLink: meetingLink,
      });
    } catch (error) {
      console.error('Ошибка при создании собеседования:', error);
      return res
        .status(500)
        .json({ message: 'Ошибка сервера при создании собеседования' });
    }
  }

  // Если метод запроса не поддерживается
  return res.status(405).json({ message: 'Метод не поддерживается' });
}
