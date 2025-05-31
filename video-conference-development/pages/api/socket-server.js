import { Server } from 'socket.io';
import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';

// Хранилище активных комнат и участников
const rooms = new Map();
const userSockets = new Map();
const connectionStats = new Map();

// Статистика для мониторинга
let totalConnections = 0;
let totalRooms = 0;

const SocketHandler = async (req, res) => {
  if (res.socket.server.io) {
    console.log('Socket.io сервер уже запущен');
    res.end();
    return;
  }

  console.log('Инициализация Socket.io сервера...');

  const io = new Server(res.socket.server, {
    path: '/api/socket-server',
    addTrailingSlash: false,
    cors: {
      origin: process.env.NEXTAUTH_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  res.socket.server.io = io;

  io.on('connection', async (socket) => {
    totalConnections++;
    console.log(`Новое подключение: ${socket.id} (всего: ${totalConnections})`);

    // Аутентификация пользователя
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      console.log(`Неавторизованное подключение: ${socket.id}`);
      socket.emit('auth-error', { message: 'Требуется авторизация' });
      socket.disconnect();
      return;
    }

    const userId = session.user.id;
    const userName = session.user.name || session.user.email;

    // Сохраняем связь пользователя с сокетом
    userSockets.set(userId, socket.id);
    socket.userId = userId;
    socket.userName = userName;
    socket.connectedAt = new Date();

    // Инициализируем статистику соединения
    connectionStats.set(socket.id, {
      userId,
      userName,
      connectedAt: new Date(),
      messagesCount: 0,
      lastActivity: new Date(),
    });

    console.log(
      `Пользователь ${userName} (${userId}) подключился: ${socket.id}`
    );

    // Отправляем подтверждение успешного подключения
    socket.emit('connection-established', {
      socketId: socket.id,
      userId,
      userName,
      serverTime: new Date(),
    });

    // Присоединение к комнате
    socket.on('join-room', (data) => {
      const { roomId } = data;

      console.log(
        `Пользователь ${userName} присоединяется к комнате ${roomId}`
      );

      // Покидаем предыдущие комнаты
      socket.rooms.forEach((room) => {
        if (room !== socket.id) {
          socket.leave(room);
          leaveRoom(socket, room);
        }
      });

      // Присоединяемся к новой комнате
      socket.join(roomId);
      socket.currentRoom = roomId;

      // Инициализируем комнату если её нет
      if (!rooms.has(roomId)) {
        rooms.set(roomId, {
          id: roomId,
          participants: new Map(),
          createdAt: new Date(),
        });
      }

      const room = rooms.get(roomId);

      // Добавляем участника в комнату
      room.participants.set(userId, {
        userId,
        userName,
        socketId: socket.id,
        joinedAt: new Date(),
        videoEnabled: true,
        audioEnabled: true,
        screenShareEnabled: false,
      });

      // Получаем список существующих участников
      const existingParticipants = Array.from(
        room.participants.values()
      ).filter((p) => p.userId !== userId);

      // Отправляем подтверждение присоединения
      socket.emit('room-joined', {
        roomId,
        participants: existingParticipants,
      });

      // Уведомляем других участников о новом пользователе
      socket.to(roomId).emit('user-joined', {
        userId,
        userName,
        socketId: socket.id,
      });

      console.log(`Комната ${roomId}: ${room.participants.size} участников`);
    });

    // Покидание комнаты
    socket.on('leave-room', () => {
      if (socket.currentRoom) {
        leaveRoom(socket, socket.currentRoom);
      }
    });

    // WebRTC Signaling события с улучшенной обработкой ошибок
    socket.on('offer', (data) => {
      try {
        const { targetSocketId, offer } = data;

        if (!targetSocketId || !offer) {
          socket.emit('signaling-error', {
            type: 'offer',
            message: 'Отсутствуют обязательные параметры',
          });
          return;
        }

        console.log(`Offer от ${socket.id} к ${targetSocketId}`);
        updateConnectionStats(socket.id);

        // Проверяем, что целевой сокет существует
        const targetSocket = io.sockets.sockets.get(targetSocketId);
        if (!targetSocket) {
          socket.emit('signaling-error', {
            type: 'offer',
            message: 'Целевой участник не найден',
          });
          return;
        }

        socket.to(targetSocketId).emit('offer', {
          fromUserId: userId,
          fromSocketId: socket.id,
          fromUserName: userName,
          offer,
          timestamp: new Date(),
        });

        console.log(
          `Offer успешно отправлен от ${userName} к ${targetSocketId}`
        );
      } catch (error) {
        console.error('Ошибка обработки offer:', error);
        socket.emit('signaling-error', {
          type: 'offer',
          message: 'Внутренняя ошибка сервера',
        });
      }
    });

    socket.on('answer', (data) => {
      try {
        const { targetSocketId, answer } = data;

        if (!targetSocketId || !answer) {
          socket.emit('signaling-error', {
            type: 'answer',
            message: 'Отсутствуют обязательные параметры',
          });
          return;
        }

        console.log(`Answer от ${socket.id} к ${targetSocketId}`);
        updateConnectionStats(socket.id);

        const targetSocket = io.sockets.sockets.get(targetSocketId);
        if (!targetSocket) {
          socket.emit('signaling-error', {
            type: 'answer',
            message: 'Целевой участник не найден',
          });
          return;
        }

        socket.to(targetSocketId).emit('answer', {
          fromUserId: userId,
          fromSocketId: socket.id,
          fromUserName: userName,
          answer,
          timestamp: new Date(),
        });

        console.log(
          `Answer успешно отправлен от ${userName} к ${targetSocketId}`
        );
      } catch (error) {
        console.error('Ошибка обработки answer:', error);
        socket.emit('signaling-error', {
          type: 'answer',
          message: 'Внутренняя ошибка сервера',
        });
      }
    });

    socket.on('ice-candidate', (data) => {
      try {
        const { targetSocketId, candidate } = data;

        if (!targetSocketId || !candidate) {
          socket.emit('signaling-error', {
            type: 'ice-candidate',
            message: 'Отсутствуют обязательные параметры',
          });
          return;
        }

        console.log(`ICE candidate от ${socket.id} к ${targetSocketId}`);
        updateConnectionStats(socket.id);

        const targetSocket = io.sockets.sockets.get(targetSocketId);
        if (!targetSocket) {
          socket.emit('signaling-error', {
            type: 'ice-candidate',
            message: 'Целевой участник не найден',
          });
          return;
        }

        socket.to(targetSocketId).emit('ice-candidate', {
          fromUserId: userId,
          fromSocketId: socket.id,
          fromUserName: userName,
          candidate,
          timestamp: new Date(),
        });
      } catch (error) {
        console.error('Ошибка обработки ICE candidate:', error);
        socket.emit('signaling-error', {
          type: 'ice-candidate',
          message: 'Внутренняя ошибка сервера',
        });
      }
    });

    // Новые события для улучшенного signaling
    socket.on('connection-quality', (data) => {
      try {
        const { targetSocketId, quality } = data;

        if (targetSocketId && quality) {
          socket.to(targetSocketId).emit('peer-connection-quality', {
            fromUserId: userId,
            fromSocketId: socket.id,
            quality,
            timestamp: new Date(),
          });
        }
      } catch (error) {
        console.error('Ошибка передачи качества соединения:', error);
      }
    });

    socket.on('renegotiation-needed', (data) => {
      try {
        const { targetSocketId } = data;

        if (targetSocketId) {
          console.log(
            `Renegotiation needed от ${socket.id} к ${targetSocketId}`
          );
          socket.to(targetSocketId).emit('renegotiation-needed', {
            fromUserId: userId,
            fromSocketId: socket.id,
            timestamp: new Date(),
          });
        }
      } catch (error) {
        console.error('Ошибка обработки renegotiation:', error);
      }
    });

    // Управление медиа
    socket.on('toggle-video', (data) => {
      const { videoEnabled } = data;

      if (socket.currentRoom && rooms.has(socket.currentRoom)) {
        const room = rooms.get(socket.currentRoom);
        const participant = room.participants.get(userId);

        if (participant) {
          participant.videoEnabled = videoEnabled;

          socket.to(socket.currentRoom).emit('user-video-toggled', {
            userId,
            videoEnabled,
          });

          console.log(
            `${userName} ${videoEnabled ? 'включил' : 'выключил'} видео`
          );
        }
      }
    });

    socket.on('toggle-audio', (data) => {
      const { audioEnabled } = data;

      if (socket.currentRoom && rooms.has(socket.currentRoom)) {
        const room = rooms.get(socket.currentRoom);
        const participant = room.participants.get(userId);

        if (participant) {
          participant.audioEnabled = audioEnabled;

          socket.to(socket.currentRoom).emit('user-audio-toggled', {
            userId,
            audioEnabled,
          });

          console.log(
            `${userName} ${audioEnabled ? 'включил' : 'выключил'} аудио`
          );
        }
      }
    });

    socket.on('toggle-screen-share', (data) => {
      const { screenShareEnabled } = data;

      if (socket.currentRoom && rooms.has(socket.currentRoom)) {
        const room = rooms.get(socket.currentRoom);
        const participant = room.participants.get(userId);

        if (participant) {
          participant.screenShareEnabled = screenShareEnabled;

          socket.to(socket.currentRoom).emit('user-screen-share-toggled', {
            userId,
            screenShareEnabled,
          });

          console.log(
            `${userName} ${
              screenShareEnabled ? 'начал' : 'завершил'
            } демонстрацию экрана`
          );
        }
      }
    });

    // Ping-pong для проверки соединения
    socket.on('ping', () => {
      updateConnectionStats(socket.id);
      socket.emit('pong', { timestamp: new Date() });
    });

    // Получение статистики комнаты
    socket.on('get-room-stats', () => {
      if (socket.currentRoom && rooms.has(socket.currentRoom)) {
        const room = rooms.get(socket.currentRoom);
        socket.emit('room-stats', {
          roomId: socket.currentRoom,
          participantCount: room.participants.size,
          createdAt: room.createdAt,
          participants: Array.from(room.participants.values()),
        });
      }
    });

    // Отключение
    socket.on('disconnect', (reason) => {
      totalConnections--;
      console.log(
        `Пользователь ${userName} отключился: ${socket.id}, причина: ${reason}`
      );

      if (socket.currentRoom) {
        leaveRoom(socket, socket.currentRoom);
      }

      userSockets.delete(userId);
      connectionStats.delete(socket.id);

      // Логируем статистику отключения
      console.log(
        `Активных подключений: ${totalConnections}, активных комнат: ${rooms.size}`
      );
    });

    // Обработка ошибок
    socket.on('error', (error) => {
      console.error(`Ошибка сокета ${socket.id}:`, error);
      socket.emit('socket-error', {
        message: 'Произошла ошибка соединения',
        timestamp: new Date(),
      });
    });
  });

  // Функция обновления статистики соединения
  function updateConnectionStats(socketId) {
    const stats = connectionStats.get(socketId);
    if (stats) {
      stats.messagesCount++;
      stats.lastActivity = new Date();
    }
  }

  // Функция покидания комнаты
  function leaveRoom(socket, roomId) {
    if (!rooms.has(roomId)) return;

    const room = rooms.get(roomId);
    const userId = socket.userId;

    if (room.participants.has(userId)) {
      room.participants.delete(userId);

      // Уведомляем других участников с дополнительной информацией
      socket.to(roomId).emit('user-left', {
        userId,
        userName: socket.userName,
        leftAt: new Date(),
        reason: 'user-action',
      });

      console.log(
        `${socket.userName} покинул комнату ${roomId} (осталось: ${room.participants.size})`
      );

      // Удаляем пустую комнату
      if (room.participants.size === 0) {
        rooms.delete(roomId);
        totalRooms--;
        console.log(
          `Комната ${roomId} удалена (пустая). Активных комнат: ${totalRooms}`
        );
      }
    }

    socket.leave(roomId);
    socket.currentRoom = null;
  }

  // Функция получения статистики сервера
  function getServerStats() {
    return {
      totalConnections,
      totalRooms: rooms.size,
      activeUsers: userSockets.size,
      rooms: Array.from(rooms.entries()).map(([id, room]) => ({
        id,
        participantCount: room.participants.size,
        createdAt: room.createdAt,
      })),
      uptime: process.uptime(),
      timestamp: new Date(),
    };
  }

  // API endpoint для получения статистики (только для администраторов)
  io.engine.on('connection_error', (err) => {
    console.error('Socket.IO connection error:', err);
  });

  // Периодическая очистка неактивных комнат и статистики
  setInterval(() => {
    const now = new Date();
    const maxAge = 24 * 60 * 60 * 1000; // 24 часа
    const maxInactivity = 30 * 60 * 1000; // 30 минут

    // Очистка неактивных комнат
    for (const [roomId, room] of rooms.entries()) {
      if (room.participants.size === 0 && now - room.createdAt > maxAge) {
        rooms.delete(roomId);
        console.log(`Удалена неактивная комната: ${roomId}`);
      }
    }

    // Очистка старой статистики соединений
    for (const [socketId, stats] of connectionStats.entries()) {
      if (now - stats.lastActivity > maxInactivity) {
        connectionStats.delete(socketId);
      }
    }

    // Логируем статистику сервера каждый час
    const stats = getServerStats();
    console.log('📊 Статистика сервера:', {
      connections: stats.totalConnections,
      rooms: stats.totalRooms,
      users: stats.activeUsers,
      uptime: `${Math.floor(stats.uptime / 3600)}ч ${Math.floor(
        (stats.uptime % 3600) / 60
      )}м`,
    });
  }, 60 * 60 * 1000); // Проверяем каждый час

  // Мониторинг производительности каждые 5 минут
  setInterval(() => {
    const memUsage = process.memoryUsage();
    console.log('🔧 Использование памяти:', {
      rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
      heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
    });
  }, 5 * 60 * 1000);

  console.log('Socket.io сервер успешно инициализирован');
  res.end();
};

export default SocketHandler;
