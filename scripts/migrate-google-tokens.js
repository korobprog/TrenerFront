/**
 * Скрипт для миграции Google токенов из .env файлов в базу данных
 *
 * Этот скрипт:
 * 1. Получает токены из .env файлов
 * 2. Находит или создает аккаунт Google в базе данных
 * 3. Обновляет токены в базе данных
 * 4. Проверяет валидность токенов (опционально)
 *
 * Использование:
 * node scripts/migrate-google-tokens.js [userId|email] [--validate]
 *
 * Параметры:
 * - userId|email: ID пользователя или email для поиска пользователя
 * - --validate: Флаг для проверки валидности токенов перед миграцией
 *
 * Если userId/email не указан, скрипт попытается найти пользователя с ролью superadmin
 */

const { PrismaClient } = require('@prisma/client');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const { google } = require('googleapis');

// Создаем экземпляр PrismaClient
// Не используем оптимизированную реализацию из lib/prisma.js, так как она работает по-другому
const prisma = new PrismaClient({
  log: ['error', 'warn'],
});

// Загружаем переменные окружения из .env.local и .env.production
function loadEnvFiles(customEnvPath = null) {
  // Пути к файлам .env
  const envLocalPath = path.resolve(process.cwd(), '.env.local');
  const envProductionPath = path.resolve(process.cwd(), '.env.production');

  let envLocalVars = {};
  let envProductionVars = {};
  let customEnvVars = {};

  // Загружаем .env.local, если он существует
  if (fs.existsSync(envLocalPath)) {
    console.log('Загружаем переменные из .env.local');
    envLocalVars = dotenv.parse(fs.readFileSync(envLocalPath));
  }

  // Загружаем .env.production, если он существует
  if (fs.existsSync(envProductionPath)) {
    console.log('Загружаем переменные из .env.production');
    envProductionVars = dotenv.parse(fs.readFileSync(envProductionPath));
  }

  // Загружаем пользовательский .env файл, если указан
  if (customEnvPath && fs.existsSync(customEnvPath)) {
    console.log(`Загружаем переменные из ${customEnvPath}`);
    customEnvVars = dotenv.parse(fs.readFileSync(customEnvPath));
  }

  // Объединяем переменные, приоритет у .env.local и пользовательского файла
  return { ...envProductionVars, ...envLocalVars, ...customEnvVars };
}

/**
 * Проверяет валидность Google токенов
 * @param {Object} tokens - Объект с токенами
 * @returns {Promise<boolean>} - Результат проверки
 */
async function validateGoogleTokens(tokens) {
  try {
    console.log('Проверяем валидность токенов...');

    // Создаем OAuth2 клиент
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    // Устанавливаем токены
    oauth2Client.setCredentials({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expiry_date: tokens.expires_at ? tokens.expires_at * 1000 : null, // Конвертируем в миллисекунды
    });

    // Пробуем получить информацию о пользователе
    const oauth2 = google.oauth2({
      auth: oauth2Client,
      version: 'v2',
    });

    const userInfo = await oauth2.userinfo.get();

    console.log('Токены валидны. Информация о пользователе Google:');
    console.log(`- Email: ${userInfo.data.email}`);
    console.log(`- Name: ${userInfo.data.name}`);

    return true;
  } catch (error) {
    console.error('Ошибка при проверке токенов:', error.message);

    // Проверяем тип ошибки
    if (error.message.includes('invalid_grant')) {
      console.error('Ошибка: Refresh token недействителен или отозван');
    } else if (error.message.includes('invalid_token')) {
      console.error('Ошибка: Access token недействителен');
    }

    return false;
  }
}

/**
 * Находит пользователя по ID или email
 * @param {string} userIdentifier - ID или email пользователя
 * @returns {Promise<Object|null>} - Найденный пользователь или null
 */
async function findUser(userIdentifier) {
  try {
    // Проверяем, является ли идентификатор email-адресом
    const isEmail = userIdentifier && userIdentifier.includes('@');

    if (isEmail) {
      console.log(`Ищем пользователя по email: ${userIdentifier}`);
      return await prisma.user.findUnique({
        where: { email: userIdentifier },
      });
    } else if (userIdentifier) {
      console.log(`Ищем пользователя по ID: ${userIdentifier}`);
      return await prisma.user.findUnique({
        where: { id: userIdentifier },
      });
    } else {
      console.log('Ищем пользователя с ролью superadmin');
      return await prisma.user.findFirst({
        where: { role: 'superadmin' },
      });
    }
  } catch (error) {
    console.error(`Ошибка при поиске пользователя: ${error.message}`);
    throw new Error(`Не удалось найти пользователя: ${error.message}`);
  }
}

