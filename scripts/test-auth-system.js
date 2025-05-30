/**
 * Скрипт для тестирования новой системы аутентификации
 */

const { PrismaClient } = require('@prisma/client');
const {
  hashPassword,
  verifyPassword,
  validatePassword,
  validateEmail,
  validateUsername,
} = require('../lib/utils/passwordUtils');
const {
  createUserWithPassword,
  getUserByEmail,
  hasSuperAdmin,
} = require('../lib/utils/userManagement');

const prisma = new PrismaClient();

async function testPasswordUtils() {
  console.log('🔐 Тестирование утилит для работы с паролями');
  console.log('==============================================\n');

  // Тест валидации пароля
  console.log('1. Тестирование валидации пароля:');
  const testPasswords = [
    'weak', // слабый пароль
    'StrongPass123!', // сильный пароль
    '12345678', // только цифры
    'NoNumbers!', // без цифр
    'nonumbers123', // без специальных символов
  ];

  testPasswords.forEach((password) => {
    const validation = validatePassword(password);
    console.log(
      `   "${password}": ${validation.isValid ? '✅ Валиден' : '❌ Невалиден'}`
    );
    if (!validation.isValid) {
      validation.errors.forEach((error) => console.log(`      - ${error}`));
    }
  });

  // Тест хеширования и проверки пароля
  console.log('\n2. Тестирование хеширования пароля:');
  const testPassword = 'TestPassword123!';
  try {
    const hashedPassword = await hashPassword(testPassword);
    console.log(`   Исходный пароль: ${testPassword}`);
    console.log(`   Хешированный: ${hashedPassword.substring(0, 30)}...`);

    const isValid = await verifyPassword(testPassword, hashedPassword);
    console.log(
      `   Проверка пароля: ${isValid ? '✅ Успешно' : '❌ Неуспешно'}`
    );

    const isInvalid = await verifyPassword('WrongPassword', hashedPassword);
    console.log(
      `   Проверка неверного пароля: ${
        isInvalid ? '❌ Ошибка' : '✅ Корректно отклонен'
      }`
    );
  } catch (error) {
    console.log(`   ❌ Ошибка: ${error.message}`);
  }

  // Тест валидации email
  console.log('\n3. Тестирование валидации email:');
  const testEmails = [
    'valid@example.com',
    'invalid-email',
    'test@domain',
    'user@test.co.uk',
    '@invalid.com',
  ];

  testEmails.forEach((email) => {
    const isValid = validateEmail(email);
    console.log(`   "${email}": ${isValid ? '✅ Валиден' : '❌ Невалиден'}`);
  });

  // Тест валидации username
  console.log('\n4. Тестирование валидации username:');
  const testUsernames = [
    'validuser',
    'ab', // слишком короткий
    'user_123', // валидный с подчеркиванием
    'user-name', // валидный с дефисом
    '123user', // начинается с цифры
    'user@name', // недопустимый символ
  ];

  testUsernames.forEach((username) => {
    const validation = validateUsername(username);
    console.log(
      `   "${username}": ${validation.isValid ? '✅ Валиден' : '❌ Невалиден'}`
    );
    if (!validation.isValid) {
      validation.errors.forEach((error) => console.log(`      - ${error}`));
    }
  });
}

async function testUserManagement() {
  console.log('\n👤 Тестирование управления пользователями');
  console.log('=========================================\n');

  // Проверка существования суперадминистратора
  console.log('1. Проверка существования суперадминистратора:');
  try {
    const hasSuperAdminResult = await hasSuperAdmin();
    console.log(
      `   Суперадминистратор существует: ${
        hasSuperAdminResult ? '✅ Да' : '❌ Нет'
      }`
    );
  } catch (error) {
    console.log(`   ❌ Ошибка при проверке: ${error.message}`);
  }

  // Тест создания тестового пользователя
  console.log('\n2. Создание тестового пользователя:');
  const testUserEmail = `test_${Date.now()}@example.com`;
  try {
    const testUser = await createUserWithPassword({
      email: testUserEmail,
      password: 'TestPassword123!',
      name: 'Test User',
      role: 'user',
    });

    console.log('   ✅ Тестовый пользователь создан:');
    console.log(`      ID: ${testUser.id}`);
    console.log(`      Email: ${testUser.email}`);
    console.log(`      Роль: ${testUser.role}`);

    // Тест поиска пользователя
    console.log('\n3. Поиск созданного пользователя:');
    const foundUser = await getUserByEmail(testUserEmail);
    if (foundUser) {
      console.log('   ✅ Пользователь найден:');
      console.log(`      ID: ${foundUser.id}`);
      console.log(`      Email: ${foundUser.email}`);
      console.log(`      Имя: ${foundUser.name}`);
    } else {
      console.log('   ❌ Пользователь не найден');
    }

    // Удаление тестового пользователя
    console.log('\n4. Удаление тестового пользователя:');
    await prisma.user.delete({
      where: { id: testUser.id },
    });
    console.log('   ✅ Тестовый пользователь удален');
  } catch (error) {
    console.log(`   ❌ Ошибка: ${error.message}`);
  }
}

