/**
 * Главный скрипт для запуска всех тестов системы авторизации
 * Объединяет все виды тестирования в один комплексный отчет
 */

const { runAuthTests, testResults } = require('./test-auth-fixes');
const { runHttpAuthTests } = require('./test-auth-api-requests');

// Цвета для консоли
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Генерация итогового отчета
 */
function generateFinalReport(authTestsPassed, httpTestsPassed, startTime) {
  const endTime = new Date();
  const duration = Math.round((endTime - startTime) / 1000);

  log('\n' + '='.repeat(80), 'magenta');
  log('ИТОГОВЫЙ ОТЧЕТ ПО ТЕСТИРОВАНИЮ СИСТЕМЫ АВТОРИЗАЦИИ', 'magenta');
  log('='.repeat(80), 'magenta');

  log(`\nВремя выполнения: ${duration} секунд`, 'blue');
  log(`Дата завершения: ${endTime.toLocaleString('ru-RU')}`, 'blue');

  log(`\nРЕЗУЛЬТАТЫ ТЕСТИРОВАНИЯ:`, 'cyan');

  // Результаты основных тестов
  log(`\n1. ОСНОВНЫЕ ТЕСТЫ АВТОРИЗАЦИИ:`, 'yellow');
  if (authTestsPassed) {
    log(`   ✓ ПРОЙДЕНЫ УСПЕШНО`, 'green');
  } else {
    log(`   ✗ ОБНАРУЖЕНЫ ПРОБЛЕМЫ`, 'red');
  }

  if (testResults && testResults.summary) {
    log(`   - Всего тестов: ${testResults.summary.total}`, 'blue');
    log(`   - Пройдено: ${testResults.summary.passed}`, 'green');
    log(`   - Провалено: ${testResults.summary.failed}`, 'red');
  }

  // Результаты HTTP тестов
  log(`\n2. HTTP ТЕСТЫ API ENDPOINTS:`, 'yellow');
  if (httpTestsPassed) {
    log(`   ✓ ПРОЙДЕНЫ УСПЕШНО`, 'green');
  } else {
    log(`   ✗ ОБНАРУЖЕНЫ ПРОБЛЕМЫ`, 'red');
  }

  // Общий результат
  const allTestsPassed = authTestsPassed && httpTestsPassed;
  log(`\nОБЩИЙ РЕЗУЛЬТАТ:`, 'cyan');
  if (allTestsPassed) {
    log(`✓ ВСЕ ТЕСТЫ ПРОЙДЕНЫ УСПЕШНО!`, 'green');
    log(`Система авторизации работает корректно.`, 'green');
  } else {
    log(`✗ ОБНАРУЖЕНЫ ПРОБЛЕМЫ В СИСТЕМЕ АВТОРИЗАЦИИ!`, 'red');
    log(`Требуется исправление найденных ошибок.`, 'red');
  }

  // Рекомендации
  log(`\nРЕКОМЕНДАЦИИ:`, 'cyan');

  if (allTestsPassed) {
    log(`1. Система готова к продакшену`, 'green');
    log(`2. Регулярно запускайте тесты после изменений`, 'green');
    log(`3. Мониторьте логи доступа к админ-панели`, 'green');
  } else {
    log(`1. Проверьте middleware авторизации:`, 'yellow');
    log(`   - lib/middleware/adminAuth.js`, 'yellow');
    log(`   - lib/middleware/superAdminAuth.js`, 'yellow');
    log(`2. Убедитесь в корректности ролей пользователей`, 'yellow');
    log(`3. Проверьте настройки NextAuth`, 'yellow');
    log(
      `4. Убедитесь, что korobprog@gmail.com имеет роль superadmin`,
      'yellow'
    );
  }

  log(`\nФАЙЛЫ ДЛЯ АНАЛИЗА:`, 'cyan');
  log(`- Основные тесты: ./test-auth-fixes.js`, 'blue');
  log(`- HTTP тесты: ./test-auth-api-requests.js`, 'blue');
  log(`- Этот скрипт: ./run-auth-tests.js`, 'blue');

  log('\n' + '='.repeat(80), 'magenta');

  return allTestsPassed;
}

/**
 * Основная функция запуска всех тестов
 */
