/**
 * Тест страницы профиля в браузере
 * Проверяет работу страницы /user/profile с реальной аутентификацией
 */

const puppeteer = require('puppeteer');

// Цвета для консоли
const colors = {
  reset: '\x1b[0m',
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

async function testProfilePageInBrowser() {
  let browser;

  try {
    log('🚀 ЗАПУСК ТЕСТИРОВАНИЯ СТРАНИЦЫ ПРОФИЛЯ В БРАУЗЕРЕ', 'magenta');
    log('=' * 60, 'magenta');

    // Запускаем браузер
    log('\n1. Запуск браузера...', 'cyan');
    browser = await puppeteer.launch({
      headless: false, // Показываем браузер для отладки
      devtools: true, // Открываем DevTools
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();

    // Включаем логирование консоли
    page.on('console', (msg) => {
      const type = msg.type();
      const text = msg.text();

      if (text.includes('[PROFILE API]')) {
        log(`🔍 [BROWSER CONSOLE] ${text}`, 'blue');
      } else if (type === 'error') {
        log(`❌ [BROWSER ERROR] ${text}`, 'red');
      } else if (type === 'warn') {
        log(`⚠️ [BROWSER WARN] ${text}`, 'yellow');
      }
    });

    // Включаем логирование сетевых запросов
    page.on('response', (response) => {
      const url = response.url();
      const status = response.status();

      if (url.includes('/api/user/profile')) {
        const statusColor = status >= 200 && status < 300 ? 'green' : 'red';
        log(
          `🌐 [NETWORK] ${response.request().method()} ${url} - ${status}`,
          statusColor
        );
      }
    });

    // Переходим на главную страницу
    log('\n2. Переход на главную страницу...', 'cyan');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });

    // Проверяем, авторизован ли пользователь
    log('\n3. Проверка состояния авторизации...', 'cyan');

    const isLoggedIn = await page.evaluate(() => {
      // Ищем элементы, указывающие на авторизацию
      const loginButton = document.querySelector('a[href*="signin"]');
      const userMenu =
        document.querySelector('[data-testid="user-menu"]') ||
        document.querySelector('.user-menu') ||
        document.querySelector('button:contains("Профиль")');

      return !loginButton || !!userMenu;
    });

    if (!isLoggedIn) {
      log('⚠️ Пользователь не авторизован, выполняем вход...', 'yellow');

      // Переходим на страницу входа
      await page.goto('http://localhost:3000/auth/signin', {
        waitUntil: 'networkidle2',
      });

      // Ищем форму входа с credentials
      const credentialsForm = await page.$('form');
      if (credentialsForm) {
        log('📝 Заполняем форму входа...', 'blue');

        // Заполняем форму
        await page.type('input[name="email"]', 'default@example.com');
        await page.type('input[name="password"]', 'password123');

        // Отправляем форму
        await Promise.all([
          page.waitForNavigation({ waitUntil: 'networkidle2' }),
          page.click('button[type="submit"]'),
        ]);

        log('✅ Форма входа отправлена', 'green');
      } else {
        log('❌ Форма входа не найдена', 'red');
        return false;
      }
    } else {
      log('✅ Пользователь уже авторизован', 'green');
    }

    // Переходим на страницу профиля
    log('\n4. Переход на страницу профиля...', 'cyan');
    await page.goto('http://localhost:3000/user/profile', {
      waitUntil: 'networkidle2',
    });

    // Ждем загрузки страницы
    await page.waitForTimeout(2000);

    // Проверяем содержимое страницы
    log('\n5. Анализ содержимого страницы...', 'cyan');

    const pageAnalysis = await page.evaluate(() => {
      const title = document.title;
      const h1 = document.querySelector('h1')?.textContent;
      const errorMessage = document.querySelector(
        '.error-message, .errorMessage, [class*="error"]'
      )?.textContent;
      const loadingMessage = document.querySelector(
        '.loading, [class*="loading"]'
      )?.textContent;
      const profileData = document.querySelector(
        '.profile-content, .profileContent, [class*="profile"]'
      );
      const userName = document.querySelector(
        '.user-name, .userName, [class*="userName"]'
      )?.textContent;
      const userEmail = document.querySelector(
        '.user-email, .userEmail, [class*="userEmail"]'
      )?.textContent;

      return {
        title,
        h1,
        errorMessage,
        loadingMessage,
        hasProfileData: !!profileData,
        userName,
        userEmail,
        bodyText: document.body.textContent.substring(0, 500),
      };
    });

    log('📊 Анализ страницы:', 'blue');
    log(`Заголовок: ${pageAnalysis.title}`, 'yellow');
    log(`H1: ${pageAnalysis.h1}`, 'yellow');
    log(
      `Есть данные профиля: ${pageAnalysis.hasProfileData}`,
      pageAnalysis.hasProfileData ? 'green' : 'red'
    );
    log(`Имя пользователя: ${pageAnalysis.userName}`, 'yellow');
    log(`Email пользователя: ${pageAnalysis.userEmail}`, 'yellow');

    if (pageAnalysis.errorMessage) {
      log(`❌ Ошибка на странице: ${pageAnalysis.errorMessage}`, 'red');
    }

    if (pageAnalysis.loadingMessage) {
      log(`⏳ Сообщение о загрузке: ${pageAnalysis.loadingMessage}`, 'yellow');
    }

    // Проверяем сетевые запросы к API
    log('\n6. Проверка API запросов...', 'cyan');

    // Делаем запрос к API напрямую
    const apiResponse = await page.evaluate(async () => {
      try {
        const response = await fetch('/api/user/profile');
        const data = await response.json();
        return {
          status: response.status,
          ok: response.ok,
          data: data,
        };
      } catch (error) {
        return {
          error: error.message,
        };
      }
    });

    log('🔍 Результат API запроса:', 'blue');
    log(JSON.stringify(apiResponse, null, 2), 'yellow');

    // Делаем скриншот для анализа
    log('\n7. Создание скриншота...', 'cyan');
    await page.screenshot({
      path: 'profile-page-test.png',
      fullPage: true,
    });
    log('✅ Скриншот сохранен: profile-page-test.png', 'green');

    // Анализируем результаты
    log('\n📋 ИТОГОВЫЙ АНАЛИЗ:', 'magenta');
    log('=' * 40, 'magenta');

    const success =
      apiResponse.ok &&
      apiResponse.data?.success &&
      pageAnalysis.hasProfileData;

    if (success) {
      log('🎉 ТЕСТ ПРОЙДЕН: Страница профиля работает корректно!', 'green');
      log(
        `✅ API возвращает данные: ${JSON.stringify(
          apiResponse.data.data,
          null,
          2
        )}`,
        'green'
      );
    } else {
      log('❌ ТЕСТ НЕ ПРОЙДЕН: Обнаружены проблемы', 'red');

      if (!apiResponse.ok) {
        log(`❌ API ошибка: статус ${apiResponse.status}`, 'red');
        log(`❌ Данные ошибки: ${JSON.stringify(apiResponse.data)}`, 'red');
      }

      if (!pageAnalysis.hasProfileData) {
        log('❌ Данные профиля не отображаются на странице', 'red');
      }
    }

    return success;
  } catch (error) {
    log(`❌ Критическая ошибка тестирования: ${error.message}`, 'red');
    log(`Стек ошибки: ${error.stack}`, 'red');
    return false;
  } finally {
    if (browser) {
      // Оставляем браузер открытым для анализа
      log(
        '\n🔍 Браузер оставлен открытым для анализа. Закройте его вручную.',
        'cyan'
      );
      // await browser.close();
    }
  }
}

// Простой тест без браузера
async function testProfileAPIDirectly() {
  log('\n🔧 ПРЯМОЙ ТЕСТ API БЕЗ БРАУЗЕРА', 'magenta');
  log('=' * 40, 'magenta');

  const http = require('http');

  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/user/profile',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(options, (res) => {
      let body = '';

      res.on('data', (chunk) => {
        body += chunk;
      });

      res.on('end', () => {
        try {
          const data = JSON.parse(body);
          log(
            `📊 Прямой API тест - статус: ${res.statusCode}`,
            res.statusCode === 401 ? 'green' : 'red'
          );
          log(`📊 Ответ: ${JSON.stringify(data, null, 2)}`, 'yellow');
          resolve(res.statusCode === 401); // Ожидаем 401 без аутентификации
        } catch (error) {
          log(`❌ Ошибка парсинга ответа: ${error.message}`, 'red');
          resolve(false);
        }
      });
    });

    req.on('error', (error) => {
      log(`❌ Ошибка запроса: ${error.message}`, 'red');
      resolve(false);
    });

    req.end();
  });
}

