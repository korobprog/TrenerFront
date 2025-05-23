/**
 * Скрипт-обертка для запуска test-gmail-api.js из корневой директории
 *
 * Этот файл перенаправляет запуск на правильный скрипт в директории scripts/
 */

// Выводим сообщение о перенаправлении
console.log('Перенаправление на scripts/test-gmail-api.js...');

// Получаем аргументы командной строки (исключая node и имя текущего скрипта)
const args = process.argv.slice(2);

// Импортируем и запускаем основной скрипт
try {
  console.log('Попытка запуска scripts/test-gmail-api.js...');
  require('./test-gmail-api');
  console.log('Скрипт scripts/test-gmail-api.js успешно запущен.');
} catch (error) {
  console.error('Ошибка при запуске scripts/test-gmail-api.js:');
  console.error(error);
  console.error(
    '\nПожалуйста, убедитесь, что вы запускаете скрипт из корневой директории проекта.'
  );
  console.error('Правильный способ запуска: node scripts/test-gmail-api.js');
  process.exit(1);
}
