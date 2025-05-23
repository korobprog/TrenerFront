import { PrismaClient } from '@prisma/client';

/**
 * Оптимизированная реализация PrismaClient с управлением соединениями
 * Следует официальным рекомендациям Prisma для предотвращения утечек соединений
 */

// Объявляем глобальную переменную для хранения экземпляра PrismaClient
const globalForPrisma = global;

/**
 * Создаем или используем существующий экземпляр PrismaClient
 * Используем рекомендуемый подход от Prisma для предотвращения создания
 * множества экземпляров в режиме разработки
 */
const prisma =
  globalForPrisma.prisma ||
  (globalForPrisma.prisma = new PrismaClient({
    log: ['error', 'warn'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL
          ? `${process.env.DATABASE_URL}?connection_limit=3&pool_timeout=15&connection_timeout=5&idle_timeout=5`
          : undefined,
      },
    },
  }));

// Обработка завершения работы приложения для корректного закрытия соединений
if (!globalForPrisma.prismaErrorHandlersAdded) {
  process.on('beforeExit', async () => {
    console.log('Закрытие соединений Prisma Client...');
    await prisma.$disconnect();
  });

  // Обработка необработанных исключений для закрытия соединений
  process.on('uncaughtException', async (e) => {
    console.error('Необработанное исключение:', e);
    try {
      await prisma.$disconnect();
    } catch (disconnectError) {
      console.error(
        `Ошибка при отключении соединения: ${disconnectError.message}`
      );
    }
    process.exit(1);
  });

  // Обработка необработанных отклонений промисов для закрытия соединений
  process.on('unhandledRejection', async (e) => {
    console.error('Необработанное отклонение промиса:', e);
    try {
      await prisma.$disconnect();
    } catch (disconnectError) {
      console.error(
        `Ошибка при отключении соединения: ${disconnectError.message}`
      );
    }
    process.exit(1);
  });

  // Устанавливаем флаг, что обработчики ошибок уже добавлены
  globalForPrisma.prismaErrorHandlersAdded = true;
}

export default prisma;
