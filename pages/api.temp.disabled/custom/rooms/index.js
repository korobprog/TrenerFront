import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

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
        return await getRooms(req, res, session);
      case 'POST':
        return await createRoom(req, res, session);
      default:
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).json({
          success: false,
          error: `Метод ${method} не поддерживается`,
        });
    }
  } catch (error) {
    console.error('Ошибка в API видеокомнат:', error);
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

// Получение списка комнат пользователя
async function getRooms(req, res, session) {
  try {
    const { status } = req.query;

    let whereClause = {
      OR: [
        { hostId: session.user.id }, // Комнаты, где пользователь - хост
        {
          participants: {
            some: {
              userId: session.user.id,
              status: 'joined',
            },
          },
        }, // Комнаты, где пользователь - участник
      ],
    };

    // Фильтрация по статусу
    if (status) {
      const now = new Date();

      switch (status) {
        case 'active':
          whereClause.isActive = true;
          whereClause.actualStart = { not: null };
          whereClause.actualEnd = null;
          break;
        case 'scheduled':
          whereClause.isActive = true;
          whereClause.scheduledStart = { gte: now };
          whereClause.actualStart = null;
          break;
        case 'ended':
          whereClause.OR = [{ isActive: false }, { actualEnd: { not: null } }];
          break;
      }
    }

    const rooms = await prisma.videoRoom.findMany({
      where: whereClause,
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
          where: {
            status: 'joined',
          },
        },
        calendarEvents: {
          select: {
            id: true,
            title: true,
            startTime: true,
            endTime: true,
          },
        },
        _count: {
          select: {
            participants: {
              where: {
                status: 'joined',
              },
            },
          },
        },
      },
      orderBy: [
        { isActive: 'desc' },
        { scheduledStart: 'asc' },
        { createdAt: 'desc' },
      ],
    });

    const formattedRooms = rooms.map((room) => ({
      id: room.id,
      code: room.code,
      name: room.name,
      description: room.description,
      isActive: room.isActive,
      maxParticipants: room.maxParticipants,
      requiresPassword: room.requiresPassword,
      scheduledStart: room.scheduledStart,
      scheduledEnd: room.scheduledEnd,
      actualStart: room.actualStart,
      actualEnd: room.actualEnd,
      host: room.host,
      participantCount: room._count.participants,
      participants: room.participants.map((p) => ({
        id: p.id,
        user: p.user,
        guestName: p.guestName,
        role: p.role,
        joinedAt: p.joinedAt,
        audioEnabled: p.audioEnabled,
        videoEnabled: p.videoEnabled,
      })),
      calendarEvents: room.calendarEvents,
      isHost: room.hostId === session.user.id,
      createdAt: room.createdAt,
      updatedAt: room.updatedAt,
    }));

    return res.status(200).json({
      success: true,
      data: formattedRooms,
      message: 'Список комнат успешно получен',
    });
  } catch (error) {
    console.error('Ошибка при получении списка комнат:', error);
    return res.status(500).json({
      success: false,
      error: 'Ошибка при получении списка комнат',
      details:
        process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

// Создание новой видеокомнаты
async function createRoom(req, res, session) {
  try {
    const {
      name,
      description,
      maxParticipants = 10,
      requiresPassword = false,
      password,
      scheduledStart,
      scheduledEnd,
    } = req.body;

    // Валидация обязательных полей
    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Название комнаты обязательно',
      });
    }

    // Валидация лимитов
    if (maxParticipants < 2 || maxParticipants > 50) {
      return res.status(400).json({
        success: false,
        error: 'Количество участников должно быть от 2 до 50',
      });
    }

    // Валидация пароля
    if (requiresPassword && (!password || password.length < 4)) {
      return res.status(400).json({
        success: false,
        error: 'Пароль должен содержать минимум 4 символа',
      });
    }

    // Валидация времени планирования
    let scheduledStartDate = null;
    let scheduledEndDate = null;

    if (scheduledStart) {
      scheduledStartDate = new Date(scheduledStart);
      if (isNaN(scheduledStartDate.getTime())) {
        return res.status(400).json({
          success: false,
          error: 'Некорректный формат времени начала',
        });
      }

      if (scheduledStartDate <= new Date()) {
        return res.status(400).json({
          success: false,
          error: 'Время начала должно быть в будущем',
        });
      }
    }

    if (scheduledEnd) {
      scheduledEndDate = new Date(scheduledEnd);
      if (isNaN(scheduledEndDate.getTime())) {
        return res.status(400).json({
          success: false,
          error: 'Некорректный формат времени окончания',
        });
      }

      if (scheduledStartDate && scheduledEndDate <= scheduledStartDate) {
        return res.status(400).json({
          success: false,
          error: 'Время окончания должно быть позже времени начала',
        });
      }
    }

    // Генерация уникального кода комнаты
    let roomCode;
    let isCodeUnique = false;
    let attempts = 0;

    while (!isCodeUnique && attempts < 10) {
      roomCode = generateRoomCode();
      const existingRoom = await prisma.videoRoom.findUnique({
        where: { code: roomCode },
      });

      if (!existingRoom) {
        isCodeUnique = true;
      }
      attempts++;
    }

    if (!isCodeUnique) {
      return res.status(500).json({
        success: false,
        error: 'Не удалось сгенерировать уникальный код комнаты',
      });
    }

    // Создание комнаты
    const room = await prisma.videoRoom.create({
      data: {
        code: roomCode,
        name,
        description: description || '',
        hostId: session.user.id,
        maxParticipants,
        requiresPassword,
        password: requiresPassword ? password : null,
        scheduledStart: scheduledStartDate,
        scheduledEnd: scheduledEndDate,
        isActive: true,
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

    // Автоматически добавляем хоста как участника
    await prisma.videoRoomParticipant.create({
      data: {
        roomId: room.id,
        userId: session.user.id,
        role: 'host',
        status: 'joined',
      },
    });

    return res.status(201).json({
      success: true,
      data: {
        id: room.id,
        code: room.code,
        name: room.name,
        description: room.description,
        isActive: room.isActive,
        maxParticipants: room.maxParticipants,
        requiresPassword: room.requiresPassword,
        scheduledStart: room.scheduledStart,
        scheduledEnd: room.scheduledEnd,
        host: room.host,
        isHost: true,
        joinUrl: `${
          process.env.NEXTAUTH_URL || 'http://localhost:3000'
        }/video-room/${room.code}`,
        createdAt: room.createdAt,
      },
      message: 'Видеокомната успешно создана',
    });
  } catch (error) {
    console.error('Ошибка при создании комнаты:', error);
    return res.status(500).json({
      success: false,
      error: 'Ошибка при создании комнаты',
      details:
        process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

// Генерация уникального кода комнаты
function generateRoomCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
