/**
 * Тест для диагностики HTTP 500 ошибки при записи на mock-интервью
 */

const testBookInterview = async () => {
  console.log('🔍 Начинаем диагностику ошибки записи на интервью...\n');

  // ID интервью из ошибки
  const interviewId = 'cmbbur3rh0009mkcyhjmnbh5p';
  const url = `http://localhost:3000/api/mock-interviews/${interviewId}/book`;

  console.log(`📍 URL: ${url}`);
  console.log(`📍 Метод: POST`);
  console.log(`📍 ID интервью: ${interviewId}\n`);

  try {
    console.log('🚀 Отправляем POST запрос...');

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Добавляем cookie для аутентификации (если есть)
        Cookie: process.env.TEST_COOKIE || '',
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
testBookInterview().catch(console.error);
