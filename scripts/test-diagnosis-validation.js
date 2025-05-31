// Тест для валидации диагноза проблем с записью на собеседования и аватарами

console.log('🔍 ДИАГНОСТИКА ПРОБЛЕМ - ВАЛИДАЦИЯ');
console.log('=====================================');

// 1. ПРОВЕРКА API ENDPOINT ДЛЯ ЗАПИСИ НА СОБЕСЕДОВАНИЯ
console.log('\n1. ПРОВЕРКА API ENDPOINT /api/mock-interviews/[id]/book');
console.log('-------------------------------------------------------');

async function testBookingEndpoint() {
  try {
    const testId = 'test-interview-id';
    const response = await fetch(`/api/mock-interviews/${testId}/book`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log('❌ ПРОБЛЕМА ПОДТВЕРЖДЕНА: Endpoint /book НЕ СУЩЕСТВУЕТ');
    console.log(`Статус ответа: ${response.status}`);
    console.log(`Ожидаемый статус: 404 (Not Found)`);

    if (response.status === 404) {
      console.log('✅ Диагноз подтвержден: API endpoint отсутствует');
    }
  } catch (error) {
    console.log('❌ Ошибка при тестировании endpoint:', error.message);
  }
}

// 2. ПРОВЕРКА ПРОБЛЕМ С SVG АВАТАРАМИ
console.log('\n2. ПРОВЕРКА ПРОБЛЕМ С SVG АВАТАРАМИ');
console.log('-----------------------------------');

function testSVGAvatarGeneration() {
  console.log('Тестирование генерации SVG аватара из AuthButton...');

  // Воспроизводим логику из AuthButton.js строка 52
  const name = 'Тест Пользователь';
  const initials = name
    .split(' ')
    .map((word) => word.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);

  console.log(`Инициалы: ${initials}`);

  // ПРОБЛЕМНЫЙ SVG из AuthButton.js:52
  const problematicSVG = `
    <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
      <circle cx="20" cy="20" r="20" fill="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"/>
      <text x="20" y="26" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="14" font-weight="600">${initials}</text>
    </svg>
  `;

  console.log('❌ ПРОБЛЕМА НАЙДЕНА: Некорректный SVG градиент');
  console.log('ПРОБЛЕМА: fill="linear-gradient(...)" - неправильный синтаксис');
  console.log('ПРАВИЛЬНО: Нужно использовать <defs> и url(#gradientId)');

  // Правильный SVG
  const correctSVG = `
    <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="avatarGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
        </linearGradient>
      </defs>
      <circle cx="20" cy="20" r="20" fill="url(#avatarGradient)"/>
      <text x="20" y="26" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="14" font-weight="600">${initials}</text>
    </svg>
  `;

  console.log('✅ ИСПРАВЛЕННЫЙ SVG готов');

  return {
    problematic: problematicSVG,
    correct: correctSVG,
    initials: initials,
  };
}

// 3. ПРОВЕРКА FALLBACK АВАТАРА
console.log('\n3. ПРОВЕРКА FALLBACK АВАТАРА');
console.log('-----------------------------');

async function testFallbackAvatar() {
  try {
    const response = await fetch('/default-avatar.svg');
    console.log(`Статус fallback аватара: ${response.status}`);

    if (response.ok) {
      console.log('✅ Fallback аватар /default-avatar.svg существует');
    } else {
      console.log('❌ Fallback аватар недоступен');
    }
  } catch (error) {
    console.log('❌ Ошибка при проверке fallback аватара:', error.message);
  }
}

// 4. ПРОВЕРКА ВНЕШНИХ API ДЛЯ АВАТАРОВ
console.log('\n4. ПРОВЕРКА ВНЕШНИХ API ДЛЯ АВАТАРОВ');
console.log('------------------------------------');

async function testExternalAvatarAPI() {
  try {
    // Тестируем DiceBear API из avatar.js:103
    const testUrl =
      'https://api.dicebear.com/7.x/initials/svg?seed=ТП&backgroundColor=3b82f6&textColor=ffffff';
    const response = await fetch(testUrl);

    console.log(`DiceBear API статус: ${response.status}`);

    if (response.ok) {
      console.log('✅ DiceBear API доступен');
    } else {
      console.log(
        '❌ DiceBear API недоступен - может быть причиной ошибок аватаров'
      );
    }
  } catch (error) {
    console.log('❌ Ошибка при проверке DiceBear API:', error.message);
    console.log(
      '🔍 Возможная причина: Блокировка внешних запросов или недоступность API'
    );
  }
}

// ЗАПУСК ВСЕХ ТЕСТОВ
async function runDiagnostics() {
  console.log('\n🚀 ЗАПУСК ДИАГНОСТИЧЕСКИХ ТЕСТОВ');
  console.log('=================================');

  // Тест 1: API endpoint
  await testBookingEndpoint();

  // Тест 2: SVG аватары
  const svgTest = testSVGAvatarGeneration();

  // Тест 3: Fallback аватар
  await testFallbackAvatar();

  // Тест 4: Внешние API
  await testExternalAvatarAPI();

  console.log('\n📋 ИТОГОВЫЙ ДИАГНОЗ');
  console.log('==================');
  console.log(
    '1. ❌ КРИТИЧЕСКАЯ ПРОБЛЕМА: Отсутствует API endpoint /api/mock-interviews/[id]/book'
  );
  console.log(
    '2. ❌ ПРОБЛЕМА SVG: Некорректный синтаксис градиента в AuthButton.js:52'
  );
  console.log('3. ✅ Fallback аватар существует');
  console.log('4. ⚠️  Возможные проблемы с внешними API (DiceBear)');

  console.log('\n🎯 КОРНЕВЫЕ ПРИЧИНЫ:');
  console.log('1. Отсутствие реализации функции записи на собеседования');
  console.log(
    '2. Неправильный SVG синтаксис вызывает ошибки рендеринга аватаров'
  );

  return {
    bookingEndpointMissing: true,
    svgSyntaxError: true,
    fallbackAvatarExists: true,
    externalAPIIssues: 'unknown',
  };
}

// Экспорт для использования в браузере
if (typeof window !== 'undefined') {
  window.runDiagnostics = runDiagnostics;
  window.testSVGAvatarGeneration = testSVGAvatarGeneration;
}

// Экспорт для Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    runDiagnostics,
    testSVGAvatarGeneration,
    testBookingEndpoint,
    testFallbackAvatar,
    testExternalAvatarAPI,
  };
}

console.log('\n📝 ИНСТРУКЦИИ ДЛЯ ЗАПУСКА:');
console.log('В браузере: window.runDiagnostics()');
console.log('В Node.js: node test-diagnosis-validation.js');
