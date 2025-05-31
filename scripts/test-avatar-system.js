#!/usr/bin/env node

/**
 * Тестовый скрипт для проверки системы аватаров
 * Проверяет доступность файлов и API endpoints
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3000';

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

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;

    const req = protocol.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: data,
        });
      });
    });

    req.on('error', reject);

    if (options.body) {
      req.write(options.body);
    }

    req.end();
  });
}

async function testFileExists(filePath) {
  try {
    await fs.promises.access(filePath, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function testDefaultAvatarFile() {
  log('\n🔍 Проверка файла default-avatar.svg...', 'blue');

  const filePath = path.join(__dirname, 'public', 'default-avatar.svg');
  const exists = await testFileExists(filePath);

  if (exists) {
    log('✅ Файл public/default-avatar.svg существует', 'green');

    try {
      const content = await fs.promises.readFile(filePath, 'utf8');
      if (content.includes('<svg') && content.includes('</svg>')) {
        log('✅ Файл содержит валидный SVG', 'green');
      } else {
        log('⚠️  Файл может содержать невалидный SVG', 'yellow');
      }
    } catch (error) {
      log(`❌ Ошибка чтения файла: ${error.message}`, 'red');
    }
  } else {
    log('❌ Файл public/default-avatar.svg не найден', 'red');
  }

  return exists;
}

async function testDefaultAvatarEndpoint() {
  log('\n🌐 Проверка доступности /default-avatar.svg...', 'blue');

  try {
    const response = await makeRequest(`${BASE_URL}/default-avatar.svg`);

    if (response.statusCode === 200) {
      log('✅ Endpoint /default-avatar.svg доступен (200 OK)', 'green');

      const contentType = response.headers['content-type'];
      if (contentType && contentType.includes('image/svg')) {
        log('✅ Правильный Content-Type: image/svg+xml', 'green');
      } else {
        log(`⚠️  Неожиданный Content-Type: ${contentType}`, 'yellow');
      }

      return true;
    } else {
      log(`❌ Endpoint недоступен: ${response.statusCode}`, 'red');
      return false;
    }
  } catch (error) {
    log(`❌ Ошибка запроса: ${error.message}`, 'red');
    return false;
  }
}

async function testAvatarAPI() {
  log('\n🔧 Проверка API /api/user/avatar...', 'blue');

  try {
    // Тестируем генерацию аватара (без авторизации, ожидаем 401)
    const response = await makeRequest(`${BASE_URL}/api/user/avatar`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'generate',
        name: 'Test User',
      }),
    });

    if (response.statusCode === 401) {
      log('✅ API корректно требует авторизацию (401)', 'green');
      return true;
    } else if (response.statusCode === 404) {
      log('⚠️  API endpoint не найден (404)', 'yellow');
      return false;
    } else {
      log(`⚠️  Неожиданный статус: ${response.statusCode}`, 'yellow');
      try {
        const data = JSON.parse(response.data);
        log(`   Ответ: ${JSON.stringify(data, null, 2)}`, 'yellow');
      } catch {
        log(`   Ответ: ${response.data}`, 'yellow');
      }
      return true;
    }
  } catch (error) {
    log(`❌ Ошибка запроса к API: ${error.message}`, 'red');
    return false;
  }
}

async function testPublicDirectory() {
  log('\n📁 Проверка структуры папки public...', 'blue');

  const publicPath = path.join(__dirname, 'public');

  try {
    const exists = await testFileExists(publicPath);
    if (!exists) {
      log('❌ Папка public/ не существует', 'red');
      return false;
    }

    log('✅ Папка public/ существует', 'green');

    const files = await fs.promises.readdir(publicPath);
    log(`📋 Файлы в public/: ${files.join(', ')}`, 'blue');

    return true;
  } catch (error) {
    log(`❌ Ошибка проверки папки public: ${error.message}`, 'red');
    return false;
  }
}

async function checkServerRunning() {
  log('\n🚀 Проверка работы сервера...', 'blue');

  try {
    const response = await makeRequest(`${BASE_URL}/`);
    if (response.statusCode === 200) {
      log('✅ Сервер работает', 'green');
      return true;
    } else {
      log(`⚠️  Сервер отвечает с кодом: ${response.statusCode}`, 'yellow');
      return false;
    }
  } catch (error) {
    log(`❌ Сервер недоступен: ${error.message}`, 'red');
    log('💡 Убедитесь, что сервер запущен: npm run dev', 'yellow');
    return false;
  }
}

async function runTests() {
  log('🧪 Тестирование системы аватаров', 'bold');
  log('='.repeat(50), 'blue');

  const results = {
    publicDir: await testPublicDirectory(),
    defaultFile: await testDefaultAvatarFile(),
    serverRunning: await checkServerRunning(),
  };

  if (results.serverRunning) {
    results.defaultEndpoint = await testDefaultAvatarEndpoint();
    results.avatarAPI = await testAvatarAPI();
  }

  // Итоговый отчет
  log('\n📊 Результаты тестирования:', 'bold');
  log('='.repeat(50), 'blue');

  const tests = [
    { name: 'Папка public/', result: results.publicDir },
    { name: 'Файл default-avatar.svg', result: results.defaultFile },
    { name: 'Сервер запущен', result: results.serverRunning },
    { name: 'Endpoint /default-avatar.svg', result: results.defaultEndpoint },
    { name: 'API /api/user/avatar', result: results.avatarAPI },
  ];

  tests.forEach((test) => {
    if (test.result === undefined) {
      log(`⏭️  ${test.name}: пропущен`, 'yellow');
    } else if (test.result) {
      log(`✅ ${test.name}: пройден`, 'green');
    } else {
      log(`❌ ${test.name}: провален`, 'red');
    }
  });

  const passedTests = tests.filter((t) => t.result === true).length;
  const totalTests = tests.filter((t) => t.result !== undefined).length;

  log(
    `\n🎯 Результат: ${passedTests}/${totalTests} тестов пройдено`,
    passedTests === totalTests ? 'green' : 'yellow'
  );

  if (results.defaultFile && results.defaultEndpoint) {
    log('\n🎉 Основная проблема с 404 ошибками решена!', 'green');
    log('   Файл default-avatar.svg создан и доступен', 'green');
  } else if (!results.defaultFile) {
    log('\n⚠️  Требуется создать файл public/default-avatar.svg', 'yellow');
  } else if (!results.defaultEndpoint && results.serverRunning) {
    log('\n⚠️  Файл существует, но недоступен через веб-сервер', 'yellow');
  }

  log('\n🔍 Для мониторинга логов аватаров откройте консоль браузера', 'blue');
  log('   и найдите сообщения с префиксом [AVATAR_DEBUG]', 'blue');
}

// Запуск тестов
runTests().catch((error) => {
  log(`\n💥 Критическая ошибка: ${error.message}`, 'red');
  process.exit(1);
});
