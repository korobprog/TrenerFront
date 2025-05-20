/**
 * CommonJS модуль для работы с Prisma
 * Использует прямой импорт из @prisma/client для более надежной работы
 */

const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

// Добавляем логи для отладки
console.log('Инициализация Prisma клиента...');
console.log('DATABASE_URL определен:', !!process.env.DATABASE_URL);
if (process.env.DATABASE_URL) {
  // Выводим только часть URL без учетных данных для безопасности
  const urlParts = process.env.DATABASE_URL.split('@');
  if (urlParts.length > 1) {
    console.log('DATABASE_URL (безопасный):', `[credentials]@${urlParts[1]}`);
  }
}

// Настройки для PrismaClient
const prismaClientOptions = {
  log: ['error', 'warn', 'query'], // Добавляем логирование запросов для отладки
  // Добавляем дополнительные параметры для настройки пула соединений
  datasources: {
    db: {
      url: process.env.DATABASE_URL
        ? `${process.env.DATABASE_URL}?connection_limit=3&pool_timeout=15&connection_timeout=5&idle_timeout=5`
        : undefined,
    },
  },
};

// Объявляем глобальную переменную для хранения экземпляра PrismaClient
const globalForPrisma = global;
console.log('globalForPrisma определен:', !!globalForPrisma);
console.log('globalForPrisma.prisma определен:', !!globalForPrisma.prisma);

/**
 * Создаем или используем существующий экземпляр PrismaClient
 * Используем рекомендуемый подход от Prisma для предотвращения создания
 * множества экземпляров в режиме разработки
 */
let prisma;
try {
  console.log('Попытка создания или получения экземпляра PrismaClient...');
  prisma =
    globalForPrisma.prisma ||
    (globalForPrisma.prisma = new PrismaClient(prismaClientOptions));
  console.log('PrismaClient успешно инициализирован:', !!prisma);
} catch (error) {
  console.error('Ошибка при инициализации PrismaClient:', error);
  throw error;
}

// Семафор для ограничения количества одновременных соединений
const connectionSemaphore = {
  max: 3, // Максимальное количество одновременных соединений
  current: 0,
  queue: [],

  async acquire() {
    if (this.current < this.max) {
      this.current++;
      return true;
    }

    // Если достигнут лимит, ждем освобождения соединения
    return new Promise((resolve) => {
      this.queue.push(resolve);
    });
  },

  release() {
    if (this.queue.length > 0) {
      // Если есть ожидающие запросы, разрешаем один из них
      const resolve = this.queue.shift();
      resolve(true);
    } else {
      // Иначе просто уменьшаем счетчик
      this.current--;
    }
  },
};

/**
 * Функция для выполнения запроса к базе данных с автоматическим закрытием соединения
 * и ограничением количества одновременных соединений
 * @param {Function} callback - Функция, выполняющая запрос к базе данных
 * @returns {Promise<any>} - Результат выполнения запроса
 */
async function withPrisma(callback) {
  // Ожидаем доступное соединение
  await connectionSemaphore.acquire();

  let result;
  let retries = 3;
  let connectionReleased = false;

  try {
    while (retries > 0) {
      try {
        // Выполняем запрос к базе данных
        result = await callback(prisma);
        break; // Если запрос успешен, выходим из цикла
      } catch (error) {
        retries--;
        console.error(
          `Ошибка при выполнении запроса к базе данных: ${error.message}. Осталось попыток: ${retries}`
        );

        // Если это последняя попытка, пробуем принудительно переподключиться
        if (retries === 0) {
          console.error(
            'Все попытки исчерпаны. Принудительное переподключение...'
          );
          await forceReconnect();
          // Последняя попытка после переподключения
          result = await callback(prisma);
        }

        // Пауза перед следующей попыткой
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    return result;
  } finally {
    // Освобождаем соединение после выполнения запроса
    try {
      if (!connectionReleased) {
        connectionSemaphore.release();
        connectionReleased = true;
      }
    } catch (disconnectError) {
      console.error(
        `Ошибка при освобождении соединения: ${disconnectError.message}`
      );
      // Даже при ошибке отключения освобождаем семафор
      if (!connectionReleased) {
        connectionSemaphore.release();
        connectionReleased = true;
      }
    }
  }
}

/**
 * Функция для принудительного переподключения к базе данных
 * @returns {Promise<void>}
 */
async function forceReconnect() {
  try {
    console.log('Начинаем принудительное переподключение...');

    // Принудительно закрываем все соединения
    console.log('Отключаем текущие соединения...');
    await prisma.$disconnect();

    // Ждем некоторое время перед повторным подключением
    console.log('Ожидаем 2 секунды перед повторным подключением...');
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Создаем новое соединение
    console.log('Создаем новое соединение...');
    await prisma.$connect();

    console.log('Принудительное переподключение выполнено успешно');
    return true;
  } catch (error) {
    console.error(
      `Ошибка при принудительном переподключении: ${error.message}`,
      error.stack
    );
    throw error;
  }
}

/**
 * Функция для выполнения запроса к базе данных с таймаутом
 * @param {Function} callback - Функция, выполняющая запрос к базе данных
 * @param {number} timeoutMs - Таймаут в миллисекундах
 * @returns {Promise<any>} - Результат выполнения запроса
 */
async function withPrismaTimeout(callback, timeoutMs = 5000) {
  return Promise.race([
    withPrisma(callback),
    new Promise((_, reject) =>
      setTimeout(
        () =>
          reject(
            new Error(`Превышен таймаут запроса к базе данных (${timeoutMs}мс)`)
          ),
        timeoutMs
      )
    ),
  ]);
}

/**
 * Функция для проверки состояния соединения с базой данных
 * @returns {Promise<boolean>} - true, если соединение активно, false в противном случае
 */
async function checkPrismaConnection() {
  try {
    console.log('Проверка соединения с базой данных...');
    // Выполняем простой запрос для проверки соединения
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('Соединение с базой данных успешно:', result);
    return true;
  } catch (error) {
    console.error(
      `Ошибка при проверке соединения с базой данных: ${error.message}`,
      error.stack
    );
    return false;
  }
}

/**
 * Функция для очистки всех соединений с базой данных
 * Может быть вызвана периодически для предотвращения утечек соединений
 */
async function cleanupConnections() {
  try {
    console.log('Очистка соединений с базой данных...');
    await prisma.$disconnect();
    await new Promise((resolve) => setTimeout(resolve, 1000));
    await prisma.$connect();
    console.log('Очистка соединений выполнена успешно');
    return true;
  } catch (error) {
    console.error(`Ошибка при очистке соединений: ${error.message}`);
    return false;
  }
}

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

// Экспортируем объекты и функции
module.exports = {
  default: prisma,
  withPrisma,
  withPrismaTimeout,
  checkPrismaConnection,
  cleanupConnections,
};
