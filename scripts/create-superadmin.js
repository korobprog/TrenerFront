// Скрипт для создания супер-администратора
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

/**
 * Функция для создания супер-администратора
 * @param {string} username Логин супер-администратора
 * @param {string} password Пароль супер-администратора
 * @param {string} email Email супер-администратора
 * @param {string} name Имя супер-администратора
 */
async function createSuperAdmin(username, password, email, name) {
  try {
    console.log('Проверка наличия супер-администратора в системе...');

    // Проверяем, существует ли уже супер-администратор
    const existingSuperAdmin = await prisma.user.findFirst({
      where: { role: 'superadmin' },
    });

    if (existingSuperAdmin) {
      console.log('Супер-администратор уже существует в системе:');
      console.log(`- ID: ${existingSuperAdmin.id}`);
      console.log(`- Email: ${existingSuperAdmin.email}`);
      console.log(`- Имя: ${existingSuperAdmin.name}`);
      console.log(
        'Используйте скрипт update-superadmin.js для обновления данных'
      );
      return;
    }

    // Проверяем, существует ли пользователь с таким email
    const existingUserWithEmail = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUserWithEmail) {
      console.log(`Пользователь с email ${email} уже существует в системе`);
      console.log('Обновляем его роль до супер-администратора');

      // Хешируем пароль
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Обновляем пользователя до супер-администратора
      const updatedUser = await prisma.user.update({
        where: { id: existingUserWithEmail.id },
        data: {
          name,
          role: 'superadmin',
          password: hashedPassword,
        },
      });

      console.log('Пользователь успешно обновлен до супер-администратора:');
      console.log(`- ID: ${updatedUser.id}`);
      console.log(`- Логин: ${username}`);
      console.log(`- Email: ${updatedUser.email}`);
      console.log(`- Имя: ${updatedUser.name}`);
      console.log(`- Роль: ${updatedUser.role}`);

      return;
    }

    // Хешируем пароль
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Создаем нового супер-администратора
    const newSuperAdmin = await prisma.user.create({
      data: {
        email,
        name,
        role: 'superadmin',
        password: hashedPassword,
      },
    });

    console.log('Супер-администратор успешно создан:');
    console.log(`- ID: ${newSuperAdmin.id}`);
    console.log(`- Логин: ${username}`);
    console.log(`- Email: ${newSuperAdmin.email}`);
    console.log(`- Имя: ${newSuperAdmin.name}`);
    console.log(`- Роль: ${newSuperAdmin.role}`);

    // Создаем запись в логе административных действий
    await prisma.adminActionLog.create({
      data: {
        adminId: newSuperAdmin.id,
        action: 'create_superadmin',
        entityType: 'user',
        entityId: newSuperAdmin.id,
        details: {
          message: 'Создание супер-администратора системы',
        },
      },
    });

    console.log('Запись в логе административных действий создана');

    // Создаем запись UserPoints для суперадминистратора
    await prisma.userPoints.create({
      data: {
        userId: newSuperAdmin.id,
        points: 1000, // Начальное количество баллов
      },
    });

    console.log('Запись UserPoints для супер-администратора создана');
  } catch (error) {
    console.error('Ошибка при создании супер-администратора:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Параметры супер-администратора
const USERNAME = 'admin';
const PASSWORD = 'krishna1284radha';
const EMAIL = 'korobprog@gmail.com';
const NAME = 'Супер-администратор';

// Вызываем функцию создания супер-администратора
createSuperAdmin(USERNAME, PASSWORD, EMAIL, NAME).catch((error) => {
  console.error('Ошибка при выполнении скрипта:', error);
  process.exit(1);
});
