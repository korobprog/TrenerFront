const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createBookingTransaction() {
  try {
    // Создаем транзакцию списания баллов за запись на собеседование
    const transaction = await prisma.pointsTransaction.create({
      data: {
        userId: 'cmaqnvem70002jt1i48owvbkf',
        amount: -2,
        type: 'booking',
        description: 'Запись на собеседование',
      },
    });

    console.log('Транзакция создана:');
    console.log(transaction);

    // Обновляем баланс пользователя
    const updatedPoints = await prisma.userPoints.update({
      where: { userId: 'cmaqnvem70002jt1i48owvbkf' },
      data: {
        points: {
          decrement: 2,
        },
      },
    });

    console.log('Баланс обновлен:');
    console.log(updatedPoints);
  } catch (error) {
    console.error('Ошибка при создании транзакции:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createBookingTransaction();
