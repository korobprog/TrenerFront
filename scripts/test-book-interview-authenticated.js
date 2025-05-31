/**
 * Тест для диагностики HTTP 500 ошибки при записи на mock-интервью с аутентификацией
 */

const testBookInterviewAuthenticated = async () => {
  console.log(
    '🔍 Начинаем диагностику ошибки записи на интервью с аутентификацией...\n'
  );

  // ID интервью из ошибки
  const interviewId = 'cmbbur3rh0009mkcyhjmnbh5p';
  const url = `http://localhost:3000/api/mock-interviews/${interviewId}/book`;

  // Cookie из браузера (нужно скопировать из DevTools)
  const authCookie =
    'next-auth.csrf-token=7c040149f8f8c461298f65bcdda923027ec6f4a5eacf7f4208e646bb78b7400e%7C4f6fcff4d02c3f1ecd8d61ceeb691ef076eab85aa4a8fffbe96e962472265c46; next-auth.callback-url=http%3A%2F%2Flocalhost%3A3000%2F; next-auth.session-token=3621ebb0-8151-4e84-9b65-7e6ec958852a';

  console.log(`📍 URL: ${url}`);
  console.log(`📍 Метод: POST`);
  console.log(`📍 ID интервью: ${interviewId}`);
  console.log(`📍 Cookie: ${authCookie.substring(0, 100)}...`);
  console.log('');

  try {
    console.log('🚀 Отправляем POST запрос с аутентификацией...');

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: authCookie,
        'User-Agent':
          'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
        Accept: 'application/json',
        Referer: 'http://localhost:3000/mock-interviews',
      },
    });

    console.log(`📊 Статус ответа: ${response.status}`);
    console.log(`📊 Статус текст: ${response.statusText}`);

    // Получаем заголовки ответа
    console.log('\n📋 Заголовки ответа:');
    for (const [key, value] of response.headers.entries()) {
      console.log(`  ${key}: ${value}`);
    }

    // Пытаемся получить тело ответа
    let responseData;
    try {
      responseData = await response.json();
      console.log('\n📄 Тело ответа (JSON):');
      console.log(JSON.stringify(responseData, null, 2));
    } catch (jsonError) {
      console.log('\n❌ Ошибка парсинга JSON ответа:', jsonError.message);

      // Пытаемся получить как текст
      try {
        const textResponse = await response.text();
        console.log('\n📄 Тело ответа (текст):');
        console.log(textResponse);
      } catch (textError) {
        console.log('❌ Не удалось получить тело ответа:', textError.message);
      }
    }

    if (!response.ok) {
      console.log(`\n❌ HTTP ошибка: ${response.status}`);
      if (responseData) {
        console.log(
          '💬 Сообщение об ошибке:',
          responseData.message || responseData.error
        );
      }

      // Если это 500 ошибка, то мы нашли проблему!
      if (response.status === 500) {
        console.log('\n🎯 НАЙДЕНА HTTP 500 ОШИБКА!');
        console.log(
          '🔍 Проверьте серверные логи выше для получения stack trace'
        );
      }
    } else {
      console.log('\n✅ Запрос выполнен успешно');
    }
  } catch (error) {
    console.error('\n💥 Ошибка при выполнении запроса:');
    console.error('Тип ошибки:', error.constructor.name);
    console.error('Сообщение:', error.message);
    console.error('Stack trace:', error.stack);
  }

  console.log('\n🔍 Диагностика завершена');
};

// Запускаем тест
testBookInterviewAuthenticated().catch(console.error);
