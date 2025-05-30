import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Генерирует уникальный код для видеокомнаты
 */
export function generateRoomCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Создает видеокомнату для mock-interview
 */
export async function createVideoRoomForInterview(mockInterviewId, roomData) {
  try {
    // Проверяем, существует ли уже комната для этого собеседования
    const existingRoom = await prisma.videoRoom.findFirst({
      where: {
        mockInterviewId: mockInterviewId,
        isActive: true,
      },
    });

    if (existingRoom) {
      throw new Error('Видеокомната для этого собеседования уже существует');
    }

    // Получаем информацию о собеседовании
    const mockInterview = await prisma.mockInterview.findUnique({
      where: { id: mockInterviewId },
      include: {
        interviewer: true,
        interviewee: true,
      },
    });

    if (!mockInterview) {
      throw new Error('Собеседование не найдено');
    }

    // Генерируем уникальный код комнаты
    let roomCode;
    let isCodeUnique = false;
    let attempts = 0;
    const maxAttempts = 10;

    while (!isCodeUnique && attempts < maxAttempts) {
      roomCode = generateRoomCode();
      const existingCodeRoom = await prisma.videoRoom.findUnique({
        where: { roomCode },
      });
      isCodeUnique = !existingCodeRoom;
      attempts++;
    }

    if (!isCodeUnique) {
      throw new Error('Не удалось сгенерировать уникальный код комнаты');
    }

    // Создаем видеокомнату
    const videoRoom = await prisma.videoRoom.create({
      data: {
        name:
          roomData.name ||
          `Собеседование ${new Date(
            mockInterview.scheduledTime
          ).toLocaleDateString('ru-RU')}`,
        description: roomData.description || `Видеокомната для собеседования`,
        hostId: mockInterview.interviewerId,
        roomCode,
        isPrivate: true,
        maxParticipants: roomData.maxParticipants || 2,
        scheduledStartTime:
          roomData.scheduledStartTime || mockInterview.scheduledTime,
        scheduledEndTime:
          roomData.scheduledEndTime ||
          new Date(
            new Date(mockInterview.scheduledTime).getTime() + 60 * 60 * 1000
          ), // +1 час
        mockInterviewId: mockInterviewId,
        settings: {
          autoJoinAudio: true,
          autoJoinVideo: false,
          recordingEnabled: false,
          maxVideoQuality: '720p',
        },
      },
    });

    // Добавляем участников
    const participants = [];

    // Добавляем интервьюера как хоста
    participants.push({
      videoRoomId: videoRoom.id,
      userId: mockInterview.interviewerId,
      role: 'host',
    });

    // Добавляем интервьюируемого как участника (если он есть)
    if (mockInterview.intervieweeId) {
      participants.push({
        videoRoomId: videoRoom.id,
        userId: mockInterview.intervieweeId,
        role: 'participant',
      });
    }

    await prisma.videoRoomParticipant.createMany({
      data: participants,
    });

    // Возвращаем созданную комнату с участниками
    return await prisma.videoRoom.findUnique({
      where: { id: videoRoom.id },
      include: {
        host: true,
        participants: {
          include: {
            user: true,
          },
        },
        mockInterview: {
          include: {
            interviewer: true,
            interviewee: true,
          },
        },
      },
    });
  } catch (error) {
    console.error('Ошибка создания видеокомнаты для собеседования:', error);
    throw error;
  }
}

/**
 * Получает видеокомнату для mock-interview
 */
export async function getVideoRoomForInterview(mockInterviewId) {
  try {
    const videoRoom = await prisma.videoRoom.findFirst({
      where: {
        mockInterviewId: mockInterviewId,
        isActive: true,
      },
      include: {
        host: true,
        participants: {
          include: {
            user: true,
          },
        },
        mockInterview: {
          include: {
            interviewer: true,
            interviewee: true,
          },
        },
      },
    });

    return videoRoom;
  } catch (error) {
    console.error('Ошибка получения видеокомнаты для собеседования:', error);
    throw error;
  }
}

/**
 * Получает видеокомнату по коду
 */
export async function getVideoRoomByCode(roomCode) {
  try {
    const videoRoom = await prisma.videoRoom.findUnique({
      where: { roomCode },
      include: {
        host: true,
        participants: {
          include: {
            user: true,
          },
        },
        mockInterview: {
          include: {
            interviewer: true,
            interviewee: true,
          },
        },
      },
    });

    return videoRoom;
  } catch (error) {
    console.error('Ошибка получения видеокомнаты по коду:', error);
    throw error;
  }
}

/**
 * Присоединяет пользователя к видеокомнате
 */
