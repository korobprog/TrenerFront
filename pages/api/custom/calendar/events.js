import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import moment from 'moment';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  try {
    const session = await getServerSession(req, res, authOptions);

    if (!session) {
      return res.status(401).json({ error: 'Не авторизован' });
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
        return res
          .status(405)
          .json({ error: `Метод ${method} не поддерживается` });
    }
  } catch (error) {
    console.error('Ошибка в API календарных событий:', error);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}

// Получение событий
async function getEvents(req, res, session) {
  try {
    const { start, end, type } = req.query;

    let whereClause = {
      organizerId: session.user.id,
    };

    // Фильтр по датам
    if (start && end) {
      whereClause.startTime = {
        gte: new Date(start),
        lte: new Date(end),
      };
    }

    // Фильтр по типу события
    if (type && type !== 'all') {
      whereClause.eventType = type;
    }

    const events = await prisma.customCalendarEvent.findMany({
      where: whereClause,
      include: {
        organizer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        videoRoom: {
          select: {
            id: true,
            name: true,
            roomCode: true,
            isActive: true,
          },
        },
      },
      orderBy: {
        startTime: 'asc',
      },
    });

    // Преобразуем события в формат для календаря
    const formattedEvents = events.map((event) => ({
      id: event.id,
      title: event.title,
      description: event.description,
      start: event.startTime,
      end: event.endTime,
      allDay: event.isAllDay,
      type: event.eventType,
      status: event.status,
      meetingLink: event.meetingLink,
      videoRoom: event.videoRoom,
      organizer: event.organizer,
      attendeeIds: event.attendeeIds || [],
      reminderMinutes: event.reminderMinutes,
      isRecurring: event.isRecurring,
      recurrenceRule: event.recurrenceRule,
    }));

    return res.status(200).json({
      success: true,
      events: formattedEvents,
    });
  } catch (error) {
    console.error('Ошибка при получении событий:', error);
    return res.status(500).json({ error: 'Ошибка при получении событий' });
  }
}

// Создание события
async function createEvent(req, res, session) {
  try {
    const {
      title,
      description,
      startTime,
      endTime,
      isAllDay = false,
      eventType = 'meeting',
      attendeeIds = [],
      reminderMinutes = 15,
      isRecurring = false,
      recurrenceRule,
      createVideoRoom = false,
    } = req.body;

    // Валидация обязательных полей
    if (!title || !startTime || !endTime) {
      return res.status(400).json({
        error: 'Обязательные поля: title, startTime, endTime',
      });
    }

    // Проверяем корректность дат
    const start = moment(startTime);
    const end = moment(endTime);

    if (!start.isValid() || !end.isValid()) {
      return res.status(400).json({ error: 'Некорректный формат даты' });
    }

    if (end.isBefore(start)) {
      return res.status(400).json({
        error: 'Время окончания не может быть раньше времени начала',
      });
    }

    let videoRoomId = null;
    let meetingLink = null;

    // Создаем видеокомнату если требуется
    if (createVideoRoom && eventType === 'video_conference') {
      const roomCode = uuidv4().substring(0, 8).toUpperCase();

      const videoRoom = await prisma.videoRoom.create({
        data: {
          id: uuidv4(),
          name: `Комната для: ${title}`,
          description: description || '',
          hostId: session.user.id,
          roomCode,
          scheduledStartTime: new Date(startTime),
          scheduledEndTime: new Date(endTime),
          maxParticipants: 10,
          isPrivate: true,
        },
      });

      videoRoomId = videoRoom.id;
      meetingLink = `${process.env.NEXTAUTH_URL}/video-room/${roomCode}`;
    }

    // Создаем событие
    const event = await prisma.customCalendarEvent.create({
      data: {
        id: uuidv4(),
        title,
        description: description || '',
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        isAllDay,
        eventType,
        videoRoomId,
        organizerId: session.user.id,
        attendeeIds: JSON.stringify(attendeeIds),
        meetingLink,
        reminderMinutes,
        isRecurring,
        recurrenceRule: recurrenceRule || null,
        status: 'scheduled',
      },
      include: {
        organizer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        videoRoom: {
          select: {
            id: true,
            name: true,
            roomCode: true,
            isActive: true,
          },
        },
      },
    });

    return res.status(201).json({
      success: true,
      event: {
        id: event.id,
        title: event.title,
        description: event.description,
        start: event.startTime,
        end: event.endTime,
        allDay: event.isAllDay,
        type: event.eventType,
        status: event.status,
        meetingLink: event.meetingLink,
        videoRoom: event.videoRoom,
        organizer: event.organizer,
        attendeeIds: JSON.parse(event.attendeeIds || '[]'),
        reminderMinutes: event.reminderMinutes,
        isRecurring: event.isRecurring,
        recurrenceRule: event.recurrenceRule,
      },
    });
  } catch (error) {
    console.error('Ошибка при создании события:', error);
    return res.status(500).json({ error: 'Ошибка при создании события' });
  }
}

