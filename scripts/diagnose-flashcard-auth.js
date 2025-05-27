const { getServerSession } = require('next-auth/next');
const { authOptions } = require('../pages/api/auth/[...nextauth]');

/**
 * Диагностический скрипт для проверки авторизации в API флешкарт
 * Симулирует запрос к API и проверяет все этапы авторизации
 */

// Симуляция req и res объектов для тестирования
function createMockRequest(headers = {}, cookies = {}) {
  return {
    headers: {
      'user-agent': 'Mozilla/5.0 (Test Browser)',
      accept: 'application/json',
      ...headers,
    },
    cookies: {
      ...cookies,
    },
    method: 'GET',
    url: '/api/flashcards/questions',
  };
}

function createMockResponse() {
  const res = {
    status: function (code) {
      this.statusCode = code;
      return this;
    },
    json: function (data) {
      this.responseData = data;
      return this;
    },
    setHeader: function (name, value) {
      this.headers = this.headers || {};
      this.headers[name] = value;
      return this;
    },
    getHeader: function (name) {
      return this.headers?.[name];
    },
    headers: {},
  };
  return res;
}

async function diagnoseFlashcardAuth() {
  console.log('=== ДИАГНОСТИКА АВТОРИЗАЦИИ ФЛЕШКАРТ ===');

  try {
    // Тест 1: Проверка без сессии
    console.log('\n🔍 ТЕСТ 1: Запрос без сессии');
    const req1 = createMockRequest();
    const res1 = createMockResponse();

    const session1 = await getServerSession(req1, res1, authOptions);
    console.log('   Результат getServerSession:', session1);
    console.log('   Ожидаемый результат: null (нет сессии)');

    // Тест 2: Проверка с некорректными cookies
    console.log('\n🔍 ТЕСТ 2: Запрос с некорректными cookies');
    const req2 = createMockRequest(
      {},
      {
        'next-auth.session-token': 'invalid-token',
        'next-auth.csrf-token': 'invalid-csrf',
      }
    );
    const res2 = createMockResponse();

    const session2 = await getServerSession(req2, res2, authOptions);
    console.log('   Результат getServerSession:', session2);
    console.log('   Ожидаемый результат: null (некорректная сессия)');

    // Тест 3: Проверка конфигурации NextAuth
    console.log('\n🔍 ТЕСТ 3: Проверка конфигурации NextAuth');
    console.log(
      '   authOptions.session.strategy:',
      authOptions.session?.strategy
    );
    console.log('   authOptions.secret установлен:', !!authOptions.secret);
    console.log(
      '   authOptions.providers количество:',
      authOptions.providers?.length
    );
    console.log('   authOptions.adapter установлен:', !!authOptions.adapter);

    // Тест 4: Проверка переменных окружения
    console.log('\n🔍 ТЕСТ 4: Проверка переменных окружения');
    console.log(
      '   NEXTAUTH_SECRET установлен:',
      !!process.env.NEXTAUTH_SECRET
    );
    console.log('   NEXTAUTH_URL:', process.env.NEXTAUTH_URL);
    console.log('   NODE_ENV:', process.env.NODE_ENV);

    // Тест 5: Проверка импортов
    console.log('\n🔍 ТЕСТ 5: Проверка импортов');
    console.log('   getServerSession импортирован:', typeof getServerSession);
    console.log('   authOptions импортирован:', typeof authOptions);

    // Тест 6: Симуляция полного запроса к API
    console.log('\n🔍 ТЕСТ 6: Симуляция запроса к API флешкарт');

    // Импортируем handler из API
    const flashcardHandler =
      require('../pages/api/flashcards/questions').default;

    const req6 = createMockRequest({}, {});
    const res6 = createMockResponse();

    // Добавляем query параметры
    req6.query = {};

    console.log('   Вызываем handler...');
    await flashcardHandler(req6, res6);

    console.log('   Статус ответа:', res6.statusCode);
    console.log('   Данные ответа:', res6.responseData);

    if (res6.statusCode === 401) {
      console.log(
        '   ✅ API корректно возвращает 401 для неавторизованного запроса'
      );
    } else {
      console.log('   ❌ Неожиданный статус ответа');
    }
  } catch (error) {
    console.error('\n🚨 КРИТИЧЕСКАЯ ОШИБКА В ДИАГНОСТИКЕ:');
    console.error('   Сообщение:', error.message);
    console.error('   Стек:', error.stack);
  }

  console.log('\n=== КОНЕЦ ДИАГНОСТИКИ ===');
}

// Запускаем диагностику
diagnoseFlashcardAuth().catch(console.error);
