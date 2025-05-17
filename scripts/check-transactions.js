const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTransactions() {
  try {
    // Получаем ID пользователя из аргументов командной строки
    const userId = process.argv[2];

    if (!userId) {
      console.error(
        'Ошибка: Необходимо указать ID пользователя в качестве аргумента'
      );
      console.log(
        'Пример использования: node scripts/check-transactions.js USER_ID'
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

    console.log('Информация о пользователе:');
    console.log(user);

    // Получаем текущий баланс пользователя
    const userPoints = await prisma.userPoints.findUnique({
      where: { userId: userId },
    });

    console.log('\nТекущий баланс пользователя:');
    console.log(userPoints);

    // Получаем историю транзакций пользователя
    const transactions = await prisma.pointsTransaction.findMany({
      where: { userId: userId },
      orderBy: {
        createdAt: 'desc',
      },
    });

    console.log('\nИстория транзакций пользователя:');
    console.log(transactions);

    // Выводим общее количество транзакций
    console.log(`\nОбщее количество транзакций: ${transactions.length}`);
  } catch (error) {
    console.error('Ошибка при проверке транзакций:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTransactions();
