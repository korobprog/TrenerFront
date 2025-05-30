import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import prisma, { withPrisma } from '../../../lib/prisma';
import { createCalendarEvent } from '../../../lib/utils/googleCalendar';

export default async function handler(req, res) {
  // Добавляем детальные логи для отладки запроса
  console.log('API mock-interviews: Детали запроса', {
    method: req.method,
    query: JSON.stringify(req.query),
    body: req.body,
    cookies: req.headers.cookie,
  });

  // Проверяем заголовки запроса для отладки
  console.log('API: Заголовки запроса:', req.headers);

  // Добавляем логи для отладки
  console.log('API: Пробуем получить сессию через getServerSession');
  const session = await getServerSession(req, res, authOptions);

  // Добавляем детальные логи для отладки сессии
  console.log('API mock-interviews: Детали сессии', {
    id: session?.user?.id,
    email: session?.user?.email,
    role: session?.user?.role,
    timestamp: session?.timestamp,
  });

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

      // Получаем параметр status из запроса
      const { status } = req.query;
      console.log('API: Параметр status:', status);

      // Определяем статусы для фильтрации
      let statusFilter = {};

      if (status === 'active') {
        // Для активных собеседований показываем только со статусами pending и booked
        statusFilter = {
          status: {
            in: ['pending', 'booked'],
          },
        };
      } else if (status === 'archived') {
        // Для архивных собеседований показываем только со статусами completed и cancelled
        statusFilter = {
          status: {
            in: ['completed', 'cancelled'],
          },
        };
      }

      // Проверим, есть ли собеседования, на которые записался текущий пользователь
      const bookedInterviews = await withPrisma(async (prisma) => {
        return await prisma.mockInterview.findMany({
          where: {
            intervieweeId: session.user.id,
            status: 'booked',
            ...statusFilter,
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
      const userCreatedInterviews = await withPrisma(async (prisma) => {
        return await prisma.mockInterview.findMany({
          where: {
            interviewerId: session.user.id,
            ...statusFilter,
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

      // Получаем собеседования других пользователей с учетом фильтра статуса
      const otherInterviews = await withPrisma(async (prisma) => {
        return await prisma.mockInterview.findMany({
          where: {
            // Если фильтр не указан или активные собеседования, то показываем только pending
            // Иначе используем общий фильтр статуса
            ...(status === 'active' || !status
              ? { status: 'pending' }
              : statusFilter),
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
    const { scheduledTime, manualMeetingLink } = req.body;

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

      let meetingLink = '';
      let calendarEventId = null;
      // Флаг, указывающий, нужно ли создавать событие в Google Calendar
      let needCreateCalendarEvent = false;

      // Если предоставлена ручная ссылка, проверяем, не является ли она заглушкой
      if (manualMeetingLink) {
        console.log(
          'API: Использование ручной ссылки на Google Meet:',
          manualMeetingLink
        );

        // Проверяем, не является ли ссылка заглушкой test-mock-link
        if (manualMeetingLink.includes('test-mock-link')) {
          console.log(
            'API: Обнаружена заглушка test-mock-link, создаем реальную ссылку'
          );
          // Будем создавать реальную ссылку через Google Calendar API
          needCreateCalendarEvent = true;
        } else {
          // Если это не заглушка, используем предоставленную ссылку
          meetingLink = manualMeetingLink;
        }
      } else {
        // Если ручная ссылка не предоставлена, создаем событие в Google Calendar
        needCreateCalendarEvent = true;
      }

      // Если нужно создать событие в Google Calendar
      if (needCreateCalendarEvent) {
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

        // Если создание события не удалось и все попытки исчерпаны
        if (!calendarResult.success) {
          console.error(
            'API: Не удалось создать событие в Google Calendar:',
            calendarResult.error
          );

          // Проверяем, связана ли ошибка с авторизацией Google
          const isAuthError =
            calendarResult.error &&
            (calendarResult.error.includes('invalid_grant') ||
              calendarResult.error.includes('unauthorized') ||
              calendarResult.error.includes('invalid_client') ||
              calendarResult.error.includes('access_denied'));

          // Если это был запрос без ручной ссылки, возвращаем ошибку с флагом для фронтенда
          if (!manualMeetingLink) {
            return res.status(400).json({
              message: isAuthError
                ? 'Требуется повторная авторизация Google или ручной ввод ссылки на Google Meet'
                : 'Не удалось автоматически создать ссылку на Google Meet',
              error: calendarResult.error,
              needManualLink: true, // Флаг для фронтенда, что нужен ручной ввод ссылки
              isAuthError: isAuthError, // Флаг, указывающий на проблемы с авторизацией
            });
          } else {
            // Если была предоставлена ручная ссылка, но создание события все равно не удалось,
            // продолжаем с ручной ссылкой (событие в календаре не обязательно)
            console.warn(
              'API: Используем ручную ссылку, так как автоматическое создание не удалось'
            );
            meetingLink = manualMeetingLink;
            calendarEventId = null;
          }
        } else {
          // Получаем ссылку на Google Meet из результата
          meetingLink = calendarResult.meetingLink || '';
          calendarEventId = calendarResult.eventId || null;

          console.log('API: Получена ссылка на Google Meet:', meetingLink);

          // Если не удалось получить ссылку на Google Meet, возвращаем ошибку
          if (!meetingLink) {
            console.warn('API: Не удалось получить ссылку на Google Meet');
            return res.status(400).json({
              message: 'Не удалось получить ссылку на Google Meet',
              needManualLink: true, // Флаг для фронтенда, что нужен ручной ввод ссылки
            });
          }
        }
      }

      // Логируем данные перед созданием собеседования
      console.log('API: Данные для создания собеседования:', {
        interviewerId: session.user.id,
        scheduledTime: new Date(scheduledTime),
        meetingLink: meetingLink,
        status: 'pending',
        calendarEventId: calendarEventId,
        isManualLink: !!manualMeetingLink,
      });

      // Проверяем схему модели MockInterview
      console.log('API: Проверка схемы модели MockInterview');

      // Создаем новое собеседование с полученной ссылкой на Google Meet
      const newInterview = await withPrisma(async (prisma) => {
        return await prisma.mockInterview.create({
          data: {
            interviewer: {
              connect: { id: session.user.id },
            },
            scheduledTime: new Date(scheduledTime),
            meetingLink: meetingLink,
            status: 'pending',
            // Сохраняем ID события в Google Calendar для возможности обновления в будущем
            calendarEventId: calendarEventId,
          },
        });
      });

      return res.status(201).json({
        ...newInterview,
        meetingLink: meetingLink,
        isManualLink: !!manualMeetingLink,
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
