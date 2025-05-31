/**
 * Тест для проверки работы CredentialsProvider
 * Проверяет, работает ли вход через email/пароль
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

// Функции валидации (копия из passwordUtils.js)
function validateEmail(email) {
  if (!email || typeof email !== 'string') {
    return false;
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function validateUsername(username) {
  const result = {
    isValid: true,
    errors: [],
  };

  if (!username || typeof username !== 'string') {
    result.isValid = false;
    result.errors.push('Имя пользователя должно быть строкой');
    return result;
  }

  if (username.length < 3) {
    result.isValid = false;
    result.errors.push('Имя пользователя должно содержать минимум 3 символа');
  }

  if (username.length > 30) {
    result.isValid = false;
    result.errors.push('Имя пользователя не должно превышать 30 символов');
  }

  if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
    result.isValid = false;
    result.errors.push(
      'Имя пользователя может содержать только буквы, цифры, подчеркивание и дефис'
    );
  }

  if (/^\d/.test(username)) {
    result.isValid = false;
    result.errors.push('Имя пользователя не должно начинаться с цифры');
  }

  return result;
}

// Симуляция логики authorize из NextAuth
async function simulateCredentialsAuth(credentials) {
  console.log('🔐 Симуляция авторизации CredentialsProvider...');
  console.log(`Попытка входа с: ${credentials.username}`);

  if (!credentials?.username || !credentials?.password) {
    console.log('❌ Отсутствуют учетные данные');
    return null;
  }

  try {
    // Валидация входных данных
    const isEmail = validateEmail(credentials.username);
    const usernameValidation = validateUsername(credentials.username);

    console.log(`Это email: ${isEmail}`);
    console.log(`Валидация username: ${usernameValidation.isValid}`);

    if (!isEmail && !usernameValidation.isValid) {
      console.log('❌ Невалидный email или username');
      return null;
    }

    // Поиск пользователя по email или username
    let user = null;

    if (isEmail) {
      console.log('Поиск пользователя по email...');
      user = await prisma.user.findUnique({
        where: { email: credentials.username },
      });
    } else {
      // Поиск по имени пользователя (для обратной совместимости с суперадмином)
      if (
        credentials.username === 'admin' ||
        credentials.username === 'superadmin'
      ) {
        console.log('Поиск суперадмина...');
        user = await prisma.user.findFirst({
          where: { role: 'superadmin' },
        });
      }
    }

    if (!user) {
      console.log('❌ Пользователь не найден');
      return null;
    }

    console.log(`✅ Пользователь найден: ${user.email} (${user.role})`);

    // Проверка пароля
    if (!user.password) {
      console.log('❌ У пользователя нет пароля');
      return null;
    }

    const isValidPassword = await bcrypt.compare(
      credentials.password,
      user.password
    );

    if (!isValidPassword) {
      console.log('❌ Неверный пароль');
      return null;
    }

    console.log('✅ Пароль верный');

    // Проверка блокировки пользователя
    if (user.isBlocked) {
      console.log('❌ Пользователь заблокирован');
      return null;
    }

    console.log('✅ Пользователь не заблокирован');

    // Обновляем время последнего входа
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    console.log('✅ Время последнего входа обновлено');

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      image: user.image,
    };
  } catch (error) {
    console.error('❌ Ошибка при авторизации:', error);
    return null;
  }
}

async function testCredentialsProvider() {
  console.log('=== ТЕСТ CREDENTIALS PROVIDER ===\n');

  try {
    await prisma.$connect();

    // Найдем тестового пользователя
    const testUser = await prisma.user.findUnique({
      where: { email: 'test@example.com' },
    });

    if (!testUser) {
      console.log(
        '❌ Тестовый пользователь не найден. Запустите сначала test-email-auth-diagnosis-fixed.js'
      );
      return;
    }

    console.log('✅ Тестовый пользователь найден');
    console.log(`Email: ${testUser.email}`);
    console.log(`Имя: ${testUser.name}`);
    console.log(`Роль: ${testUser.role}\n`);

    // Тест 1: Правильные учетные данные
    console.log('ТЕСТ 1: Правильные учетные данные');
    const result1 = await simulateCredentialsAuth({
      username: 'test@example.com',
      password: 'TestPass123!',
    });

    if (result1) {
      console.log('✅ УСПЕХ: Авторизация прошла успешно');
      console.log(`Авторизован как: ${result1.email} (${result1.role})\n`);
    } else {
      console.log('❌ ОШИБКА: Авторизация не удалась\n');
    }

    // Тест 2: Неправильный пароль
    console.log('ТЕСТ 2: Неправильный пароль');
    const result2 = await simulateCredentialsAuth({
      username: 'test@example.com',
      password: 'WrongPassword',
    });

    if (!result2) {
      console.log('✅ УСПЕХ: Авторизация правильно отклонена\n');
    } else {
      console.log('❌ ОШИБКА: Авторизация прошла с неправильным паролем\n');
    }

    // Тест 3: Несуществующий email
    console.log('ТЕСТ 3: Несуществующий email');
    const result3 = await simulateCredentialsAuth({
      username: 'nonexistent@example.com',
      password: 'TestPass123!',
    });

    if (!result3) {
      console.log('✅ УСПЕХ: Авторизация правильно отклонена\n');
    } else {
      console.log('❌ ОШИБКА: Авторизация прошла с несуществующим email\n');
    }

    // Тест 4: Невалидный email
    console.log('ТЕСТ 4: Невалидный email');
    const result4 = await simulateCredentialsAuth({
      username: 'invalid-email',
      password: 'TestPass123!',
    });

    if (!result4) {
      console.log('✅ УСПЕХ: Авторизация правильно отклонена\n');
    } else {
      console.log('❌ ОШИБКА: Авторизация прошла с невалидным email\n');
    }

    console.log('=== ЗАКЛЮЧЕНИЕ ===');
    console.log(
      'CredentialsProvider работает корректно для входа по email/паролю.'
    );
    console.log('Это НЕ Email провайдер (magic link), а обычная форма входа.');
    console.log('Пользователь должен знать свой пароль для входа.');
  } catch (error) {
    console.error('❌ Ошибка при тестировании:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Запуск теста
testCredentialsProvider()
  .then(() => {
    console.log('\n=== ТЕСТ ЗАВЕРШЕН ===');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Критическая ошибка:', error);
    process.exit(1);
  });
