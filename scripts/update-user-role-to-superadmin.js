const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

async function updateUserRole() {
  const targetUserId = 'cmbbcczhj000emkxw3fub8ld3';
  const targetEmail = 'makstreid@yandex.ru';
  const newRole = 'superadmin';

  console.log('🔄 Начинаем процесс изменения роли пользователя...');
  console.log(`📧 Email: ${targetEmail}`);
  console.log(`🆔 ID: ${targetUserId}`);
  console.log(`🎯 Новая роль: ${newRole}`);
  console.log('─'.repeat(50));

  try {
    // 1. Проверяем существование пользователя и его текущую роль
    console.log('1️⃣ Проверяем текущую информацию о пользователе...');

    const currentUser = await prisma.user.findUnique({
      where: {
        id: targetUserId,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        lastLoginAt: true,
      },
    });

    if (!currentUser) {
      throw new Error(
        `❌ Пользователь с ID ${targetUserId} не найден в базе данных`
      );
    }

    console.log('✅ Пользователь найден:');
    console.log(`   📧 Email: ${currentUser.email}`);
    console.log(`   👤 Имя: ${currentUser.name || 'Не указано'}`);
    console.log(`   🔑 Текущая роль: ${currentUser.role}`);
    console.log(
      `   📅 Дата регистрации: ${currentUser.createdAt.toISOString()}`
    );
    console.log(
      `   🕐 Последний вход: ${
        currentUser.lastLoginAt
          ? currentUser.lastLoginAt.toISOString()
          : 'Никогда'
      }`
    );

    // 2. Проверяем соответствие email
    if (currentUser.email !== targetEmail) {
      throw new Error(
        `❌ Email не совпадает! Ожидался: ${targetEmail}, найден: ${currentUser.email}`
      );
    }

    // 3. Проверяем, не является ли пользователь уже superadmin
    if (currentUser.role === newRole) {
      console.log(
        `⚠️ Пользователь уже имеет роль "${newRole}". Операция не требуется.`
      );
      return;
    }

    console.log('─'.repeat(50));

    // 4. Выполняем обновление роли
    console.log('2️⃣ Обновляем роль пользователя...');

    const updatedUser = await prisma.user.update({
      where: {
        id: targetUserId,
      },
      data: {
        role: newRole,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        updatedAt: true,
      },
    });

    console.log('✅ Роль успешно обновлена!');
    console.log(`   🆔 ID: ${updatedUser.id}`);
    console.log(`   📧 Email: ${updatedUser.email}`);
    console.log(`   🔑 Новая роль: ${updatedUser.role}`);
    console.log(
      `   🕐 Время обновления: ${updatedUser.updatedAt.toISOString()}`
    );

    console.log('─'.repeat(50));

    // 5. Проверяем результат
    console.log('3️⃣ Проверяем результат операции...');

    const verificationUser = await prisma.user.findUnique({
      where: {
        id: targetUserId,
      },
      select: {
        id: true,
        email: true,
        role: true,
        updatedAt: true,
      },
    });

    if (verificationUser && verificationUser.role === newRole) {
      console.log('✅ Проверка пройдена успешно!');
      console.log(`   🎯 Роль подтверждена: ${verificationUser.role}`);
      console.log(
        `   ⏰ Последнее обновление: ${verificationUser.updatedAt.toISOString()}`
      );
    } else {
      throw new Error('❌ Ошибка проверки: роль не была обновлена корректно');
    }

    console.log('─'.repeat(50));

    // 6. Дополнительная информация о других superadmin пользователях
    console.log('4️⃣ Информация о всех superadmin пользователях:');

    const allSuperAdmins = await prisma.user.findMany({
      where: {
        role: 'superadmin',
      },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        lastLoginAt: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    console.log(`📊 Всего superadmin пользователей: ${allSuperAdmins.length}`);
    allSuperAdmins.forEach((admin, index) => {
      console.log(
        `   ${index + 1}. ${admin.email} (${admin.name || 'Без имени'})`
      );
      console.log(`      🆔 ID: ${admin.id}`);
      console.log(`      📅 Регистрация: ${admin.createdAt.toISOString()}`);
      console.log(
        `      🕐 Последний вход: ${
          admin.lastLoginAt ? admin.lastLoginAt.toISOString() : 'Никогда'
        }`
      );
    });

    console.log('─'.repeat(50));
    console.log('🎉 ОПЕРАЦИЯ ЗАВЕРШЕНА УСПЕШНО!');
    console.log(`✅ Пользователь ${targetEmail} теперь имеет роль ${newRole}`);
  } catch (error) {
    console.error('❌ ОШИБКА ПРИ ВЫПОЛНЕНИИ ОПЕРАЦИИ:');
    console.error(`   💥 Сообщение: ${error.message}`);
    console.error(`   📍 Стек: ${error.stack}`);

    // Попытка отката (если это возможно)
    try {
      console.log('🔄 Попытка получения текущего состояния пользователя...');
      const currentState = await prisma.user.findUnique({
        where: { id: targetUserId },
        select: { email: true, role: true },
      });

      if (currentState) {
        console.log(
          `📊 Текущее состояние: ${currentState.email} - роль: ${currentState.role}`
        );
      }
    } catch (rollbackError) {
      console.error(
        '❌ Ошибка при получении текущего состояния:',
        rollbackError.message
      );
    }

    throw error;
  } finally {
    // 7. Закрываем соединение с базой данных
    console.log('🔌 Закрываем соединение с базой данных...');
    await prisma.$disconnect();
    console.log('✅ Соединение закрыто');
  }
}

// Запускаем скрипт
updateUserRole()
  .then(() => {
    console.log('🏁 Скрипт завершен успешно');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Скрипт завершен с ошибкой:', error.message);
    process.exit(1);
  });