async function runAllAuthTests() {
  const startTime = new Date();

  log('ЗАПУСК КОМПЛЕКСНОГО ТЕСТИРОВАНИЯ СИСТЕМЫ АВТОРИЗАЦИИ', 'bright');
  log('=' * 80, 'bright');
  log(`Дата начала: ${startTime.toLocaleString('ru-RU')}`, 'blue');

  let authTestsPassed = false;
  let httpTestsPassed = false;

  try {
    // Запуск основных тестов авторизации
    log('\n🔍 ЭТАП 1: ОСНОВНЫЕ ТЕСТЫ АВТОРИЗАЦИИ', 'cyan');
    log('Тестирование middleware, ролей и доступа к БД...', 'blue');

    try {
      await runAuthTests();
      // Проверяем результаты
      if (testResults && testResults.summary) {
        authTestsPassed = testResults.summary.failed === 0;
      }
      log(`✓ Основные тесты завершены`, 'green');
    } catch (error) {
      log(`✗ Ошибка в основных тестах: ${error.message}`, 'red');
      authTestsPassed = false;
    }

    // Небольшая пауза между тестами
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Запуск HTTP тестов
    log('\n🌐 ЭТАП 2: HTTP ТЕСТЫ API ENDPOINTS', 'cyan');
    log('Тестирование реальных HTTP запросов к API...', 'blue');

    try {
      httpTestsPassed = await runHttpAuthTests();
      log(`✓ HTTP тесты завершены`, 'green');
    } catch (error) {
      log(`✗ Ошибка в HTTP тестах: ${error.message}`, 'red');
      httpTestsPassed = false;
    }

    // Генерация итогового отчета
    const allTestsPassed = generateFinalReport(
      authTestsPassed,
      httpTestsPassed,
      startTime
    );

    // Завершение с соответствующим кодом выхода
    process.exit(allTestsPassed ? 0 : 1);
  } catch (error) {
    log(`\n✗ КРИТИЧЕСКАЯ ОШИБКА: ${error.message}`, 'red');
    console.error(error);

    generateFinalReport(false, false, startTime);
    process.exit(1);
  }
}

/**
 * Функция для запуска только основных тестов
 */
async function runBasicTests() {
  log('ЗАПУСК ТОЛЬКО ОСНОВНЫХ ТЕСТОВ АВТОРИЗАЦИИ', 'bright');
  try {
    await runAuthTests();
    return testResults && testResults.summary
      ? testResults.summary.failed === 0
      : false;
  } catch (error) {
    log(`✗ Ошибка: ${error.message}`, 'red');
    return false;
  }
}

/**
 * Функция для запуска только HTTP тестов
 */
async function runHttpTests() {
  log('ЗАПУСК ТОЛЬКО HTTP ТЕСТОВ', 'bright');
  try {
    return await runHttpAuthTests();
  } catch (error) {
    log(`✗ Ошибка: ${error.message}`, 'red');
    return false;
  }
}

// Обработка аргументов командной строки
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    log('\nИСПОЛЬЗОВАНИЕ:', 'cyan');
    log('node run-auth-tests.js [опции]', 'blue');
    log('\nОПЦИИ:', 'cyan');
    log('  --basic, -b     Запустить только основные тесты', 'blue');
    log('  --http, -h      Запустить только HTTP тесты', 'blue');
    log('  --help          Показать эту справку', 'blue');
    log('\nПРИМЕРЫ:', 'cyan');
    log('  node run-auth-tests.js              # Все тесты', 'blue');
    log(
      '  node run-auth-tests.js --basic      # Только основные тесты',
      'blue'
    );
    log('  node run-auth-tests.js --http       # Только HTTP тесты', 'blue');
    process.exit(0);
  }

  if (args.includes('--basic') || args.includes('-b')) {
    runBasicTests().then((success) => {
      process.exit(success ? 0 : 1);
    });
  } else if (args.includes('--http')) {
    runHttpTests().then((success) => {
      process.exit(success ? 0 : 1);
    });
  } else {
    runAllAuthTests();
  }
}

module.exports = {
  runAllAuthTests,
  runBasicTests,
  runHttpTests,
  generateFinalReport,
};
