/**
 * CommonJS модуль для работы с Prisma
 * Использует прямой импорт из @prisma/client для более надежной работы
 */

const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

// Создаем уникальный идентификатор для этого экземпляра модуля
const moduleId = crypto.randomBytes(8).toString('hex');
console.log(`[CommonJS Prisma] Инициализация модуля (ID: ${moduleId})`);

// Добавляем логи для отладки
console.log('[CommonJS Prisma] Инициализация Prisma клиента...');
console.log(
  '[CommonJS Prisma] DATABASE_URL определен:',
  !!process.env.DATABASE_URL
);
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
console.log('[CommonJS Prisma] globalForPrisma определен:', !!globalForPrisma);
console.log(
  '[CommonJS Prisma] globalForPrisma.prisma определен:',
  !!globalForPrisma.prisma
);

// Инициализируем глобальный счетчик соединений, если он еще не существует
globalForPrisma.totalConnections = globalForPrisma.totalConnections || 0;

// Инициализируем глобальный семафор, если он еще не существует
globalForPrisma.connectionSemaphore = globalForPrisma.connectionSemaphore || {
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
      this.current = Math.max(0, this.current - 1); // Гарантируем, что счетчик не станет отрицательным
    }
    console.log(
      `[Семафор] Освобождено соединение, текущее количество: ${this.current}`
    );
  },
};

// Проверяем, существует ли уже экземпляр PrismaClient
if (globalForPrisma.prisma) {
  console.log(
    `[CommonJS Prisma] Существующий экземпляр создан из: ${
      globalForPrisma.prismaCreatedFrom || 'неизвестно'
    }`
  );
}

/**
 * Создаем или используем существующий экземпляр PrismaClient
 * Используем рекомендуемый подход от Prisma для предотвращения создания
 * множества экземпляров в режиме разработки
 */
let prisma;
try {
  console.log(
    '[CommonJS Prisma] Попытка создания или получения экземпляра PrismaClient...'
  );
  prisma =
    globalForPrisma.prisma ||
    (globalForPrisma.prisma = new PrismaClient(prismaClientOptions));

  // Отмечаем, что этот экземпляр был создан из CommonJS модуля
  if (!globalForPrisma.prismaCreatedFrom) {
    globalForPrisma.prismaCreatedFrom = `CommonJS Module (${moduleId})`;
    console.log(`[CommonJS Prisma] Создан новый экземпляр PrismaClient`);
  } else {
    console.log(
      `[CommonJS Prisma] Используется существующий экземпляр PrismaClient из: ${globalForPrisma.prismaCreatedFrom}`
    );
  }

  console.log(
    '[CommonJS Prisma] PrismaClient успешно инициализирован:',
    !!prisma
  );
} catch (error) {
  console.error('Ошибка при инициализации PrismaClient:', error);
  throw error;
}

// Используем глобальный семафор вместо локального
const connectionSemaphore = globalForPrisma.connectionSemaphore;

/**
 * Функция для выполнения запроса к базе данных с автоматическим закрытием соединения
 * и ограничением количества одновременных соединений
 * @param {Function} callback - Функция, выполняющая запрос к базе данных
 * @returns {Promise<any>} - Результат выполнения запроса
 */
async function withPrisma(callback) {
  console.log(
    `[CommonJS Prisma] withPrisma вызвана из модуля с ID: ${moduleId}`
  );
  console.log(
    `[CommonJS Prisma] Используемый экземпляр создан из: ${
      globalForPrisma.prismaCreatedFrom || 'неизвестно'
    }`
  );

  // Проверяем, не превышен ли лимит общего количества соединений
  while (globalForPrisma.totalConnections >= connectionSemaphore.max) {
    console.log(
      `[CommonJS Prisma] Достигнут лимит общего количества соединений (${connectionSemaphore.max}), ожидание...`
    );
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  // Увеличиваем глобальный счетчик соединений
  globalForPrisma.totalConnections++;
  console.log(
    `[CommonJS Prisma] Общее количество соединений: ${globalForPrisma.totalConnections}`
  );

  // Ожидаем доступное соединение
  await connectionSemaphore.acquire();
  console.log(
    `[CommonJS Prisma] Соединение получено, текущее количество: ${connectionSemaphore.current}`
  );

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
        // Добавляем вызов $disconnect() для согласованности с ES модулем
        console.log(
          `[CommonJS Prisma] Отключение соединения перед освобождением семафора`
        );
        await prisma.$disconnect();
        connectionSemaphore.release();
        connectionReleased = true;

        // Уменьшаем глобальный счетчик соединений
        globalForPrisma.totalConnections--;
        console.log(
          `[CommonJS Prisma] Соединение освобождено, текущее количество: ${connectionSemaphore.current}, общее количество: ${globalForPrisma.totalConnections}`
        );
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
    // Временно отключено для предотвращения спама в консоли
    // console.log('Очистка соединений с базой данных...');
    await prisma.$disconnect();
    await new Promise((resolve) => setTimeout(resolve, 1000));
    await prisma.$connect();
    // console.log('Очистка соединений выполнена успешно');
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

  // Периодическая проверка и синхронизация счетчиков отключена в режиме разработки
  if (
    typeof setInterval !== 'undefined' &&
    !globalForPrisma.syncIntervalSet &&
    process.env.NODE_ENV === 'production'
  ) {
    const SYNC_INTERVAL = 60 * 1000; // 1 минута
    setInterval(() => {
      if (globalForPrisma.totalConnections !== connectionSemaphore.current) {
        console.log(
          `[CommonJS Prisma] Обнаружено несоответствие счетчиков: totalConnections=${globalForPrisma.totalConnections}, semaphore=${connectionSemaphore.current}`
        );
        // Синхронизируем счетчики, выбирая наименьшее значение для безопасности
        const newValue = Math.min(
          globalForPrisma.totalConnections,
          connectionSemaphore.current
        );
        globalForPrisma.totalConnections = newValue;
        connectionSemaphore.current = newValue;
        console.log(
          `[CommonJS Prisma] Счетчики синхронизированы: totalConnections=${globalForPrisma.totalConnections}, semaphore=${connectionSemaphore.current}`
        );
      }
    }, SYNC_INTERVAL);
    console.log(
      `[CommonJS Prisma] Настроена периодическая синхронизация счетчиков каждые ${
        SYNC_INTERVAL / 1000
      } секунд`
    );
    globalForPrisma.syncIntervalSet = true;
  } else if (process.env.NODE_ENV !== 'production') {
    console.log(
      '[CommonJS Prisma] Периодическая синхронизация счетчиков отключена в режиме разработки'
    );
  }
}

// Экспортируем объекты и функции
module.exports = {
  default: prisma,
  withPrisma,
  withPrismaTimeout,
  checkPrismaConnection,
  cleanupConnections,
};
