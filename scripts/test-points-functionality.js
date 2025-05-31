/**
 * Тестовый скрипт для проверки функциональности изменения баллов пользователей
 * Запуск: node test-points-functionality.js
 */

const puppeteer = require('puppeteer');

async function testPointsFunctionality() {
  console.log(
    '🧪 Начинаем тестирование функциональности изменения баллов...\n'
  );

  let browser;
  try {
    // Запускаем браузер
    browser = await puppeteer.launch({
      headless: false, // Показываем браузер для наглядности
      defaultViewport: { width: 1280, height: 720 },
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();

    // Включаем логирование консоли браузера
    page.on('console', (msg) => {
      console.log(`🌐 Browser Console [${msg.type()}]:`, msg.text());
    });

    // Включаем логирование сетевых запросов
    page.on('response', (response) => {
      if (
        response.url().includes('/api/admin/users/') &&
        response.url().includes('/points')
      ) {
        console.log(`📡 API Response: ${response.status()} ${response.url()}`);
      }
    });

    console.log('1️⃣ Переходим на страницу пользователя...');
    await page.goto(
      'http://localhost:3000/admin/users/cmb9k4mtb0000mkc4b5uwfgtz',
      {
        waitUntil: 'networkidle2',
      }
    );

    // Ждем загрузки страницы
    await page.waitForTimeout(2000);

    console.log('2️⃣ Проверяем, что страница загрузилась...');
    const pageTitle = await page.title();
    console.log(`   Заголовок страницы: ${pageTitle}`);

    // Проверяем наличие имени пользователя
    try {
      await page.waitForSelector('h2', { timeout: 5000 });
      const userName = await page.$eval('h2', (el) => el.textContent);
      console.log(`   Имя пользователя: ${userName}`);
    } catch (error) {
      console.log('   ⚠️ Не удалось найти имя пользователя');
    }

    console.log('3️⃣ Переходим на вкладку "Баллы и транзакции"...');
    try {
      // Ищем и кликаем на вкладку баллов
      await page.waitForSelector('button:has-text("Баллы и транзакции")', {
        timeout: 5000,
      });
      await page.click('button:has-text("Баллы и транзакции")');
      await page.waitForTimeout(1000);
      console.log('   ✅ Вкладка "Баллы и транзакции" открыта');
    } catch (error) {
      console.log('   ⚠️ Не удалось найти вкладку "Баллы и транзакции"');
      // Попробуем альтернативный селектор
      try {
        const tabs = await page.$$('button[class*="tabButton"]');
        for (let tab of tabs) {
          const text = await tab.evaluate((el) => el.textContent);
          if (text.includes('Баллы') || text.includes('транзакции')) {
            await tab.click();
            console.log('   ✅ Найдена и нажата вкладка баллов');
            break;
          }
        }
      } catch (altError) {
        console.log('   ❌ Не удалось найти вкладку баллов');
      }
    }

    console.log('4️⃣ Ищем кнопку "Изменить баллы"...');
    try {
      await page.waitForSelector('button:has-text("Изменить баллы")', {
        timeout: 5000,
      });
      console.log('   ✅ Кнопка "Изменить баллы" найдена');

      console.log('5️⃣ Кликаем на кнопку "Изменить баллы"...');
      await page.click('button:has-text("Изменить баллы")');
      await page.waitForTimeout(1000);

      console.log('6️⃣ Проверяем, что модальное окно открылось...');
      await page.waitForSelector('[class*="modal"]', { timeout: 5000 });
      console.log('   ✅ Модальное окно открыто');

      console.log('7️⃣ Заполняем форму изменения баллов...');

      // Заполняем поле количества баллов
      await page.fill('input[name="amount"]', '50');
      console.log('   ✅ Введено количество баллов: 50');

      // Выбираем тип операции
      await page.selectOption('select[name="type"]', 'bonus');
      console.log('   ✅ Выбран тип операции: bonus');

      // Заполняем описание
      await page.fill(
        'textarea[name="description"]',
        'Тестирование функции изменения баллов через браузер'
      );
      console.log('   ✅ Введено описание операции');

      console.log('8️⃣ Отправляем форму...');
      await page.click('button[type="submit"]');

      // Ждем ответа от сервера
      await page.waitForTimeout(3000);

      console.log('9️⃣ Проверяем результат...');

      // Проверяем, закрылось ли модальное окно
      const modalExists = await page.$('[class*="modal"]');
      if (!modalExists) {
        console.log('   ✅ Модальное окно закрылось после отправки');
      } else {
        console.log('   ⚠️ Модальное окно все еще открыто');
      }
    } catch (error) {
      console.log(
        '   ❌ Ошибка при работе с кнопкой "Изменить баллы":',
        error.message
      );

      // Попробуем найти кнопку альтернативным способом
      try {
        const buttons = await page.$$('button');
        for (let button of buttons) {
          const text = await button.evaluate((el) => el.textContent);
          if (text.includes('Изменить') && text.includes('баллы')) {
            console.log(
              '   ✅ Найдена кнопка изменения баллов альтернативным способом'
            );
            await button.click();
            break;
          }
        }
      } catch (altError) {
        console.log('   ❌ Не удалось найти кнопку изменения баллов');
      }
    }

    console.log('🔟 Проверяем текущее состояние баллов...');
    try {
      // Ищем отображение текущих баллов
      const pointsElements = await page.$$(
        '[class*="pointsValue"], [class*="infoValue"]'
      );
      for (let element of pointsElements) {
        const text = await element.evaluate((el) => el.textContent);
        if (text.match(/\d+/)) {
          console.log(`   💰 Найдены баллы: ${text}`);
        }
      }
    } catch (error) {
      console.log('   ⚠️ Не удалось найти отображение баллов');
    }

    console.log('\n✅ Тестирование завершено!');
  } catch (error) {
    console.error('❌ Ошибка при тестировании:', error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Запускаем тестирование
testPointsFunctionality().catch(console.error);
