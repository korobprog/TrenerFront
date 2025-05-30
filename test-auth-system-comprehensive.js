/**
 * Комплексный тест системы аутентификации
 * Проверяет все компоненты Email провайдера и настроек аутентификации
 */

const fs = require('fs');
const path = require('path');

// Цвета для консоли
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testAuthSystemComprehensive() {
  log('🔍 КОМПЛЕКСНОЕ ТЕСТИРОВАНИЕ СИСТЕМЫ АУТЕНТИФИКАЦИИ', 'bold');
  log('='.repeat(60), 'blue');

  const results = {
    passed: 0,
    failed: 0,
    warnings: 0,
    details: [],
  };

  // 1. Проверка файлов конфигурации
  log('\n1️⃣ ПРОВЕРКА ФАЙЛОВ КОНФИГУРАЦИИ', 'blue');

  const configFiles = [
    { path: 'pages/api/auth/[...nextauth].js', name: 'NextAuth конфигурация' },
    {
      path: 'pages/user/auth-settings.js',
      name: 'Страница настроек аутентификации',
    },
    {
      path: 'pages/api/user/auth-settings.js',
      name: 'API настроек аутентификации',
    },
    {
      path: 'pages/auth/verify-request.js',
      name: 'Страница подтверждения email',
    },
    { path: 'pages/auth/signin.js', name: 'Страница входа' },
    { path: 'styles/user/AuthSettings.module.css', name: 'CSS стили настроек' },
    { path: 'prisma/schema.prisma', name: 'Схема базы данных' },
  ];

  for (const file of configFiles) {
    if (fs.existsSync(file.path)) {
      log(`   ✅ ${file.name}`, 'green');
      results.passed++;
    } else {
      log(`   ❌ ${file.name} - файл не найден`, 'red');
      results.failed++;
    }
    results.details.push(
      `${file.name}: ${fs.existsSync(file.path) ? 'OK' : 'MISSING'}`
    );
  }

  // 2. Проверка переменных окружения
  log('\n2️⃣ ПРОВЕРКА ПЕРЕМЕННЫХ ОКРУЖЕНИЯ', 'blue');

  const envVars = [
    { name: 'NEXTAUTH_URL', required: true },
    { name: 'NEXTAUTH_SECRET', required: true },
    { name: 'YANDEX_SMTP_HOST', required: true },
    { name: 'YANDEX_SMTP_PORT', required: true },
    { name: 'YANDEX_SMTP_USER', required: true },
    { name: 'YANDEX_SMTP_PASSWORD', required: true, sensitive: true },
    { name: 'YANDEX_EMAIL_FROM', required: true },
    { name: 'DATABASE_URL', required: true, sensitive: true },
  ];

  for (const envVar of envVars) {
    const value = process.env[envVar.name];
    if (value && !value.includes('your_') && !value.includes('_here')) {
      log(`   ✅ ${envVar.name}`, 'green');
      results.passed++;
    } else if (envVar.required) {
      log(
        `   ❌ ${envVar.name} - не настроена или содержит placeholder`,
        'red'
      );
      results.failed++;
    } else {
      log(`   ⚠️  ${envVar.name} - опциональная, не настроена`, 'yellow');
      results.warnings++;
    }
    results.details.push(
      `${envVar.name}: ${value ? (envVar.sensitive ? 'SET' : 'OK') : 'MISSING'}`
    );
  }

  // 3. Проверка структуры NextAuth конфигурации
  log('\n3️⃣ ПРОВЕРКА NEXTAUTH КОНФИГУРАЦИИ', 'blue');

  try {
    const nextAuthContent = fs.readFileSync(
      'pages/api/auth/[...nextauth].js',
      'utf8'
    );

    const checks = [
      { pattern: /EmailProvider/, name: 'Email провайдер' },
      { pattern: /GoogleProvider/, name: 'Google провайдер' },
      { pattern: /GitHubProvider/, name: 'GitHub провайдер' },
      { pattern: /CredentialsProvider/, name: 'Credentials провайдер' },
      { pattern: /YANDEX_SMTP_HOST/, name: 'Яндекс SMTP настройки' },
      {
        pattern: /checkUserAuthSettings/,
        name: 'Проверка настроек пользователя',
      },
      {
        pattern: /handleFirstTimeUserRegistration/,
        name: 'Обработка новых пользователей',
      },
      { pattern: /UserAuthSettings/, name: 'Модель настроек аутентификации' },
    ];

    for (const check of checks) {
      if (check.pattern.test(nextAuthContent)) {
        log(`   ✅ ${check.name}`, 'green');
        results.passed++;
      } else {
        log(`   ❌ ${check.name} - не найден`, 'red');
        results.failed++;
      }
      results.details.push(
        `NextAuth ${check.name}: ${
          check.pattern.test(nextAuthContent) ? 'OK' : 'MISSING'
        }`
      );
    }
  } catch (error) {
    log(`   ❌ Ошибка чтения NextAuth конфигурации: ${error.message}`, 'red');
    results.failed++;
  }

  // 4. Проверка схемы базы данных
  log('\n4️⃣ ПРОВЕРКА СХЕМЫ БАЗЫ ДАННЫХ', 'blue');

  try {
    const schemaContent = fs.readFileSync('prisma/schema.prisma', 'utf8');

    const dbChecks = [
      { pattern: /model UserAuthSettings/, name: 'Модель UserAuthSettings' },
      { pattern: /enableEmailAuth.*Boolean/, name: 'Поле enableEmailAuth' },
      { pattern: /enableGoogleAuth.*Boolean/, name: 'Поле enableGoogleAuth' },
      { pattern: /enableGithubAuth.*Boolean/, name: 'Поле enableGithubAuth' },
      {
        pattern: /enableCredentialsAuth.*Boolean/,
        name: 'Поле enableCredentialsAuth',
      },
      { pattern: /requireTwoFactor.*Boolean/, name: 'Поле requireTwoFactor' },
      { pattern: /sessionTimeout.*Int/, name: 'Поле sessionTimeout' },
      {
        pattern: /authSettings.*UserAuthSettings/,
        name: 'Связь User -> UserAuthSettings',
      },
    ];

    for (const check of dbChecks) {
      if (check.pattern.test(schemaContent)) {
        log(`   ✅ ${check.name}`, 'green');
        results.passed++;
      } else {
        log(`   ❌ ${check.name} - не найден`, 'red');
        results.failed++;
      }
      results.details.push(
        `Schema ${check.name}: ${
          check.pattern.test(schemaContent) ? 'OK' : 'MISSING'
        }`
      );
    }
  } catch (error) {
    log(`   ❌ Ошибка чтения схемы базы данных: ${error.message}`, 'red');
    results.failed++;
  }

  // 5. Проверка API endpoint
  log('\n5️⃣ ПРОВЕРКА API ENDPOINT', 'blue');

  try {
    const apiContent = fs.readFileSync(
      'pages/api/user/auth-settings.js',
      'utf8'
    );

    const apiChecks = [
      { pattern: /getServerSession/, name: 'Проверка сессии' },
      { pattern: /req\.method === 'GET'/, name: 'Обработка GET запросов' },
      { pattern: /req\.method === 'PUT'/, name: 'Обработка PUT запросов' },
      {
        pattern: /prisma\.userAuthSettings\.findUnique/,
        name: 'Получение настроек',
      },
      {
        pattern: /prisma\.userAuthSettings\.upsert/,
        name: 'Обновление настроек',
      },
      { pattern: /typeof.*boolean/, name: 'Валидация типов данных' },
      { pattern: /sessionTimeout.*1.*168/, name: 'Валидация времени сессии' },
    ];

    for (const check of apiChecks) {
      if (check.pattern.test(apiContent)) {
        log(`   ✅ ${check.name}`, 'green');
        results.passed++;
      } else {
        log(`   ❌ ${check.name} - не найден`, 'red');
        results.failed++;
      }
      results.details.push(
        `API ${check.name}: ${
          check.pattern.test(apiContent) ? 'OK' : 'MISSING'
        }`
      );
    }
  } catch (error) {
    log(`   ❌ Ошибка чтения API endpoint: ${error.message}`, 'red');
    results.failed++;
  }

  // 6. Проверка страницы настроек
  log('\n6️⃣ ПРОВЕРКА СТРАНИЦЫ НАСТРОЕК', 'blue');

  try {
    const pageContent = fs.readFileSync('pages/user/auth-settings.js', 'utf8');

    const pageChecks = [
      { pattern: /useSession/, name: 'Использование сессии' },
      { pattern: /getServerSideProps/, name: 'Серверная проверка авторизации' },
      { pattern: /enableEmailAuth/, name: 'Настройка Email аутентификации' },
      { pattern: /enableGoogleAuth/, name: 'Настройка Google аутентификации' },
      { pattern: /enableGithubAuth/, name: 'Настройка GitHub аутентификации' },
      {
        pattern: /enableCredentialsAuth/,
        name: 'Настройка Credentials аутентификации',
      },
      {
        pattern: /requireTwoFactor/,
        name: 'Настройка двухфакторной аутентификации',
      },
      { pattern: /sessionTimeout/, name: 'Настройка времени сессии' },
    ];

    for (const check of pageChecks) {
      if (check.pattern.test(pageContent)) {
        log(`   ✅ ${check.name}`, 'green');
        results.passed++;
      } else {
        log(`   ❌ ${check.name} - не найден`, 'red');
        results.failed++;
      }
      results.details.push(
        `Page ${check.name}: ${
          check.pattern.test(pageContent) ? 'OK' : 'MISSING'
        }`
      );
    }
  } catch (error) {
    log(`   ❌ Ошибка чтения страницы настроек: ${error.message}`, 'red');
    results.failed++;
  }

  // 7. Проверка CSS стилей
  log('\n7️⃣ ПРОВЕРКА CSS СТИЛЕЙ', 'blue');

  try {
    const cssContent = fs.readFileSync(
      'styles/user/AuthSettings.module.css',
      'utf8'
    );

    const cssChecks = [
      { pattern: /\.container/, name: 'Основной контейнер' },
      { pattern: /\.checkboxLabel/, name: 'Стили чекбоксов' },
      { pattern: /\.saveButton/, name: 'Кнопка сохранения' },
      { pattern: /\.message/, name: 'Стили сообщений' },
      { pattern: /\.error/, name: 'Стили ошибок' },
      { pattern: /@media.*max-width/, name: 'Адаптивность' },
    ];

    for (const check of cssChecks) {
      if (check.pattern.test(cssContent)) {
        log(`   ✅ ${check.name}`, 'green');
        results.passed++;
      } else {
        log(`   ❌ ${check.name} - не найден`, 'red');
        results.failed++;
      }
      results.details.push(
        `CSS ${check.name}: ${
          check.pattern.test(cssContent) ? 'OK' : 'MISSING'
        }`
      );
    }
  } catch (error) {
    log(`   ❌ Ошибка чтения CSS файла: ${error.message}`, 'red');
    results.failed++;
  }

  // Итоговый отчет
  log('\n' + '='.repeat(60), 'blue');
  log('📊 ИТОГОВЫЙ ОТЧЕТ', 'bold');
  log('='.repeat(60), 'blue');

  log(`\n✅ Пройдено тестов: ${results.passed}`, 'green');
  log(
    `❌ Провалено тестов: ${results.failed}`,
    results.failed > 0 ? 'red' : 'green'
  );
  log(
    `⚠️  Предупреждений: ${results.warnings}`,
    results.warnings > 0 ? 'yellow' : 'green'
  );

  const total = results.passed + results.failed + results.warnings;
  const successRate =
    total > 0 ? Math.round((results.passed / total) * 100) : 0;

  log(
    `\n📈 Процент успешности: ${successRate}%`,
    successRate >= 80 ? 'green' : successRate >= 60 ? 'yellow' : 'red'
  );

  // Рекомендации
  log('\n💡 РЕКОМЕНДАЦИИ:', 'blue');

  if (results.failed === 0 && results.warnings === 0) {
    log('   🎉 Система полностью готова к использованию!', 'green');
  } else {
    if (results.failed > 0) {
      log('   🔧 Необходимо исправить критические ошибки', 'red');
    }
    if (results.warnings > 0) {
      log('   ⚠️  Рекомендуется настроить опциональные компоненты', 'yellow');
    }
  }

  // Следующие шаги
  log('\n🚀 СЛЕДУЮЩИЕ ШАГИ:', 'blue');
  log('   1. Настройте пароль приложения Яндекс почты', 'yellow');
  log('   2. Обновите YANDEX_SMTP_PASSWORD в .env', 'yellow');
  log(
    '   3. Протестируйте отправку email: node test-yandex-email-provider.js --send-test',
    'yellow'
  );
  log(
    '   4. Проверьте работу страницы настроек: http://localhost:3000/user/auth-settings',
    'yellow'
  );
  log('   5. Протестируйте вход через разные провайдеры', 'yellow');

  return {
    success: results.failed === 0,
    results,
  };
}

// Запуск тестов
if (require.main === module) {
  testAuthSystemComprehensive()
    .then((result) => {
      process.exit(result.success ? 0 : 1);
    })
    .catch((error) => {
      console.error('Критическая ошибка:', error);
      process.exit(1);
    });
}

module.exports = { testAuthSystemComprehensive };
