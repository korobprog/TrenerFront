const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function verifySuperAdminRole() {
  try {
    console.log('🔍 Проверка роли пользователя korobprog@gmail.com...');

    // Получить информацию о пользователе
    const user = await prisma.user.findUnique({
      where: {
        email: 'korobprog@gmail.com',
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      console.error('❌ Пользователь korobprog@gmail.com не найден!');
      return;
    }

    console.log('✅ Информация о пользователе:');
    console.log(`   ID: ${user.id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Имя: ${user.name || 'Не указано'}`);
    console.log(`   Роль: ${user.role}`);
    console.log(`   Дата создания: ${user.createdAt}`);
    console.log(`   Последнее обновление: ${user.updatedAt}`);

    // Проверить роль
    if (user.role === 'superadmin') {
      console.log('\n🎉 УСПЕХ! Пользователь имеет роль superadmin');
    } else {
      console.log(
        `\n❌ ОШИБКА! Ожидалась роль 'superadmin', но получена '${user.role}'`
      );
    }

    // Проверить последние записи в логе администратора
    console.log('\n📋 Проверка логов администратора...');

    const adminLogs = await prisma.adminActionLog.findMany({
      where: {
        entityId: user.id,
        action: 'ROLE_CHANGE',
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 3,
      select: {
        id: true,
        action: true,
        details: true,
        createdAt: true,
      },
    });

    if (adminLogs.length > 0) {
      console.log(`✅ Найдено ${adminLogs.length} записей в логе:`);
      adminLogs.forEach((log, index) => {
        console.log(`   ${index + 1}. Действие: ${log.action}`);
        console.log(`      Время: ${log.createdAt}`);
        console.log(`      Детали: ${JSON.stringify(log.details, null, 6)}`);
      });
    } else {
      console.log('⚠️  Записи в логе администратора не найдены');
    }
  } catch (error) {
    console.error('❌ Ошибка при проверке роли пользователя:');
    console.error(error);
  } finally {
    await prisma.$disconnect();
    console.log('\n🔌 Соединение с базой данных закрыто');
  }
}

// Запуск проверки
console.log('🔍 Запуск проверки роли superadmin...');
console.log('📧 Проверяемый пользователь: korobprog@gmail.com');
console.log('='.repeat(50));

verifySuperAdminRole()
  .then(() => {
    console.log('\n✅ Проверка завершена');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Критическая ошибка проверки:');
    console.error(error);
    process.exit(1);
  });
