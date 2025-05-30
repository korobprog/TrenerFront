import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  try {
    const session = await getServerSession(req, res, authOptions);

    if (!session) {
      return res.status(401).json({ error: 'Не авторизован' });
    }

    const { method } = req;
    const userId = session.user.id;

    switch (method) {
      case 'GET':
        return await handleGet(req, res, userId);
      case 'POST':
        return await handlePost(req, res, userId);
      case 'PUT':
        return await handlePut(req, res, userId);
      case 'DELETE':
        return await handleDelete(req, res, userId);
      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
        return res
          .status(405)
          .json({ error: `Метод ${method} не поддерживается` });
    }
  } catch (error) {
    console.error('Ошибка API календарных событий:', error);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}

// Получение календарных событий
async function handleGet(req, res, userId) {
  try {
    const { date, view, eventId } = req.query;

    // Если запрашивается конкретное событие
    if (eventId) {
      const event = await prisma.customCalendarEvent.findUnique({
        where: { id: eventId },
        include: {
          organizer: {
            select: { id: true, name: true, email: true },
          },
          videoRoom: {
            select: { id: true, name: true, roomCode: true, isActive: true },
          },
        },
      });

      if (!event) {
        return res.status(404).json({ error: 'Событие не найдено' });
      }

      // Проверяем права доступа
      const hasAccess =
        event.organizerId === userId ||
        (event.attendeeIds && event.attendeeIds.includes(userId));

      if (!hasAccess) {
        return res.status(403).json({ error: 'Нет доступа к этому событию' });
      }

      return res.status(200).json({ event });
    }

    // Получение списка событий с фильтрацией
    let startDate, endDate;
    const currentDate = date ? new Date(date) : new Date();

    switch (view) {
      case 'day':
        startDate = new Date(currentDate);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(currentDate);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'week':
        const startOfWeek = new Date(currentDate);
        startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);
        startDate = startOfWeek;
        endDate = endOfWeek;
        break;
      case 'month':
      default:
        startDate = new Date(
          currentDate.getFullYear(),
          currentDate.getMonth(),
          1
        );
        endDate = new Date(
          currentDate.getFullYear(),
          currentDate.getMonth() + 1,
          0,
          23,
          59,
          59,
          999
        );
        break;
    }

    const events = await prisma.customCalendarEvent.findMany({
      where: {
        AND: [
          {
            OR: [
              { organizerId: userId },
              { attendeeIds: { array_contains: userId } },
            ],
          },
          {
            OR: [
              {
                startTime: {
                  gte: startDate,
                  lte: endDate,
                },
              },
              {
                endTime: {
                  gte: startDate,
                  lte: endDate,
                },
              },
              {
                AND: [
                  { startTime: { lte: startDate } },
                  { endTime: { gte: endDate } },
                ],
              },
            ],
          },
        ],
      },
      include: {
        organizer: {
          select: { id: true, name: true, email: true },
        },
        videoRoom: {
          select: { id: true, name: true, roomCode: true, isActive: true },
        },
      },
      orderBy: { startTime: 'asc' },
    });

    return res.status(200).json({ events });
  } catch (error) {
    console.error('Ошибка получения событий:', error);
    return res.status(500).json({ error: 'Ошибка получения событий' });
  }
}

// Создание нового события
async function handlePost(req, res, userId) {
  try {
    const {
      title,
      description,
      startTime,
      endTime,
      isAllDay,
      eventType,
      videoRoomId,
      attendeeIds,
      meetingLink,
      reminderMinutes,
      isRecurring,
      recurrenceRule,
    } = req.body;

    // Валидация обязательных полей
    if (!title || !startTime || !endTime) {
      return res.status(400).json({
        error: 'Обязательные поля: title, startTime, endTime',
      });
    }

    // Валидация времени
    const start = new Date(startTime);
    const end = new Date(endTime);

    if (start >= end) {
      return res.status(400).json({
        error: 'Время начала должно быть раньше времени окончания',
      });
    }

    // Проверка доступности видеокомнаты (если указана)
    if (videoRoomId) {
      const videoRoom = await prisma.videoRoom.findUnique({
        where: { id: videoRoomId },
      });

      if (!videoRoom) {
        return res.status(404).json({ error: 'Видеокомната не найдена' });
      }

      if (videoRoom.hostId !== userId) {
        return res.status(403).json({
          error: 'Только хост может создавать события для этой комнаты',
        });
      }
    }

    // Проверка конфликтов времени для видеокомнаты
    if (videoRoomId) {
      const conflictingEvents = await prisma.customCalendarEvent.findMany({
        where: {
          videoRoomId,
          status: { not: 'cancelled' },
          OR: [
            {
              AND: [{ startTime: { lte: start } }, { endTime: { gt: start } }],
            },
            {
              AND: [{ startTime: { lt: end } }, { endTime: { gte: end } }],
            },
            {
              AND: [{ startTime: { gte: start } }, { endTime: { lte: end } }],
            },
          ],
        },
      });

      if (conflictingEvents.length > 0) {
        return res.status(409).json({
          error: 'Видеокомната уже занята в это время',
        });
      }
    }

    // Создание события
    const event = await prisma.customCalendarEvent.create({
      data: {
        title,
        description,
        startTime: start,
        endTime: end,
        isAllDay: isAllDay || false,
        eventType: eventType || 'meeting',
        videoRoomId,
        organizerId: userId,
        attendeeIds: attendeeIds || [],
        meetingLink,
        reminderMinutes: reminderMinutes || 15,
        isRecurring: isRecurring || false,
        recurrenceRule,
        status: 'scheduled',
      },
      include: {
        organizer: {
          select: { id: true, name: true, email: true },
        },
        videoRoom: {
          select: { id: true, name: true, roomCode: true, isActive: true },
        },
      },
    });

    // Планируем уведомления
    if (reminderMinutes && reminderMinutes > 0) {
      await scheduleNotification(event.id, start, reminderMinutes);
    }

    return res.status(201).json({ event });
  } catch (error) {
    console.error('Ошибка создания события:', error);
    return res.status(500).json({ error: 'Ошибка создания события' });
  }
}

