/**
 * Финальная версия тестового скрипта для проверки функциональности изменения баллов
 * Запуск: node test-points-functionality-final.js
 */

const puppeteer = require('puppeteer');

// Функция для ожидания
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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

    console.log('1️⃣ Устанавливаем cookie для аутентификации...');

    // Устанавливаем cookie сессии для аутентификации
    await page.setCookie({
      name: 'next-auth.session-token',
      value: '3621ebb0-8151-4e84-9b65-7e6ec958852a',
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      secure: false,
    });

    await page.setCookie({
      name: 'next-auth.csrf-token',
      value:
        '7c040149f8f8c461298f65bcdda923027ec6f4a5eacf7f4208e646bb78b7400e%7C4f6fcff4d02c3f1ecd8d61ceeb691ef076eab85aa4a8fffbe96e962472265c46',
      domain: 'localhost',
      path: '/',
      httpOnly: false,
      secure: false,
    });

    await page.setCookie({
      name: 'next-auth.callback-url',
      value: 'http%3A%2F%2Flocalhost%3A3000%2F',
      domain: 'localhost',
      path: '/',
      httpOnly: false,
      secure: false,
    });

    console.log('2️⃣ Переходим на страницу пользователя...');
    await page.goto(
      'http://localhost:3000/admin/users/cmb9k4mtb0000mkc4b5uwfgtz',
      {
        waitUntil: 'networkidle2',
      }
    );

    // Ждем загрузки страницы
    await wait(3000);

    console.log('3️⃣ Проверяем, что страница загрузилась...');
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

    console.log('4️⃣ Переходим на вкладку "Баллы и транзакции"...');
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
        await wait(2000);
        console.log('   ✅ Вкладка "Баллы и транзакции" открыта');
      } else {
        console.log('   ⚠️ Не удалось найти вкладку "Баллы и транзакции"');

        // Попробуем найти по классам
        const tabButtons = await page.$$(
          '[class*="tabButton"], [class*="tab"]'
        );
        for (let tab of tabButtons) {
          const text = await page.evaluate((el) => el.textContent, tab);
          console.log(`   Найдена вкладка: "${text}"`);
          if (text && (text.includes('Баллы') || text.includes('транзакции'))) {
            await tab.click();
            pointsTabFound = true;
            break;
          }
        }
      }
    } catch (error) {
      console.log('   ❌ Ошибка при поиске вкладки баллов:', error.message);
    }

    console.log('5️⃣ Ищем кнопку "Изменить баллы"...');
    try {
      // Ждем появления контента вкладки
      await wait(2000);

      // Ищем все кнопки и проверяем их текст
      const buttons = await page.$$('button');
      let editPointsButton = null;

      console.log(`   Найдено кнопок на странице: ${buttons.length}`);

      for (let button of buttons) {
        const text = await page.evaluate((el) => el.textContent, button);
        console.log(`   Проверяем кнопку: "${text}"`);
        if (text && text.includes('Изменить') && text.includes('баллы')) {
          editPointsButton = button;
          console.log(`   ✅ Найдена кнопка: "${text}"`);
          break;
        }
      }

      if (editPointsButton) {
        console.log('6️⃣ Кликаем на кнопку "Изменить баллы"...');
        await editPointsButton.click();
        await wait(1000);

        console.log('7️⃣ Проверяем, что модальное окно открылось...');

        // Ищем модальное окно по различным селекторам
        const modalSelectors = [
          '[class*="modal"]',
          '[class*="Modal"]',
          '.modal',
          '[role="dialog"]',
          '[aria-modal="true"]',
          '[class*="overlay"]',
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

          // Ищем форму напрямую
          const forms = await page.$$('form');
          console.log(`   Найдено форм: ${forms.length}`);
        }

        console.log('8️⃣ Заполняем форму изменения баллов...');

        // Заполняем поле количества баллов
        try {
          const amountInput = await page.$('input[name="amount"]');
          if (amountInput) {
            await amountInput.click({ clickCount: 3 }); // Выделяем весь текст
            await amountInput.type('50');
            console.log('   ✅ Введено количество баллов: 50');
          } else {
            console.log('   ⚠️ Поле amount не найдено');

            // Попробуем найти по другим селекторам
            const inputs = await page.$$(
              'input[type="number"], input[type="text"]'
            );
            console.log(`   Найдено полей ввода: ${inputs.length}`);

            for (let input of inputs) {
              const placeholder = await page.evaluate(
                (el) => el.placeholder,
                input
              );
              const name = await page.evaluate((el) => el.name, input);
              console.log(
                `   Поле: name="${name}", placeholder="${placeholder}"`
              );
            }
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

            // Ищем все селекты
            const selects = await page.$$('select');
            console.log(`   Найдено селектов: ${selects.length}`);

            for (let select of selects) {
              const name = await page.evaluate((el) => el.name, select);
              console.log(`   Селект: name="${name}"`);
            }
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

            // Ищем все текстареа
            const textareas = await page.$$('textarea');
            console.log(`   Найдено текстареа: ${textareas.length}`);
          }
        } catch (error) {
          console.log('   ❌ Ошибка при заполнении описания:', error.message);
        }

        console.log('9️⃣ Отправляем форму...');
        try {
          const submitButton = await page.$('button[type="submit"]');
          if (submitButton) {
            await submitButton.click();
            console.log('   ✅ Форма отправлена');
          } else {
            console.log('   ⚠️ Кнопка отправки не найдена');

            // Ищем кнопки с текстом "Сохранить", "Отправить" и т.д.
            const buttons = await page.$$('button');
            for (let button of buttons) {
              const text = await page.evaluate((el) => el.textContent, button);
              if (
                text &&
                (text.includes('Сохранить') ||
                  text.includes('Отправить') ||
                  text.includes('Применить'))
              ) {
                console.log(`   Найдена кнопка отправки: "${text}"`);
                await button.click();
                break;
              }
            }
          }
        } catch (error) {
          console.log('   ❌ Ошибка при отправке формы:', error.message);
        }

        // Ждем ответа от сервера
        await wait(3000);

        console.log('🔟 Проверяем результат...');

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

        // Выводим все найденные кнопки для анализа
        console.log('   📋 Все кнопки на странице:');
        const allButtons = await page.$$('button');
        for (let i = 0; i < allButtons.length; i++) {
          const text = await page.evaluate(
            (el) => el.textContent,
            allButtons[i]
          );
          console.log(`   ${i + 1}. "${text}"`);
        }
      }
    } catch (error) {
      console.log(
        '   ❌ Ошибка при работе с кнопкой "Изменить баллы":',
        error.message
      );
    }

    console.log('1️⃣1️⃣ Проверяем текущее состояние баллов...');
    try {
      // Ищем отображение текущих баллов
      const allElements = await page.$$('*');
      let foundPoints = false;

      for (let element of allElements.slice(0, 50)) {
        // Ограничиваем поиск первыми 50 элементами
        try {
          const text = await page.evaluate((el) => el.textContent, element);
          if (text && text.match(/\d+.*балл/i)) {
            console.log(`   💰 Найдены баллы: ${text.trim()}`);
            foundPoints = true;
          }
        } catch (e) {
          // Игнорируем ошибки
        }
      }

      if (!foundPoints) {
        console.log('   ⚠️ Отображение баллов не найдено');
      }
    } catch (error) {
      console.log('   ⚠️ Не удалось найти отображение баллов');
    }

    console.log('\n✅ Тестирование завершено!');

    // Делаем скриншот для анализа
    await page.screenshot({ path: 'test-points-result.png', fullPage: true });
    console.log('📸 Скриншот сохранен как test-points-result.png');

    // Ждем 5 секунд перед закрытием для просмотра результата
    console.log('⏳ Ожидание 5 секунд перед закрытием браузера...');
    await wait(5000);
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
