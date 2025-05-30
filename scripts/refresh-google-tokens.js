const { google } = require('googleapis');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function refreshGoogleTokens() {
  try {
    console.log('Начинаем обновление Google токенов...');

    // Проверяем переменные окружения
    if (
      !process.env.GOOGLE_CLIENT_ID ||
      !process.env.GOOGLE_CLIENT_SECRET ||
      !process.env.GOOGLE_REFRESH_TOKEN
    ) {
      console.error(
        'Отсутствуют необходимые переменные окружения для Google OAuth'
      );
      return;
    }

    console.log('Создаем OAuth2 клиент...');
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    // Устанавливаем refresh_token
    oauth2Client.setCredentials({
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
    });

    console.log('Запрашиваем новый access token...');
    const { credentials } = await oauth2Client.refreshAccessToken();

    console.log('Новый токен получен успешно');
    console.log('Время жизни нового токена (секунды):', credentials.expires_in);

    // Вычисляем время истечения
    const newExpiryTime = Date.now() + credentials.expires_in * 1000;
    console.log(
      'Новое время истечения:',
      new Date(newExpiryTime).toISOString()
    );

    // Обновляем переменные окружения в файле .env.production
    const fs = require('fs');
    const envPath = '.env.production';

    console.log('Читаем текущий .env.production файл...');
    let envContent = fs.readFileSync(envPath, 'utf8');

    // Обновляем токены
    envContent = envContent.replace(
      /GOOGLE_ACCESS_TOKEN=.*/,
      `GOOGLE_ACCESS_TOKEN=${credentials.access_token}`
    );
    envContent = envContent.replace(
      /GOOGLE_TOKEN_EXPIRY=.*/,
      `GOOGLE_TOKEN_EXPIRY=${newExpiryTime}`
    );

    console.log('Записываем обновленные токены в .env.production...');
    fs.writeFileSync(envPath, envContent);

    console.log('Токены успешно обновлены в .env.production файле');

    // Также обновляем токены в базе данных, если есть аккаунты Google
    console.log('Проверяем наличие Google аккаунтов в базе данных...');
    const googleAccounts = await prisma.account.findMany({
      where: {
        provider: 'google',
      },
    });

    console.log(
      `Найдено ${googleAccounts.length} Google аккаунтов в базе данных`
    );

    if (googleAccounts.length > 0) {
      console.log('Обновляем токены в базе данных...');
      for (const account of googleAccounts) {
        await prisma.account.update({
          where: { id: account.id },
          data: {
            access_token: credentials.access_token,
            expires_at: Math.floor(newExpiryTime / 1000), // В секундах для БД
          },
        });
        console.log(`Обновлен аккаунт ID: ${account.id}`);
      }
    }

    console.log('Обновление токенов завершено успешно!');
  } catch (error) {
    console.error('Ошибка при обновлении токенов:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Запускаем функцию
refreshGoogleTokens()
  .then(() => {
    console.log('Скрипт завершен успешно');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Ошибка выполнения скрипта:', error);
    process.exit(1);
  });
