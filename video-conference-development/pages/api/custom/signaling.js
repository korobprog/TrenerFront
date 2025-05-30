import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';

// Хранилище активных WebRTC сессий
const activeSessions = new Map();
const roomSessions = new Map();

export default async function handler(req, res) {
  try {
    // Проверка авторизации
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Требуется авторизация для доступа к signaling API',
      });
    }

    const { method } = req;
    const userId = session.user.id;
    const userName = session.user.name || session.user.email;

    console.log(
      `Signaling API: ${method} запрос от пользователя ${userName} (${userId})`
    );

    switch (method) {
      case 'POST':
        return await handleSignalingMessage(req, res, userId, userName);

      case 'GET':
        return await handleGetSessions(req, res, userId);

      case 'DELETE':
        return await handleDeleteSession(req, res, userId);

      default:
        res.setHeader('Allow', ['POST', 'GET', 'DELETE']);
        return res.status(405).json({
          error: 'Method not allowed',
          message: `Метод ${method} не поддерживается`,
        });
    }
  } catch (error) {
    console.error('Ошибка в signaling API:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Внутренняя ошибка сервера',
    });
  }
}

// Обработка signaling сообщений
async function handleSignalingMessage(req, res, userId, userName) {
  const { type, roomId, targetUserId, data } = req.body;

  if (!type || !roomId) {
    return res.status(400).json({
      error: 'Bad request',
      message: 'Требуются параметры type и roomId',
    });
  }

  console.log(`Signaling: ${type} от ${userId} в комнате ${roomId}`);

  switch (type) {
    case 'join-session':
      return await handleJoinSession(req, res, userId, userName, roomId);

    case 'leave-session':
      return await handleLeaveSession(req, res, userId, roomId);

    case 'offer':
      return await handleOffer(req, res, userId, roomId, targetUserId, data);

    case 'answer':
      return await handleAnswer(req, res, userId, roomId, targetUserId, data);

    case 'ice-candidate':
      return await handleIceCandidate(
        req,
        res,
        userId,
        roomId,
        targetUserId,
        data
      );

    case 'media-state':
      return await handleMediaState(req, res, userId, roomId, data);

    default:
      return res.status(400).json({
        error: 'Invalid signaling type',
        message: `Неизвестный тип signaling сообщения: ${type}`,
      });
  }
}

// Присоединение к сессии
async function handleJoinSession(req, res, userId, userName, roomId) {
  try {
    // Создаем или получаем комнату
    if (!roomSessions.has(roomId)) {
      roomSessions.set(roomId, {
        id: roomId,
        participants: new Map(),
        createdAt: new Date(),
        lastActivity: new Date(),
      });
    }

    const room = roomSessions.get(roomId);

    // Добавляем участника
    const participant = {
      userId,
      userName,
      joinedAt: new Date(),
      videoEnabled: true,
      audioEnabled: true,
      screenShareEnabled: false,
      connectionState: 'connecting',
    };

    room.participants.set(userId, participant);
    room.lastActivity = new Date();

    // Сохраняем активную сессию пользователя
    activeSessions.set(userId, {
      roomId,
      joinedAt: new Date(),
      lastPing: new Date(),
    });

    // Получаем список других участников
    const otherParticipants = Array.from(room.participants.values()).filter(
      (p) => p.userId !== userId
    );

    console.log(`Пользователь ${userName} присоединился к сессии ${roomId}`);
    console.log(`Участников в комнате: ${room.participants.size}`);

    return res.status(200).json({
      success: true,
      message: 'Успешно присоединились к сессии',
      data: {
        roomId,
        participant,
        otherParticipants,
        totalParticipants: room.participants.size,
      },
    });
  } catch (error) {
    console.error('Ошибка при присоединении к сессии:', error);
    return res.status(500).json({
      error: 'Join session failed',
      message: 'Не удалось присоединиться к сессии',
    });
  }
}

