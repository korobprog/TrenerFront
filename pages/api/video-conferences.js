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
        { scheduledStart: 'asc' },
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
    userId, // Добавляем поддержку userId из запроса
  } = req.body;

  console.log(
    'API video-conferences: Создание новой комнаты - ДЕТАЛЬНЫЕ ДАННЫЕ',
    {
      sessionUserId: user.id,
      requestUserId: userId,
      userName: user.name,
      userEmail: user.email,
      requestBody: JSON.stringify(req.body, null, 2),
      extractedFields: {
        name,
        description,
        isPrivate,
        maxParticipants,
        scheduledStartTime,
        scheduledEndTime,
        recordingEnabled,
        settings,
        userId,
      },
    }
  );

  // Валидация входных данных
  console.log('API video-conferences: Начало валидации входных данных');

  // Определяем hostId - используем переданный userId или текущего пользователя
  const hostId = userId || user.id;
  console.log('API video-conferences: Определен hostId для комнаты', {
    hostId,
    fromRequest: !!userId,
    sessionUserId: user.id,
  });

  // Валидация userId если он передан
  if (userId && userId !== user.id) {
    console.log(
      'API video-conferences: ПРЕДУПРЕЖДЕНИЕ - userId отличается от сессии',
      {
        requestUserId: userId,
        sessionUserId: user.id,
      }
    );

    // Проверяем, существует ли пользователь с переданным userId
    const requestedUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true },
    });

    if (!requestedUser) {
      console.log(
        'API video-conferences: ОШИБКА ВАЛИДАЦИИ - пользователь не найден',
        {
          userId,
        }
      );
      return res.status(400).json({
        error: 'Указанный пользователь не найден',
        details: { userId },
      });
    }

    console.log('API video-conferences: Пользователь найден', {
      requestedUser,
    });
  }

  if (!name || name.trim().length === 0) {
    console.log(
      'API video-conferences: ОШИБКА ВАЛИДАЦИИ - отсутствует название комнаты',
      { name }
    );
    return res.status(400).json({ error: 'Название комнаты обязательно' });
  }

  if (name.length > 100) {
    console.log(
      'API video-conferences: ОШИБКА ВАЛИДАЦИИ - название слишком длинное',
      { nameLength: name.length }
    );
    return res
      .status(400)
      .json({ error: 'Название комнаты не должно превышать 100 символов' });
  }

  if (description && description.length > 500) {
    console.log(
      'API video-conferences: ОШИБКА ВАЛИДАЦИИ - описание слишком длинное',
      { descriptionLength: description.length }
    );
    return res
      .status(400)
      .json({ error: 'Описание не должно превышать 500 символов' });
  }

  if (maxParticipants < 2 || maxParticipants > 100) {
    console.log(
      'API video-conferences: ОШИБКА ВАЛИДАЦИИ - неверное количество участников',
      { maxParticipants }
    );
    return res
      .status(400)
      .json({ error: 'Количество участников должно быть от 2 до 100' });
  }

  console.log('API video-conferences: Базовая валидация пройдена успешно');

  if (scheduledStartTime && scheduledEndTime) {
    const startTime = new Date(scheduledStartTime);
    const endTime = new Date(scheduledEndTime);

    if (startTime >= endTime) {
      return res
        .status(400)
        .json({ error: 'Время окончания должно быть позже времени начала' });
    }
  }

  // Проверяем, что время начала в будущем с улучшенной валидацией
  if (scheduledStartTime) {
    const startTime = new Date(scheduledStartTime);
    const now = new Date();
    const bufferMinutes = 1; // Буферное время в минутах
    const minValidTime = new Date(now.getTime() + bufferMinutes * 60 * 1000);

    // Детальное логирование для диагностики
    console.log('API video-conferences: Валидация времени начала', {
      originalInput: scheduledStartTime,
      parsedStartTime: startTime.toISOString(),
      currentServerTime: now.toISOString(),
      minValidTime: minValidTime.toISOString(),
      startTimeLocal: startTime.toLocaleString('ru-RU', {
        timeZone: 'Europe/Moscow',
      }),
      currentTimeLocal: now.toLocaleString('ru-RU', {
        timeZone: 'Europe/Moscow',
      }),
      differenceMinutes: (
        (startTime.getTime() - now.getTime()) /
        (1000 * 60)
      ).toFixed(2),
      isValid: startTime >= minValidTime,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });

    if (startTime < minValidTime) {
      const errorMessage = `Время начала должно быть минимум через ${bufferMinutes} минуту в будущем`;
      console.log(
        'API video-conferences: КРИТИЧЕСКАЯ ОШИБКА ВАЛИДАЦИИ ВРЕМЕНИ',
        {
          error: errorMessage,
          originalInput: scheduledStartTime,
          startTime: startTime.toISOString(),
          minValidTime: minValidTime.toISOString(),
          currentTime: now.toISOString(),
          differenceMinutes: (
            (startTime.getTime() - now.getTime()) /
            (1000 * 60)
          ).toFixed(2),
          startTimeLocal: startTime.toLocaleString('ru-RU', {
            timeZone: 'Europe/Moscow',
          }),
          currentTimeLocal: now.toLocaleString('ru-RU', {
            timeZone: 'Europe/Moscow',
          }),
          bufferMinutes,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          requestHeaders: {
            'user-agent': req.headers['user-agent'],
            'content-type': req.headers['content-type'],
          },
        }
      );

      return res.status(400).json({
        error: errorMessage,
        details: {
          scheduledTime: startTime.toISOString(),
          currentTime: now.toISOString(),
          minValidTime: minValidTime.toISOString(),
          differenceMinutes: (
            (startTime.getTime() - now.getTime()) /
            (1000 * 60)
          ).toFixed(2),
        },
      });
    }

    console.log('API video-conferences: Валидация времени пройдена успешно');
  }

  try {
    console.log('API video-conferences: Начало создания комнаты в базе данных');

    // Генерируем уникальный код комнаты
    const roomCode = await generateUniqueRoomCode();
    console.log('API video-conferences: Сгенерирован код комнаты:', roomCode);

    const createData = {
      name: name.trim(),
      description: description?.trim(),
      hostId: hostId, // Используем определенный hostId
      code: roomCode,
      isPrivate,
      maxParticipants,
      scheduledStart: scheduledStartTime ? new Date(scheduledStartTime) : null,
      scheduledEnd: scheduledEndTime ? new Date(scheduledEndTime) : null,
      recordingEnabled,
      settings,
    };

    console.log('API video-conferences: Данные для создания комнаты:', {
      createData: JSON.stringify(createData, null, 2),
      scheduledStartParsed: scheduledStartTime
        ? new Date(scheduledStartTime).toISOString()
        : null,
      scheduledEndParsed: scheduledEndTime
        ? new Date(scheduledEndTime).toISOString()
        : null,
    });

    const room = await prisma.videoRoom.create({
      data: createData,
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
      roomCode: room.code,
      scheduledStart: room.scheduledStart,
      createdAt: room.createdAt,
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
    console.error(
      'API video-conferences: КРИТИЧЕСКАЯ ОШИБКА при создании комнаты:',
      {
        error: error.message,
        stack: error.stack,
        code: error.code,
        meta: error.meta,
        name: error.name,
        requestData: {
          name,
          description,
          isPrivate,
          maxParticipants,
          scheduledStartTime,
          scheduledEndTime,
          recordingEnabled,
          settings,
        },
        userId: user.id,
        isPrismaError: error.name?.includes('Prisma'),
        isValidationError: error.code === 'P2002' || error.code === 'P2003',
      }
    );
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
      where: { code: roomCode },
    });

    if (!existingRoom) {
      isUnique = true;
    }
  }

  return roomCode;
}
