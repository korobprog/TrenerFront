import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * API роут для управления комнатами видеоконференций
 * GET /api/video-conferences/rooms/[id] - получение информации о комнате
 * POST /api/video-conferences/rooms/[id] - создание новой комнаты (id игнорируется)
 * PUT /api/video-conferences/rooms/[id] - обновление настроек комнаты
 * DELETE /api/video-conferences/rooms/[id] - удаление комнаты
 */
export default async function handler(req, res) {
  try {
    // Получаем сессию пользователя
    const session = await getServerSession(req, res, authOptions);

    if (!session || !session.user) {
      return res.status(401).json({ error: 'Не авторизован' });
    }

    // Получаем пользователя из базы данных
    const user = await prisma.user.findUnique({
      where: {
        email: session.user.email,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    const { id } = req.query;

    switch (req.method) {
      case 'GET':
        return await handleGetRoom(req, res, id, user);
      case 'POST':
        return await handleCreateRoom(req, res, user);
      case 'PUT':
        return await handleUpdateRoom(req, res, id, user);
      case 'DELETE':
        return await handleDeleteRoom(req, res, id, user);
      default:
        return res.status(405).json({ error: 'Метод не поддерживается' });
    }
  } catch (error) {
    console.error('Ошибка в API video-conferences/rooms:', error);
    return res.status(500).json({
      error: 'Внутренняя ошибка сервера',
      message: 'Не удалось обработать запрос',
      details:
        process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Получение информации о комнате
 */
async function handleGetRoom(req, res, roomId, user) {
  if (!roomId) {
    return res.status(400).json({ error: 'ID комнаты обязателен' });
  }

  try {
    const room = await prisma.videoRoom.findUnique({
      where: { id: roomId },
      include: {
        host: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        _count: {
          select: {
            participants: true,
          },
        },
      },
    });

    if (!room) {
      return res.status(404).json({ error: 'Комната не найдена' });
    }

    // Проверяем права доступа к комнате
    const isHost = room.hostId === user.id;
    const isParticipant = room.participants.some((p) => p.userId === user.id);
    const isAdmin = user.role === 'admin' || user.role === 'superadmin';

    if (!isHost && !isParticipant && !isAdmin && room.isPrivate) {
      return res.status(403).json({ error: 'Нет доступа к этой комнате' });
    }

    return res.status(200).json({
      success: true,
      data: {
        ...room,
        isHost,
        isParticipant,
        participantCount: room._count.participants,
      },
    });
  } catch (error) {
    console.error('Ошибка при получении комнаты:', error);
    throw error;
  }
}

/**
 * Создание новой комнаты
 */
async function handleCreateRoom(req, res, user) {
  const {
    name,
    description,
    isPrivate = false,
    maxParticipants = 10,
    scheduledStartTime,
    scheduledEndTime,
    recordingEnabled = false,
    settings = {},
  } = req.body;

  // Валидация входных данных
  if (!name || name.trim().length === 0) {
    return res.status(400).json({ error: 'Название комнаты обязательно' });
  }

  if (name.length > 100) {
    return res
      .status(400)
      .json({ error: 'Название комнаты не должно превышать 100 символов' });
  }

  if (description && description.length > 500) {
    return res
      .status(400)
      .json({ error: 'Описание не должно превышать 500 символов' });
  }

  if (maxParticipants < 2 || maxParticipants > 100) {
    return res
      .status(400)
      .json({ error: 'Количество участников должно быть от 2 до 100' });
  }

  if (scheduledStartTime && scheduledEndTime) {
    const startTime = new Date(scheduledStartTime);
    const endTime = new Date(scheduledEndTime);

    if (startTime >= endTime) {
      return res
        .status(400)
        .json({ error: 'Время окончания должно быть позже времени начала' });
    }
  }

  try {
    // Генерируем уникальный код комнаты
    const roomCode = await generateUniqueRoomCode();

    const room = await prisma.videoRoom.create({
      data: {
        name: name.trim(),
        description: description?.trim(),
        hostId: user.id,
        roomCode,
        isPrivate,
        maxParticipants,
        scheduledStartTime: scheduledStartTime
          ? new Date(scheduledStartTime)
          : null,
        scheduledEndTime: scheduledEndTime ? new Date(scheduledEndTime) : null,
        recordingEnabled,
        settings,
      },
      include: {
        host: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return res.status(201).json({
      success: true,
      data: room,
      message: 'Комната успешно создана',
    });
  } catch (error) {
    console.error('Ошибка при создании комнаты:', error);
    throw error;
  }
}

/**
 * Обновление настроек комнаты
 */
async function handleUpdateRoom(req, res, roomId, user) {
  if (!roomId) {
    return res.status(400).json({ error: 'ID комнаты обязателен' });
  }

  try {
    // Проверяем существование комнаты и права доступа
    const existingRoom = await prisma.videoRoom.findUnique({
      where: { id: roomId },
    });

    if (!existingRoom) {
      return res.status(404).json({ error: 'Комната не найдена' });
    }

    const isHost = existingRoom.hostId === user.id;
    const isAdmin = user.role === 'admin' || user.role === 'superadmin';

    if (!isHost && !isAdmin) {
      return res
        .status(403)
        .json({
          error:
            'Только хост или администратор может изменять настройки комнаты',
        });
    }

    const {
      name,
      description,
      isPrivate,
      maxParticipants,
      scheduledStartTime,
      scheduledEndTime,
      recordingEnabled,
      settings,
    } = req.body;

    // Валидация данных
    const updateData = {};

    if (name !== undefined) {
      if (!name || name.trim().length === 0) {
        return res
          .status(400)
          .json({ error: 'Название комнаты не может быть пустым' });
      }
      if (name.length > 100) {
        return res
          .status(400)
          .json({ error: 'Название комнаты не должно превышать 100 символов' });
      }
      updateData.name = name.trim();
    }

    if (description !== undefined) {
      if (description && description.length > 500) {
        return res
          .status(400)
          .json({ error: 'Описание не должно превышать 500 символов' });
      }
      updateData.description = description?.trim();
    }

    if (isPrivate !== undefined) {
      updateData.isPrivate = Boolean(isPrivate);
    }

    if (maxParticipants !== undefined) {
      if (maxParticipants < 2 || maxParticipants > 100) {
        return res
          .status(400)
          .json({ error: 'Количество участников должно быть от 2 до 100' });
      }
      updateData.maxParticipants = maxParticipants;
    }

    if (scheduledStartTime !== undefined) {
      updateData.scheduledStartTime = scheduledStartTime
        ? new Date(scheduledStartTime)
        : null;
    }

    if (scheduledEndTime !== undefined) {
      updateData.scheduledEndTime = scheduledEndTime
        ? new Date(scheduledEndTime)
        : null;
    }

    if (recordingEnabled !== undefined) {
      updateData.recordingEnabled = Boolean(recordingEnabled);
    }

    if (settings !== undefined) {
      updateData.settings = settings;
    }

    // Проверяем время начала и окончания
    const finalStartTime =
      updateData.scheduledStartTime ?? existingRoom.scheduledStartTime;
    const finalEndTime =
      updateData.scheduledEndTime ?? existingRoom.scheduledEndTime;

    if (finalStartTime && finalEndTime && finalStartTime >= finalEndTime) {
      return res
        .status(400)
        .json({ error: 'Время окончания должно быть позже времени начала' });
    }

    const updatedRoom = await prisma.videoRoom.update({
      where: { id: roomId },
      data: updateData,
      include: {
        host: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            participants: true,
          },
        },
      },
    });

    return res.status(200).json({
      success: true,
      data: updatedRoom,
      message: 'Настройки комнаты успешно обновлены',
    });
  } catch (error) {
    console.error('Ошибка при обновлении комнаты:', error);
    throw error;
  }
}

/**
 * Удаление комнаты
 */
async function handleDeleteRoom(req, res, roomId, user) {
  if (!roomId) {
    return res.status(400).json({ error: 'ID комнаты обязателен' });
  }

  try {
    // Проверяем существование комнаты и права доступа
    const existingRoom = await prisma.videoRoom.findUnique({
      where: { id: roomId },
      include: {
        participants: true,
      },
    });

    if (!existingRoom) {
      return res.status(404).json({ error: 'Комната не найдена' });
    }

    const isHost = existingRoom.hostId === user.id;
    const isAdmin = user.role === 'admin' || user.role === 'superadmin';

    if (!isHost && !isAdmin) {
      return res
        .status(403)
        .json({ error: 'Только хост или администратор может удалить комнату' });
    }

    // Проверяем, есть ли активные участники
    const activeParticipants = existingRoom.participants.filter(
      (p) => !p.leftAt
    );
    if (activeParticipants.length > 0 && existingRoom.isActive) {
      return res.status(400).json({
        error: 'Нельзя удалить активную комнату с участниками',
        message: 'Сначала завершите конференцию или удалите всех участников',
      });
    }

    await prisma.videoRoom.delete({
      where: { id: roomId },
    });

    return res.status(200).json({
      success: true,
      message: 'Комната успешно удалена',
    });
  } catch (error) {
    console.error('Ошибка при удалении комнаты:', error);
    throw error;
  }
}

/**
 * Генерация уникального кода комнаты
 */
async function generateUniqueRoomCode() {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let roomCode;
  let isUnique = false;

  while (!isUnique) {
    roomCode = '';
    for (let i = 0; i < 8; i++) {
      roomCode += characters.charAt(
        Math.floor(Math.random() * characters.length)
      );
    }

    // Проверяем уникальность
    const existingRoom = await prisma.videoRoom.findUnique({
      where: { roomCode },
    });

    if (!existingRoom) {
      isUnique = true;
    }
  }

  return roomCode;
}
