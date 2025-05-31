import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import prisma from '../../../../lib/prisma';

export default async function handler(req, res) {
  // Поддерживаем только GET метод
  if (req.method !== 'GET') {
    console.log(
      `API mock-interviews/[id]/video-room: Неподдерживаемый метод ${req.method}`
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
      `API mock-interviews/[id]/video-room: Запрос информации о видеокомнате для интервью с ID: ${id}`
    );

    // Валидация ID
    if (!id || typeof id !== 'string') {
      console.log(
        'API mock-interviews/[id]/video-room: Некорректный ID интервью'
      );
      return res.status(400).json({
        message: 'Некорректный ID интервью',
      });
    }

    // Проверяем аутентификацию
    console.log('API mock-interviews/[id]/video-room: Проверка аутентификации');
    const session = await getServerSession(req, res, authOptions);

    if (!session || !session.user) {
      console.log(
        'API mock-interviews/[id]/video-room: Пользователь не авторизован'
      );
      return res.status(401).json({
        message: 'Необходима авторизация для доступа к видеокомнате',
      });
    }

    console.log(
      `API mock-interviews/[id]/video-room: Пользователь авторизован: ${session.user.email} (ID: ${session.user.id})`
    );

    // Получаем интервью с данными о видеокомнате
    console.log(
      'API mock-interviews/[id]/video-room: Получение данных интервью и видеокомнаты из базы данных'
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
        // Данные видеокомнаты
        videoRoom: {
          select: {
            id: true,
            code: true,
            name: true,
            description: true,
            isActive: true,
            isPrivate: true,
            maxParticipants: true,
            requiresPassword: true,
            recordingEnabled: true,
            scheduledStart: true,
            scheduledEnd: true,
            actualStart: true,
            actualEnd: true,
            settings: true,
            // Участники комнаты
            participants: {
              select: {
                id: true,
                userId: true,
                guestName: true,
                status: true,
                role: true,
                audioEnabled: true,
                videoEnabled: true,
                screenSharing: true,
                joinedAt: true,
                leftAt: true,
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    image: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    // Проверяем, существует ли интервью
    if (!interview) {
      console.log(
        `API mock-interviews/[id]/video-room: Интервью с ID ${id} не найдено`
      );
      return res.status(404).json({
        message: 'Интервью не найдено',
      });
    }

    console.log(
      `API mock-interviews/[id]/video-room: Интервью найдено. Интервьюер: ${interview.interviewerId}, Интервьюируемый: ${interview.intervieweeId}`
    );

    // Проверяем права доступа - пользователь должен быть участником интервью
    const isInterviewer = interview.interviewerId === session.user.id;
    const isInterviewee = interview.intervieweeId === session.user.id;
    const hasAccess = isInterviewer || isInterviewee;

    if (!hasAccess) {
      console.log(
        `API mock-interviews/[id]/video-room: Пользователь ${session.user.id} не имеет доступа к видеокомнате интервью ${id}`
      );
      return res.status(403).json({
        message: 'Доступ запрещен. Вы не являетесь участником этого интервью',
      });
    }

    console.log(
      `API mock-interviews/[id]/video-room: Доступ разрешен. Роль пользователя: ${
        isInterviewer ? 'интервьюер' : 'интервьюируемый'
      }`
    );

    // Если видеокомната не существует, создаем её автоматически
    let videoRoom = interview.videoRoom;

    if (!videoRoom && interview.videoType === 'built_in') {
      console.log(
        `API mock-interviews/[id]/video-room: Создание новой видеокомнаты для интервью ${id}`
      );

      // Генерируем уникальный код комнаты
      const roomCode = `interview-${id}-${Date.now()}`;

      try {
        videoRoom = await prisma.videoRoom.create({
          data: {
            code: roomCode,
            name: `Собеседование ${
              interview.interviewer.name || interview.interviewer.email
            }`,
            description: `Видеокомната для собеседования запланированного на ${new Date(
              interview.scheduledTime
            ).toLocaleString('ru-RU')}`,
            hostId: interview.interviewerId,
            isActive: true,
            isPrivate: true,
            maxParticipants: 2,
            requiresPassword: false,
            recordingEnabled: false,
            scheduledStart: interview.scheduledTime,
            scheduledEnd: new Date(
              interview.scheduledTime.getTime() + 60 * 60 * 1000
            ), // +1 час
            settings: {
              interviewMode: true,
              allowScreenShare: true,
              allowChat: true,
            },
          },
          include: {
            participants: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    image: true,
                  },
                },
              },
            },
          },
        });

        // Обновляем интервью, связывая его с созданной видеокомнатой
        await prisma.mockInterview.update({
          where: { id: id },
          data: { videoRoomId: videoRoom.id },
        });

        console.log(
          `API mock-interviews/[id]/video-room: Видеокомната создана с ID: ${videoRoom.id}, код: ${videoRoom.code}`
        );
      } catch (createError) {
        console.error(
          'API mock-interviews/[id]/video-room: Ошибка при создании видеокомнаты:',
          createError
        );
        return res.status(500).json({
          message: 'Не удалось создать видеокомнату',
        });
      }
    }

    // Формируем ответ
    const responseData = {
      interview: {
        id: interview.id,
        scheduledTime: interview.scheduledTime,
        status: interview.status,
        videoType: interview.videoType,
        meetingLink: interview.meetingLink,
        interviewer: interview.interviewer,
        interviewee: interview.interviewee,
      },
      videoRoom: videoRoom
        ? {
            id: videoRoom.id,
            code: videoRoom.code,
            name: videoRoom.name,
            description: videoRoom.description,
            isActive: videoRoom.isActive,
            isPrivate: videoRoom.isPrivate,
            maxParticipants: videoRoom.maxParticipants,
            requiresPassword: videoRoom.requiresPassword,
            recordingEnabled: videoRoom.recordingEnabled,
            scheduledStart: videoRoom.scheduledStart,
            scheduledEnd: videoRoom.scheduledEnd,
            actualStart: videoRoom.actualStart,
            actualEnd: videoRoom.actualEnd,
            settings: videoRoom.settings,
            participants: videoRoom.participants,
            // URL для подключения к комнате
            joinUrl: `/video-conferences/rooms/${videoRoom.code}`,
          }
        : null,
      // Флаги для определения роли текущего пользователя
      isCurrentUserInterviewer: isInterviewer,
      isCurrentUserInterviewee: isInterviewee,
      currentUserRole: isInterviewer ? 'interviewer' : 'interviewee',
    };

    console.log(
      `API mock-interviews/[id]/video-room: Успешно получена информация о видеокомнате для интервью ${id}`
    );
    console.log(
      `API mock-interviews/[id]/video-room: Тип видеосвязи: ${interview.videoType}`
    );
    console.log(
      `API mock-interviews/[id]/video-room: Наличие видеокомнаты: ${
        videoRoom ? 'да' : 'нет'
      }`
    );

    return res.status(200).json(responseData);
  } catch (error) {
    console.error(
      'API mock-interviews/[id]/video-room: Ошибка при получении информации о видеокомнате:',
      error
    );
    console.error(
      'API mock-interviews/[id]/video-room: Стек ошибки:',
      error.stack
    );

    // Логируем дополнительную информацию для отладки
    console.error('API mock-interviews/[id]/video-room: Детали ошибки:', {
      message: error.message,
      code: error.code,
      meta: error.meta,
    });

    return res.status(500).json({
      message:
        'Внутренняя ошибка сервера при получении информации о видеокомнате',
    });
  } finally {
    // Закрываем соединение с Prisma
    await prisma.$disconnect();
    console.log(
      'API mock-interviews/[id]/video-room: Соединение с базой данных закрыто'
    );
  }
}
