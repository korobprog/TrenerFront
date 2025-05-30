import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth/[...nextauth]';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * API роут для управления участниками комнат видеоконференций
 * GET /api/video-conferences/rooms/[id]/participants - список участников комнаты
 * POST /api/video-conferences/rooms/[id]/participants - добавление участника
 * DELETE /api/video-conferences/rooms/[id]/participants - удаление участника
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

    const { id: roomId } = req.query;

    if (!roomId) {
      return res.status(400).json({ error: 'ID комнаты обязателен' });
    }

    // Проверяем существование комнаты
    const room = await prisma.videoRoom.findUnique({
      where: { id: roomId },
      select: {
        id: true,
        hostId: true,
        isPrivate: true,
        isActive: true,
        maxParticipants: true,
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

    switch (req.method) {
      case 'GET':
        return await handleGetParticipants(req, res, roomId, room, user);
      case 'POST':
        return await handleAddParticipant(req, res, roomId, room, user);
      case 'DELETE':
        return await handleRemoveParticipant(req, res, roomId, room, user);
      default:
        return res.status(405).json({ error: 'Метод не поддерживается' });
    }
  } catch (error) {
    console.error('Ошибка в API video-conferences/rooms/participants:', error);
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
 * Получение списка участников комнаты
 */
async function handleGetParticipants(req, res, roomId, room, user) {
  try {
    // Проверяем права доступа к комнате
    const isHost = room.hostId === user.id;
    const isAdmin = user.role === 'admin' || user.role === 'superadmin';

    // Проверяем, является ли пользователь участником
    const userParticipation = await prisma.videoRoomParticipant.findUnique({
      where: {
        videoRoomId_userId: {
          videoRoomId: roomId,
          userId: user.id,
        },
      },
    });

    const isParticipant = !!userParticipation;

    if (!isHost && !isParticipant && !isAdmin && room.isPrivate) {
      return res
        .status(403)
        .json({ error: 'Нет доступа к списку участников этой комнаты' });
    }

    const { status = 'all', limit = '50', offset = '0' } = req.query;

    // Валидация параметров
    const limitNum = parseInt(limit, 10);
    const offsetNum = parseInt(offset, 10);

    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      return res
        .status(400)
        .json({ error: 'Параметр limit должен быть числом от 1 до 100' });
    }

    if (isNaN(offsetNum) || offsetNum < 0) {
      return res
        .status(400)
        .json({ error: 'Параметр offset должен быть неотрицательным числом' });
    }

    // Формируем условия фильтрации
    const where = {
      videoRoomId: roomId,
    };

    if (status === 'active') {
      where.leftAt = null;
    } else if (status === 'left') {
      where.leftAt = { not: null };
    }

    // Получаем общее количество участников
    const totalCount = await prisma.videoRoomParticipant.count({ where });

    // Получаем список участников
    const participants = await prisma.videoRoomParticipant.findMany({
      where,
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
      orderBy: [{ joinedAt: 'desc' }, { createdAt: 'desc' }],
      skip: offsetNum,
      take: limitNum,
    });

    // Подсчитываем статистику
    const stats = {
      total: totalCount,
      active: await prisma.videoRoomParticipant.count({
        where: { videoRoomId: roomId, leftAt: null },
      }),
      left: await prisma.videoRoomParticipant.count({
        where: { videoRoomId: roomId, leftAt: { not: null } },
      }),
    };

    return res.status(200).json({
      success: true,
      data: {
        participants,
        stats,
        pagination: {
          totalCount,
          limit: limitNum,
          offset: offsetNum,
          hasMore: offsetNum + limitNum < totalCount,
        },
        userPermissions: {
          isHost,
          isParticipant,
          isAdmin,
          canManageParticipants: isHost || isAdmin,
        },
      },
    });
  } catch (error) {
    console.error('Ошибка при получении участников:', error);
    throw error;
  }
}

/**
 * Добавление участника в комнату
 */
async function handleAddParticipant(req, res, roomId, room, user) {
  const { userId, role = 'participant' } = req.body;

  // Валидация входных данных
  if (!userId) {
    return res.status(400).json({ error: 'ID пользователя обязателен' });
  }

  if (!['participant', 'moderator'].includes(role)) {
    return res
      .status(400)
      .json({ error: 'Роль должна быть participant или moderator' });
  }

  try {
    // Проверяем права на добавление участников
    const isHost = room.hostId === user.id;
    const isAdmin = user.role === 'admin' || user.role === 'superadmin';

    // Проверяем, является ли текущий пользователь модератором
    const userParticipation = await prisma.videoRoomParticipant.findUnique({
      where: {
        videoRoomId_userId: {
          videoRoomId: roomId,
          userId: user.id,
        },
      },
    });

    const isModerator = userParticipation?.role === 'moderator';

    if (!isHost && !isAdmin && !isModerator) {
      return res
        .status(403)
        .json({
          error:
            'Только хост, модератор или администратор может добавлять участников',
        });
    }

    // Проверяем существование пользователя для добавления
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        isBlocked: true,
      },
    });

    if (!targetUser) {
      return res
        .status(404)
        .json({ error: 'Пользователь для добавления не найден' });
    }

    if (targetUser.isBlocked) {
      return res
        .status(400)
        .json({ error: 'Нельзя добавить заблокированного пользователя' });
    }

    // Проверяем, не является ли пользователь уже участником
    const existingParticipant = await prisma.videoRoomParticipant.findUnique({
      where: {
        videoRoomId_userId: {
          videoRoomId: roomId,
          userId: userId,
        },
      },
    });

    if (existingParticipant) {
      if (!existingParticipant.leftAt) {
        return res
          .status(400)
          .json({ error: 'Пользователь уже является участником комнаты' });
      }

      // Если пользователь ранее покинул комнату, обновляем его статус
      const updatedParticipant = await prisma.videoRoomParticipant.update({
        where: {
          videoRoomId_userId: {
            videoRoomId: roomId,
            userId: userId,
          },
        },
        data: {
          role,
          leftAt: null,
          joinedAt: new Date(),
          isVideoEnabled: true,
          isAudioEnabled: true,
          isScreenSharing: false,
        },
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
      });

      return res.status(200).json({
        success: true,
        data: updatedParticipant,
        message: 'Участник успешно возвращен в комнату',
      });
    }

    // Проверяем лимит участников
    const currentParticipantsCount = await prisma.videoRoomParticipant.count({
      where: {
        videoRoomId: roomId,
        leftAt: null,
      },
    });

    if (currentParticipantsCount >= room.maxParticipants) {
      return res.status(400).json({
        error: 'Достигнут максимальный лимит участников комнаты',
        maxParticipants: room.maxParticipants,
        currentCount: currentParticipantsCount,
      });
    }

    // Создаем нового участника
    const newParticipant = await prisma.videoRoomParticipant.create({
      data: {
        videoRoomId: roomId,
        userId: userId,
        role,
        joinedAt: new Date(),
        isVideoEnabled: true,
        isAudioEnabled: true,
        isScreenSharing: false,
      },
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
    });

    return res.status(201).json({
      success: true,
      data: newParticipant,
      message: 'Участник успешно добавлен в комнату',
    });
  } catch (error) {
    console.error('Ошибка при добавлении участника:', error);
    throw error;
  }
}

