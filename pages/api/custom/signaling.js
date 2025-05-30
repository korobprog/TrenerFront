import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  try {
    const session = await getServerSession(req, res, authOptions);

    if (!session) {
      return res.status(401).json({ error: 'Не авторизован' });
    }

    const { method } = req;

    switch (method) {
      case 'POST':
        return await handleSignaling(req, res, session);
      case 'GET':
        return await getRoomStatus(req, res, session);
      default:
        res.setHeader('Allow', ['GET', 'POST']);
        return res
          .status(405)
          .json({ error: `Метод ${method} не поддерживается` });
    }
  } catch (error) {
    console.error('Ошибка в API signaling:', error);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}

// Обработка WebRTC signaling
async function handleSignaling(req, res, session) {
  try {
    const { type, roomId, targetUserId, data } = req.body;

    if (!type || !roomId) {
      return res.status(400).json({
        error: 'Обязательные поля: type, roomId',
      });
    }

    // Проверяем существование комнаты
    const room = await prisma.videoRoom.findUnique({
      where: { roomCode: roomId },
      include: {
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
      },
    });

    if (!room) {
      return res.status(404).json({ error: 'Комната не найдена' });
    }

    if (!room.isActive) {
      return res.status(400).json({ error: 'Комната неактивна' });
    }

    // Проверяем, является ли пользователь участником комнаты
    const isParticipant = room.participants.some(
      (p) => p.userId === session.user.id
    );

    if (!isParticipant) {
      return res
        .status(403)
        .json({ error: 'Вы не являетесь участником этой комнаты' });
    }

    // Обрабатываем различные типы signaling сообщений
    switch (type) {
      case 'offer':
        return await handleOffer(req, res, session, room, targetUserId, data);

      case 'answer':
        return await handleAnswer(req, res, session, room, targetUserId, data);

      case 'ice-candidate':
        return await handleIceCandidate(
          req,
          res,
          session,
          room,
          targetUserId,
          data
        );

      case 'join-room':
        return await handleJoinRoom(req, res, session, room);

      case 'leave-room':
        return await handleLeaveRoom(req, res, session, room);

      case 'toggle-media':
        return await handleToggleMedia(req, res, session, room, data);

      default:
        return res
          .status(400)
          .json({ error: 'Неизвестный тип signaling сообщения' });
    }
  } catch (error) {
    console.error('Ошибка при обработке signaling:', error);
    return res.status(500).json({ error: 'Ошибка при обработке signaling' });
  }
}

// Обработка WebRTC Offer
async function handleOffer(req, res, session, room, targetUserId, data) {
  if (!targetUserId || !data.offer) {
    return res.status(400).json({ error: 'Требуется targetUserId и offer' });
  }

  // В реальном приложении здесь бы была логика передачи offer через WebSocket
  // Пока что просто возвращаем успешный ответ
  return res.status(200).json({
    success: true,
    message: 'Offer отправлен',
    type: 'offer',
    fromUserId: session.user.id,
    targetUserId,
    roomId: room.roomCode,
  });
}

// Обработка WebRTC Answer
async function handleAnswer(req, res, session, room, targetUserId, data) {
  if (!targetUserId || !data.answer) {
    return res.status(400).json({ error: 'Требуется targetUserId и answer' });
  }

  return res.status(200).json({
    success: true,
    message: 'Answer отправлен',
    type: 'answer',
    fromUserId: session.user.id,
    targetUserId,
    roomId: room.roomCode,
  });
}

// Обработка ICE Candidate
async function handleIceCandidate(req, res, session, room, targetUserId, data) {
  if (!targetUserId || !data.candidate) {
    return res
      .status(400)
      .json({ error: 'Требуется targetUserId и candidate' });
  }

  return res.status(200).json({
    success: true,
    message: 'ICE candidate отправлен',
    type: 'ice-candidate',
    fromUserId: session.user.id,
    targetUserId,
    roomId: room.roomCode,
  });
}

// Присоединение к комнате
async function handleJoinRoom(req, res, session, room) {
  try {
    // Проверяем, не является ли пользователь уже участником
    const existingParticipant = await prisma.videoRoomParticipant.findUnique({
      where: {
        videoRoomId_userId: {
          videoRoomId: room.id,
          userId: session.user.id,
        },
      },
    });

    if (existingParticipant && !existingParticipant.leftAt) {
      return res.status(400).json({ error: 'Вы уже находитесь в комнате' });
    }

    // Создаем или обновляем запись участника
    const participant = await prisma.videoRoomParticipant.upsert({
      where: {
        videoRoomId_userId: {
          videoRoomId: room.id,
          userId: session.user.id,
        },
      },
      update: {
        joinedAt: new Date(),
        leftAt: null,
        isVideoEnabled: true,
        isAudioEnabled: true,
        isScreenSharing: false,
      },
      create: {
        videoRoomId: room.id,
        userId: session.user.id,
        role: room.hostId === session.user.id ? 'host' : 'participant',
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
          },
        },
      },
    });

    // Обновляем время начала комнаты, если это первый участник
    if (!room.actualStartTime) {
      await prisma.videoRoom.update({
        where: { id: room.id },
        data: { actualStartTime: new Date() },
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Успешно присоединились к комнате',
      participant: {
        id: participant.id,
        userId: participant.userId,
        userName: participant.user.name,
        role: participant.role,
        joinedAt: participant.joinedAt,
        isVideoEnabled: participant.isVideoEnabled,
        isAudioEnabled: participant.isAudioEnabled,
        isScreenSharing: participant.isScreenSharing,
      },
      roomInfo: {
        id: room.id,
        name: room.name,
        roomCode: room.roomCode,
        hostId: room.hostId,
        isHost: room.hostId === session.user.id,
      },
    });
  } catch (error) {
    console.error('Ошибка при присоединении к комнате:', error);
    return res
      .status(500)
      .json({ error: 'Ошибка при присоединении к комнате' });
  }
}