// Обновление события
async function handlePut(req, res, userId) {
  try {
    const { eventId } = req.query;
    const updateData = req.body;

    if (!eventId) {
      return res.status(400).json({ error: 'ID события обязателен' });
    }

    // Проверяем существование события и права доступа
    const existingEvent = await prisma.customCalendarEvent.findUnique({
      where: { id: eventId },
    });

    if (!existingEvent) {
      return res.status(404).json({ error: 'Событие не найдено' });
    }

    if (existingEvent.organizerId !== userId) {
      return res.status(403).json({
        error: 'Только организатор может редактировать событие',
      });
    }

    // Валидация времени (если обновляется)
    if (updateData.startTime && updateData.endTime) {
      const start = new Date(updateData.startTime);
      const end = new Date(updateData.endTime);

      if (start >= end) {
        return res.status(400).json({
          error: 'Время начала должно быть раньше времени окончания',
        });
      }
    }

    // Проверка конфликтов времени для видеокомнаты (если время изменяется)
    if (updateData.startTime || updateData.endTime || updateData.videoRoomId) {
      const videoRoomId = updateData.videoRoomId || existingEvent.videoRoomId;
      const startTime = updateData.startTime
        ? new Date(updateData.startTime)
        : existingEvent.startTime;
      const endTime = updateData.endTime
        ? new Date(updateData.endTime)
        : existingEvent.endTime;

      if (videoRoomId) {
        const conflictingEvents = await prisma.customCalendarEvent.findMany({
          where: {
            id: { not: eventId },
            videoRoomId,
            status: { not: 'cancelled' },
            OR: [
              {
                AND: [
                  { startTime: { lte: startTime } },
                  { endTime: { gt: startTime } },
                ],
              },
              {
                AND: [
                  { startTime: { lt: endTime } },
                  { endTime: { gte: endTime } },
                ],
              },
              {
                AND: [
                  { startTime: { gte: startTime } },
                  { endTime: { lte: endTime } },
                ],
              },
            ],
          },
        });

        if (conflictingEvents.length > 0) {
          return res.status(409).json({
            error: 'Видеокомната уже занята в это время',
          });
        }
      }
    }

    // Обновление события
    const updatedEvent = await prisma.customCalendarEvent.update({
      where: { id: eventId },
      data: {
        ...updateData,
        updatedAt: new Date(),
      },
      include: {
        organizer: {
          select: { id: true, name: true, email: true },
        },
        videoRoom: {
          select: { id: true, name: true, roomCode: true, isActive: true },
        },
      },
    });

    return res.status(200).json({ event: updatedEvent });
  } catch (error) {
    console.error('Ошибка обновления события:', error);
    return res.status(500).json({ error: 'Ошибка обновления события' });
  }
}

// Удаление события
async function handleDelete(req, res, userId) {
  try {
    const { eventId } = req.query;

    if (!eventId) {
      return res.status(400).json({ error: 'ID события обязателен' });
    }

    // Проверяем существование события и права доступа
    const existingEvent = await prisma.customCalendarEvent.findUnique({
      where: { id: eventId },
    });

    if (!existingEvent) {
      return res.status(404).json({ error: 'Событие не найдено' });
    }

    if (existingEvent.organizerId !== userId) {
      return res.status(403).json({
        error: 'Только организатор может удалить событие',
      });
    }

    // Удаление события
    await prisma.customCalendarEvent.delete({
      where: { id: eventId },
    });

    return res.status(200).json({ message: 'Событие успешно удалено' });
  } catch (error) {
    console.error('Ошибка удаления события:', error);
    return res.status(500).json({ error: 'Ошибка удаления события' });
  }
}

// Функция для планирования уведомлений
async function scheduleNotification(eventId, startTime, reminderMinutes) {
  try {
    // Здесь можно интегрировать с системой очередей (например, Bull Queue)
    // или использовать cron jobs для отправки уведомлений
    console.log(
      `Запланировано уведомление для события ${eventId} за ${reminderMinutes} минут до ${startTime}`
    );

    // Пример интеграции с API уведомлений
    const notificationTime = new Date(
      startTime.getTime() - reminderMinutes * 60 * 1000
    );

    // Можно сохранить задачу в базе данных или отправить в очередь
    // await scheduleJob(notificationTime, 'send-event-reminder', { eventId });
  } catch (error) {
    console.error('Ошибка планирования уведомления:', error);
  }
}
