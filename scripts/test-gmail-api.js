/**
 * Тестовый скрипт для проверки отправки писем через Gmail API
 *
 * Запуск:
 *   - Базовый: node scripts/test-gmail-api.js
 *   - С указанием получателя: node scripts/test-gmail-api.js email@example.com
 */

// Загружаем переменные окружения из .env.production
require('dotenv').config({ path: '.env.production' });

// Инициализируем Prisma перед импортом других модулей
// Это необходимо для корректной работы с базой данных
require('../prisma/client');

// Импортируем функцию для отправки писем
const { sendEmailViaGmailApi } = require('../lib/utils/email');
const { initializeGmailClient } = require('../lib/utils/googleGmail');

// Получаем ID пользователя или адрес получателя из аргументов командной строки
const userIdOrEmail = process.argv[2];
const TEST_EMAIL = process.argv[3] || 'test@example.com';

// Проверяем, является ли первый аргумент ID пользователя или адресом получателя
const isEmail = userIdOrEmail && userIdOrEmail.includes('@');
const userId = isEmail ? null : userIdOrEmail;
const recipientEmail = isEmail ? userIdOrEmail : TEST_EMAIL;

/**
 * Основная функция для тестирования отправки письма
 */
async function testGmailApiSend() {
  console.log('=== Тестирование отправки письма через Gmail API ===');
  console.log(`ID пользователя из командной строки: ${userId || 'не указан'}`);
  console.log(
    `ID пользователя из переменной окружения: ${
      process.env.GMAIL_USER_ID || 'не указан'
    }`
  );
  console.log(
    `Используемый ID пользователя: ${userId || process.env.GMAIL_USER_ID}`
  );
  console.log(`Адрес получателя: ${recipientEmail}`);
  console.log(`Время запуска: ${new Date().toLocaleString('ru-RU')}`);
  console.log('---------------------------------------------------');

  // Проверяем наличие необходимых переменных окружения
  console.log('\n[1] Проверка конфигурации:');

  // Проверяем GMAIL_USER_ID
  if (!process.env.GMAIL_USER_ID) {
    console.warn(
      '⚠️ Переменная GMAIL_USER_ID не установлена. Используем значение по умолчанию.'
    );
    process.env.GMAIL_USER_ID = 'me';
  } else {
    console.log('✅ GMAIL_USER_ID настроен:', process.env.GMAIL_USER_ID);
  }

  // Проверяем токены Google
  console.log('✅ GOOGLE_CLIENT_ID настроен:', !!process.env.GOOGLE_CLIENT_ID);
  console.log(
    '✅ GOOGLE_CLIENT_SECRET настроен:',
    !!process.env.GOOGLE_CLIENT_SECRET
  );
  console.log(
    '✅ GOOGLE_ACCESS_TOKEN настроен:',
    !!process.env.GOOGLE_ACCESS_TOKEN
  );
  console.log(
    '✅ GOOGLE_REFRESH_TOKEN настроен:',
    !!process.env.GOOGLE_REFRESH_TOKEN
  );

  // Проверяем настройки SMTP (запасной вариант)
  console.log('✅ EMAIL_HOST настроен:', !!process.env.EMAIL_HOST);
  console.log('✅ EMAIL_USER настроен:', !!process.env.EMAIL_USER);
  if (!process.env.EMAIL_PASSWORD) {
    console.warn(
      '⚠️ EMAIL_PASSWORD не настроен. Запасной SMTP метод может не работать.'
    );
  } else {
    console.log('✅ EMAIL_PASSWORD настроен');
  }

  console.log('\n[2] Проверка подключения к Gmail API:');
  try {
    const gmail = await initializeGmailClient(process.env.GMAIL_USER_ID);
    console.log('✅ Подключение к Gmail API успешно установлено');
  } catch (error) {
    console.error('❌ Ошибка при подключении к Gmail API:', error.message);
    console.error('Детали ошибки:', error);
  }

  // Создаем параметры тестового письма
  const mailOptions = {
    from: process.env.EMAIL_FROM || 'noreply@example.com',
    to: TEST_EMAIL,
    subject: 'Тестовое письмо через Gmail API',
    text: 'Это тестовое письмо, отправленное через Gmail API.',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h2 style="color: #333; text-align: center;">Тестовое письмо</h2>
        <p>Это тестовое письмо, отправленное через Gmail API.</p>
        <p>Время отправки: ${new Date().toLocaleString('ru-RU')}</p>
        <p style="text-align: center; margin-top: 30px; color: #777; font-size: 12px;">Это автоматическое тестовое сообщение.</p>
      </div>
    `,
  };

  try {
    console.log(`Отправка тестового письма на адрес: ${TEST_EMAIL}`);

    console.log('\n[3] Отправка тестового письма:');
    console.log(`📧 Отправитель: ${mailOptions.from}`);
    console.log(`📧 Получатель: ${mailOptions.to}`);
    console.log(`📧 Тема: ${mailOptions.subject}`);
    console.log(`📧 Время отправки: ${new Date().toLocaleString('ru-RU')}`);

    // Отправляем письмо через Gmail API
    console.log('\n[4] Процесс отправки:');
    console.time('Время отправки');
    console.log(`Переданный ID пользователя: ${userId}`);
    console.log(
      `Значение GMAIL_USER_ID из переменной окружения: ${process.env.GMAIL_USER_ID}`
    );

    // Используем переданный ID пользователя, если он есть, иначе используем значение из переменной окружения
    const userIdToUse = userId || process.env.GMAIL_USER_ID;
    console.log(`Используемый ID пользователя для отправки: ${userIdToUse}`);

    const result = await sendEmailViaGmailApi(mailOptions, userIdToUse);
    console.timeEnd('Время отправки');

    // Выводим результат
    console.log('\n[5] Результат отправки:');
    if (result.success) {
      console.log('✅ Письмо успешно отправлено!');
      console.log(`✅ ID сообщения: ${result.messageId}`);
      console.log(
        `✅ Метод отправки: ${
          result.fallbackToSMTP ? 'SMTP (запасной вариант)' : 'Gmail API'
        }`
      );

      if (result.fallbackToSMTP) {
        console.log(
          '⚠️ Письмо отправлено через SMTP (запасной вариант), а не через Gmail API'
        );
        console.log(
          '⚠️ Причина использования запасного варианта: Gmail API недоступен или произошла ошибка'
        );
      }
    } else {
      console.error('❌ Ошибка при отправке письма:');
      console.error(`❌ Сообщение ошибки: ${result.error}`);
      if (result.details) {
        console.error('❌ Детали ошибки:', result.details);
      }
    }
  } catch (error) {
    console.error('\n❌ Критическая ошибка при отправке письма:');
    console.error(`❌ Сообщение ошибки: ${error.message}`);

    // Выводим дополнительную информацию для отладки
    console.log('\n[6] Дополнительная информация для отладки:');
    console.log('📌 NODE_ENV:', process.env.NODE_ENV);
    console.log('📌 GMAIL_USER_ID установлен:', !!process.env.GMAIL_USER_ID);
    console.log(
      '📌 GOOGLE_ACCESS_TOKEN установлен:',
      !!process.env.GOOGLE_ACCESS_TOKEN
    );
    console.log(
      '📌 GOOGLE_REFRESH_TOKEN установлен:',
      !!process.env.GOOGLE_REFRESH_TOKEN
    );
    console.log('📌 EMAIL_PASSWORD установлен:', !!process.env.EMAIL_PASSWORD);

    // Анализ ошибки
    console.log('\n[7] Анализ ошибки:');
    if (error.message.includes('invalid_grant')) {
      console.error(
        '❌ Ошибка авторизации: недействительный токен. Требуется обновление токенов Google.'
      );
    } else if (error.message.includes('invalid_client')) {
      console.error(
        '❌ Ошибка авторизации: недействительный клиент. Проверьте GOOGLE_CLIENT_ID и GOOGLE_CLIENT_SECRET.'
      );
    } else if (error.message.includes('unauthorized_client')) {
      console.error(
        '❌ Ошибка авторизации: неавторизованный клиент. Проверьте настройки проекта в Google Cloud Console.'
      );
    } else if (error.message.includes('invalid_request')) {
      console.error(
        '❌ Ошибка запроса: неверный запрос. Проверьте параметры запроса.'
      );
    } else if (
      error.message.includes('ENOTFOUND') ||
      error.message.includes('ETIMEDOUT')
    ) {
      console.error(
        '❌ Ошибка сети: проблемы с подключением к серверам Google. Проверьте интернет-соединение.'
      );
    }

    // Выводим полный стек ошибки для детального анализа
    console.log('\n[8] Полный стек ошибки:');
    console.error(error);
  }
}

// Функция для вывода справки
function printHelp() {
  console.log(`
Использование: node scripts/test-gmail-api.js [userId|recipientEmail] [recipientEmail]

Параметры:
  userId         - ID пользователя в базе данных (опционально)
  recipientEmail - Адрес электронной почты получателя (опционально)
                   По умолчанию: test@example.com

Примеры:
  node scripts/test-gmail-api.js                           # Использует GMAIL_USER_ID из .env, отправка на test@example.com
  node scripts/test-gmail-api.js cmaqiq7d20000s2kbsxvuofri # Использует указанный ID пользователя, отправка на test@example.com
  node scripts/test-gmail-api.js user@gmail.com            # Использует GMAIL_USER_ID из .env, отправка на указанный адрес
  node scripts/test-gmail-api.js cmaqiq7d20000s2kbsxvuofri user@gmail.com # Использует указанный ID и адрес
  `);
}

// Проверяем, запрошена ли справка
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  printHelp();
} else {
  // Запускаем тестирование
  console.log(
    `\nЗапуск тестирования отправки письма на адрес: ${recipientEmail}\n`
  );

  testGmailApiSend()
    .then(() => {
      console.log('\n=== Тестирование завершено ===');
    })
    .catch((error) => {
      console.error('\n=== Тестирование завершено с ошибкой ===');
      console.error(error);
      process.exit(1);
    });
}
