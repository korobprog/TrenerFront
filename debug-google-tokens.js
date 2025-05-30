const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugGoogleTokens() {
  console.log('=== ДИАГНОСТИКА GOOGLE OAUTH ТОКЕНОВ ===\n');

  const userId = 'cmb9k4mtb0000mkc4b5uwfgtz'; // ID пользователя из логов

  try {
    // 1. Проверяем существование пользователя
    console.log('1. ПРОВЕРКА ПОЛЬЗОВАТЕЛЯ:');
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        accounts: {
          select: {
            id: true,
            provider: true,
            providerAccountId: true,
            access_token: true,
            refresh_token: true,
            expires_at: true,
            refresh_token_expires_in: true,
            scope: true,
            token_type: true,
          },
        },
      },
    });

    if (!user) {
      console.log(`❌ Пользователь с ID ${userId} не найден в базе данных`);
      return;
    }

    console.log(`✅ Пользователь найден:`);
    console.log(`   - ID: ${user.id}`);
    console.log(`   - Имя: ${user.name}`);
    console.log(`   - Email: ${user.email}`);
    console.log(`   - Создан: ${user.createdAt}`);
    console.log(`   - Количество аккаунтов: ${user.accounts.length}\n`);

    // 2. Анализируем аккаунты пользователя
    console.log('2. АНАЛИЗ АККАУНТОВ:');
    if (user.accounts.length === 0) {
      console.log('❌ У пользователя нет связанных аккаунтов OAuth');
      return;
    }

    user.accounts.forEach((account, index) => {
      console.log(`Аккаунт ${index + 1}:`);
      console.log(`   - ID: ${account.id}`);
      console.log(`   - Провайдер: ${account.provider}`);
      console.log(`   - Provider Account ID: ${account.providerAccountId}`);
      console.log(`   - Тип токена: ${account.token_type || 'не указан'}`);
      console.log(`   - Область доступа: ${account.scope || 'не указана'}`);

      if (account.access_token) {
        console.log(
          `   - Access Token: ${account.access_token.substring(
            0,
            20
          )}... (длина: ${account.access_token.length})`
        );
      } else {
        console.log(`   - Access Token: ❌ отсутствует`);
      }

      if (account.refresh_token) {
        console.log(
          `   - Refresh Token: ${account.refresh_token.substring(
            0,
            20
          )}... (длина: ${account.refresh_token.length})`
        );
      } else {
        console.log(`   - Refresh Token: ❌ отсутствует`);
      }

      if (account.expires_at) {
        const expiryDate = new Date(account.expires_at * 1000);
        const now = new Date();
        const isExpired = expiryDate < now;
        console.log(
          `   - Истекает: ${expiryDate.toISOString()} (${
            isExpired ? '❌ истёк' : '✅ действителен'
          })`
        );

        if (!isExpired) {
          const timeLeft = Math.floor((expiryDate - now) / 1000 / 60);
          console.log(`   - Осталось времени: ${timeLeft} минут`);
        }
      } else {
        console.log(`   - Время истечения: ❌ не указано`);
      }

      if (account.refresh_token_expires_in) {
        console.log(
          `   - Refresh Token истекает через: ${account.refresh_token_expires_in} секунд`
        );
      }

      console.log('');
    });

    // 3. Проверяем Google аккаунт специально
    console.log('3. ПРОВЕРКА GOOGLE АККАУНТА:');
    const googleAccount = user.accounts.find(
      (acc) => acc.provider === 'google'
    );

    if (!googleAccount) {
      console.log('❌ Google аккаунт не найден');
      console.log(
        'Доступные провайдеры:',
        user.accounts.map((acc) => acc.provider).join(', ')
      );
      return;
    }

    console.log('✅ Google аккаунт найден');

    // 4. Проверяем токены Google
    console.log('\n4. ДИАГНОСТИКА GOOGLE ТОКЕНОВ:');

    const issues = [];

    if (!googleAccount.access_token) {
      issues.push('❌ Access Token отсутствует');
    }

    if (!googleAccount.refresh_token) {
      issues.push('❌ Refresh Token отсутствует');
    }

    if (!googleAccount.expires_at) {
      issues.push('❌ Время истечения токена не указано');
    } else {
      const expiryDate = new Date(googleAccount.expires_at * 1000);
      const now = new Date();
      if (expiryDate < now) {
        issues.push('❌ Access Token истёк');
      }
    }

    if (!googleAccount.scope || !googleAccount.scope.includes('calendar')) {
      issues.push('❌ Отсутствует разрешение на доступ к Google Calendar');
    }

    if (issues.length === 0) {
      console.log('✅ Все токены Google в порядке');
    } else {
      console.log('Обнаружены проблемы:');
      issues.forEach((issue) => console.log(`   ${issue}`));
    }

    // 5. Проверяем переменные окружения
    console.log('\n5. ПРОВЕРКА ПЕРЕМЕННЫХ ОКРУЖЕНИЯ:');

    const envVars = [
      'GOOGLE_CLIENT_ID',
      'GOOGLE_CLIENT_SECRET',
      'GOOGLE_REDIRECT_URI',
      'GOOGLE_ACCESS_TOKEN',
      'GOOGLE_REFRESH_TOKEN',
      'GOOGLE_TOKEN_EXPIRY',
    ];

    envVars.forEach((varName) => {
      const value = process.env[varName];
      if (value) {
        if (varName.includes('TOKEN')) {
          console.log(
            `✅ ${varName}: ${value.substring(0, 20)}... (длина: ${
              value.length
            })`
          );
        } else {
          console.log(`✅ ${varName}: ${value}`);
        }
      } else {
        console.log(`❌ ${varName}: не установлена`);
      }
    });

    // 6. Проверяем время истечения токена из .env
    if (process.env.GOOGLE_TOKEN_EXPIRY) {
      const envExpiryDate = new Date(parseInt(process.env.GOOGLE_TOKEN_EXPIRY));
      const now = new Date();
      const isEnvTokenExpired = envExpiryDate < now;
      console.log(
        `\nТокен из .env истекает: ${envExpiryDate.toISOString()} (${
          isEnvTokenExpired ? '❌ истёк' : '✅ действителен'
        })`
      );
    }

    // 7. Рекомендации по исправлению
    console.log('\n6. РЕКОМЕНДАЦИИ ПО ИСПРАВЛЕНИЮ:');

    if (!googleAccount) {
      console.log(
        '1. Пользователь должен заново авторизоваться через Google OAuth'
      );
      console.log(
        '2. Убедитесь, что в Google Cloud Console настроены правильные redirect URI'
      );
    } else if (!googleAccount.refresh_token) {
      console.log(
        '1. Refresh Token отсутствует - требуется полная повторная авторизация'
      );
      console.log('2. Проверьте настройки OAuth в Google Cloud Console');
      console.log('3. Убедитесь, что запрашивается offline access');
    } else if (
      googleAccount.expires_at &&
      new Date(googleAccount.expires_at * 1000) < new Date()
    ) {
      console.log(
        '1. Access Token истёк, но Refresh Token есть - попробуйте обновить токен'
      );
      console.log(
        '2. Если обновление не работает, требуется повторная авторизация'
      );
    } else if (
      !googleAccount.scope ||
      !googleAccount.scope.includes('calendar')
    ) {
      console.log('1. Отсутствуют необходимые разрешения для Google Calendar');
      console.log(
        '2. Требуется повторная авторизация с запросом calendar scope'
      );
    }
  } catch (error) {
    console.error('❌ Ошибка при диагностике:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Запускаем диагностику
debugGoogleTokens().catch(console.error);
