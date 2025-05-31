const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function makeKorobprogSuperAdmin() {
  try {
    console.log('🔍 Поиск пользователя korobprog@gmail.com...');

    // Найти пользователя по email
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
      },
    });

    if (!user) {
      console.error('❌ Пользователь korobprog@gmail.com не найден в системе!');
      return;
    }

    console.log('✅ Пользователь найден:');
    console.log(`   ID: ${user.id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Имя: ${user.name || 'Не указано'}`);
    console.log(`   Текущая роль: ${user.role}`);
    console.log(`   Дата регистрации: ${user.createdAt}`);

    // Проверить, не является ли пользователь уже супер администратором
    if (user.role === 'superadmin') {
      console.log('ℹ️  Пользователь уже имеет роль superadmin');
      return;
    }

    console.log('\n🔄 Изменение роли на superadmin...');

    // Обновить роль пользователя
    const updatedUser = await prisma.user.update({
      where: {
        email: 'korobprog@gmail.com',
      },
      data: {
        role: 'superadmin',
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        updatedAt: true,
      },
    });

    console.log('✅ Роль успешно изменена!');
    console.log(`   ID: ${updatedUser.id}`);
    console.log(`   Email: ${updatedUser.email}`);
    console.log(`   Имя: ${updatedUser.name || 'Не указано'}`);
    console.log(`   Новая роль: ${updatedUser.role}`);
    console.log(`   Время обновления: ${updatedUser.updatedAt}`);

    // Логирование операции в AdminActionLog
    console.log('\n📝 Создание записи в логе администратора...');

    await prisma.adminActionLog.create({
      data: {
        adminId: updatedUser.id, // Сам пользователь как инициатор
        action: 'ROLE_CHANGE',
        entityType: 'User',
        entityId: updatedUser.id,
        details: {
          previousRole: user.role,
          newRole: 'superadmin',
          email: updatedUser.email,
          changedBy: 'system_script',
          reason: 'Manual superadmin assignment via script',
        },
      },
    });

    console.log('✅ Запись в логе администратора создана');

    console.log('\n🎉 ОПЕРАЦИЯ ЗАВЕРШЕНА УСПЕШНО!');
    console.log(
      `Пользователь ${updatedUser.email} теперь имеет роль superadmin`
    );
  } catch (error) {
    console.error('❌ Ошибка при изменении роли пользователя:');
    console.error(error);

    if (error.code === 'P2002') {
      console.error('Ошибка уникальности данных');
    } else if (error.code === 'P2025') {
      console.error('Пользователь не найден');
    }
  } finally {
    // Закрыть соединение с базой данных
    await prisma.$disconnect();
    console.log('\n🔌 Соединение с базой данных закрыто');
  }
}

// Запуск скрипта
console.log('🚀 Запуск скрипта назначения superadmin роли...');
console.log('📧 Целевой пользователь: korobprog@gmail.com');
console.log('🎯 Целевая роль: superadmin');
console.log('='.repeat(50));

makeKorobprogSuperAdmin()
  .then(() => {
    console.log('\n✅ Скрипт выполнен успешно');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Критическая ошибка скрипта:');
    console.error(error);
    process.exit(1);
  });
