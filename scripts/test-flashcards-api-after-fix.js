const fetch = require('node-fetch');

async function testFlashcardsAPIAfterFix() {
  try {
    console.log('=== ТЕСТ API ФЛЕШ-КАРТОЧЕК ПОСЛЕ ИСПРАВЛЕНИЯ ===');

    // Тестируем API эндпоинт напрямую
    console.log('🔍 Тестируем GET /api/flashcards/questions...');

    const response = await fetch(
      'http://localhost:3000/api/flashcards/questions?limit=5',
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          // Добавляем базовые заголовки для тестирования
          'User-Agent': 'Test-Script/1.0',
        },
      }
    );

    console.log(`📊 Статус ответа: ${response.status} ${response.statusText}`);
    console.log(
      `📊 Заголовки ответа:`,
      Object.fromEntries(response.headers.entries())
    );

    if (response.ok) {
      const data = await response.json();
      console.log('✅ API работает корректно!');
      console.log(`📝 Получено вопросов: ${data.questions?.length || 0}`);
      console.log(`📊 Всего доступных: ${data.totalAvailable || 0}`);
      console.log(`🔧 Режим: ${data.mode || 'не указан'}`);
      console.log(`🔧 Фильтры:`, data.filters || {});

      if (data.questions && data.questions.length > 0) {
        console.log('📋 Первые 2 вопроса:');
        data.questions.slice(0, 2).forEach((q, i) => {
          console.log(`  ${i + 1}. ID: ${q.id}`);
          console.log(`     Текст: ${q.questionText?.substring(0, 80)}...`);
          console.log(`     Тема: ${q.topic || 'не указана'}`);
          console.log(`     Сложность: ${q.difficulty || 'не указана'}`);
        });
      }
    } else {
      const errorText = await response.text();
      console.error('❌ API вернул ошибку:');
      console.error(`   Статус: ${response.status}`);
      console.error(`   Текст ошибки: ${errorText}`);

      // Пытаемся парсить JSON ошибку
      try {
        const errorJson = JSON.parse(errorText);
        console.error(`   Сообщение: ${errorJson.message || 'не указано'}`);
        console.error(`   Детали: ${errorJson.error || 'не указаны'}`);
      } catch (parseError) {
        console.error(`   Не удалось распарсить JSON ошибки`);
      }
    }

    console.log('=== ТЕСТ ЗАВЕРШЕН ===');
  } catch (error) {
    console.error('🚨 КРИТИЧЕСКАЯ ОШИБКА В ТЕСТЕ:');
    console.error('   Сообщение:', error.message);
    console.error('   Стек:', error.stack);

    if (error.code === 'ECONNREFUSED') {
      console.error('   Причина: Сервер не запущен на localhost:3000');
      console.error('   Решение: Запустите сервер командой npm run dev');
    } else if (error.code === 'ENOTFOUND') {
      console.error('   Причина: Не удается найти хост localhost');
      console.error('   Решение: Проверьте сетевые настройки');
    }
  }
}

testFlashcardsAPIAfterFix();
