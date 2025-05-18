/**
 * Скрипт для проверки соединения с базой данных
 */

const { PrismaClient } = require('@prisma/client');

async function checkDatabaseConnection() {
  console.log('Проверка соединения с базой данных...');
  console.log(`DATABASE_URL: ${process.env.DATABASE_URL || 'не определен'}`);

  // Создаем экземпляр PrismaClient
  const prisma = new PrismaClient({
    log: ['query', 'info', 'warn', 'error'],
  });

  try {
    // Пробуем выполнить простой запрос
    console.log('Выполняем тестовый запрос...');
    const result = await prisma.$queryRaw`SELECT 1 as test`;

    console.log('Соединение с базой данных успешно установлено!');
    console.log('Результат запроса:', result);

    return true;
  } catch (error) {
    console.error('Ошибка при подключении к базе данных:');
    console.error(error);

    // Проверяем тип ошибки для более подробной диагностики
    if (error.message.includes('connect ECONNREFUSED')) {
      console.error(
        '\nОшибка подключения: сервер базы данных не запущен или недоступен.'
      );
      console.error('Убедитесь, что:');
      console.error('1. Docker запущен');
      console.error(
        '2. Контейнер с базой данных запущен (docker-compose up -d)'
      );
      console.error('3. База данных слушает порт 5432');
    } else if (error.message.includes('authentication failed')) {
      console.error('\nОшибка аутентификации: неверные учетные данные.');
      console.error('Убедитесь, что:');
      console.error(
        '1. Переменная DATABASE_URL содержит правильные учетные данные'
      );
      console.error(
        '2. Пользователь и пароль в .env файлах соответствуют настройкам в docker-compose.yml'
      );
    } else if (
      error.message.includes('database') &&
      error.message.includes('does not exist')
    ) {
      console.error('\nОшибка: база данных не существует.');
      console.error('Убедитесь, что:');
      console.error('1. База данных "interview_prep" создана');
      console.error(
        '2. Имя базы данных в DATABASE_URL соответствует имени в docker-compose.yml'
      );
    }

    return false;
  } finally {
    // Закрываем соединение
    await prisma.$disconnect();
  }
}

// Запускаем проверку
checkDatabaseConnection()
  .then((success) => {
    if (!success) {
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error('Непредвиденная ошибка:', error);
    process.exit(1);
  });
