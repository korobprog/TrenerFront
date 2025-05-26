// Скрипт для назначения пользователя администратором по email
const { PrismaClient } = require('@prisma/client');
const readline = require('readline');
const prisma = new PrismaClient();

// Создаем интерфейс для чтения ввода пользователя
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

/**
 * Функция для создания администратора из существующего пользователя
 * @param {string} email Email пользователя, которого нужно сделать администратором
 */
async function makeAdminUser(email) {
  try {
    // Проверяем, существует ли пользователь с указанным email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      console.error(`Пользователь с email ${email} не найден`);
      return false;
    }

    // Проверяем, не является ли пользователь уже администратором
    if (user.role === 'admin') {
      console.log(
        `Пользователь ${user.name || user.email} уже является администратором`
      );
      return true;
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
        adminId: user.id, // Администратор создает сам себя или другого администратора
        action: 'create_admin',
        entityType: 'user',
        entityId: user.id,
        details: {
          message: 'Назначение пользователя администратором',
        },
      },
    });

    console.log('Запись в логе административных действий создана');
    return true;
  } catch (error) {
    console.error('Ошибка при назначении администратора:', error);
    return false;
  }
}

// Основная функция скрипта
async function main() {
  try {
    // Запрашиваем email пользователя
    rl.question(
      'Введите email пользователя, которого нужно сделать администратором: ',
      async (email) => {
        if (!email || !email.trim()) {
          console.error('Email не может быть пустым');
          rl.close();
          await prisma.$disconnect();
          return;
        }

        const success = await makeAdminUser(email.trim());
        rl.close();
        await prisma.$disconnect();

        // Выходим с соответствующим кодом
        process.exit(success ? 0 : 1);
      }
    );
  } catch (error) {
    console.error('Ошибка при выполнении скрипта:', error);
    rl.close();
    await prisma.$disconnect();
    process.exit(1);
  }
}

// Запускаем основную функцию
main();
