/**
 * Скрипт для проверки состояния базы данных после миграции
 * Проверяет наличие новых полей в таблице VideoRoom
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function verifyMigration() {
  console.log('🔍 === ПРОВЕРКА СОСТОЯНИЯ БАЗЫ ДАННЫХ ПОСЛЕ МИГРАЦИИ ===\n');

  try {
    // 1. Проверяем подключение к базе данных
    console.log('📡 Проверка подключения к базе данных...');
    await prisma.$connect();
    console.log('✅ Подключение к базе данных успешно\n');

    // 2. Проверяем структуру таблицы VideoRoom
    console.log('🏗️ Проверка структуры таблицы VideoRoom...');

    // Получаем информацию о столбцах таблицы VideoRoom
    const tableInfo = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'VideoRoom' 
      AND table_schema = 'public'
      ORDER BY ordinal_position;
    `;

    console.log('📋 Столбцы таблицы VideoRoom:');
    tableInfo.forEach((column, index) => {
      const nullable = column.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
      const defaultValue = column.column_default
        ? ` DEFAULT ${column.column_default}`
        : '';
      console.log(
        `   ${index + 1}. ${column.column_name} (${
          column.data_type
        }) ${nullable}${defaultValue}`
      );
    });

    // 3. Проверяем наличие новых полей
    console.log('\n🎯 Проверка новых полей:');
    const requiredFields = ['isPrivate', 'recordingEnabled', 'settings'];
    const existingFields = tableInfo.map((col) => col.column_name);

    requiredFields.forEach((field) => {
      if (existingFields.includes(field)) {
        console.log(`   ✅ ${field} - присутствует`);
      } else {
        console.log(`   ❌ ${field} - отсутствует`);
      }
    });

    // 4. Проверяем существующие VideoRoom записи
    console.log('\n📊 Проверка существующих записей VideoRoom...');
    const roomCount = await prisma.videoRoom.count();
    console.log(`   Общее количество комнат: ${roomCount}`);

    if (roomCount > 0) {
      // Получаем несколько записей для проверки новых полей
      const sampleRooms = await prisma.videoRoom.findMany({
        take: 3,
        select: {
          id: true,
          code: true,
          name: true,
          isPrivate: true,
          recordingEnabled: true,
          settings: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      console.log('\n📝 Примеры записей с новыми полями:');
      sampleRooms.forEach((room, index) => {
        console.log(`   Комната ${index + 1}:`);
        console.log(`     ID: ${room.id}`);
        console.log(`     Код: ${room.code}`);
        console.log(`     Название: ${room.name}`);
        console.log(`     Приватная: ${room.isPrivate}`);
        console.log(`     Запись включена: ${room.recordingEnabled}`);
        console.log(
          `     Настройки: ${
            room.settings ? JSON.stringify(room.settings) : 'null'
          }`
        );
        console.log(`     Создана: ${room.createdAt.toISOString()}`);
        console.log('');
      });
    }

    // 5. Проверяем MockInterview записи с videoType
    console.log('📊 Проверка записей MockInterview...');
    const interviewCount = await prisma.mockInterview.count();
    console.log(`   Общее количество интервью: ${interviewCount}`);

    if (interviewCount > 0) {
      // Проверяем распределение по типам видео
      const videoTypeStats = await prisma.mockInterview.groupBy({
        by: ['videoType'],
        _count: {
          videoType: true,
        },
      });

      console.log('\n📈 Статистика по типам видео:');
      videoTypeStats.forEach((stat) => {
        console.log(
          `   ${stat.videoType || 'null'}: ${stat._count.videoType} интервью`
        );
      });

      // Получаем примеры интервью с videoRoomId
      const interviewsWithVideoRoom = await prisma.mockInterview.findMany({
        where: {
          videoRoomId: {
            not: null,
          },
        },
        take: 3,
        select: {
          id: true,
          videoType: true,
          videoRoomId: true,
          meetingLink: true,
          status: true,
          scheduledTime: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      if (interviewsWithVideoRoom.length > 0) {
        console.log('\n🔗 Интервью со связанными VideoRoom:');
        interviewsWithVideoRoom.forEach((interview, index) => {
          console.log(`   Интервью ${index + 1}:`);
          console.log(`     ID: ${interview.id}`);
          console.log(`     Тип видео: ${interview.videoType}`);
          console.log(`     VideoRoom ID: ${interview.videoRoomId}`);
          console.log(`     Ссылка: ${interview.meetingLink}`);
          console.log(`     Статус: ${interview.status}`);
          console.log(`     Время: ${interview.scheduledTime.toISOString()}`);
          console.log('');
        });
      } else {
        console.log('   ℹ️ Интервью со связанными VideoRoom не найдены');
      }
    }

    // 6. Проверяем последние миграции
    console.log('📜 Проверка последних миграций...');
    const migrations = await prisma.$queryRaw`
      SELECT migration_name, started_at, finished_at
      FROM "_prisma_migrations"
      ORDER BY started_at DESC
      LIMIT 5;
    `;

    console.log('   Последние 5 миграций:');
    migrations.forEach((migration, index) => {
      const duration = migration.finished_at
        ? `${Math.round(
            (new Date(migration.finished_at) - new Date(migration.started_at)) /
              1000
          )}s`
        : 'в процессе';
      console.log(`   ${index + 1}. ${migration.migration_name} (${duration})`);
    });

    console.log('\n✅ === ПРОВЕРКА ЗАВЕРШЕНА УСПЕШНО ===');
  } catch (error) {
    console.error('\n❌ Ошибка при проверке базы данных:', error);

    if (error.code === 'P1001') {
      console.log('\n💡 Возможные причины:');
      console.log('   - База данных не запущена');
      console.log('   - Неверные параметры подключения в .env');
      console.log('   - Проблемы с сетью');
    } else if (error.code === 'P2021') {
      console.log(
        '\n💡 Таблица не существует. Возможно, миграции не применены.'
      );
      console.log('   Выполните: npx prisma migrate dev');
    }

    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Функция для создания тестовой VideoRoom
async function createTestVideoRoom() {
  console.log('\n🧪 === СОЗДАНИЕ ТЕСТОВОЙ VIDEOROOM ===');

  try {
    // Проверяем, есть ли пользователи для создания комнаты
    const userCount = await prisma.user.count();
    if (userCount === 0) {
      console.log(
        '❌ Нет пользователей в базе данных для создания тестовой комнаты'
      );
      return;
    }

    // Получаем первого пользователя
    const testUser = await prisma.user.findFirst({
      select: { id: true, name: true, email: true },
    });

    // Генерируем уникальный код комнаты
    const roomCode =
      'TEST' + Math.random().toString(36).substring(2, 8).toUpperCase();

    const testRoom = await prisma.videoRoom.create({
      data: {
        name: 'Тестовая комната после миграции',
        description: 'Комната для проверки новых полей',
        code: roomCode,
        hostId: testUser.id,
        isPrivate: true,
        recordingEnabled: false,
        maxParticipants: 5,
        settings: {
          allowScreenShare: true,
          allowChat: true,
          autoRecord: false,
          quality: 'HD',
          testField: 'migration-test',
        },
      },
    });

    console.log('✅ Тестовая VideoRoom создана успешно:');
    console.log(`   ID: ${testRoom.id}`);
    console.log(`   Код: ${testRoom.code}`);
    console.log(`   Название: ${testRoom.name}`);
    console.log(`   Хост: ${testUser.name} (${testUser.email})`);
    console.log(`   Приватная: ${testRoom.isPrivate}`);
    console.log(`   Запись: ${testRoom.recordingEnabled}`);
    console.log(`   Настройки: ${JSON.stringify(testRoom.settings, null, 2)}`);

    return testRoom;
  } catch (error) {
    console.error('❌ Ошибка при создании тестовой комнаты:', error);
    throw error;
  }
}

// Основная функция
async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--create-test')) {
    await createTestVideoRoom();
  } else {
    await verifyMigration();
  }
}

// Запуск скрипта
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  verifyMigration,
  createTestVideoRoom,
};
