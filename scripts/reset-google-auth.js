// scripts/reset-google-auth.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function resetGoogleAuth() {
  try {
    console.log('Поиск пользователей с аккаунтами Google...');

    // Находим всех пользователей с аккаунтами Google
    const googleAccounts = await prisma.account.findMany({
      where: {
        provider: 'google',
      },
      include: {
        user: true,
      },
    });

    console.log(`Найдено ${googleAccounts.length} аккаунтов Google`);

    // Удаляем аккаунты Google
    for (const account of googleAccounts) {
      console.log(
        `Удаление аккаунта Google для пользователя ${
          account.user.email || account.user.name || account.userId
        }`
      );

      await prisma.account.delete({
        where: {
          id: account.id,
        },
      });
    }

    console.log(
      '\nСписок пользователей, которым нужно заново авторизоваться через Google:'
    );
    googleAccounts.forEach((account) => {
      console.log(
        `- ${account.user.email || account.user.name || account.userId}`
      );
    });

    console.log(
      '\nГотово! Пользователям необходимо заново войти в систему через Google для восстановления токенов.'
    );
    console.log(
      'После входа будут созданы новые токены с корректными значениями refresh_token и access_token.'
    );
  } catch (error) {
    console.error('Ошибка при сбросе аутентификации Google:', error);
  } finally {
    await prisma.$disconnect();
  }
}

resetGoogleAuth().catch((error) => {
  console.error('Ошибка выполнения скрипта:', error);
  process.exit(1);
});
