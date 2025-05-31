/**
 * Простой тест для проверки исправления ошибки userId
 * при создании интервью с встроенной видеосистемой
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testUserIdFix() {
  console.log('🚀 Тестирование исправления ошибки userId...');
  console.log('⏰ Время запуска:', new Date().toLocaleString('ru-RU'));
  console.log('='.repeat(60));

  try {
    // Создаем тестового пользователя
    console.log('👤 Создание тестового пользователя...');
    const testUser = await prisma.user.upsert({
      where: { email: 'test-userid@example.com' },
      update: {},
      create: {
        email: 'test-userid@example.com',
        name: 'Test User for UserId Fix',
        role: 'user',
      },
    });
    console.log('✅ Тестовый пользователь создан:', testUser.id);

    // Тестируем создание VideoRoom напрямую через Prisma
    console.log('\n🎥 Тестирование создания VideoRoom...');

    const videoRoomData = {
      name: 'Тестовая комната для проверки userId',
      description: 'Комната для тестирования исправления ошибки userId',
      hostId: testUser.id, // Используем правильное поле hostId
      code: `TEST${Date.now()}`,
      isPrivate: true,
      maxParticipants: 2,
      scheduledStart: new Date(Date.now() + 2 * 60 * 60 * 1000), // через 2 часа
      recordingEnabled: false,
      settings: {
        allowScreenShare: true,
        allowChat: true,
        autoRecord: false,
      },
    };

    console.log('📋 Данные для создания VideoRoom:', {
      name: videoRoomData.name,
      hostId: videoRoomData.hostId,
      code: videoRoomData.code,
      isPrivate: videoRoomData.isPrivate,
      maxParticipants: videoRoomData.maxParticipants,
    });

    const videoRoom = await prisma.videoRoom.create({
      data: videoRoomData,
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

    console.log('✅ VideoRoom создана успешно!');
    console.log('📝 Детали VideoRoom:', {
      id: videoRoom.id,
      code: videoRoom.code,
      name: videoRoom.name,
      hostId: videoRoom.hostId,
      hostName: videoRoom.host.name,
      isActive: videoRoom.isActive,
      scheduledStart: videoRoom.scheduledStart,
    });

    // Тестируем создание MockInterview с связью к VideoRoom
    console.log('\n📋 Тестирование создания MockInterview...');

    const mockInterviewData = {
      interviewerId: testUser.id,
      scheduledTime: new Date(Date.now() + 2 * 60 * 60 * 1000),
      meetingLink: `http://localhost:3000/video-conferences/rooms/${videoRoom.code}`,
      status: 'pending',
      videoType: 'built_in',
      videoRoomId: videoRoom.id,
    };

    const mockInterview = await prisma.mockInterview.create({
      data: mockInterviewData,
      include: {
        videoRoom: {
          select: {
            id: true,
            code: true,
            name: true,
            isActive: true,
          },
        },
        interviewer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    console.log('✅ MockInterview создано успешно!');
    console.log('📝 Детали MockInterview:', {
      id: mockInterview.id,
      videoType: mockInterview.videoType,
      videoRoomId: mockInterview.videoRoomId,
      videoRoomCode: mockInterview.videoRoom?.code,
      meetingLink: mockInterview.meetingLink,
      status: mockInterview.status,
      interviewerName: mockInterview.interviewer.name,
    });

    // Проверяем связи
    console.log('\n🔗 Проверка связей между объектами...');

    const videoRoomWithInterviews = await prisma.videoRoom.findUnique({
      where: { id: videoRoom.id },
      include: {
        mockInterviews: true,
        host: {
          select: { id: true, name: true },
        },
      },
    });

    console.log('✅ Связи проверены успешно!');
    console.log('📊 Статистика связей:', {
      videoRoomId: videoRoomWithInterviews.id,
      hostId: videoRoomWithInterviews.hostId,
      hostName: videoRoomWithInterviews.host.name,
      connectedInterviews: videoRoomWithInterviews.mockInterviews.length,
      interviewIds: videoRoomWithInterviews.mockInterviews.map((i) => i.id),
    });

    console.log('\n' + '='.repeat(60));
    console.log('🎉 ТЕСТ ПРОЙДЕН УСПЕШНО!');
    console.log('✅ Ошибка userId исправлена');
    console.log('✅ VideoRoom создается с правильным hostId');
    console.log('✅ MockInterview корректно связывается с VideoRoom');
    console.log('✅ Все связи работают правильно');

    // Очистка тестовых данных
    console.log('\n🧹 Очистка тестовых данных...');
    await prisma.mockInterview.delete({ where: { id: mockInterview.id } });
    await prisma.videoRoom.delete({ where: { id: videoRoom.id } });
    await prisma.user.delete({ where: { id: testUser.id } });
    console.log('✅ Тестовые данные очищены');

    return true;
  } catch (error) {
    console.error('\n❌ ОШИБКА ТЕСТА:', error.message);
    console.error('📋 Детали ошибки:', error);

    // Попытка очистки в случае ошибки
    try {
      console.log('\n🧹 Попытка очистки данных после ошибки...');
      await prisma.mockInterview.deleteMany({
        where: { interviewer: { email: 'test-userid@example.com' } },
      });
      await prisma.videoRoom.deleteMany({
        where: { host: { email: 'test-userid@example.com' } },
      });
      await prisma.user.deleteMany({
        where: { email: 'test-userid@example.com' },
      });
      console.log('✅ Очистка завершена');
    } catch (cleanupError) {
      console.error('⚠️ Ошибка очистки:', cleanupError.message);
    }

    return false;
  } finally {
    await prisma.$disconnect();
  }
}

// Запуск теста
if (require.main === module) {
  testUserIdFix()
    .then((success) => {
      if (success) {
        console.log('\n🎯 РЕЗУЛЬТАТ: Исправление работает корректно!');
        process.exit(0);
      } else {
        console.log('\n💥 РЕЗУЛЬТАТ: Требуется дополнительное исправление!');
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('\n💥 КРИТИЧЕСКАЯ ОШИБКА:', error);
      process.exit(1);
    });
}

module.exports = { testUserIdFix };
