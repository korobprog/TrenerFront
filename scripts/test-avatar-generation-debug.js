/**
 * Тест для диагностики проблемы с генерацией аватарки
 * Воспроизводит ошибку "Метод не поддерживается"
 */

console.log('🧪 Тестирование генерации аватарки...\n');

// Симуляция запроса на генерацию аватарки
async function testAvatarGeneration() {
  try {
    console.log('1️⃣ Отправляем POST запрос на генерацию аватарки...');

    const testData = {
      action: 'generate',
      name: 'Test User',
    };

    console.log('📝 Данные запроса:', testData);
    console.log('🔗 URL:', '/api/user/avatar');
    console.log('📡 Метод:', 'POST');
    console.log('📋 Content-Type:', 'application/json');

    // Имитируем fetch запрос (в реальности нужна авторизация)
    const response = await fetch('/api/user/avatar', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData),
    });

    console.log('\n📡 Ответ сервера:');
    console.log('   Статус:', response.status);
    console.log('   Статус текст:', response.statusText);
    console.log('   OK:', response.ok);

    const data = await response.json();
    console.log('   Данные:', data);

    if (!response.ok) {
      console.log('\n❌ Ошибка:', data.error);

      if (data.error === 'Метод не поддерживается') {
        console.log(
          '\n🔍 ДИАГНОЗ: API не поддерживает POST метод для генерации аватарки'
        );
        console.log('💡 РЕШЕНИЕ: Нужно добавить обработку POST запросов в API');
      }
    } else {
      console.log('\n✅ Генерация прошла успешно');
    }
  } catch (error) {
    console.error('\n❌ Ошибка при тестировании:', error.message);

    if (error.message.includes('fetch')) {
      console.log(
        '\n💡 Примечание: Этот тест нужно запускать в браузере с авторизацией'
      );
    }
  }
}

// Анализ API endpoint
function analyzeApiEndpoint() {
  console.log('\n🔍 Анализ API endpoint /api/user/avatar:');
  console.log('   Поддерживаемые методы: GET, PUT, DELETE');
  console.log('   Отсутствующий метод: POST');
  console.log(
    '   Проблема: Компонент отправляет POST, но API его не обрабатывает'
  );

  console.log('\n📋 Что нужно исправить:');
  console.log('   1. Добавить обработку POST метода в API');
  console.log('   2. Добавить логику генерации аватарки');
  console.log('   3. Добавить автоматическую генерацию при загрузке');
}

// Предлагаемое решение
function proposeSolution() {
  console.log('\n💡 Предлагаемое решение:');
  console.log('   1. Добавить в API обработку POST метода');
  console.log('   2. Обработать action="generate" для генерации аватарки');
  console.log('   3. Обработать action="upload" для загрузки файла');
  console.log('   4. Обработать action="url" для сохранения URL');
  console.log('   5. Добавить автоматическую генерацию в компоненте');
}

// Запуск анализа
analyzeApiEndpoint();
proposeSolution();

// Экспорт для использования в браузере
if (typeof window !== 'undefined') {
  window.testAvatarGeneration = testAvatarGeneration;
  console.log(
    '\n🌐 Для тестирования в браузере выполните: testAvatarGeneration()'
  );
}

console.log(
  '\n🎯 Основная проблема: API не поддерживает POST метод для генерации аватарки'
);
console.log('🔧 Статус: Готов к исправлению');
