const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testDatabaseConnection() {
  console.log('Проверка соединения с базой данных...');

  try {
    // Проверяем соединение, выполняя простой запрос
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('Соединение с базой данных установлено успешно!');
    console.log('Результат тестового запроса:', result);

    // Получаем информацию о версии PostgreSQL
    const versionInfo = await prisma.$queryRaw`SELECT version()`;
    console.log('Версия PostgreSQL:', versionInfo[0].version);

    // Проверяем количество таблиц в базе данных
    const tablesCount = await prisma.$queryRaw`
      SELECT count(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
    console.log(`Количество таблиц в базе данных: ${tablesCount[0].count}`);

    // Выводим список таблиц
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `;
    console.log('Список таблиц:');
    tables.forEach((table, index) => {
      console.log(`${index + 1}. ${table.table_name}`);
    });
  } catch (error) {
    console.error('Ошибка при подключении к базе данных:');
    console.error(error);
  } finally {
    // Закрываем соединение
    await prisma.$disconnect();
  }
}

testDatabaseConnection();
