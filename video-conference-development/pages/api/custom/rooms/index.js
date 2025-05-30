import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth/[...nextauth]';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  try {
    const session = await getServerSession(req, res, authOptions);

    if (!session) {
      return res.status(401).json({ error: 'Необходима авторизация' });
    }

    const { method } = req;

    switch (method) {
      case 'GET':
        return await handleGet(req, res, session);
      case 'POST':
        return await handlePost(req, res, session);
      default:
        res.setHeader('Allow', ['GET', 'POST']);
        return res
          .status(405)
          .json({ error: `Метод ${method} не поддерживается` });
    }
  } catch (error) {
    console.error('Ошибка API видеокомнат:', error);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}

async function handleGet(req, res, session) {
  const { userId, status, page = 1, limit = 10 } = req.query;

  try {
    const where = {};

    // Фильтр по пользователю (комнаты где пользователь хост или участник)
    if (userId) {
      where.OR = [
        { hostId: userId },
        { participants: { some: { userId: userId } } },
      ];
    }

    // Фильтр по статусу
    if (status) {
      if (status === 'active') {
        where.isActive = true;
      } else if (status === 'inactive') {
        where.isActive = false;
      }
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [rooms, total] = await Promise.all([
      prisma.videoRoom.findMany({
        where,
        include: {
          host: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
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
          _count: {
            select: {
              participants: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: parseInt(limit),
      }),
      prisma.videoRoom.count({ where }),
    ]);

    return res.status(200).json({
      rooms,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Ошибка получения видеокомнат:', error);
    return res.status(500).json({ error: 'Ошибка получения видеокомнат' });
  }
}

async function handlePost(req, res, session) {
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

  // Валидация
  if (!name || name.trim().length === 0) {
    return res.status(400).json({ error: 'Название комнаты обязательно' });
  }

  if (maxParticipants < 2 || maxParticipants > 50) {
    return res
      .status(400)
      .json({ error: 'Количество участников должно быть от 2 до 50' });
  }

  try {
    // Генерируем уникальный код комнаты
    const roomCode = await generateUniqueRoomCode();

    const videoRoom = await prisma.videoRoom.create({
      data: {
        name: name.trim(),
        description: description?.trim(),
        hostId: session.user.id,
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
            image: true,
          },
        },
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

    // Автоматически добавляем хоста как участника
    await prisma.videoRoomParticipant.create({
      data: {
        videoRoomId: videoRoom.id,
        userId: session.user.id,
        role: 'host',
      },
    });

    return res.status(201).json({ room: videoRoom });
  } catch (error) {
    console.error('Ошибка создания видеокомнаты:', error);
    return res.status(500).json({ error: 'Ошибка создания видеокомнаты' });
  }
}

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
