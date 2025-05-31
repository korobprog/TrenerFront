import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { PrismaClient } from '@prisma/client';
import { createCalendarEvent } from '../../../lib/utils/googleCalendar';

const prisma = new PrismaClient();

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
        // Для активных собеседований показываем только со статусами pending, scheduled и booked
        statusFilter = {
          status: {
            in: ['pending', 'scheduled', 'booked'],
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
      const bookedInterviews = await prisma.mockInterview.findMany({
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
      const otherInterviews = await prisma.mockInterview.findMany({
        where: {
          // Если фильтр не указан или активные собеседования, то показываем только pending
          // Иначе используем общий фильтр статуса
          ...(status === 'active' || !status
            ? { status: { in: ['pending', 'scheduled'] } }
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
    } finally {
      await prisma.$disconnect();
    }
  }

  // Обработка POST запроса - создание нового собеседования
  if (req.method === 'POST') {
    const {
      scheduledTime,
      manualMeetingLink,
      videoType = 'google_meet',
    } = req.body;

    // Проверка наличия обязательных полей
    if (!scheduledTime) {
      return res
        .status(400)
        .json({ message: 'Необходимо указать время собеседования' });
    }

    // Валидация videoType
    if (!['google_meet', 'built_in'].includes(videoType)) {
      return res.status(400).json({
        message:
          'Недопустимый тип видеосвязи. Допустимые значения: google_meet, built_in',
      });
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
      let videoRoomId = null;
      // Флаг, указывающий, нужно ли создавать событие в Google Calendar
      let needCreateCalendarEvent = false;

      console.log('API: Обработка типа видеосвязи:', videoType);

      // Логика для встроенной видеосистемы
      if (videoType === 'built_in') {
        try {
          console.log('API: Создание встроенной видеокомнаты');

          // Дополнительная валидация времени для встроенной видеосистемы
          const scheduledDate = new Date(scheduledTime);
          const now = new Date();

          console.log('API: Валидация времени для встроенной видеосистемы', {
            originalScheduledTime: scheduledTime,
            parsedScheduledTime: scheduledDate.toISOString(),
            currentTime: now.toISOString(),
            scheduledTimeLocal: scheduledDate.toLocaleString('ru-RU', {
              timeZone: 'Europe/Moscow',
            }),
            currentTimeLocal: now.toLocaleString('ru-RU', {
              timeZone: 'Europe/Moscow',
            }),
            differenceHours: (
              (scheduledDate.getTime() - now.getTime()) /
              (1000 * 60 * 60)
            ).toFixed(2),
            isInFuture: scheduledDate > now,
          });

          // Создаем VideoRoom через внутренний API
          const videoRoomData = {
            name: `Собеседование ${new Date(scheduledTime).toLocaleDateString(
              'ru-RU'
            )}`,
            description: `Собеседование запланировано на ${new Date(
              scheduledTime
            ).toLocaleString('ru-RU')}`,
            isPrivate: true,
            maxParticipants: 2,
            scheduledStartTime: scheduledTime,
            recordingEnabled: false,
            userId: session.user.id, // Добавляем userId для создания VideoRoom
            settings: {
              allowScreenShare: true,
              allowChat: true,
              autoRecord: false,
            },
          };

          console.log('API: Данные для создания видеокомнаты', {
            videoRoomData: JSON.stringify(videoRoomData, null, 2),
            userId: session.user.id,
            userEmail: session.user.email,
            userName: session.user.name,
          });

          console.log('API: Отправка запроса на создание видеокомнаты', {
            url: `${
              process.env.NEXTAUTH_URL || 'http://localhost:3000'
            }/api/video-conferences`,
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Cookie: req.headers.cookie ? 'присутствует' : 'отсутствует',
            },
            bodyData: JSON.stringify(videoRoomData, null, 2),
            userIdIncluded: !!videoRoomData.userId,
          });

          // Создаем видеокомнату
          const videoRoomResponse = await fetch(
            `${
              process.env.NEXTAUTH_URL || 'http://localhost:3000'
            }/api/video-conferences`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Cookie: req.headers.cookie || '',
              },
              body: JSON.stringify(videoRoomData),
            }
          );

          console.log('API: Получен ответ от video-conferences API', {
            status: videoRoomResponse.status,
            statusText: videoRoomResponse.statusText,
            ok: videoRoomResponse.ok,
            headers: Object.fromEntries(videoRoomResponse.headers.entries()),
          });

          if (!videoRoomResponse.ok) {
            const errorData = await videoRoomResponse.json();
            console.error('API: ДЕТАЛЬНАЯ ОШИБКА создания видеокомнаты:', {
              status: videoRoomResponse.status,
              statusText: videoRoomResponse.statusText,
              errorData: JSON.stringify(errorData, null, 2),
              requestData: JSON.stringify(videoRoomData, null, 2),
              requestHeaders: {
                'Content-Type': 'application/json',
                Cookie: req.headers.cookie ? 'присутствует' : 'отсутствует',
              },
            });

            // Возвращаем ошибку вместо fallback на Google Meet
            return res.status(400).json({
              message: `Не удалось создать встроенную видеокомнату: ${
                errorData.error || 'Неизвестная ошибка'
              }`,
              error: errorData.error,
              details: errorData.details,
              videoType: 'built_in',
              needRetry: true, // Флаг для фронтенда, что можно повторить попытку
            });
          }

          const videoRoom = await videoRoomResponse.json();
          videoRoomId = videoRoom.id;
          meetingLink = `${
            process.env.NEXTAUTH_URL || 'http://localhost:3000'
          }/video-conferences/rooms/${videoRoom.code}`;

          console.log('API: Видеокомната создана успешно:', {
            roomId: videoRoomId,
            roomCode: videoRoom.code,
            meetingLink: meetingLink,
          });
        } catch (error) {
          console.error(
            'API: Критическая ошибка при создании встроенной видеокомнаты:',
            error
          );

          // Возвращаем ошибку вместо автоматического fallback
          return res.status(500).json({
            message: 'Критическая ошибка при создании встроенной видеосистемы',
            error: error.message,
            videoType: 'built_in',
            needRetry: true,
          });
        }
      } else {
        // Логика для Google Meet (существующая)
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
        videoType: videoType,
        videoRoomId: videoRoomId,
        calendarEventId: calendarEventId,
        isManualLink: !!manualMeetingLink,
      });

      // Проверяем схему модели MockInterview
      console.log('API: Проверка схемы модели MockInterview');

      // Подготавливаем данные для создания собеседования
      const interviewCreateData = {
        interviewer: {
          connect: { id: session.user.id },
        },
        scheduledTime: new Date(scheduledTime),
        meetingLink: meetingLink,
        status: 'pending',
        videoType: videoType,
        // Сохраняем ID события в Google Calendar для возможности обновления в будущем
        calendarEventId: calendarEventId,
      };

      // Добавляем videoRoomId только если он существует
      if (videoRoomId) {
        interviewCreateData.videoRoom = {
          connect: { id: videoRoomId },
        };
      }

      // Создаем новое собеседование
      const newInterview = await prisma.mockInterview.create({
        data: interviewCreateData,
        include: {
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

      // Подготавливаем ответ
      const responseData = {
        ...newInterview,
        meetingLink: meetingLink,
        isManualLink: !!manualMeetingLink,
        videoType: videoType,
      };

      // Добавляем информацию о видеокомнате если она есть
      if (newInterview.videoRoom) {
        responseData.videoRoom = newInterview.videoRoom;
      }

      console.log('API: Собеседование создано успешно:', {
        id: newInterview.id,
        videoType: newInterview.videoType,
        videoRoomId: newInterview.videoRoomId,
        meetingLink: meetingLink,
      });

      return res.status(201).json(responseData);
    } catch (error) {
      console.error('Ошибка при создании собеседования:', error);
      return res
        .status(500)
        .json({ message: 'Ошибка сервера при создании собеседования' });
    } finally {
      await prisma.$disconnect();
    }
  }

  // Если метод запроса не поддерживается
  return res.status(405).json({ message: 'Метод не поддерживается' });
}