// Обновление события
async function updateEvent(req, res, session) {
  try {
    const { id } = req.query;
    const updateData = req.body;

    if (!id) {
      return res.status(400).json({ error: 'ID события обязателен' });
    }

    // Проверяем существование события и права доступа
    const existingEvent = await prisma.customCalendarEvent.findUnique({
      where: { id },
    });

    if (!existingEvent) {
      return res.status(404).json({ error: 'Событие не найдено' });
    }

    if (existingEvent.organizerId !== session.user.id) {
      return res
        .status(403)
        .json({ error: 'Нет прав для редактирования этого события' });
    }

    // Подготавливаем данные для обновления
    const dataToUpdate = {};

    if (updateData.title) dataToUpdate.title = updateData.title;
    if (updateData.description !== undefined)
      dataToUpdate.description = updateData.description;
    if (updateData.startTime)
      dataToUpdate.startTime = new Date(updateData.startTime);
    if (updateData.endTime) dataToUpdate.endTime = new Date(updateData.endTime);
    if (updateData.isAllDay !== undefined)
      dataToUpdate.isAllDay = updateData.isAllDay;
    if (updateData.eventType) dataToUpdate.eventType = updateData.eventType;
    if (updateData.attendeeIds)
      dataToUpdate.attendeeIds = JSON.stringify(updateData.attendeeIds);
    if (updateData.reminderMinutes !== undefined)
      dataToUpdate.reminderMinutes = updateData.reminderMinutes;
    if (updateData.status) dataToUpdate.status = updateData.status;

    dataToUpdate.updatedAt = new Date();

    const updatedEvent = await prisma.customCalendarEvent.update({
      where: { id },
      data: dataToUpdate,
      include: {
        organizer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        videoRoom: {
          select: {
            id: true,
            name: true,
            roomCode: true,
            isActive: true,
          },
        },
      },
    });

    return res.status(200).json({
      success: true,
      event: {
        id: updatedEvent.id,
        title: updatedEvent.title,
        description: updatedEvent.description,
        start: updatedEvent.startTime,
        end: updatedEvent.endTime,
        allDay: updatedEvent.isAllDay,
        type: updatedEvent.eventType,
        status: updatedEvent.status,
        meetingLink: updatedEvent.meetingLink,
        videoRoom: updatedEvent.videoRoom,
        organizer: updatedEvent.organizer,
        attendeeIds: JSON.parse(updatedEvent.attendeeIds || '[]'),
        reminderMinutes: updatedEvent.reminderMinutes,
        isRecurring: updatedEvent.isRecurring,
        recurrenceRule: updatedEvent.recurrenceRule,
      },
    });
  } catch (error) {
    console.error('Ошибка при обновлении события:', error);
    return res.status(500).json({ error: 'Ошибка при обновлении события' });
  }
}

// Удаление события
async function deleteEvent(req, res, session) {
  try {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({ error: 'ID события обязателен' });
    }

    // Проверяем существование события и права доступа
    const existingEvent = await prisma.customCalendarEvent.findUnique({
      where: { id },
      include: {
        videoRoom: true,
      },
    });

    if (!existingEvent) {
      return res.status(404).json({ error: 'Событие не найдено' });
    }

    if (existingEvent.organizerId !== session.user.id) {
      return res
        .status(403)
        .json({ error: 'Нет прав для удаления этого события' });
    }

    // Если есть связанная видеокомната, деактивируем её
    if (existingEvent.videoRoom) {
      await prisma.videoRoom.update({
        where: { id: existingEvent.videoRoom.id },
        data: { isActive: false },
      });
    }

    // Удаляем событие
    await prisma.customCalendarEvent.delete({
      where: { id },
    });

    return res.status(200).json({
      success: true,
      message: 'Событие успешно удалено',
    });
  } catch (error) {
    console.error('Ошибка при удалении события:', error);
    return res.status(500).json({ error: 'Ошибка при удалении события' });
  }
}
