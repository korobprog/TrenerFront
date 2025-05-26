/**
 * Тестовый скрипт для проверки конфликта экземпляров PrismaClient
 * Этот скрипт последовательно импортирует и использует оба модуля Prisma
 * для выявления потенциальных конфликтов
 */

// Импортируем модуль ES
console.log('=== ТЕСТ КОНФЛИКТА ЭКЗЕМПЛЯРОВ PRISMA ===');
console.log('1. Импорт ES модуля Prisma');
const esModule = require('../lib/prisma');
const { withPrisma: withPrismaES } = require('../lib/prisma');

// Выполняем запрос с использованием ES модуля
console.log('\n2. Выполнение запроса с использованием ES модуля');
async function testESModule() {
  try {
    const result = await withPrismaES(async (prisma) => {
      console.log('Выполнение запроса через ES модуль...');
      // Простой запрос для проверки соединения
      return await prisma.$queryRaw`SELECT 1 as test`;
    });
    console.log('Результат запроса через ES модуль:', result);
  } catch (error) {
    console.error('Ошибка при выполнении запроса через ES модуль:', error);
  }
}

// Импортируем модуль CommonJS
console.log('\n3. Импорт CommonJS модуля Prisma');
const commonJSModule = require('../lib/prismaCommonJS');
const { withPrisma: withPrismaCommonJS } = commonJSModule;

// Выполняем запрос с использованием CommonJS модуля
console.log('\n4. Выполнение запроса с использованием CommonJS модуля');
async function testCommonJSModule() {
  try {
    const result = await withPrismaCommonJS(async (prisma) => {
      console.log('Выполнение запроса через CommonJS модуль...');
      // Простой запрос для проверки соединения
      return await prisma.$queryRaw`SELECT 1 as test`;
    });
    console.log('Результат запроса через CommonJS модуль:', result);
  } catch (error) {
    console.error(
      'Ошибка при выполнении запроса через CommonJS модуль:',
      error
    );
  }
}

// Выполняем запросы параллельно для проверки конфликтов
console.log('\n5. Выполнение параллельных запросов для проверки конфликтов');
async function testParallelQueries() {
  try {
    console.log('Запуск параллельных запросов...');

    // Создаем массив промисов для параллельного выполнения
    const promises = [];

    // Добавляем 3 запроса через ES модуль
    for (let i = 0; i < 3; i++) {
      promises.push(
        withPrismaES(async (prisma) => {
          console.log(`Параллельный запрос ES #${i + 1}...`);
          return await prisma.$queryRaw`SELECT 1 as test_es_${i + 1}`;
        })
      );
    }

    // Добавляем 3 запроса через CommonJS модуль
    for (let i = 0; i < 3; i++) {
      promises.push(
        withPrismaCommonJS(async (prisma) => {
          console.log(`Параллельный запрос CommonJS #${i + 1}...`);
          return await prisma.$queryRaw`SELECT 1 as test_commonjs_${i + 1}`;
        })
      );
    }

    // Ожидаем выполнения всех запросов
    const results = await Promise.all(promises);
    console.log('Все параллельные запросы выполнены успешно');
    console.log('Результаты:', results);
  } catch (error) {
    console.error('Ошибка при выполнении параллельных запросов:', error);
  }
}

// Проверяем, являются ли экземпляры PrismaClient одним и тем же объектом
console.log('\n6. Проверка идентичности экземпляров PrismaClient');
const esInstance = esModule.default;
const commonJSInstance = commonJSModule.default;
console.log(
  'ES модуль и CommonJS модуль используют один и тот же экземпляр PrismaClient:',
  esInstance === commonJSInstance
);

// Выполняем тесты последовательно
async function runTests() {
  console.log('\n=== НАЧАЛО ТЕСТИРОВАНИЯ ===');

  await testESModule();
  await testCommonJSModule();
  await testParallelQueries();

  console.log('\n=== ТЕСТИРОВАНИЕ ЗАВЕРШЕНО ===');

  // Отключаем соединения с базой данных
  try {
    console.log('\nОтключение соединений...');
    await esModule.default.$disconnect();
    console.log('Соединения отключены');
  } catch (error) {
    console.error('Ошибка при отключении соединений:', error);
  }

  // Выводим итоговую информацию
  console.log('\n=== ИТОГИ ТЕСТИРОВАНИЯ ===');
  console.log(
    '1. ES модуль и CommonJS модуль используют один и тот же экземпляр PrismaClient:',
    esInstance === commonJSInstance
  );
  console.log(
    '2. Проверьте логи выше на наличие ошибок или конфликтов при параллельном выполнении запросов'
  );
  console.log(
    '3. Обратите внимание на идентификаторы модулей и экземпляров в логах'
  );
}

// Запускаем тесты
runTests().catch(console.error);
