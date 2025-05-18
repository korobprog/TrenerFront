// Скрипт для инициализации супер-администратора
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
    // Проверяем, существует ли уже супер-администратор
    const existingSuperAdmin = await prisma.user.findFirst({
      where: { role: 'superadmin' },
    });

    if (existingSuperAdmin) {
      console.log('Супер-администратор уже существует в системе:');
      console.log(`- Email: ${existingSuperAdmin.email}`);
      console.log(`- Имя: ${existingSuperAdmin.name}`);
      return;
    }

    // Хешируем пароль
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Создаем супер-администратора
    const superAdmin = await prisma.user.create({
      data: {
        email,
        name,
        role: 'superadmin',
        password: hashedPassword,
      },
    });

    console.log('Супер-администратор успешно создан:');
    console.log(`- Логин: ${username}`);
    console.log(`- Email: ${superAdmin.email}`);
    console.log(`- Имя: ${superAdmin.name}`);

    // Создаем запись в логе административных действий
    await prisma.adminActionLog.create({
      data: {
        adminId: superAdmin.id,
        action: 'create_superadmin',
        entityType: 'user',
        entityId: superAdmin.id,
        details: {
          message: 'Инициализация супер-администратора системы',
        },
      },
    });

    console.log('Запись в логе административных действий создана');
  } catch (error) {
    console.error('Ошибка при создании супер-администратора:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Параметры супер-администратора по умолчанию
const DEFAULT_USERNAME = 'admin';
const DEFAULT_PASSWORD = 'krishna1284radha';
const DEFAULT_EMAIL = 'korobprog@gmail.com';
const DEFAULT_NAME = 'Супер-администратор';

// Получаем параметры из аргументов командной строки или используем значения по умолчанию
const username = process.argv[2] || DEFAULT_USERNAME;
const password = process.argv[3] || DEFAULT_PASSWORD;
const email = process.argv[4] || DEFAULT_EMAIL;
const name = process.argv[5] || DEFAULT_NAME;

// Вызываем функцию создания супер-администратора
createSuperAdmin(username, password, email, name).catch((error) => {
  console.error('Ошибка при выполнении скрипта:', error);
  process.exit(1);
});