// Покидание сессии
async function handleLeaveSession(req, res, userId, roomId) {
  try {
    if (roomSessions.has(roomId)) {
      const room = roomSessions.get(roomId);
      room.participants.delete(userId);
      room.lastActivity = new Date();

      // Удаляем пустую комнату
      if (room.participants.size === 0) {
        roomSessions.delete(roomId);
        console.log(`Комната ${roomId} удалена (пустая)`);
      }
    }

    activeSessions.delete(userId);

    console.log(`Пользователь ${userId} покинул сессию ${roomId}`);

    return res.status(200).json({
      success: true,
      message: 'Успешно покинули сессию',
    });
  } catch (error) {
    console.error('Ошибка при покидании сессии:', error);
    return res.status(500).json({
      error: 'Leave session failed',
      message: 'Не удалось покинуть сессию',
    });
  }
}

// Обработка WebRTC offer
async function handleOffer(req, res, userId, roomId, targetUserId, data) {
  try {
    if (!targetUserId || !data) {
      return res.status(400).json({
        error: 'Bad request',
        message: 'Требуются параметры targetUserId и data для offer',
      });
    }

    // Проверяем, что оба пользователя в одной комнате
    const room = roomSessions.get(roomId);
    if (
      !room ||
      !room.participants.has(userId) ||
      !room.participants.has(targetUserId)
    ) {
      return res.status(400).json({
        error: 'Invalid participants',
        message: 'Один или оба участника не находятся в комнате',
      });
    }

    // В реальном приложении здесь бы отправлялось сообщение через WebSocket
    // Пока что просто логируем и возвращаем успех
    console.log(
      `WebRTC Offer от ${userId} к ${targetUserId} в комнате ${roomId}`
    );

    return res.status(200).json({
      success: true,
      message: 'Offer обработан',
      data: {
        type: 'offer',
        fromUserId: userId,
        targetUserId,
        roomId,
        timestamp: new Date(),
      },
    });
  } catch (error) {
    console.error('Ошибка при обработке offer:', error);
    return res.status(500).json({
      error: 'Offer processing failed',
      message: 'Не удалось обработать offer',
    });
  }
}

// Обработка WebRTC answer
async function handleAnswer(req, res, userId, roomId, targetUserId, data) {
  try {
    if (!targetUserId || !data) {
      return res.status(400).json({
        error: 'Bad request',
        message: 'Требуются параметры targetUserId и data для answer',
      });
    }

    console.log(
      `WebRTC Answer от ${userId} к ${targetUserId} в комнате ${roomId}`
    );

    return res.status(200).json({
      success: true,
      message: 'Answer обработан',
      data: {
        type: 'answer',
        fromUserId: userId,
        targetUserId,
        roomId,
        timestamp: new Date(),
      },
    });
  } catch (error) {
    console.error('Ошибка при обработке answer:', error);
    return res.status(500).json({
      error: 'Answer processing failed',
      message: 'Не удалось обработать answer',
    });
  }
}

// Обработка ICE candidates
async function handleIceCandidate(
  req,
  res,
  userId,
  roomId,
  targetUserId,
  data
) {
  try {
    if (!targetUserId || !data) {
      return res.status(400).json({
        error: 'Bad request',
        message: 'Требуются параметры targetUserId и data для ICE candidate',
      });
    }

    console.log(
      `ICE Candidate от ${userId} к ${targetUserId} в комнате ${roomId}`
    );

    return res.status(200).json({
      success: true,
      message: 'ICE candidate обработан',
      data: {
        type: 'ice-candidate',
        fromUserId: userId,
        targetUserId,
        roomId,
        timestamp: new Date(),
      },
    });
  } catch (error) {
    console.error('Ошибка при обработке ICE candidate:', error);
    return res.status(500).json({
      error: 'ICE candidate processing failed',
      message: 'Не удалось обработать ICE candidate',
    });
  }
}

