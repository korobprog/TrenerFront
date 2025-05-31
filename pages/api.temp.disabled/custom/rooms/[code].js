import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
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
    const { code } = req.query;

    if (!code) {
      return res.status(400).json({
        success: false,
        error: 'Код комнаты обязателен',
      });
    }

    switch (method) {
      case 'GET':
        return await getRoomInfo(req, res, session, code);
      case 'PUT':
        return await updateRoom(req, res, session, code);
      case 'DELETE':
        return await deleteRoom(req, res, session, code);
      default:
        res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
        return res.status(405).json({
          success: false,
          error: `Метод ${method} не поддерживается`,
        });
    }
  } catch (error) {
    console.error('Ошибка в API конкретной видеокомнаты:', error);
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

// Получение информации о комнате
async function getRoomInfo(req, res, session, code) {
  try {
    const { password } = req.query;

    const room = await prisma.videoRoom.findUnique({
      where: { code },
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
          orderBy: {
            joinedAt: 'asc',
          },
        },
        chatMessages: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
          take: 50, // Последние 50 сообщений
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
    });

    if (!room) {
      return res.status(404).json({
        success: false,
        error: 'Комната не найдена',
      });
    }

    // Проверка активности комнаты
    if (!room.isActive) {
      return res.status(410).json({
        success: false,
        error: 'Комната была закрыта',
      });
    }

    // Проверка пароля (если требуется)
    if (room.requiresPassword && room.hostId !== session.user.id) {
      if (!password || password !== room.password) {
        return res.status(403).json({
          success: false,
          error: 'Неверный пароль для входа в комнату',
        });
      }
    }

    // Проверка лимита участников
    const currentParticipants = room._count.participants;
    const isParticipant = room.participants.some(
      (p) => p.userId === session.user.id && p.status === 'joined'
    );
    const isHost = room.hostId === session.user.id;

    if (
      !isHost &&
      !isParticipant &&
      currentParticipants >= room.maxParticipants
    ) {
      return res.status(423).json({
        success: false,
        error: 'Комната заполнена',
      });
    }

    // Проверка времени планирования
    const now = new Date();
    if (room.scheduledStart && now < room.scheduledStart) {
      return res.status(425).json({
        success: false,
        error: 'Комната еще не открыта',
        scheduledStart: room.scheduledStart,
      });
    }

    if (room.scheduledEnd && now > room.scheduledEnd) {
      return res.status(410).json({
        success: false,
        error: 'Время работы комнаты истекло',
      });
    }

    // Если пользователь еще не участник, добавляем его
    if (!isParticipant && !isHost) {
      await prisma.videoRoomParticipant.create({
        data: {
          roomId: room.id,
          userId: session.user.id,
          role: 'participant',
          status: 'joined',
        },
      });
    }

    const roomInfo = {
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
      participantCount: currentParticipants,
      participants: room.participants
        .filter((p) => p.status === 'joined')
        .map((p) => ({
          id: p.id,
          user: p.user,
          guestName: p.guestName,
          role: p.role,
          joinedAt: p.joinedAt,
          leftAt: p.leftAt,
          audioEnabled: p.audioEnabled,
          videoEnabled: p.videoEnabled,
          screenSharing: p.screenSharing,
        })),
      chatMessages: room.chatMessages.map((msg) => ({
        id: msg.id,
        message: msg.message,
        messageType: msg.messageType,
        user: msg.user,
        guestName: msg.guestName,
        createdAt: msg.createdAt,
      })),
      calendarEvents: room.calendarEvents,
      isHost,
      isParticipant: isParticipant || isHost,
      canJoin:
        isHost || isParticipant || currentParticipants < room.maxParticipants,
      createdAt: room.createdAt,
      updatedAt: room.updatedAt,
    };

    return res.status(200).json({
      success: true,
      data: roomInfo,
      message: 'Информация о комнате получена',
    });
  } catch (error) {
    console.error('Ошибка при получении информации о комнате:', error);
    return res.status(500).json({
      success: false,
      error: 'Ошибка при получении информации о комнате',
      details:
        process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

// Обновление настроек комнаты
async function updateRoom(req, res, session, code) {
  try {
    const {
      name,
      description,
      maxParticipants,
      requiresPassword,
      password,
      scheduledEnd,
    } = req.body;

    const room = await prisma.videoRoom.findUnique({
      where: { code },
    });

    if (!room) {
      return res.status(404).json({
        success: false,
        error: 'Комната не найдена',
      });
    }

    // Только хост может изменять настройки
    if (room.hostId !== session.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Только хост может изменять настройки комнаты',
      });
    }

    // Подготовка данных для обновления
    const updateData = {};

    if (name !== undefined) {
      if (!name.trim()) {
        return res.status(400).json({
          success: false,
          error: 'Название комнаты не может быть пустым',
        });
      }
      updateData.name = name.trim();
    }

    if (description !== undefined) {
      updateData.description = description;
    }

    if (maxParticipants !== undefined) {
      if (maxParticipants < 2 || maxParticipants > 50) {
        return res.status(400).json({
          success: false,
          error: 'Количество участников должно быть от 2 до 50',
        });
      }
      updateData.maxParticipants = maxParticipants;
    }

    if (requiresPassword !== undefined) {
      updateData.requiresPassword = requiresPassword;

      if (requiresPassword) {
        if (!password || password.length < 4) {
          return res.status(400).json({
            success: false,
            error: 'Пароль должен содержать минимум 4 символа',
          });
        }
        updateData.password = password;
      } else {
        updateData.password = null;
      }
    }

    if (scheduledEnd !== undefined) {
      if (scheduledEnd) {
        const endDate = new Date(scheduledEnd);
        if (isNaN(endDate.getTime())) {
          return res.status(400).json({
            success: false,
            error: 'Некорректный формат времени окончания',
          });
        }

        if (endDate <= new Date()) {
          return res.status(400).json({
            success: false,
            error: 'Время окончания должно быть в будущем',
          });
        }

        updateData.scheduledEnd = endDate;
      } else {
        updateData.scheduledEnd = null;
      }
    }

    const updatedRoom = await prisma.videoRoom.update({
      where: { code },
      data: updateData,
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

    return res.status(200).json({
      success: true,
      data: {
        id: updatedRoom.id,
        code: updatedRoom.code,
        name: updatedRoom.name,
        description: updatedRoom.description,
        maxParticipants: updatedRoom.maxParticipants,
        requiresPassword: updatedRoom.requiresPassword,
        scheduledStart: updatedRoom.scheduledStart,
        scheduledEnd: updatedRoom.scheduledEnd,
        host: updatedRoom.host,
        updatedAt: updatedRoom.updatedAt,
      },
      message: 'Настройки комнаты обновлены',
    });
  } catch (error) {
    console.error('Ошибка при обновлении комнаты:', error);
    return res.status(500).json({
      success: false,
      error: 'Ошибка при обновлении комнаты',
      details:
        process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

// Удаление комнаты
async function deleteRoom(req, res, session, code) {
  try {
    const room = await prisma.videoRoom.findUnique({
      where: { code },
      include: {
        participants: {
          where: {
            status: 'joined',
          },
        },
      },
    });

    if (!room) {
      return res.status(404).json({
        success: false,
        error: 'Комната не найдена',
      });
    }

    // Только хост может удалить комнату
    if (room.hostId !== session.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Только хост может удалить комнату',
      });
    }

    // Помечаем всех участников как покинувших комнату
    if (room.participants.length > 0) {
      await prisma.videoRoomParticipant.updateMany({
        where: {
          roomId: room.id,
          status: 'joined',
        },
        data: {
          status: 'left',
          leftAt: new Date(),
        },
      });
    }

    // Деактивируем комнату и устанавливаем время окончания
    await prisma.videoRoom.update({
      where: { code },
      data: {
        isActive: false,
        actualEnd: new Date(),
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Комната успешно закрыта',
    });
  } catch (error) {
    console.error('Ошибка при удалении комнаты:', error);
    return res.status(500).json({
      success: false,
      error: 'Ошибка при удалении комнаты',
      details:
        process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}
