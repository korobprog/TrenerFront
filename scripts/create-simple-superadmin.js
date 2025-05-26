// Скрипт для создания супер-администратора с простым паролем
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

/**
 * Функция для создания супер-администратора с простым паролем
 * @param {string} username Логин супер-администратора
 * @param {string} password Пароль супер-администратора
 * @param {string} email Email супер-администратора
 * @param {string} name Имя супер-администратора
 */
async function createSimpleSuperAdmin(username, password, email, name) {
  try {
    console.log('Создание супер-администратора с простым паролем...');

    // Хешируем пароль
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Проверяем, существует ли уже супер-администратор
    const existingSuperAdmin = await prisma.user.findFirst({
      where: { role: 'superadmin' },
    });

    if (existingSuperAdmin) {
      console.log('Обновляем существующего супер-администратора:');
      console.log(`- ID: ${existingSuperAdmin.id}`);

      // Обновляем пароль супер-администратора
      const updatedSuperAdmin = await prisma.user.update({
        where: { id: existingSuperAdmin.id },
        data: {
          name,
          password: hashedPassword,
        },
      });

      console.log('Супер-администратор успешно обновлен:');
      console.log(`- ID: ${updatedSuperAdmin.id}`);
      console.log(`- Логин: ${username}`);
      console.log(`- Email: ${updatedSuperAdmin.email}`);
      console.log(`- Имя: ${updatedSuperAdmin.name}`);
      console.log(`- Новый пароль: ${password}`);

      return;
    }

    // Если супер-администратор не существует, создаем нового
    const newSuperAdmin = await prisma.user.create({
      data: {
        email,
        name,
        role: 'superadmin',
        password: hashedPassword,
      },
    });

    console.log('Новый супер-администратор успешно создан:');
    console.log(`- ID: ${newSuperAdmin.id}`);
    console.log(`- Логин: ${username}`);
    console.log(`- Email: ${newSuperAdmin.email}`);
    console.log(`- Имя: ${newSuperAdmin.name}`);
    console.log(`- Пароль: ${password}`);

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

// Параметры супер-администратора с простым паролем
const USERNAME = 'superadmin';
const PASSWORD = 'admin123';
const EMAIL = 'korobprog@gmail.com';
const NAME = 'Супер-администратор';

// Вызываем функцию создания супер-администратора
createSimpleSuperAdmin(USERNAME, PASSWORD, EMAIL, NAME).catch((error) => {
  console.error('Ошибка при выполнении скрипта:', error);
  process.exit(1);
});