async function testDatabaseConnection() {
  console.log('\n🗄️  Тестирование подключения к базе данных');
  console.log('===========================================\n');

  try {
    // Тест подключения
    await prisma.$connect();
    console.log('✅ Подключение к базе данных успешно');

    // Тест запроса
    const userCount = await prisma.user.count();
    console.log(`✅ Количество пользователей в базе: ${userCount}`);

    // Проверка таблиц NextAuth
    const accountCount = await prisma.account.count();
    console.log(`✅ Количество OAuth аккаунтов: ${accountCount}`);

    const sessionCount = await prisma.session.count();
    console.log(`✅ Количество активных сессий: ${sessionCount}`);
  } catch (error) {
    console.log(`❌ Ошибка подключения к базе данных: ${error.message}`);
  }
}

async function testAuthProviders() {
  console.log('\n🔑 Тестирование конфигурации провайдеров');
  console.log('=========================================\n');

  // Проверка переменных окружения для Google OAuth
  console.log('1. Google OAuth:');
  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

  console.log(
    `   GOOGLE_CLIENT_ID: ${
      googleClientId ? '✅ Установлен' : '❌ Не установлен'
    }`
  );
  console.log(
    `   GOOGLE_CLIENT_SECRET: ${
      googleClientSecret ? '✅ Установлен' : '❌ Не установлен'
    }`
  );

  // Проверка переменных окружения для GitHub OAuth
  console.log('\n2. GitHub OAuth:');
  const githubClientId = process.env.GITHUB_CLIENT_ID;
  const githubClientSecret = process.env.GITHUB_CLIENT_SECRET;

  console.log(
    `   GITHUB_CLIENT_ID: ${
      githubClientId ? '✅ Установлен' : '❌ Не установлен'
    }`
  );
  console.log(
    `   GITHUB_CLIENT_SECRET: ${
      githubClientSecret ? '✅ Установлен' : '❌ Не установлен'
    }`
  );

  // Проверка основных переменных NextAuth
  console.log('\n3. NextAuth.js:');
  const nextAuthUrl = process.env.NEXTAUTH_URL;
  const nextAuthSecret = process.env.NEXTAUTH_SECRET;

  console.log(
    `   NEXTAUTH_URL: ${nextAuthUrl ? '✅ Установлен' : '❌ Не установлен'}`
  );
  console.log(
    `   NEXTAUTH_SECRET: ${
      nextAuthSecret ? '✅ Установлен' : '❌ Не установлен'
    }`
  );

  if (!githubClientId || !githubClientSecret) {
    console.log('\n⚠️  Предупреждение: GitHub OAuth не настроен');
    console.log(
      '   Добавьте GITHUB_CLIENT_ID и GITHUB_CLIENT_SECRET в .env.production'
    );
  }
}

async function runAllTests() {
  console.log('🧪 Тестирование системы аутентификации NextAuth.js');
  console.log('==================================================\n');

  try {
    await testPasswordUtils();
    await testDatabaseConnection();
    await testUserManagement();
    await testAuthProviders();

    console.log('\n✅ Все тесты завершены!');
    console.log('\n📋 Следующие шаги:');
    console.log('1. Настройте GitHub OAuth (если еще не настроен)');
    console.log(
      '2. Мигрируйте пароль суперадминистратора: node scripts/migrate-superadmin-password.js'
    );
    console.log(
      '3. Создайте дополнительных пользователей: node scripts/create-user-with-password.js'
    );
    console.log('4. Протестируйте вход через все провайдеры');
  } catch (error) {
    console.error('❌ Критическая ошибка при тестировании:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Запуск тестов
if (require.main === module) {
  runAllTests();
}

module.exports = {
  testPasswordUtils,
  testUserManagement,
  testDatabaseConnection,
  testAuthProviders,
  runAllTests,
};