// Основная функция миграции
async function migrateGoogleTokens() {
  try {
    console.log('=== Начало миграции Google токенов ===');

    // Парсим аргументы командной строки
    const args = process.argv.slice(2);
    const validateFlag = args.includes('--validate');
    const userIdentifier = args.find((arg) => !arg.startsWith('--'));

    // Получаем токены из .env файлов
    const envVars = loadEnvFiles();

    // Проверяем наличие необходимых токенов
    if (!envVars.GOOGLE_REFRESH_TOKEN) {
      console.error('Ошибка: GOOGLE_REFRESH_TOKEN не найден в .env файлах');
      process.exit(1);
    }

    // Находим пользователя по ID, email или роли superadmin
    const user = await findUser(userIdentifier);

    if (!user) {
      console.error(
        `Ошибка: Пользователь ${
          userIdentifier || 'с ролью superadmin'
        } не найден`
      );
      console.log('Пожалуйста, укажите корректный ID или email пользователя:');
      console.log(
        'node scripts/migrate-google-tokens.js [userId|email] [--validate]'
      );
      process.exit(1);
    }

    console.log(
      `Мигрируем токены для пользователя: ${user.name || 'Без имени'} (${
        user.email || 'Без email'
      })`
    );

    // Подготавливаем данные для обновления/создания
    const accountData = {
      refresh_token: envVars.GOOGLE_REFRESH_TOKEN,
      access_token: envVars.GOOGLE_ACCESS_TOKEN || null,
      expires_at: envVars.GOOGLE_TOKEN_EXPIRY
        ? Math.floor(parseInt(envVars.GOOGLE_TOKEN_EXPIRY) / 1000) // Конвертируем в секунды
        : null,
      token_type: 'Bearer',
      scope:
        'https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events',
    };

    // Проверяем валидность токенов, если указан флаг --validate
    if (validateFlag) {
      const isValid = await validateGoogleTokens(accountData);
      if (!isValid) {
        console.log('Предупреждение: Токены не прошли проверку валидности');
        console.log(
          'Вы можете продолжить миграцию, но токены могут не работать'
        );

        // Запрашиваем подтверждение для продолжения
        console.log('Хотите продолжить миграцию? (y/n)');
        const readline = require('readline').createInterface({
          input: process.stdin,
          output: process.stdout,
        });

        const answer = await new Promise((resolve) => {
          readline.question('> ', resolve);
        });

        readline.close();

        if (answer.toLowerCase() !== 'y') {
          console.log('Миграция отменена пользователем');
          process.exit(0);
        }
      }
    }

    try {
      // Ищем существующий аккаунт Google или создаем новый
      let googleAccount = await prisma.account.findFirst({
        where: {
          userId: user.id,
          provider: 'google',
        },
      });

      // Обновляем существующий аккаунт или создаем новый
      if (googleAccount) {
        console.log('Обновляем существующий аккаунт Google');

        await prisma.account.update({
          where: { id: googleAccount.id },
          data: accountData,
        });

        console.log(`Аккаунт с ID ${googleAccount.id} успешно обновлен`);
      } else {
        console.log('Создаем новый аккаунт Google');

        const newAccount = await prisma.account.create({
          data: {
            ...accountData,
            userId: user.id,
            type: 'oauth',
            provider: 'google',
            providerAccountId: user.email || `user-${user.id}`, // Используем email или генерируем ID
          },
        });

        console.log(`Создан новый аккаунт с ID ${newAccount.id}`);
      }
    } catch (error) {
      console.error(`Ошибка при работе с аккаунтом Google: ${error.message}`);
      throw new Error(
        `Не удалось обновить/создать аккаунт Google: ${error.message}`
      );
    }

    console.log('Миграция токенов успешно завершена!');

    // Выводим информацию о том, что делать дальше
    console.log('\n=== Следующие шаги ===');
    console.log('1. Проверьте, что токены успешно сохранены в базе данных:');
    console.log(
      '   SELECT * FROM "Account" WHERE provider = \'google\' AND "userId" = \'' +
        user.id +
        "';"
    );
    console.log('2. Протестируйте функциональность создания Google Meet');
    console.log(
      '3. После успешного тестирования можно удалить токены из .env файлов:'
    );
    console.log('   - GOOGLE_ACCESS_TOKEN');
    console.log('   - GOOGLE_REFRESH_TOKEN');
    console.log('   - GOOGLE_TOKEN_EXPIRY');
  } catch (error) {
    console.error('Ошибка при миграции токенов:');
    console.error(error.message);

    // Проверяем тип ошибки для более подробной диагностики
    if (error.message.includes('connect ECONNREFUSED')) {
      console.error(
        '\nОшибка подключения: сервер базы данных не запущен или недоступен.'
      );
      console.error('Убедитесь, что:');
      console.error('1. Docker запущен');
      console.error(
        '2. Контейнер с базой данных запущен (docker-compose up -d)'
      );
      console.error('3. База данных слушает порт 5432');
    } else if (error.message.includes('authentication failed')) {
      console.error('\nОшибка аутентификации: неверные учетные данные.');
      console.error('Убедитесь, что:');
      console.error(
        '1. Переменная DATABASE_URL содержит правильные учетные данные'
      );
      console.error(
        '2. Пользователь и пароль в .env файлах соответствуют настройкам в docker-compose.yml'
      );
    }

    process.exit(1);
  } finally {
    try {
      await prisma.$disconnect();
    } catch (disconnectError) {
      console.error(
        `Ошибка при отключении от базы данных: ${disconnectError.message}`
      );
    }
  }
}

// Запускаем миграцию
migrateGoogleTokens();
