/**
 * Скрипт для проверки наличия токенов Google в базе данных
 */

const { PrismaClient } = require('@prisma/client');

// Создаем экземпляр PrismaClient
const prisma = new PrismaClient({
  log: ['error', 'warn'],
});

async function checkGoogleTokens() {
  try {
    console.log('=== Проверка токенов Google в базе данных ===');

    // Получаем все аккаунты Google из базы данных
    const accounts = await prisma.account.findMany({
      where: {
        provider: 'google',
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    console.log(`Найдено аккаунтов Google: ${accounts.length}`);

    // Выводим информацию о каждом аккаунте
    accounts.forEach((account, index) => {
      console.log(`\nАккаунт Google #${index + 1}:`);
      console.log(`- ID аккаунта: ${account.id}`);
      console.log(`- ID пользователя: ${account.userId}`);
      console.log(`- Имя пользователя: ${account.user?.name || 'Не указано'}`);
      console.log(
        `- Email пользователя: ${account.user?.email || 'Не указан'}`
      );
      console.log(`- Роль пользователя: ${account.user?.role || 'Не указана'}`);
      console.log(
        `- Refresh Token: ${
          account.refresh_token ? 'Присутствует' : 'Отсутствует'
        }`
      );
      console.log(
        `- Access Token: ${
          account.access_token ? 'Присутствует' : 'Отсутствует'
        }`
      );
      console.log(
        `- Срок действия токена: ${
          account.expires_at
            ? new Date(account.expires_at * 1000).toISOString()
            : 'Не указан'
        }`
      );
    });

    // Проверяем наличие переменных окружения
    console.log('\n=== Проверка переменных окружения ===');
    console.log(`- GMAIL_USER_ID: ${process.env.GMAIL_USER_ID || 'Не указан'}`);
    console.log(
      `- GOOGLE_CLIENT_ID: ${
        process.env.GOOGLE_CLIENT_ID ? 'Присутствует' : 'Отсутствует'
      }`
    );
    console.log(
      `- GOOGLE_CLIENT_SECRET: ${
        process.env.GOOGLE_CLIENT_SECRET ? 'Присутствует' : 'Отсутствует'
      }`
    );
    console.log(
      `- GOOGLE_REDIRECT_URI: ${process.env.GOOGLE_REDIRECT_URI || 'Не указан'}`
    );
    console.log(
      `- GOOGLE_ACCESS_TOKEN: ${
        process.env.GOOGLE_ACCESS_TOKEN ? 'Присутствует' : 'Отсутствует'
      }`
    );
    console.log(
      `- GOOGLE_REFRESH_TOKEN: ${
        process.env.GOOGLE_REFRESH_TOKEN ? 'Присутствует' : 'Отсутствует'
      }`
    );
    console.log(
      `- GOOGLE_TOKEN_EXPIRY: ${process.env.GOOGLE_TOKEN_EXPIRY || 'Не указан'}`
    );

    // Выводим рекомендации
    console.log('\n=== Рекомендации ===');
    if (accounts.length === 0) {
      console.log(
        'В базе данных не найдены аккаунты Google. Необходимо выполнить миграцию токенов:'
      );
      console.log(
        'node scripts/migrate-google-tokens.js [userId|email] --validate'
      );
    } else {
      console.log('Для тестирования Gmail API используйте ID пользователя:');
      accounts.forEach((account) => {
        console.log(
          `- ${account.user?.name || 'Пользователь'} (${
            account.user?.email || 'Без email'
          }): node scripts/test-gmail-api.js ${account.userId}`
        );
      });
    }
  } catch (error) {
    console.error('Ошибка при проверке токенов Google:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Запускаем функцию
checkGoogleTokens();
