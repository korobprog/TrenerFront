/**
 * Скрипт для получения списка пользователей из базы данных
 */

const { PrismaClient } = require('@prisma/client');

// Создаем экземпляр PrismaClient
const prisma = new PrismaClient({
  log: ['error', 'warn'],
});

async function listUsers() {
  try {
    console.log('=== Получение списка пользователей ===');

    // Получаем список пользователей
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
      orderBy: {
        role: 'desc',
      },
    });

    console.log(`Найдено пользователей: ${users.length}`);

    // Выводим информацию о пользователях
    users.forEach((user, index) => {
      console.log(`\nПользователь #${index + 1}:`);
      console.log(`- ID: ${user.id}`);
      console.log(`- Имя: ${user.name || 'Не указано'}`);
      console.log(`- Email: ${user.email || 'Не указан'}`);
      console.log(`- Роль: ${user.role || 'Не указана'}`);
    });

    // Выводим рекомендации по выбору пользователя для миграции токенов
    console.log('\n=== Рекомендации ===');
    console.log(
      'Для миграции токенов Google выберите пользователя с ролью admin или superadmin.'
    );
    console.log('Команда для миграции токенов:');
    console.log(
      'node scripts/migrate-google-tokens.js [userId|email] --validate'
    );
  } catch (error) {
    console.error('Ошибка при получении списка пользователей:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Запускаем функцию
listUsers();
