const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testCredentialsSignIn() {
  try {
    console.log('🧪 Тестирование входа по логину и паролю...\n');

    // Импортируем функцию authorize из NextAuth конфигурации
    const { authOptions } = require('./pages/api/auth/[...nextauth].js');

    // Находим провайдер credentials
    const credentialsProvider = authOptions.providers.find(
      (provider) => provider.id === 'credentials'
    );

    if (!credentialsProvider) {
      console.log('❌ Провайдер credentials не найден');
      return;
    }

    console.log('✅ Провайдер credentials найден');

    // Тестируем с правильными учетными данными
    console.log('\n1️⃣ Тест с правильными учетными данными:');
    const validCredentials = {
      username: 'test@example.com',
      password: 'testpassword123',
    };

    console.log(`   📧 Email: ${validCredentials.username}`);
    console.log(`   🔐 Пароль: ${validCredentials.password}`);

    try {
      const validResult = await credentialsProvider.authorize(validCredentials);
      if (validResult) {
        console.log('   ✅ Авторизация успешна');
        console.log(
          `   👤 Пользователь: ${validResult.name} (${validResult.email})`
        );
        console.log(`   🆔 ID: ${validResult.id}`);
        console.log(`   👑 Роль: ${validResult.role}`);
      } else {
        console.log('   ❌ Авторизация не удалась');
      }
    } catch (error) {
      console.log('   ❌ Ошибка при авторизации:', error.message);
    }

    // Тестируем с неправильными учетными данными
    console.log('\n2️⃣ Тест с неправильными учетными данными:');
    const invalidCredentials = {
      username: 'test@example.com',
      password: 'wrongpassword',
    };

    console.log(`   📧 Email: ${invalidCredentials.username}`);
    console.log(`   🔐 Пароль: ${invalidCredentials.password}`);

    try {
      const invalidResult = await credentialsProvider.authorize(
        invalidCredentials
      );
      if (invalidResult) {
        console.log('   ❌ Авторизация не должна была пройти!');
      } else {
        console.log('   ✅ Авторизация правильно отклонена');
      }
    } catch (error) {
      console.log(
        '   ✅ Авторизация правильно отклонена с ошибкой:',
        error.message
      );
    }

    // Тестируем с несуществующим пользователем
    console.log('\n3️⃣ Тест с несуществующим пользователем:');
    const nonExistentCredentials = {
      username: 'nonexistent@example.com',
      password: 'anypassword',
    };

    console.log(`   📧 Email: ${nonExistentCredentials.username}`);
    console.log(`   🔐 Пароль: ${nonExistentCredentials.password}`);

    try {
      const nonExistentResult = await credentialsProvider.authorize(
        nonExistentCredentials
      );
      if (nonExistentResult) {
        console.log('   ❌ Авторизация не должна была пройти!');
      } else {
        console.log('   ✅ Авторизация правильно отклонена');
      }
    } catch (error) {
      console.log(
        '   ✅ Авторизация правильно отклонена с ошибкой:',
        error.message
      );
    }

    // Тестируем с пустыми учетными данными
    console.log('\n4️⃣ Тест с пустыми учетными данными:');
    const emptyCredentials = {
      username: '',
      password: '',
    };

    console.log(`   📧 Email: "${emptyCredentials.username}"`);
    console.log(`   🔐 Пароль: "${emptyCredentials.password}"`);

    try {
      const emptyResult = await credentialsProvider.authorize(emptyCredentials);
      if (emptyResult) {
        console.log('   ❌ Авторизация не должна была пройти!');
      } else {
        console.log('   ✅ Авторизация правильно отклонена');
      }
    } catch (error) {
      console.log(
        '   ✅ Авторизация правильно отклонена с ошибкой:',
        error.message
      );
    }

    console.log('\n🎉 Тестирование завершено!');
    console.log('\n📋 Результаты:');
    console.log('   ✅ Правильные учетные данные: должны пройти авторизацию');
    console.log('   ✅ Неправильные учетные данные: должны быть отклонены');
    console.log('   ✅ Несуществующий пользователь: должен быть отклонен');
    console.log('   ✅ Пустые учетные данные: должны быть отклонены');
  } catch (error) {
    console.error('❌ Ошибка при тестировании:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Запускаем тест
testCredentialsSignIn()
  .then(() => {
    console.log('\n🌐 Теперь можно протестировать в браузере:');
    console.log('   1. Откройте http://localhost:3000/auth/signin');
    console.log('   2. Нажмите "Войти с логином и паролем"');
    console.log('   3. Введите: test@example.com / testpassword123');
    console.log('   4. Проверьте успешный вход');
  })
  .catch(console.error);
