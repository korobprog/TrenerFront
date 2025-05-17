const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createTestTransaction() {
  try {
    // Получаем ID пользователя из аргументов командной строки
    const userId = process.argv[2];

    if (!userId) {
      console.error(
        'Ошибка: Необходимо указать ID пользователя в качестве аргумента'
      );
      console.log(
        'Пример использования: node scripts/create-test-transaction.js USER_ID'
      );
      process.exit(1);
    }

    // Проверяем существование пользователя
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      console.error(`Ошибка: Пользователь с ID ${userId} не найден`);
      process.exit(1);
    }

    // Создаем тестовую транзакцию
    const transaction = await prisma.pointsTransaction.create({
      data: {
        userId: userId,
        amount: 5,
        type: 'bonus',
        description: 'Тестовое начисление баллов',
      },
    });

    console.log('Тестовая транзакция успешно создана:');
    console.log(transaction);

    // Обновляем баланс пользователя
    const userPoints = await prisma.userPoints.findUnique({
      where: { userId: userId },
    });

    if (userPoints) {
      // Обновляем существующую запись
      await prisma.userPoints.update({
        where: { userId: userId },
        data: {
          points: {
            increment: 5,
          },
        },
      });
    } else {
      // Создаем новую запись
      await prisma.userPoints.create({
        data: {
          userId: userId,
          points: 5,
        },
      });
    }

    console.log('Баланс пользователя успешно обновлен');
  } catch (error) {
    console.error('Ошибка при создании тестовой транзакции:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestTransaction();
