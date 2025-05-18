/**
 * Скрипт для очистки недействительных токенов Google
 *
 * Этот скрипт находит все аккаунты Google в базе данных и удаляет
 * недействительные токены, чтобы при следующей авторизации они были
 * корректно обновлены.
 *
 * Использование:
 * node scripts/clean-invalid-google-tokens.js [--force] [--user=userId|email]
 *
 * Параметры:
 * --force    - Принудительно очистить все токены, даже если они не проверены на валидность
 * --user     - Очистить токены только для указанного пользователя (по ID или email)
 * --validate - Проверить токены на валидность перед очисткой (занимает больше времени)
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { google } = require('googleapis');

// Создаем экземпляр PrismaClient
const prisma = new PrismaClient({
  log: ['error', 'warn'],
});

// Парсим аргументы командной строки
const args = process.argv.slice(2);
const forceMode = args.includes('--force');
const validateMode = args.includes('--validate');
let targetUser = null;

// Проверяем, указан ли конкретный пользователь
for (const arg of args) {
  if (arg.startsWith('--user=')) {
    targetUser = arg.split('=')[1];
    break;
  }
}

/**
 * Проверяет валидность токена обновления
 * @param {string} refreshToken - Токен обновления для проверки
 * @returns {Promise<boolean>} - true, если токен валиден, false в противном случае
 */
async function validateRefreshToken(refreshToken) {
  try {
    console.log('Проверка валидности refresh token...');

    // Создаем OAuth2 клиент
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    // Устанавливаем refresh_token
    oauth2Client.setCredentials({
      refresh_token: refreshToken,
    });

    // Пытаемся обновить токен
    await oauth2Client.refreshAccessToken();

    console.log('✅ Токен валиден');
    return true;
  } catch (error) {
    console.log('❌ Токен недействителен:', error.message);
    return false;
  }
}

/**
 * Очищает токены для указанного аккаунта
 * @param {Object} account - Объект аккаунта
 * @returns {Promise<boolean>} - true, если токены были очищены, false в противном случае
 */
async function cleanTokensForAccount(account) {
  try {
    console.log(
      `Очистка токенов для аккаунта ${account.id} (пользователь: ${account.userId})...`
    );

    // Если включен режим валидации и токен валиден, пропускаем
    if (validateMode && account.refresh_token) {
      const isValid = await validateRefreshToken(account.refresh_token);
      if (isValid) {
        console.log('Токен валиден, пропускаем очистку');
        return false;
      }
    }

    // Обновляем запись в базе данных, очищая токены
    await prisma.account.update({
      where: { id: account.id },
      data: {
        refresh_token: null,
        access_token: null,
        expires_at: null,
        id_token: null,
      },
    });

    console.log('✅ Токены успешно очищены');
    return true;
  } catch (error) {
    console.error('❌ Ошибка при очистке токенов:', error);
    return false;
  }
}

/**
 * Основная функция для очистки недействительных токенов
 */
async function cleanInvalidTokens() {
  try {
    console.log('=== Очистка недействительных токенов Google ===');
    console.log(
      `Режим принудительной очистки: ${forceMode ? 'Включен' : 'Выключен'}`
    );
    console.log(`Режим валидации: ${validateMode ? 'Включен' : 'Выключен'}`);
    console.log(`Целевой пользователь: ${targetUser || 'Все пользователи'}`);

    // Формируем условие поиска аккаунтов
    const whereCondition = {
      provider: 'google',
    };

    // Если указан конкретный пользователь
    if (targetUser) {
      // Проверяем, является ли targetUser email-адресом
      if (targetUser.includes('@')) {
        // Ищем пользователя по email
        const user = await prisma.user.findUnique({
          where: { email: targetUser },
        });

        if (!user) {
          console.error(`❌ Пользователь с email ${targetUser} не найден`);
          return;
        }

        whereCondition.userId = user.id;
        console.log(
          `Найден пользователь с ID ${user.id} для email ${targetUser}`
        );
      } else {
        // Используем targetUser как ID пользователя
        whereCondition.userId = targetUser;
      }
    }

    // Находим все аккаунты Google
    const accounts = await prisma.account.findMany({
      where: whereCondition,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    console.log(`Найдено ${accounts.length} аккаунтов Google`);

    // Счетчики для статистики
    let cleanedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    // Обрабатываем каждый аккаунт
    for (const account of accounts) {
      console.log(
        `\nОбработка аккаунта для пользователя ${
          account.user?.email || account.userId
        }`
      );

      // В режиме принудительной очистки или если нет refresh_token, очищаем токены
      if (forceMode || !account.refresh_token) {
        const cleaned = await cleanTokensForAccount(account);
        if (cleaned) {
          cleanedCount++;
        } else {
          errorCount++;
        }
      } else {
        // В обычном режиме проверяем наличие refresh_token
        if (account.refresh_token) {
          // Если включен режим валидации, проверяем токен
          if (validateMode) {
            const isValid = await validateRefreshToken(account.refresh_token);
            if (!isValid) {
              const cleaned = await cleanTokensForAccount(account);
              if (cleaned) {
                cleanedCount++;
              } else {
                errorCount++;
              }
            } else {
              console.log('Токен валиден, пропускаем очистку');
              skippedCount++;
            }
          } else {
            console.log(
              'Токен существует, но не проверен. Пропускаем очистку (используйте --validate для проверки)'
            );
            skippedCount++;
          }
        } else {
          console.log('Токен отсутствует, очищаем запись');
          const cleaned = await cleanTokensForAccount(account);
          if (cleaned) {
            cleanedCount++;
          } else {
            errorCount++;
          }
        }
      }
    }

    // Выводим результаты
    console.log('\n=== Результаты очистки ===');
    console.log(`Всего аккаунтов: ${accounts.length}`);
    console.log(`Очищено: ${cleanedCount}`);
    console.log(`Пропущено: ${skippedCount}`);
    console.log(`Ошибок: ${errorCount}`);

    console.log('\n=== Следующие шаги ===');
    console.log(
      '1. Выйдите из системы и войдите снова, используя свою учетную запись Google'
    );
    console.log('2. Новые токены будут автоматически сохранены в базе данных');
    console.log('3. Проверьте работу приложения');
  } catch (error) {
    console.error('Ошибка при очистке токенов:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Запускаем функцию очистки
cleanInvalidTokens()
  .then(() => {
    console.log('Очистка токенов завершена');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Критическая ошибка при выполнении скрипта:', error);
    process.exit(1);
  });