// Покидание комнаты
async function handleLeaveRoom(req, res, session, room) {
  try {
    const participant = await prisma.videoRoomParticipant.findUnique({
      where: {
        videoRoomId_userId: {
          videoRoomId: room.id,
          userId: session.user.id,
        },
      },
    });

    if (!participant || participant.leftAt) {
      return res.status(400).json({ error: 'Вы не находитесь в комнате' });
    }

    // Обновляем время выхода и длительность
    const duration = participant.joinedAt
      ? Math.floor((new Date() - participant.joinedAt) / 1000)
      : 0;

    await prisma.videoRoomParticipant.update({
      where: { id: participant.id },
      data: {
        leftAt: new Date(),
        totalDuration: duration,
      },
    });

    // Проверяем, остались ли активные участники
    const activeParticipants = await prisma.videoRoomParticipant.count({
      where: {
        videoRoomId: room.id,
        leftAt: null,
      },
    });

    // Если участников не осталось, завершаем комнату
    if (activeParticipants === 0) {
      await prisma.videoRoom.update({
        where: { id: room.id },
        data: {
          actualEndTime: new Date(),
          isActive: false,
        },
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Успешно покинули комнату',
      duration,
    });
  } catch (error) {
    console.error('Ошибка при покидании комнаты:', error);
    return res.status(500).json({ error: 'Ошибка при покидании комнаты' });
  }
}

// Переключение медиа (видео/аудио/демонстрация экрана)
async function handleToggleMedia(req, res, session, room, data) {
  try {
    const { mediaType, enabled } = data;

    if (!['video', 'audio', 'screenShare'].includes(mediaType)) {
      return res.status(400).json({ error: 'Неверный тип медиа' });
    }

    const participant = await prisma.videoRoomParticipant.findUnique({
      where: {
        videoRoomId_userId: {
          videoRoomId: room.id,
          userId: session.user.id,
        },
      },
    });

    if (!participant || participant.leftAt) {
      return res.status(400).json({ error: 'Вы не находитесь в комнате' });
    }

    // Обновляем состояние медиа
    const updateData = {};
    switch (mediaType) {
      case 'video':
        updateData.isVideoEnabled = enabled;
        break;
      case 'audio':
        updateData.isAudioEnabled = enabled;
        break;
      case 'screenShare':
        updateData.isScreenSharing = enabled;
        break;
    }

    await prisma.videoRoomParticipant.update({
      where: { id: participant.id },
      data: updateData,
    });

    return res.status(200).json({
      success: true,
      message: `${mediaType} ${enabled ? 'включено' : 'выключено'}`,
      mediaType,
      enabled,
    });
  } catch (error) {
    console.error('Ошибка при переключении медиа:', error);
    return res.status(500).json({ error: 'Ошибка при переключении медиа' });
  }
}

// Получение статуса комнаты
async function getRoomStatus(req, res, session) {
  try {
    const { roomId } = req.query;

    if (!roomId) {
      return res.status(400).json({ error: 'roomId обязателен' });
    }

    const room = await prisma.videoRoom.findUnique({
      where: { roomCode: roomId },
      include: {
        host: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        participants: {
          where: {
            leftAt: null,
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
        },
      },
    });

    if (!room) {
      return res.status(404).json({ error: 'Комната не найдена' });
    }

    return res.status(200).json({
      success: true,
      room: {
        id: room.id,
        name: room.name,
        roomCode: room.roomCode,
        isActive: room.isActive,
        host: room.host,
        participantCount: room.participants.length,
        maxParticipants: room.maxParticipants,
        scheduledStartTime: room.scheduledStartTime,
        scheduledEndTime: room.scheduledEndTime,
        actualStartTime: room.actualStartTime,
        participants: room.participants.map((p) => ({
          id: p.id,
          userId: p.userId,
          userName: p.user.name,
          role: p.role,
          joinedAt: p.joinedAt,
          isVideoEnabled: p.isVideoEnabled,
          isAudioEnabled: p.isAudioEnabled,
          isScreenSharing: p.isScreenSharing,
        })),
      },
    });
  } catch (error) {
    console.error('Ошибка при получении статуса комнаты:', error);
    return res
      .status(500)
      .json({ error: 'Ошибка при получении статуса комнаты' });
  }
}
