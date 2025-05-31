import { Server } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';
import prisma from '../../lib/prisma';

// Хранилище активных комнат и участников
const rooms = new Map();
const participants = new Map();

// Функция для проверки аутентификации пользователя
async function authenticateUser(socket, data) {
  try {
    const { sessionToken, userId } = data;

    if (!sessionToken || !userId) {
      return null;
    }

    // Проверяем пользователя в базе данных
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isBlocked: true,
      },
    });

    if (!user || user.isBlocked) {
      return null;
    }

    return user;
  } catch (error) {
    console.error('Ошибка аутентификации пользователя:', error);
    return null;
  }
}

// Функция для логирования активности видеоконференций
async function logVideoConferenceActivity(
  userId,
  roomId,
  action,
  details = {}
) {
  try {
    await prisma.videoConferenceLog.create({
      data: {
        userId,
        roomId,
        action,
        details: JSON.stringify(details),
        timestamp: new Date(),
      },
    });
  } catch (error) {
    console.error('Ошибка логирования активности видеоконференции:', error);
  }
}

export default function handler(req, res) {
  if (!res.socket.server.io) {
    console.log('Инициализация Socket.IO сервера...');

    const io = new Server(res.socket.server, {
      path: '/api/socket-server',
      addTrailingSlash: false,
      cors: {
        origin:
          process.env.NODE_ENV === 'production'
            ? process.env.NEXTAUTH_URL
            : 'http://localhost:3000',
        methods: ['GET', 'POST'],
      },
    });

    // Обработчики событий Socket.IO
    io.on('connection', (socket) => {
      console.log(`Пользователь подключился: ${socket.id}`);

      // Создание новой комнаты с аутентификацией
      socket.on('create-room', async (data) => {
        const { roomId, userId, userName, sessionToken } = data;

        // Проверяем аутентификацию
        const user = await authenticateUser(socket, { sessionToken, userId });
        if (!user) {
          socket.emit('error', { message: 'Не авторизован' });
          return;
        }

        if (!rooms.has(roomId)) {
          rooms.set(roomId, {
            id: roomId,
            host: userId,
            participants: new Set(),
            createdAt: new Date(),
            isActive: true,
            hostName: user.name,
          });

          // Логируем создание комнаты
          await logVideoConferenceActivity(userId, roomId, 'room_created', {
            hostName: user.name,
            hostEmail: user.email,
          });
        }

        const room = rooms.get(roomId);
        room.participants.add(userId);

        participants.set(socket.id, {
          userId,
          userName: user.name,
          userEmail: user.email,
          roomId,
          isHost: room.host === userId,
          joinedAt: new Date(),
        });

        socket.join(roomId);

        socket.emit('room-created', {
          roomId,
          isHost: true,
          participants: Array.from(room.participants),
          hostName: room.hostName,
        });

        console.log(
          `Комната создана: ${roomId} пользователем ${user.name} (${user.email})`
        );
      });

      // Присоединение к комнате с аутентификацией
      socket.on('join-room', async (data) => {
        const { roomId, userId, sessionToken } = data;

        // Проверяем аутентификацию
        const user = await authenticateUser(socket, { sessionToken, userId });
        if (!user) {
          socket.emit('error', { message: 'Не авторизован' });
          return;
        }

        if (!rooms.has(roomId)) {
          socket.emit('error', { message: 'Комната не найдена' });
          return;
        }

        const room = rooms.get(roomId);
        if (!room.isActive) {
          socket.emit('error', { message: 'Комната неактивна' });
          return;
        }

        room.participants.add(userId);

        participants.set(socket.id, {
          userId,
          userName: user.name,
          userEmail: user.email,
          roomId,
          isHost: room.host === userId,
          joinedAt: new Date(),
        });

        socket.join(roomId);

        // Логируем присоединение к комнате
        await logVideoConferenceActivity(userId, roomId, 'user_joined', {
          userName: user.name,
          userEmail: user.email,
        });

        // Уведомляем всех участников о новом пользователе
        socket.to(roomId).emit('user-joined', {
          userId,
          userName: user.name,
          socketId: socket.id,
        });

        // Отправляем новому участнику список существующих участников
        const roomParticipants = Array.from(
          io.sockets.adapter.rooms.get(roomId) || []
        )
          .filter((id) => id !== socket.id)
          .map((id) => {
            const participant = participants.get(id);
            return participant
              ? {
                  userId: participant.userId,
                  userName: participant.userName,
                  socketId: id,
                }
              : null;
          })
          .filter(Boolean);

        socket.emit('room-joined', {
          roomId,
          participants: roomParticipants,
          isHost: room.host === userId,
          hostName: room.hostName,
        });

        console.log(
          `${user.name} (${user.email}) присоединился к комнате ${roomId}`
        );
      });

      // WebRTC Signaling - Offer
      socket.on('offer', (data) => {
        const { targetSocketId, offer, userId } = data;
        socket.to(targetSocketId).emit('offer', {
          offer,
          fromSocketId: socket.id,
          fromUserId: userId,
        });
      });

      // WebRTC Signaling - Answer
      socket.on('answer', (data) => {
        const { targetSocketId, answer, userId } = data;
        socket.to(targetSocketId).emit('answer', {
          answer,
          fromSocketId: socket.id,
          fromUserId: userId,
        });
      });

      // WebRTC Signaling - ICE Candidate
      socket.on('ice-candidate', (data) => {
        const { targetSocketId, candidate, userId } = data;
        socket.to(targetSocketId).emit('ice-candidate', {
          candidate,
          fromSocketId: socket.id,
          fromUserId: userId,
        });
      });

      // Управление медиа
      socket.on('toggle-video', (data) => {
        const participant = participants.get(socket.id);
        if (participant) {
          socket.to(participant.roomId).emit('user-video-toggled', {
            userId: participant.userId,
            videoEnabled: data.videoEnabled,
          });
        }
      });

      socket.on('toggle-audio', (data) => {
        const participant = participants.get(socket.id);
        if (participant) {
          socket.to(participant.roomId).emit('user-audio-toggled', {
            userId: participant.userId,
            audioEnabled: data.audioEnabled,
          });
        }
      });

      socket.on('toggle-screen-share', (data) => {
        const participant = participants.get(socket.id);
        if (participant) {
          socket.to(participant.roomId).emit('user-screen-share-toggled', {
            userId: participant.userId,
            screenShareEnabled: data.screenShareEnabled,
          });
        }
      });

      // Чат сообщения
      socket.on('chat-message', (data) => {
        const participant = participants.get(socket.id);
        if (participant) {
          const message = {
            id: uuidv4(),
            userId: participant.userId,
            userName: participant.userName,
            message: data.message,
            timestamp: new Date(),
          };

          io.to(participant.roomId).emit('chat-message', message);
        }
      });

      // Отключение пользователя с логированием
      socket.on('disconnect', async () => {
        const participant = participants.get(socket.id);

        if (participant) {
          const { roomId, userId, userName, userEmail } = participant;

          // Логируем отключение пользователя
          await logVideoConferenceActivity(
            userId,
            roomId,
            'user_disconnected',
            {
              userName,
              userEmail,
              disconnectTime: new Date(),
            }
          );

          // Удаляем участника из комнаты
          if (rooms.has(roomId)) {
            const room = rooms.get(roomId);
            room.participants.delete(userId);

            // Если комната пуста, удаляем её
            if (room.participants.size === 0) {
              rooms.delete(roomId);

              // Логируем закрытие комнаты
              await logVideoConferenceActivity(userId, roomId, 'room_closed', {
                reason: 'empty_room',
                lastUser: userName,
              });

              console.log(`Комната ${roomId} удалена (пуста)`);
            } else {
              // Уведомляем остальных участников
              socket.to(roomId).emit('user-left', {
                userId,
                userName,
                socketId: socket.id,
              });

              // Если хост покинул комнату, назначаем нового хоста
              if (room.host === userId && room.participants.size > 0) {
                const newHost = Array.from(room.participants)[0];
                room.host = newHost;

                // Логируем смену хоста
                await logVideoConferenceActivity(
                  newHost,
                  roomId,
                  'host_changed',
                  {
                    previousHost: userId,
                    newHost: newHost,
                  }
                );

                socket.to(roomId).emit('host-changed', {
                  newHostId: newHost,
                });
              }
            }
          }

          participants.delete(socket.id);
          console.log(`${userName} (${userEmail}) покинул комнату ${roomId}`);
        }

        console.log(`Пользователь отключился: ${socket.id}`);
      });

      // Получение информации о комнате
      socket.on('get-room-info', (data) => {
        const { roomId } = data;

        if (rooms.has(roomId)) {
          const room = rooms.get(roomId);
          socket.emit('room-info', {
            roomId,
            participantCount: room.participants.size,
            isActive: room.isActive,
            createdAt: room.createdAt,
          });
        } else {
          socket.emit('room-info', null);
        }
      });
    });

    res.socket.server.io = io;
    console.log('Socket.IO сервер инициализирован');
  }

  res.end();
}

export const config = {
  api: {
    bodyParser: false,
  },
};
