/**
 * Скрипт для обновления поля expires_at у Google токенов в базе данных
 *
 * Этот скрипт находит все аккаунты Google в базе данных и добавляет
 * корректное значение expires_at для тех аккаунтов, у которых оно отсутствует.
 *
 * Использование:
 * node scripts/update-google-tokens-expiry.js
 */

const { google } = require('googleapis');
const prisma = require('../prisma/client');

// Время жизни токена по умолчанию в секундах (1 час)
const DEFAULT_TOKEN_LIFETIME = 3600;

/**
 * Обновляет поле expires_at для Google аккаунтов
 */
async function updateGoogleTokensExpiry() {
  try {
    console.log('Начинаем обновление поля expires_at для Google токенов...');

    // Находим все аккаунты Google
    const googleAccounts = await prisma.account.findMany({
      where: {
        provider: 'google',
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });

    console.log(`Найдено ${googleAccounts.length} Google аккаунтов`);

    // Счетчики для статистики
    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    // Обрабатываем каждый аккаунт
    for (const account of googleAccounts) {
      try {
        console.log(
          `Обработка аккаунта для пользователя ${account.user.email} (ID: ${account.userId})`
        );

        // Проверяем наличие refresh_token
        if (!account.refresh_token) {
          console.log(`  Пропуск: отсутствует refresh_token`);
          skippedCount++;
          continue;
        }

        // Проверяем наличие expires_at
        if (account.expires_at) {
          console.log(
            `  Пропуск: поле expires_at уже установлено (${account.expires_at})`
          );
          skippedCount++;
          continue;
        }

        // Если есть access_token, но нет expires_at, пробуем обновить токен
        if (account.access_token) {
          console.log(`  Обновление: есть access_token, но нет expires_at`);

          // Создаем OAuth2 клиент
          const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            process.env.GOOGLE_REDIRECT_URI
          );

          // Устанавливаем refresh_token
          oauth2Client.setCredentials({
            refresh_token: account.refresh_token,
          });

          try {
            // Запрашиваем новый токен
            console.log(`  Запрос нового токена через refreshAccessToken`);
            const { credentials } = await oauth2Client.refreshAccessToken();

            // Вычисляем время истечения
            const expiryTime =
              Math.floor(Date.now() / 1000) + credentials.expires_in;

            // Обновляем токены в базе данных
            await prisma.account.update({
              where: { id: account.id },
              data: {
                access_token: credentials.access_token,
                expires_at: expiryTime,
              },
            });

            console.log(
              `  Успешно обновлено: новое значение expires_at = ${expiryTime}`
            );
            updatedCount++;
          } catch (refreshError) {
            console.error(
              `  Ошибка при обновлении токена:`,
              refreshError.message
            );

            // Если не удалось обновить токен, устанавливаем expires_at в прошлом
            // чтобы система попыталась обновить его при следующем использовании
            const pastExpiryTime = Math.floor(Date.now() / 1000) - 3600; // 1 час назад

            await prisma.account.update({
              where: { id: account.id },
              data: {
                expires_at: pastExpiryTime,
              },
            });

            console.log(
              `  Установлено expires_at в прошлом: ${pastExpiryTime}`
            );
            updatedCount++;
          }
        } else {
          // Если нет access_token, устанавливаем expires_at в прошлом
          console.log(`  Обновление: отсутствует access_token`);

          const pastExpiryTime = Math.floor(Date.now() / 1000) - 3600; // 1 час назад

          await prisma.account.update({
            where: { id: account.id },
            data: {
              expires_at: pastExpiryTime,
            },
          });

          console.log(`  Установлено expires_at в прошлом: ${pastExpiryTime}`);
          updatedCount++;
        }
      } catch (accountError) {
        console.error(
          `Ошибка при обработке аккаунта ${account.id}:`,
          accountError
        );
        errorCount++;
      }
    }

    console.log('\nРезультаты обновления:');
    console.log(`- Всего аккаунтов: ${googleAccounts.length}`);
    console.log(`- Обновлено: ${updatedCount}`);
    console.log(`- Пропущено: ${skippedCount}`);
    console.log(`- Ошибок: ${errorCount}`);
  } catch (error) {
    console.error('Ошибка при обновлении Google токенов:', error);
    throw error;
  } finally {
    // Закрываем соединение с базой данных
    await prisma.$disconnect();
  }
}

// Запускаем функцию обновления
updateGoogleTokensExpiry()
  .then(() => {
    console.log('Обновление Google токенов завершено успешно');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Ошибка при выполнении скрипта:', error);
    process.exit(1);
  });
