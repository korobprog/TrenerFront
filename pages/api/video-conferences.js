import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * API роут для управления видеоконференциями
 * GET /api/video-conferences - получение списка комнат с фильтрацией
 * POST /api/video-conferences - создание новой комнаты
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

    switch (req.method) {
      case 'GET':
        return await handleGetVideoRooms(req, res, user);
      case 'POST':
        return await handleCreateVideoRoom(req, res, user);
      default:
        return res.status(405).json({ error: 'Метод не поддерживается' });
    }
  } catch (error) {
    console.error('Ошибка в API video-conferences:', error);
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
 * Получение списка видеоконференций с фильтрацией
 */
async function handleGetVideoRooms(req, res, user) {
  try {
    const { status, limit = 50, offset = 0 } = req.query;

    console.log('API video-conferences: Получение списка комнат', {
      userId: user.id,
      status,
      limit,
      offset,
    });

    // Базовые условия фильтрации
    const whereConditions = {};

    // Фильтрация по статусу
    if (status === 'active') {
      whereConditions.isActive = true;
    } else if (status === 'inactive') {
      whereConditions.isActive = false;
    }

    // Получаем комнаты
    const videoRooms = await prisma.videoRoom.findMany({
      where: whereConditions,
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
      orderBy: [
        { isActive: 'desc' },
        { scheduledStartTime: 'asc' },
        { createdAt: 'desc' },
      ],
      take: parseInt(limit),
      skip: parseInt(offset),
    });

    // Фильтруем приватные комнаты (показываем только те, где пользователь участник или хост)
    const filteredRooms = videoRooms.filter((room) => {
      if (!room.isPrivate) return true;

      const isHost = room.hostId === user.id;
      const isParticipant = room.participants.some((p) => p.userId === user.id);
      const isAdmin = user.role === 'admin' || user.role === 'superadmin';

      return isHost || isParticipant || isAdmin;
    });

    // Добавляем дополнительную информацию для каждой комнаты
    const enrichedRooms = filteredRooms.map((room) => {
      const isHost = room.hostId === user.id;
      const isParticipant = room.participants.some((p) => p.userId === user.id);

      return {
        ...room,
        isHost,
        isParticipant,
        participantCount: room._count.participants,
        canJoin:
          room.isActive && room.participants.length < room.maxParticipants,
      };
    });

    console.log('API video-conferences: Найдено комнат:', enrichedRooms.length);

    return res.status(200).json(enrichedRooms);
  } catch (error) {
    console.error('Ошибка при получении списка комнат:', error);
    throw error;
  }
}

/**
 * Создание новой видеоконференции
 */
async function handleCreateVideoRoom(req, res, user) {
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

  console.log('API video-conferences: Создание новой комнаты', {
    userId: user.id,
    name,
    isPrivate,
    maxParticipants,
  });

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

  // Проверяем, что время начала в будущем
  if (scheduledStartTime) {
    const startTime = new Date(scheduledStartTime);
    const now = new Date();

    if (startTime <= now) {
      return res
        .status(400)
        .json({ error: 'Время начала должно быть в будущем' });
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
        _count: {
          select: {
            participants: true,
          },
        },
      },
    });

    console.log('API video-conferences: Комната создана успешно', {
      roomId: room.id,
      roomCode: room.roomCode,
    });

    return res.status(201).json({
      success: true,
      ...room,
      isHost: true,
      isParticipant: false,
      participantCount: 0,
      canJoin: true,
      message: 'Видеоконференция успешно создана',
    });
  } catch (error) {
    console.error('Ошибка при создании комнаты:', error);
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
