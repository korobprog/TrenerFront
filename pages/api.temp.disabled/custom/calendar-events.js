import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  try {
    const session = await getServerSession(req, res, authOptions);

    if (!session) {
      return res.status(401).json({
        success: false,
        error: 'Не авторизован',
      });
    }

    const { method } = req;

    switch (method) {
      case 'GET':
        return await getEvents(req, res, session);
      case 'POST':
        return await createEvent(req, res, session);
      case 'PUT':
        return await updateEvent(req, res, session);
      case 'DELETE':
        return await deleteEvent(req, res, session);
      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
        return res.status(405).json({
          success: false,
          error: `Метод ${method} не поддерживается`,
        });
    }
  } catch (error) {
    console.error('Ошибка в API календарных событий:', error);
    return res.status(500).json({
      success: false,
      error: 'Внутренняя ошибка сервера',
      details:
        process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  } finally {
    await prisma.$disconnect();
  }
}

// Получение событий пользователя
async function getEvents(req, res, session) {
  try {
    const { startDate, endDate, eventType } = req.query;

    let whereClause = {
      userId: session.user.id,
    };

    // Фильтрация по диапазону дат
    if (startDate && endDate) {
      whereClause.startTime = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    // Фильтрация по типу события
    if (eventType && eventType !== 'all') {
      whereClause.eventType = eventType;
    }

    const events = await prisma.customCalendarEvent.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        videoRoom: {
          select: {
            id: true,
            code: true,
            name: true,
            description: true,
            isActive: true,
            maxParticipants: true,
            requiresPassword: true,
          },
        },
        mockInterview: {
          select: {
            id: true,
            status: true,
            meetingLink: true,
          },
        },
      },
      orderBy: {
        startTime: 'asc',
      },
    });

    const formattedEvents = events.map((event) => ({
      id: event.id,
      title: event.title,
      description: event.description,
      startTime: event.startTime,
      endTime: event.endTime,
      eventType: event.eventType,
      isRecurring: event.isRecurring,
      recurringPattern: event.recurringPattern,
      recurringEndDate: event.recurringEndDate,
      videoRoom: event.videoRoom,
      mockInterview: event.mockInterview,
      user: event.user,
      createdAt: event.createdAt,
      updatedAt: event.updatedAt,
    }));

    return res.status(200).json({
      success: true,
      data: formattedEvents,
      message: 'События успешно получены',
    });
  } catch (error) {
    console.error('Ошибка при получении событий:', error);
    return res.status(500).json({
      success: false,
      error: 'Ошибка при получении событий',
      details:
        process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

// Создание нового события
async function createEvent(req, res, session) {
  try {
    const {
      title,
      description,
      startTime,
      endTime,
      eventType = 'meeting',
      videoRoomId,
      mockInterviewId,
      isRecurring = false,
      recurringPattern,
      recurringEndDate,
    } = req.body;

    // Валидация обязательных полей
    if (!title || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        error: 'Обязательные поля: title, startTime, endTime',
      });
    }

    // Проверка корректности дат
    const start = new Date(startTime);
    const end = new Date(endTime);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        success: false,
        error: 'Некорректный формат даты',
      });
    }

    if (end <= start) {
      return res.status(400).json({
        success: false,
        error: 'Время окончания должно быть позже времени начала',
      });
    }

    // Проверка доступа к видеокомнате (если указана)
    if (videoRoomId) {
      const videoRoom = await prisma.videoRoom.findUnique({
        where: { id: videoRoomId },
      });

      if (!videoRoom) {
        return res.status(404).json({
          success: false,
          error: 'Видеокомната не найдена',
        });
      }

      if (videoRoom.hostId !== session.user.id) {
        return res.status(403).json({
          success: false,
          error: 'Нет прав доступа к этой видеокомнате',
        });
      }
    }

    // Проверка доступа к собеседованию (если указано)
    if (mockInterviewId) {
      const mockInterview = await prisma.mockInterview.findUnique({
        where: { id: mockInterviewId },
      });

      if (!mockInterview) {
        return res.status(404).json({
          success: false,
          error: 'Собеседование не найдено',
        });
      }

      if (
        mockInterview.interviewerId !== session.user.id &&
        mockInterview.intervieweeId !== session.user.id
      ) {
        return res.status(403).json({
          success: false,
          error: 'Нет прав доступа к этому собеседованию',
        });
      }
    }

    // Создание события
    const event = await prisma.customCalendarEvent.create({
      data: {
        title,
        description: description || '',
        startTime: start,
        endTime: end,
        eventType,
        userId: session.user.id,
        videoRoomId: videoRoomId || null,
        mockInterviewId: mockInterviewId || null,
        isRecurring,
        recurringPattern: recurringPattern || null,
        recurringEndDate: recurringEndDate ? new Date(recurringEndDate) : null,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        videoRoom: {
          select: {
            id: true,
            code: true,
            name: true,
            description: true,
            isActive: true,
          },
        },
        mockInterview: {
          select: {
            id: true,
            status: true,
            meetingLink: true,
          },
        },
      },
    });

    return res.status(201).json({
      success: true,
      data: event,
      message: 'Событие успешно создано',
    });
  } catch (error) {
    console.error('Ошибка при создании события:', error);
    return res.status(500).json({
      success: false,
      error: 'Ошибка при создании события',
      details:
        process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

// Обновление существующего события
async function updateEvent(req, res, session) {
  try {
    const { id, title, description, startTime, endTime, eventType } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'ID события обязателен',
      });
    }

    // Проверка существования события и прав доступа
    const existingEvent = await prisma.customCalendarEvent.findUnique({
      where: { id },
    });

    if (!existingEvent) {
      return res.status(404).json({
        success: false,
        error: 'Событие не найдено',
      });
    }

    if (existingEvent.userId !== session.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Нет прав для редактирования этого события',
      });
    }

    // Подготовка данных для обновления
    const updateData = {};

    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (startTime !== undefined) {
      const start = new Date(startTime);
      if (isNaN(start.getTime())) {
        return res.status(400).json({
          success: false,
          error: 'Некорректный формат даты начала',
        });
      }
      updateData.startTime = start;
    }
    if (endTime !== undefined) {
      const end = new Date(endTime);
      if (isNaN(end.getTime())) {
        return res.status(400).json({
          success: false,
          error: 'Некорректный формат даты окончания',
        });
      }
      updateData.endTime = end;
    }
    if (eventType !== undefined) updateData.eventType = eventType;

    // Проверка корректности дат после обновления
    const finalStartTime = updateData.startTime || existingEvent.startTime;
    const finalEndTime = updateData.endTime || existingEvent.endTime;

    if (finalEndTime <= finalStartTime) {
      return res.status(400).json({
        success: false,
        error: 'Время окончания должно быть позже времени начала',
      });
    }

    const updatedEvent = await prisma.customCalendarEvent.update({
      where: { id },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        videoRoom: {
          select: {
            id: true,
            code: true,
            name: true,
            description: true,
            isActive: true,
          },
        },
        mockInterview: {
          select: {
            id: true,
            status: true,
            meetingLink: true,
          },
        },
      },
    });

    return res.status(200).json({
      success: true,
      data: updatedEvent,
      message: 'Событие успешно обновлено',
    });
  } catch (error) {
    console.error('Ошибка при обновлении события:', error);
    return res.status(500).json({
      success: false,
      error: 'Ошибка при обновлении события',
      details:
        process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

// Удаление события
async function deleteEvent(req, res, session) {
  try {
    const { id } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'ID события обязателен',
      });
    }

    // Проверка существования события и прав доступа
    const existingEvent = await prisma.customCalendarEvent.findUnique({
      where: { id },
    });

    if (!existingEvent) {
      return res.status(404).json({
        success: false,
        error: 'Событие не найдено',
      });
    }

    if (existingEvent.userId !== session.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Нет прав для удаления этого события',
      });
    }

    // Удаление события
    await prisma.customCalendarEvent.delete({
      where: { id },
    });

    return res.status(200).json({
      success: true,
      message: 'Событие успешно удалено',
    });
  } catch (error) {
    console.error('Ошибка при удалении события:', error);
    return res.status(500).json({
      success: false,
      error: 'Ошибка при удалении события',
      details:
        process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}
