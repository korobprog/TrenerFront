require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');

async function testConnection() {
  const prisma = new PrismaClient({
    log: ['error', 'warn', 'info'],
  });

  try {
    console.log('Тестируем подключение к базе данных...');
    await prisma.$connect();
    console.log('✅ Подключение к базе данных успешно!');

    // Простой запрос для проверки
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('✅ Тестовый запрос выполнен:', result);
  } catch (error) {
    console.error('❌ Ошибка подключения к базе данных:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
