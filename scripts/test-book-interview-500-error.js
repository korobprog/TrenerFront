/**
 * Тест для воспроизведения HTTP 500 ошибки при записи на mock-интервью
 * Используем cookie второго пользователя для записи на интервью первого
 */

const testBookInterview500Error = async () => {
  console.log('🔍 Воспроизводим HTTP 500 ошибку при записи на интервью...\n');

  // ID интервью из ошибки (создано пользователем cmb9k4mtb0000mkc4b5uwfgtz)
  const interviewId = 'cmbbur3rh0009mkcyhjmnbh5p';
  const url = `http://localhost:3000/api/mock-interviews/${interviewId}/book`;

  // Cookie второго пользователя (makstreid@yandex.ru, ID: cmbbcczhj000emkxw3fub8ld3)
  const authCookie =
    'next-auth.csrf-token=80138e765c0e3a044ba9d6d500592348beeaa8ef6d3a651dc9ba3d8fb72a0efb%7C176b223c60a29d126d9ee6af331342dab3665ca25fdfe07ef45af2838972037e; next-auth.callback-url=http%3A%2F%2Flocalhost%3A3000%2F; next-auth.session-token=7e18e84c-efee-467f-901e-070fe591860a';

  console.log(`📍 URL: ${url}`);
  console.log(`📍 Метод: POST`);
  console.log(`📍 ID интервью: ${interviewId}`);
  console.log(`📍 Интервьюер: cmb9k4mtb0000mkc4b5uwfgtz (korobprog@gmail.com)`);
  console.log(
    `📍 Записывается: cmbbcczhj000emkxw3fub8ld3 (makstreid@yandex.ru)`
  );
  console.log(`📍 Cookie: ${authCookie.substring(0, 100)}...`);
  console.log('');

  try {
    console.log('🚀 Отправляем POST запрос для воспроизведения 500 ошибки...');

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: authCookie,
        'User-Agent':
          'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 YaBrowser/25.4.0.0 Safari/537.36',
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
        console.log('💡 Это именно та ошибка, которую мы ищем!');
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
  console.log(
    '📝 Ожидаем увидеть HTTP 500 ошибку из-за проблем с полем points в модели User'
  );
};

// Запускаем тест
testBookInterview500Error().catch(console.error);
