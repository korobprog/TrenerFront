// Скрипт для обновления существующего супер-администратора
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

/**
 * Функция для обновления супер-администратора
 * @param {string} username Логин супер-администратора
 * @param {string} password Пароль супер-администратора
 * @param {string} email Email супер-администратора
 * @param {string} name Имя супер-администратора
 */
async function updateSuperAdmin(username, password, email, name) {
  try {
    // Находим существующего супер-администратора
    const existingSuperAdmin = await prisma.user.findFirst({
      where: { role: 'superadmin' },
    });

    if (!existingSuperAdmin) {
      console.log('Супер-администратор не найден в системе');
      return;
    }

    // Проверяем, существует ли пользователь с таким email
    const existingUserWithEmail = await prisma.user.findUnique({
      where: { email },
    });

    if (
      existingUserWithEmail &&
      existingUserWithEmail.id !== existingSuperAdmin.id
    ) {
      console.log(`Пользователь с email ${email} уже существует в системе`);
      console.log('Обновляем только пароль и имя супер-администратора');

      // Хешируем пароль
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Обновляем только пароль и имя
      const updatedSuperAdmin = await prisma.user.update({
        where: { id: existingSuperAdmin.id },
        data: {
          name,
          password: hashedPassword,
        },
      });

      console.log('Супер-администратор успешно обновлен:');
      console.log(`- Логин: ${username}`);
      console.log(`- Email: ${updatedSuperAdmin.email} (не изменен)`);
      console.log(`- Имя: ${updatedSuperAdmin.name}`);

      return;
    }

    // Хешируем пароль
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Обновляем супер-администратора
    const updatedSuperAdmin = await prisma.user.update({
      where: { id: existingSuperAdmin.id },
      data: {
        email,
        name,
        password: hashedPassword,
      },
    });

    console.log('Супер-администратор успешно обновлен:');
    console.log(`- Логин: ${username}`);
    console.log(`- Email: ${updatedSuperAdmin.email}`);
    console.log(`- Имя: ${updatedSuperAdmin.name}`);

    // Создаем запись в логе административных действий
    await prisma.adminActionLog.create({
      data: {
        adminId: updatedSuperAdmin.id,
        action: 'update_superadmin',
        entityType: 'user',
        entityId: updatedSuperAdmin.id,
        details: {
          message: 'Обновление супер-администратора системы',
        },
      },
    });

    console.log('Запись в логе административных действий создана');
  } catch (error) {
    console.error('Ошибка при обновлении супер-администратора:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Параметры супер-администратора
const USERNAME = 'admin';
const PASSWORD = 'krishna1284radha';
const EMAIL = 'korobprog@gmail.com';
const NAME = 'Супер-администратор';

// Вызываем функцию обновления супер-администратора
updateSuperAdmin(USERNAME, PASSWORD, EMAIL, NAME).catch((error) => {
  console.error('Ошибка при выполнении скрипта:', error);
  process.exit(1);
});
