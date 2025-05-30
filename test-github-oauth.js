require('dotenv').config({ path: '.env.development' });

async function testGitHubOAuth() {
  console.log('🔍 Тестирование настроек GitHub OAuth...\n');

  try {
    // Проверяем наличие переменных окружения
    console.log('1️⃣ Проверка переменных окружения:');
    const requiredVars = [
      'GITHUB_CLIENT_ID',
      'GITHUB_CLIENT_SECRET',
      'NEXTAUTH_URL',
      'NEXTAUTH_SECRET',
    ];

    const missingVars = requiredVars.filter((varName) => !process.env[varName]);

    if (missingVars.length > 0) {
      console.log('   ❌ Отсутствуют переменные:', missingVars.join(', '));
      return;
    }

    console.log('   ✅ Все необходимые переменные найдены');
    console.log(`   🔑 GitHub Client ID: ${process.env.GITHUB_CLIENT_ID}`);
    console.log(
      `   🔐 GitHub Client Secret: ${
        process.env.GITHUB_CLIENT_SECRET
          ? '***' + process.env.GITHUB_CLIENT_SECRET.slice(-4)
          : 'не установлен'
      }`
    );
    console.log(`   🌐 NextAuth URL: ${process.env.NEXTAUTH_URL}`);
    console.log(
      `   🔒 NextAuth Secret: ${
        process.env.NEXTAUTH_SECRET
          ? '***' + process.env.NEXTAUTH_SECRET.slice(-4)
          : 'не установлен'
      }`
    );

    // Проверяем формат Client ID
    console.log('\n2️⃣ Проверка формата GitHub Client ID:');
    const clientId = process.env.GITHUB_CLIENT_ID;

    if (clientId.startsWith('Ov23li')) {
      console.log('   ✅ Client ID имеет правильный формат GitHub OAuth App');
    } else if (clientId.startsWith('Iv1.')) {
      console.log('   ⚠️  Client ID выглядит как GitHub App (не OAuth App)');
      console.log('   💡 Убедитесь, что создали OAuth App, а не GitHub App');
    } else {
      console.log('   ❓ Неизвестный формат Client ID');
    }

    // Формируем URL для авторизации
    console.log('\n3️⃣ Формирование URL авторизации:');
    const authUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(
      process.env.NEXTAUTH_URL + '/api/auth/callback/github'
    )}&scope=user:email`;

    console.log('   📋 URL авторизации GitHub:');
    console.log(`   ${authUrl}`);

    // Проверяем callback URL
    console.log('\n4️⃣ Проверка callback URL:');
    const callbackUrl = `${process.env.NEXTAUTH_URL}/api/auth/callback/github`;
    console.log(`   📞 Callback URL: ${callbackUrl}`);
    console.log(
      '   💡 Убедитесь, что этот URL добавлен в настройки GitHub OAuth App'
    );

    // Тестируем доступность GitHub API
    console.log('\n5️⃣ Проверка доступности GitHub API:');

    try {
      const fetch = (await import('node-fetch')).default;
      const response = await fetch('https://api.github.com/user', {
        headers: {
          'User-Agent': 'TrenerFront-Test',
          Accept: 'application/vnd.github.v3+json',
        },
      });

      if (response.status === 401) {
        console.log(
          '   ✅ GitHub API доступен (получен ожидаемый 401 Unauthorized)'
        );
      } else {
        console.log(
          `   ⚠️  GitHub API вернул неожиданный статус: ${response.status}`
        );
      }
    } catch (error) {
      if (error.code === 'MODULE_NOT_FOUND') {
        console.log('   ⚠️  node-fetch не установлен, пропускаем проверку API');
      } else {
        console.log(`   ❌ Ошибка при проверке GitHub API: ${error.message}`);
      }
    }

    console.log('\n🎯 Инструкции для тестирования:');
    console.log(
      '1. Убедитесь, что в GitHub OAuth App настроен правильный callback URL:'
    );
    console.log(`   ${callbackUrl}`);
    console.log('2. Запустите приложение: npm run dev');
    console.log('3. Откройте http://localhost:3000');
    console.log(
      '4. Нажмите "Войти" и проверьте наличие кнопки "Продолжить с GitHub"'
    );
    console.log('5. Попробуйте авторизоваться через GitHub');

    console.log('\n🎉 Проверка настроек GitHub OAuth завершена!');
  } catch (error) {
    console.error('\n❌ Ошибка при проверке GitHub OAuth:', error.message);
    console.log('\n💡 Возможные причины:');
    console.log('   - Неправильно настроены переменные окружения');
    console.log('   - Неверный формат Client ID или Secret');
    console.log('   - Проблемы с файлом .env.development');

    console.log('\n📖 Для решения проблем см. docs/github-oauth-setup.md');
  }
}

// Запускаем тест
testGitHubOAuth();
