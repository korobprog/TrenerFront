/**
 * Исправленный тестовый скрипт для проверки функциональности изменения баллов пользователей
 * Запуск: node test-points-functionality-fixed.js
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
      // Ищем все кнопки и проверяем их текст
      const buttons = await page.$$('button');
      let pointsTabFound = false;

      for (let button of buttons) {
        const text = await page.evaluate((el) => el.textContent, button);
        if (text && (text.includes('Баллы') || text.includes('транзакции'))) {
          console.log(`   Найдена вкладка с текстом: "${text}"`);
          await button.click();
          pointsTabFound = true;
          break;
        }
      }

      if (pointsTabFound) {
        await page.waitForTimeout(1000);
        console.log('   ✅ Вкладка "Баллы и транзакции" открыта');
      } else {
        console.log('   ⚠️ Не удалось найти вкладку "Баллы и транзакции"');
      }
    } catch (error) {
      console.log('   ❌ Ошибка при поиске вкладки баллов:', error.message);
    }

    console.log('4️⃣ Ищем кнопку "Изменить баллы"...');
    try {
      // Ищем все кнопки и проверяем их текст
      const buttons = await page.$$('button');
      let editPointsButton = null;

      for (let button of buttons) {
        const text = await page.evaluate((el) => el.textContent, button);
        if (text && text.includes('Изменить') && text.includes('баллы')) {
          editPointsButton = button;
          console.log(`   ✅ Найдена кнопка: "${text}"`);
          break;
        }
      }

      if (editPointsButton) {
        console.log('5️⃣ Кликаем на кнопку "Изменить баллы"...');
        await editPointsButton.click();
        await page.waitForTimeout(1000);

        console.log('6️⃣ Проверяем, что модальное окно открылось...');

        // Ищем модальное окно по различным селекторам
        const modalSelectors = [
          '[class*="modal"]',
          '[class*="Modal"]',
          '.modal',
          '[role="dialog"]',
          '[aria-modal="true"]',
        ];

        let modalFound = false;
        for (let selector of modalSelectors) {
          try {
            await page.waitForSelector(selector, { timeout: 2000 });
            console.log(
              `   ✅ Модальное окно найдено по селектору: ${selector}`
            );
            modalFound = true;
            break;
          } catch (e) {
            // Продолжаем поиск
          }
        }

        if (!modalFound) {
          console.log(
            '   ⚠️ Модальное окно не найдено, проверяем наличие формы...'
          );
        }

        console.log('7️⃣ Заполняем форму изменения баллов...');

        // Заполняем поле количества баллов
        try {
          const amountInput = await page.$('input[name="amount"]');
          if (amountInput) {
            await amountInput.click({ clickCount: 3 }); // Выделяем весь текст
            await amountInput.type('50');
            console.log('   ✅ Введено количество баллов: 50');
          } else {
            console.log('   ⚠️ Поле amount не найдено');
          }
        } catch (error) {
          console.log(
            '   ❌ Ошибка при заполнении поля amount:',
            error.message
          );
        }

        // Выбираем тип операции
        try {
          const typeSelect = await page.$('select[name="type"]');
          if (typeSelect) {
            await typeSelect.select('bonus');
            console.log('   ✅ Выбран тип операции: bonus');
          } else {
            console.log('   ⚠️ Поле type не найдено');
          }
        } catch (error) {
          console.log('   ❌ Ошибка при выборе типа операции:', error.message);
        }

        // Заполняем описание
        try {
          const descriptionTextarea = await page.$(
            'textarea[name="description"]'
          );
          if (descriptionTextarea) {
            await descriptionTextarea.click();
            await descriptionTextarea.type(
              'Тестирование функции изменения баллов через браузер'
            );
            console.log('   ✅ Введено описание операции');
          } else {
            console.log('   ⚠️ Поле description не найдено');
          }
        } catch (error) {
          console.log('   ❌ Ошибка при заполнении описания:', error.message);
        }

        console.log('8️⃣ Отправляем форму...');
        try {
          const submitButton = await page.$('button[type="submit"]');
          if (submitButton) {
            await submitButton.click();
            console.log('   ✅ Форма отправлена');
          } else {
            console.log('   ⚠️ Кнопка отправки не найдена');
          }
        } catch (error) {
          console.log('   ❌ Ошибка при отправке формы:', error.message);
        }

        // Ждем ответа от сервера
        await page.waitForTimeout(3000);

        console.log('9️⃣ Проверяем результат...');

        // Проверяем, закрылось ли модальное окно
        try {
          const modal = await page.$('[class*="modal"]');
          if (!modal) {
            console.log('   ✅ Модальное окно закрылось после отправки');
          } else {
            console.log('   ⚠️ Модальное окно все еще открыто');
          }
        } catch (error) {
          console.log('   ⚠️ Не удалось проверить состояние модального окна');
        }
      } else {
        console.log('   ❌ Кнопка "Изменить баллы" не найдена');
      }
    } catch (error) {
      console.log(
        '   ❌ Ошибка при работе с кнопкой "Изменить баллы":',
        error.message
      );
    }

    console.log('🔟 Проверяем текущее состояние баллов...');
    try {
      // Ищем отображение текущих баллов
      const pointsSelectors = [
        '[class*="pointsValue"]',
        '[class*="infoValue"]',
        '[class*="points"]',
        '.points',
        'span:contains("баллов")',
        'div:contains("баллов")',
      ];

      for (let selector of pointsSelectors) {
        try {
          const elements = await page.$$(selector);
          for (let element of elements) {
            const text = await page.evaluate((el) => el.textContent, element);
            if (text && text.match(/\d+/)) {
              console.log(`   💰 Найдены баллы: ${text}`);
            }
          }
        } catch (e) {
          // Продолжаем поиск
        }
      }
    } catch (error) {
      console.log('   ⚠️ Не удалось найти отображение баллов');
    }

    console.log('\n✅ Тестирование завершено!');

    // Делаем скриншот для анализа
    await page.screenshot({ path: 'test-points-result.png', fullPage: true });
    console.log('📸 Скриншот сохранен как test-points-result.png');
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
