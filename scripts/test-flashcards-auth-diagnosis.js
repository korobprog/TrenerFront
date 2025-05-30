const { getServerSession } = require('next-auth/next');
const { authOptions } = require('../pages/api/auth/[...nextauth]');

/**
 * Тестовый скрипт для диагностики проблемы авторизации в API флешкарт
 * Проверяет работу getServerSession в изолированной среде
 */

async function testAuthDiagnosis() {
  console.log('=== ДИАГНОСТИКА АВТОРИЗАЦИИ ФЛЕШКАРТ ===');

  try {
    // 1. Проверяем импорт authOptions
    console.log('✅ 1. Импорт authOptions успешен');
    console.log('   - Провайдеры:', authOptions.providers?.length || 0);
    console.log('   - Стратегия сессии:', authOptions.session?.strategy);
    console.log('   - Secret настроен:', !!authOptions.secret);

    // 2. Проверяем переменные окружения
    console.log('\n✅ 2. Переменные окружения:');
    console.log('   - NEXTAUTH_SECRET:', !!process.env.NEXTAUTH_SECRET);
    console.log(
      '   - NEXTAUTH_URL:',
      process.env.NEXTAUTH_URL || 'не установлен'
    );
    console.log('   - NODE_ENV:', process.env.NODE_ENV);

    // 3. Симулируем запрос без сессии
    console.log('\n🔍 3. Тест запроса без авторизации:');
    const mockReqNoAuth = {
      method: 'GET',
      headers: {},
      cookies: {},
    };
    const mockResNoAuth = {
      status: (code) => ({ json: (data) => ({ statusCode: code, data }) }),
    };

    try {
      const sessionNoAuth = await getServerSession(
        mockReqNoAuth,
        mockResNoAuth,
        authOptions
      );
      console.log(
        '   - Результат getServerSession без авторизации:',
        sessionNoAuth
      );
      console.log('   - Ожидаемый результат: null ✅');
    } catch (error) {
      console.log('   - Ошибка getServerSession:', error.message);
    }

    // 4. Проверяем структуру authOptions
    console.log('\n🔍 4. Структура authOptions:');
    console.log('   - Callbacks настроены:', !!authOptions.callbacks);
    console.log('   - JWT callback:', !!authOptions.callbacks?.jwt);
    console.log('   - Session callback:', !!authOptions.callbacks?.session);
    console.log('   - SignIn callback:', !!authOptions.callbacks?.signIn);

    // 5. Проверяем провайдеры
    console.log('\n🔍 5. Настроенные провайдеры:');
    authOptions.providers?.forEach((provider, index) => {
      console.log(`   - ${index + 1}. ${provider.name || provider.id}`);
    });

    console.log('\n=== РЕКОМЕНДАЦИИ ===');
    console.log(
      '1. Проблема может быть в том, что getServerSession не получает корректные cookies'
    );
    console.log('2. Возможно, нужно проверить настройки CORS или домена');
    console.log(
      '3. Убедиться, что клиент отправляет правильные заголовки авторизации'
    );
    console.log('4. Проверить, что сессия создается корректно при входе');
  } catch (error) {
    console.error('🚨 КРИТИЧЕСКАЯ ОШИБКА ДИАГНОСТИКИ:');
    console.error('   Сообщение:', error.message);
    console.error('   Стек:', error.stack);
  }

  console.log('\n=== КОНЕЦ ДИАГНОСТИКИ ===');
}

// Запускаем диагностику
testAuthDiagnosis().catch(console.error);
