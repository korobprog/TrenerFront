import { PrismaClient } from '@prisma/client';

/**
 * Оптимизированная реализация PrismaClient с управлением соединениями
 * Следует официальным рекомендациям Prisma для предотвращения утечек соединений
 * https://www.prisma.io/docs/guides/performance-and-optimization/connection-management
 */

// Флаг для отслеживания, был ли уже добавлен слушатель события 'beforeExit'
let beforeExitListenerAdded = false;

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

// Настройки для PrismaClient
const prismaClientOptions = {
  log: ['error', 'warn'],
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

/**
 * Создаем или используем существующий экземпляр PrismaClient
 * Используем рекомендуемый подход от Prisma для предотвращения создания
 * множества экземпляров в режиме разработки
 */
const prisma =
  globalForPrisma.prisma ||
  (globalForPrisma.prisma = new PrismaClient(prismaClientOptions));

/**
 * Функция для выполнения запроса к базе данных с автоматическим закрытием соединения
 * @param {Function} callback - Функция, выполняющая запрос к базе данных
 * @returns {Promise<any>} - Результат выполнения запроса
 */
/**
 * Функция для выполнения запроса к базе данных с автоматическим закрытием соединения
 * и ограничением количества одновременных соединений
 * @param {Function} callback - Функция, выполняющая запрос к базе данных
 * @returns {Promise<any>} - Результат выполнения запроса
 */
export async function withPrisma(callback) {
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
        await prisma.$disconnect();
        connectionSemaphore.release();
        connectionReleased = true;
      }
    } catch (disconnectError) {
      console.error(
        `Ошибка при отключении соединения: ${disconnectError.message}`
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
    // Принудительно закрываем все соединения
    await prisma.$disconnect();

    // Ждем некоторое время перед повторным подключением
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Создаем новое соединение
    await prisma.$connect();

    console.log('Принудительное переподключение выполнено успешно');
  } catch (error) {
    console.error(
      `Ошибка при принудительном переподключении: ${error.message}`
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
export async function withPrismaTimeout(callback, timeoutMs = 5000) {
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

// Обработка завершения работы приложения для корректного закрытия соединений
// Добавляем слушатель только один раз для предотвращения утечки памяти
if (!beforeExitListenerAdded) {
  process.on('beforeExit', async () => {
    console.log('Закрытие соединений Prisma Client...');
    await prisma.$disconnect();
  });

  // Устанавливаем флаг, что слушатель уже добавлен
  beforeExitListenerAdded = true;

  // Увеличиваем максимальное количество слушателей для process
  process.setMaxListeners(20);

  console.log('Слушатель события beforeExit добавлен');
}

// Обработка необработанных исключений для закрытия соединений
// Добавляем обработчики только один раз
if (!globalForPrisma.prismaErrorHandlersAdded) {
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

  // Обработка сигнала SIGINT (Ctrl+C)
  process.on('SIGINT', async () => {
    console.log('Получен сигнал SIGINT. Закрытие соединений...');
    try {
      await prisma.$disconnect();
    } catch (disconnectError) {
      console.error(
        `Ошибка при отключении соединения: ${disconnectError.message}`
      );
    }
    process.exit(0);
  });

  // Обработка сигнала SIGTERM
  process.on('SIGTERM', async () => {
    console.log('Получен сигнал SIGTERM. Закрытие соединений...');
    try {
      await prisma.$disconnect();
    } catch (disconnectError) {
      console.error(
        `Ошибка при отключении соединения: ${disconnectError.message}`
      );
    }
    process.exit(0);
  });

  // Устанавливаем флаг, что обработчики ошибок уже добавлены
  globalForPrisma.prismaErrorHandlersAdded = true;
}

/**
 * Функция для проверки состояния соединения с базой данных
 * @returns {Promise<boolean>} - true, если соединение активно, false в противном случае
 */
export async function checkPrismaConnection() {
  try {
    // Выполняем простой запрос для проверки соединения
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error(
      `Ошибка при проверке соединения с базой данных: ${error.message}`
    );
    return false;
  }
}

/**
 * Функция для очистки всех соединений с базой данных
 * Может быть вызвана периодически для предотвращения утечек соединений
 */
export async function cleanupConnections() {
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

// Периодическая очистка соединений каждые 5 минут
if (typeof setInterval !== 'undefined') {
  const CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 минут
  setInterval(cleanupConnections, CLEANUP_INTERVAL);
  console.log(
    `Настроена периодическая очистка соединений каждые ${
      CLEANUP_INTERVAL / 1000
    } секунд`
  );
}

export default prisma;