export async function joinVideoRoom(roomId, userId) {
  try {
    // Проверяем, существует ли комната
    const videoRoom = await prisma.videoRoom.findUnique({
      where: { id: roomId },
      include: {
        participants: true,
      },
    });

    if (!videoRoom) {
      throw new Error('Видеокомната не найдена');
    }

    if (!videoRoom.isActive) {
      throw new Error('Видеокомната неактивна');
    }

    // Проверяем, не превышено ли максимальное количество участников
    const activeParticipants = videoRoom.participants.filter((p) => !p.leftAt);
    if (activeParticipants.length >= videoRoom.maxParticipants) {
      throw new Error('Достигнуто максимальное количество участников');
    }

    // Проверяем, есть ли уже участник в комнате
    const existingParticipant = await prisma.videoRoomParticipant.findUnique({
      where: {
        videoRoomId_userId: {
          videoRoomId: roomId,
          userId: userId,
        },
      },
    });

    if (existingParticipant) {
      // Если участник уже есть, обновляем время присоединения
      return await prisma.videoRoomParticipant.update({
        where: { id: existingParticipant.id },
        data: {
          joinedAt: new Date(),
          leftAt: null,
        },
        include: {
          user: true,
          videoRoom: true,
        },
      });
    } else {
      // Создаем нового участника
      return await prisma.videoRoomParticipant.create({
        data: {
          videoRoomId: roomId,
          userId: userId,
          role: 'participant',
          joinedAt: new Date(),
        },
        include: {
          user: true,
          videoRoom: true,
        },
      });
    }
  } catch (error) {
    console.error('Ошибка присоединения к видеокомнате:', error);
    throw error;
  }
}

/**
 * Покидает видеокомнату
 */
export async function leaveVideoRoom(roomId, userId) {
  try {
    const participant = await prisma.videoRoomParticipant.findUnique({
      where: {
        videoRoomId_userId: {
          videoRoomId: roomId,
          userId: userId,
        },
      },
    });

    if (!participant) {
      throw new Error('Участник не найден в комнате');
    }

    // Обновляем время выхода и вычисляем общую продолжительность
    const leftAt = new Date();
    const totalDuration = participant.joinedAt
      ? Math.floor((leftAt - participant.joinedAt) / 1000)
      : 0;

    return await prisma.videoRoomParticipant.update({
      where: { id: participant.id },
      data: {
        leftAt,
        totalDuration: (participant.totalDuration || 0) + totalDuration,
      },
      include: {
        user: true,
        videoRoom: true,
      },
    });
  } catch (error) {
    console.error('Ошибка выхода из видеокомнаты:', error);
    throw error;
  }
}

/**
 * Проверяет права доступа пользователя к видеокомнате
 */
export async function checkVideoRoomAccess(roomId, userId) {
  try {
    const videoRoom = await prisma.videoRoom.findUnique({
      where: { id: roomId },
      include: {
        participants: true,
        mockInterview: true,
      },
    });

    if (!videoRoom) {
      return { hasAccess: false, reason: 'Комната не найдена' };
    }

    // Хост всегда имеет доступ
    if (videoRoom.hostId === userId) {
      return { hasAccess: true, role: 'host' };
    }

    // Проверяем участников
    const participant = videoRoom.participants.find((p) => p.userId === userId);
    if (participant) {
      return { hasAccess: true, role: participant.role };
    }

    // Если комната связана с mock-interview, проверяем права доступа
    if (videoRoom.mockInterview) {
      if (
        videoRoom.mockInterview.interviewerId === userId ||
        videoRoom.mockInterview.intervieweeId === userId
      ) {
        return { hasAccess: true, role: 'participant' };
      }
    }

    // Для публичных комнат доступ открыт всем
    if (!videoRoom.isPrivate) {
      return { hasAccess: true, role: 'participant' };
    }

    return { hasAccess: false, reason: 'Нет доступа к приватной комнате' };
  } catch (error) {
    console.error('Ошибка проверки доступа к видеокомнате:', error);
    return { hasAccess: false, reason: 'Ошибка проверки доступа' };
  }
}

/**
 * Обновляет статус mock-interview при создании видеокомнаты
 */
export async function updateMockInterviewStatus(mockInterviewId, status) {
  try {
    return await prisma.mockInterview.update({
      where: { id: mockInterviewId },
      data: { status },
      include: {
        interviewer: true,
        interviewee: true,
        interviewFeedback: true,
      },
    });
  } catch (error) {
    console.error('Ошибка обновления статуса собеседования:', error);
    throw error;
  }
}

/**
 * Создает календарное событие для видеокомнаты
 */
export async function createCalendarEventForVideoRoom(videoRoomId, eventData) {
  try {
    const videoRoom = await prisma.videoRoom.findUnique({
      where: { id: videoRoomId },
      include: { mockInterview: true },
    });

    if (!videoRoom) {
      throw new Error('Видеокомната не найдена');
    }

    const calendarEvent = await prisma.customCalendarEvent.create({
      data: {
        title: eventData.title || `Видеоконференция: ${videoRoom.name}`,
        description: eventData.description || videoRoom.description,
        startTime: eventData.startTime || videoRoom.scheduledStartTime,
        endTime: eventData.endTime || videoRoom.scheduledEndTime,
        eventType: 'interview',
        videoRoomId: videoRoomId,
        organizerId: videoRoom.hostId,
        attendeeIds: eventData.attendeeIds || [],
        meetingLink: `/video-conference/room/${videoRoom.roomCode}`,
        reminderMinutes: eventData.reminderMinutes || 15,
      },
    });

    return calendarEvent;
  } catch (error) {
    console.error('Ошибка создания календарного события:', error);
    throw error;
  }
}

export default {
  generateRoomCode,
  createVideoRoomForInterview,
  getVideoRoomForInterview,
  getVideoRoomByCode,
  joinVideoRoom,
  leaveVideoRoom,
  checkVideoRoomAccess,
  updateMockInterviewStatus,
  createCalendarEventForVideoRoom,
};