// Обработка состояния медиа
async function handleMediaState(req, res, userId, roomId, data) {
  try {
    const { videoEnabled, audioEnabled, screenShareEnabled } = data;

    if (roomSessions.has(roomId)) {
      const room = roomSessions.get(roomId);
      const participant = room.participants.get(userId);

      if (participant) {
        if (typeof videoEnabled === 'boolean') {
          participant.videoEnabled = videoEnabled;
        }
        if (typeof audioEnabled === 'boolean') {
          participant.audioEnabled = audioEnabled;
        }
        if (typeof screenShareEnabled === 'boolean') {
          participant.screenShareEnabled = screenShareEnabled;
        }

        room.lastActivity = new Date();

        console.log(
          `Обновлено медиа состояние для ${userId}: video=${participant.videoEnabled}, audio=${participant.audioEnabled}, screen=${participant.screenShareEnabled}`
        );
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Состояние медиа обновлено',
    });
  } catch (error) {
    console.error('Ошибка при обновлении состояния медиа:', error);
    return res.status(500).json({
      error: 'Media state update failed',
      message: 'Не удалось обновить состояние медиа',
    });
  }
}

// Получение активных сессий
async function handleGetSessions(req, res, userId) {
  try {
    const { roomId } = req.query;

    if (roomId) {
      // Получаем информацию о конкретной комнате
      const room = roomSessions.get(roomId);
      if (!room) {
        return res.status(404).json({
          error: 'Room not found',
          message: 'Комната не найдена',
        });
      }

      const participants = Array.from(room.participants.values());

      return res.status(200).json({
        success: true,
        data: {
          roomId,
          participants,
          totalParticipants: participants.length,
          createdAt: room.createdAt,
          lastActivity: room.lastActivity,
        },
      });
    } else {
      // Получаем все активные комнаты
      const rooms = Array.from(roomSessions.entries()).map(([id, room]) => ({
        roomId: id,
        participantCount: room.participants.size,
        createdAt: room.createdAt,
        lastActivity: room.lastActivity,
      }));

      return res.status(200).json({
        success: true,
        data: {
          totalRooms: rooms.length,
          rooms,
          userSession: activeSessions.get(userId) || null,
        },
      });
    }
  } catch (error) {
    console.error('Ошибка при получении сессий:', error);
    return res.status(500).json({
      error: 'Get sessions failed',
      message: 'Не удалось получить информацию о сессиях',
    });
  }
}

// Удаление сессии
async function handleDeleteSession(req, res, userId) {
  try {
    const { roomId } = req.query;

    if (!roomId) {
      return res.status(400).json({
        error: 'Bad request',
        message: 'Требуется параметр roomId',
      });
    }

    // Удаляем пользователя из комнаты
    if (roomSessions.has(roomId)) {
      const room = roomSessions.get(roomId);
      room.participants.delete(userId);

      // Удаляем пустую комнату
      if (room.participants.size === 0) {
        roomSessions.delete(roomId);
        console.log(`Комната ${roomId} удалена администратором`);
      }
    }

    activeSessions.delete(userId);

    return res.status(200).json({
      success: true,
      message: 'Сессия удалена',
    });
  } catch (error) {
    console.error('Ошибка при удалении сессии:', error);
    return res.status(500).json({
      error: 'Delete session failed',
      message: 'Не удалось удалить сессию',
    });
  }
}

// Периодическая очистка неактивных сессий
setInterval(() => {
  const now = new Date();
  const maxInactivity = 30 * 60 * 1000; // 30 минут

  // Очищаем неактивные комнаты
  for (const [roomId, room] of roomSessions.entries()) {
    if (now - room.lastActivity > maxInactivity) {
      roomSessions.delete(roomId);
      console.log(`Удалена неактивная комната: ${roomId}`);
    }
  }

  // Очищаем неактивные пользовательские сессии
  for (const [userId, session] of activeSessions.entries()) {
    if (now - session.lastPing > maxInactivity) {
      activeSessions.delete(userId);
      console.log(`Удалена неактивная сессия пользователя: ${userId}`);
    }
  }
}, 5 * 60 * 1000); // Проверяем каждые 5 минут
