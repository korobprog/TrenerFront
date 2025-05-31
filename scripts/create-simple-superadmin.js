// Скрипт для создания супер-администратора с простым паролем
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function createOrUpdateSuperAdmin() {
  try {
    console.log('Начинаем создание/обновление супер-администратора...');

    const email = 'korobprog@gmail.com';
    const password = 'admin123';
    const name = 'Максим Коробков';

    // Хешируем пароль
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    console.log('Проверяем, существует ли пользователь с email:', email);

    // Сначала проверяем, есть ли пользователь с таким email
    const existingUser = await prisma.user.findUnique({
      where: { email: email },
    });

    let user;

    if (existingUser) {
      console.log('Пользователь найден, обновляем до супер-администратора...');
      console.log('- Текущая роль:', existingUser.role);

      // Обновляем существующего пользователя
      user = await prisma.user.update({
        where: { email: email },
        data: {
          name: name,
          role: 'superadmin',
          password: hashedPassword,
        },
      });

      console.log('Пользователь успешно обновлен до супер-администратора');
    } else {
      console.log(
        'Пользователь не найден, создаем нового супер-администратора...'
      );

      // Создаем нового пользователя
      user = await prisma.user.create({
        data: {
          email: email,
          name: name,
          role: 'superadmin',
          password: hashedPassword,
        },
      });

      console.log('Новый супер-администратор успешно создан');
    }

    console.log('Данные супер-администратора:');
    console.log('- ID:', user.id);
    console.log('- Email:', user.email);
    console.log('- Имя:', user.name);
    console.log('- Роль:', user.role);
    console.log('- Пароль:', password);

    // Проверяем и создаем UserPoints если нужно
    console.log('Проверяем запись UserPoints...');
    const existingPoints = await prisma.userPoints.findUnique({
      where: { userId: user.id },
    });

    if (!existingPoints) {
      await prisma.userPoints.create({
        data: {
          userId: user.id,
          points: 1000,
        },
      });
      console.log('Запись UserPoints создана с 1000 баллами');
    } else {
      console.log(
        'Запись UserPoints уже существует с',
        existingPoints.points,
        'баллами'
      );
    }

    console.log('Операция завершена успешно!');
  } catch (error) {
    console.error(
      'Ошибка при создании/обновлении супер-администратора:',
      error
    );

    // Дополнительная диагностика
    if (error.code === 'P2002') {
      console.error('Ошибка уникальности - возможно, email уже используется');
    } else if (error.code === 'P2025') {
      console.error('Запись не найдена для обновления');
    } else {
      console.error('Код ошибки:', error.code);
      console.error('Сообщение:', error.message);
    }
  } finally {
    await prisma.$disconnect();
  }
}

// Запускаем функцию
createOrUpdateSuperAdmin()
  .then(() => {
    console.log('Скрипт завершен');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Критическая ошибка:', error);
    process.exit(1);
  });