/**
 * Удаление участника из комнаты
 */
async function handleRemoveParticipant(req, res, roomId, room, user) {
  const { userId } = req.body;

  // Валидация входных данных
  if (!userId) {
    return res.status(400).json({ error: 'ID пользователя обязателен' });
  }

  try {
    // Проверяем права на удаление участников
    const isHost = room.hostId === user.id;
    const isAdmin = user.role === 'admin' || user.role === 'superadmin';
    const isSelfRemoval = userId === user.id;

    // Проверяем, является ли текущий пользователь модератором
    const userParticipation = await prisma.videoRoomParticipant.findUnique({
      where: {
        videoRoomId_userId: {
          videoRoomId: roomId,
          userId: user.id,
        },
      },
    });

    const isModerator = userParticipation?.role === 'moderator';

    if (!isHost && !isAdmin && !isModerator && !isSelfRemoval) {
      return res
        .status(403)
        .json({ error: 'Недостаточно прав для удаления участника' });
    }

    // Проверяем существование участника
    const participant = await prisma.videoRoomParticipant.findUnique({
      where: {
        videoRoomId_userId: {
          videoRoomId: roomId,
          userId: userId,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!participant) {
      return res
        .status(404)
        .json({ error: 'Участник не найден в этой комнате' });
    }

    if (participant.leftAt) {
      return res.status(400).json({ error: 'Участник уже покинул комнату' });
    }

    // Нельзя удалить хоста комнаты (кроме самоудаления)
    if (participant.userId === room.hostId && !isSelfRemoval) {
      return res.status(400).json({ error: 'Нельзя удалить хоста комнаты' });
    }

    // Модератор не может удалить другого модератора или хоста
    if (isModerator && !isHost && !isAdmin && !isSelfRemoval) {
      if (
        participant.role === 'moderator' ||
        participant.userId === room.hostId
      ) {
        return res
          .status(403)
          .json({
            error: 'Модератор не может удалить другого модератора или хоста',
          });
      }
    }

    // Обновляем участника - помечаем как покинувшего
    const updatedParticipant = await prisma.videoRoomParticipant.update({
      where: {
        videoRoomId_userId: {
          videoRoomId: roomId,
          userId: userId,
        },
      },
      data: {
        leftAt: new Date(),
        isVideoEnabled: false,
        isAudioEnabled: false,
        isScreenSharing: false,
        totalDuration: participant.joinedAt
          ? Math.floor((new Date() - participant.joinedAt) / 1000)
          : null,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return res.status(200).json({
      success: true,
      data: updatedParticipant,
      message: isSelfRemoval
        ? 'Вы покинули комнату'
        : 'Участник удален из комнаты',
    });
  } catch (error) {
    console.error('Ошибка при удалении участника:', error);
    throw error;
  }
}
