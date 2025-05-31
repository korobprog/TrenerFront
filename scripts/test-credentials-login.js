const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function createTestUser() {
  try {
    console.log(
      '🔧 Создание тестового пользователя для проверки входа по логину и паролю...\n'
    );

    // Проверяем, существует ли уже тестовый пользователь
    const existingUser = await prisma.user.findUnique({
      where: { email: 'test@example.com' },
    });

    if (existingUser) {
      console.log(
        '⚠️ Тестовый пользователь уже существует, обновляем пароль...'
      );

      // Хешируем новый пароль
      const hashedPassword = await bcrypt.hash('testpassword123', 12);

      // Обновляем пользователя
      const updatedUser = await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          password: hashedPassword,
          name: 'Тестовый Пользователь',
          isBlocked: false,
        },
      });

      console.log('✅ Пользователь обновлен:');
      console.log(`   📧 Email: ${updatedUser.email}`);
      console.log(`   👤 Имя: ${updatedUser.name}`);
      console.log(`   🔐 Пароль: testpassword123`);
      console.log(`   🆔 ID: ${updatedUser.id}`);

      return updatedUser;
    }

    // Хешируем пароль
    const hashedPassword = await bcrypt.hash('testpassword123', 12);

    // Создаем нового пользователя
    const newUser = await prisma.user.create({
      data: {
        email: 'test@example.com',
        name: 'Тестовый Пользователь',
        password: hashedPassword,
        role: 'user',
        isBlocked: false,
      },
    });

    console.log('✅ Тестовый пользователь создан:');
    console.log(`   📧 Email: ${newUser.email}`);
    console.log(`   👤 Имя: ${newUser.name}`);
    console.log(`   🔐 Пароль: testpassword123`);
    console.log(`   🆔 ID: ${newUser.id}`);

    // Создаем настройки аутентификации для пользователя
    try {
      await prisma.userAuthSettings.create({
        data: {
          userId: newUser.id,
          enableEmailAuth: true,
          enableGoogleAuth: true,
          enableGithubAuth: true,
          enableCredentialsAuth: true,
          requireTwoFactor: false,
          sessionTimeout: 24,
        },
      });
      console.log('✅ Настройки аутентификации созданы');
    } catch (authError) {
      console.log(
        '⚠️ Настройки аутентификации уже существуют или произошла ошибка:',
        authError.message
      );
    }

    // Создаем запись баллов для пользователя
    try {
      await prisma.userPoints.create({
        data: {
          userId: newUser.id,
          points: 1,
        },
      });
      console.log('✅ Начальные баллы созданы');
    } catch (pointsError) {
      console.log(
        '⚠️ Баллы уже существуют или произошла ошибка:',
        pointsError.message
      );
    }

    return newUser;
  } catch (error) {
    console.error('❌ Ошибка при создании тестового пользователя:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function testPasswordVerification() {
  try {
    console.log('\n🔍 Тестирование проверки пароля...');

    const user = await prisma.user.findUnique({
      where: { email: 'test@example.com' },
    });

    if (!user || !user.password) {
      console.log('❌ Пользователь не найден или пароль не установлен');
      return;
    }

    // Тестируем правильный пароль
    const isValidPassword = await bcrypt.compare(
      'testpassword123',
      user.password
    );
    console.log(
      `✅ Проверка правильного пароля: ${
        isValidPassword ? 'УСПЕШНО' : 'ОШИБКА'
      }`
    );

    // Тестируем неправильный пароль
    const isInvalidPassword = await bcrypt.compare(
      'wrongpassword',
      user.password
    );
    console.log(
      `✅ Проверка неправильного пароля: ${
        !isInvalidPassword ? 'УСПЕШНО' : 'ОШИБКА'
      }`
    );
  } catch (error) {
    console.error('❌ Ошибка при тестировании пароля:', error);
  }
}

// Запускаем создание тестового пользователя
createTestUser()
  .then(() => testPasswordVerification())
  .then(() => {
    console.log('\n🎉 Тестовый пользователь готов для проверки входа!');
    console.log('\n📋 Данные для входа:');
    console.log('   📧 Email: test@example.com');
    console.log('   🔐 Пароль: testpassword123');
    console.log('\n🌐 Теперь можно протестировать вход по адресу:');
    console.log('   http://localhost:3000/auth/credentials');
  })
  .catch(console.error);
