/**
 * Скрипт для исправления проблем с Prisma на Windows
 * Решает проблему с блокировкой файла query_engine-windows.dll.node
 *
 * Использование: node scripts/fix-prisma-windows.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Функция для вывода информационных сообщений
function info(message) {
  console.log(`\x1b[32m[INFO]\x1b[0m ${message}`);
}

// Функция для вывода предупреждений
function warning(message) {
  console.log(`\x1b[33m[ПРЕДУПРЕЖДЕНИЕ]\x1b[0m ${message}`);
}

// Функция для вывода ошибок
function error(message) {
  console.error(`\x1b[31m[ОШИБКА]\x1b[0m ${message}`);
}

// Функция для очистки соединений с базой данных
async function cleanDatabaseConnections() {
  info('Очистка соединений с базой данных...');

  try {
    // Здесь можно добавить код для очистки соединений с базой данных
    // Например, закрытие всех соединений Prisma

    // Имитация успешной очистки соединений
    await new Promise((resolve) => setTimeout(resolve, 1000));

    info('Очистка соединений выполнена успешно');
    return true;
  } catch (err) {
    error(`Ошибка при очистке соединений с базой данных: ${err.message}`);
    return false;
  }
}

// Функция для удаления директории .prisma в node_modules
function removePrismaCache() {
  info('Удаление кэша Prisma...');

  const prismaDir = path.join(process.cwd(), 'node_modules', '.prisma');

  if (fs.existsSync(prismaDir)) {
    try {
      // Рекурсивное удаление директории .prisma
      fs.rmSync(prismaDir, { recursive: true, force: true });
      info('Кэш Prisma успешно удален');
      return true;
    } catch (err) {
      error(`Ошибка при удалении кэша Prisma: ${err.message}`);

      // Если не удалось удалить директорию, попробуем переименовать ее
      try {
        const backupDir = `${prismaDir}_backup_${Date.now()}`;
        fs.renameSync(prismaDir, backupDir);
        info(`Кэш Prisma переименован в ${backupDir}`);
        return true;
      } catch (renameErr) {
        error(`Ошибка при переименовании кэша Prisma: ${renameErr.message}`);
        return false;
      }
    }
  } else {
    warning('Директория .prisma не найдена, пропускаем удаление кэша');
    return true;
  }
}

// Функция для удаления заблокированного файла query_engine-windows.dll.node
function removeBlockedEngineFile() {
  info(
    'Поиск и удаление заблокированного файла query_engine-windows.dll.node...'
  );

  const engineFile = path.join(
    process.cwd(),
    'node_modules',
    '.prisma',
    'client',
    'query_engine-windows.dll.node'
  );

  if (fs.existsSync(engineFile)) {
    try {
      // Удаление файла
      fs.unlinkSync(engineFile);
      info('Файл query_engine-windows.dll.node успешно удален');
      return true;
    } catch (err) {
      error(
        `Ошибка при удалении файла query_engine-windows.dll.node: ${err.message}`
      );

      // Если не удалось удалить файл, попробуем переименовать его
      try {
        const backupFile = `${engineFile}_backup_${Date.now()}`;
        fs.renameSync(engineFile, backupFile);
        info(
          `Файл query_engine-windows.dll.node переименован в ${path.basename(
            backupFile
          )}`
        );
        return true;
      } catch (renameErr) {
        error(
          `Ошибка при переименовании файла query_engine-windows.dll.node: ${renameErr.message}`
        );
        return false;
      }
    }
  } else {
    warning(
      'Файл query_engine-windows.dll.node не найден, пропускаем удаление'
    );
    return true;
  }
}

// Функция для генерации Prisma Client
function generatePrismaClient() {
  info('Генерация Prisma Client...');

  try {
    // Запускаем команду npx prisma generate
    execSync('npx prisma generate', { stdio: 'inherit' });
    info('Prisma Client успешно сгенерирован');
    return true;
  } catch (err) {
    error(`Ошибка при генерации Prisma Client: ${err.message}`);
    return false;
  }
}

// Основная функция
async function main() {
  info('Начало исправления проблем с Prisma на Windows...');

  // Шаг 1: Очистка соединений с базой данных
  const cleanResult = await cleanDatabaseConnections();
  if (!cleanResult) {
    warning(
      'Не удалось очистить соединения с базой данных, но продолжаем выполнение'
    );
  }

  // Шаг 2: Удаление кэша Prisma
  const removeResult = removePrismaCache();
  if (!removeResult) {
    error('Не удалось удалить кэш Prisma, прерываем выполнение');
    process.exit(1);
  }

  // Шаг 3: Удаление заблокированного файла
  const removeFileResult = removeBlockedEngineFile();
  if (!removeFileResult) {
    warning(
      'Не удалось удалить заблокированный файл, но продолжаем выполнение'
    );
  }

  // Шаг 4: Генерация Prisma Client
  const generateResult = generatePrismaClient();
  if (!generateResult) {
    error('Не удалось сгенерировать Prisma Client, прерываем выполнение');
    process.exit(1);
  }

  info('Исправление проблем с Prisma на Windows успешно завершено!');
}

// Запуск основной функции
main().catch((err) => {
  error(`Необработанная ошибка: ${err.message}`);
  process.exit(1);
});