async function main() {
  log('🔍 ПОЛНОЕ ТЕСТИРОВАНИЕ СТРАНИЦЫ ПРОФИЛЯ', 'magenta');

  // Сначала простой тест API
  const directTest = await testProfileAPIDirectly();

  // Затем тест в браузере (если доступен puppeteer)
  let browserTest = false;
  try {
    browserTest = await testProfilePageInBrowser();
  } catch (error) {
    if (error.message.includes('puppeteer')) {
      log('⚠️ Puppeteer не установлен, пропускаем браузерный тест', 'yellow');
      log('💡 Установите puppeteer: npm install puppeteer', 'cyan');
    } else {
      log(`❌ Ошибка браузерного теста: ${error.message}`, 'red');
    }
  }

  log('\n📋 ФИНАЛЬНЫЙ ОТЧЕТ:', 'magenta');
  log('=' * 30, 'magenta');
  log(
    `Прямой API тест: ${directTest ? '✅ ПРОЙДЕН' : '❌ НЕ ПРОЙДЕН'}`,
    directTest ? 'green' : 'red'
  );
  log(
    `Браузерный тест: ${browserTest ? '✅ ПРОЙДЕН' : '❌ НЕ ПРОЙДЕН'}`,
    browserTest ? 'green' : 'red'
  );

  return directTest;
}

if (require.main === module) {
  main().catch((error) => {
    log(`❌ Критическая ошибка: ${error.message}`, 'red');
    process.exit(1);
  });
}

module.exports = { testProfilePageInBrowser, testProfileAPIDirectly };
