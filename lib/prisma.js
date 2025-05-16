import { PrismaClient } from '@prisma/client';

// Предотвращаем создание множества экземпляров Prisma Client в режиме разработки
// https://www.prisma.io/docs/guides/performance-and-optimization/connection-management#prevent-multiple-instances-in-development

// Создаем новый экземпляр PrismaClient с включенным логированием запросов
const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

// Добавляем логирование для отладки
console.log('Prisma Client инициализирован:', prisma ? 'успешно' : 'ошибка');

// Проверяем доступность моделей
console.log('Доступные модели в Prisma Client:', Object.keys(prisma));

// Проверяем наличие модели UserPoints
try {
  console.log('Проверка модели UserPoints...');
  // Выполняем тестовый запрос к модели UserPoints
  prisma.$queryRaw`SELECT EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'UserPoints'
  )`
    .then((result) => {
      console.log('Результат проверки таблицы UserPoints:', result);
    })
    .catch((error) => {
      console.error('Ошибка при проверке таблицы UserPoints:', error);
    });
} catch (error) {
  console.error('Ошибка при проверке модели UserPoints:', error);
}

// Проверяем таблицу Session
try {
  console.log('Проверка таблицы Session...');
  // Выполняем тестовый запрос к таблице Session
  prisma.$queryRaw`SELECT EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'Session'
  )`
    .then((result) => {
      console.log('Результат проверки таблицы Session:', result);

      // Если таблица существует, проверяем количество записей
      if (result[0].exists) {
        prisma.session
          .count()
          .then((count) => {
            console.log('Количество записей в таблице Session:', count);
          })
          .catch((error) => {
            console.error(
              'Ошибка при подсчете записей в таблице Session:',
              error
            );
          });
      }
    })
    .catch((error) => {
      console.error('Ошибка при проверке таблицы Session:', error);
    });
} catch (error) {
  console.error('Ошибка при проверке таблицы Session:', error);
}

export default prisma;
