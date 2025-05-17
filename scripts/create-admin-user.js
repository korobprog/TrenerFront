// Скрипт для создания первого администратора
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Функция для создания администратора из существующего пользователя
 * @param {string} email Email пользователя, которого нужно сделать администратором
 */
async function createAdminUser(email) {
  try {
    // Проверяем, существует ли пользователь с указанным email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      console.error(`Пользователь с email ${email} не найден`);
      return;
    }

    // Обновляем роль пользователя на "admin"
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { role: 'admin' },
    });

    console.log(
      `Пользователь ${
        updatedUser.name || updatedUser.email
      } успешно назначен администратором`
    );

    // Создаем запись в логе административных действий
    await prisma.adminActionLog.create({
      data: {
        adminId: user.id, // Первый администратор создает сам себя
        action: 'create_admin',
        entityType: 'user',
        entityId: user.id,
        details: {
          message: 'Создание первого администратора системы',
        },
      },
    });

    console.log('Запись в логе административных действий создана');
  } catch (error) {
    console.error('Ошибка при создании администратора:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Получаем email из аргументов командной строки
const email = process.argv[2];

if (!email) {
  console.error('Необходимо указать email пользователя');
  console.log(
    'Использование: node scripts/create-admin-user.js user@example.com'
  );
  process.exit(1);
}

// Вызываем функцию создания администратора
createAdminUser(email).catch((error) => {
  console.error('Ошибка при выполнении скрипта:', error);
  process.exit(1);
});
