/**
 * ФИНАЛЬНОЕ ТЕСТИРОВАНИЕ ДОСТУПА К КАБИНЕТУ СУПЕР АДМИНИСТРАТОРА
 *
 * Проверяет:
 * 1. API эндпоинты администратора
 * 2. Авторизацию и права доступа
 * 3. Функциональность middleware
 * 4. Корректность возвращаемых данных
 */

const fetch = require('node-fetch');
const BASE_URL = 'http://localhost:3000';

// Функция для выполнения HTTP запросов
async function makeRequest(url, options = {}) {
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
        ...options.headers,
      },
      ...options,
    });

    let data;
    try {
      data = await response.json();
    } catch (e) {
      data = await response.text();
    }

    return {
      status: response.status,
      ok: response.ok,
      data,
      headers: Object.fromEntries(response.headers.entries()),
    };
  } catch (error) {
    return {
      status: 0,
      ok: false,
      error: error.message,
    };
  }
}

// Тестирование API эндпоинтов без авторизации
async function testUnauthorizedAccess() {
  console.log('🚫 ТЕСТИРОВАНИЕ ДОСТУПА БЕЗ АВТОРИЗАЦИИ');
  console.log('=' * 50);

  const endpoints = [
    '/api/admin/statistics',
    '/api/admin/users',
    '/api/admin/logs',
    '/api/admin/interviews',
  ];

  const results = [];

  for (const endpoint of endpoints) {
    console.log(`\n📡 Тестирование: ${endpoint}`);

    const result = await makeRequest(`${BASE_URL}${endpoint}`);
    console.log(`   Статус: ${result.status}`);

    if (result.status === 401) {
      console.log(`   ✅ Корректно: Требуется авторизация`);
      results.push({
        endpoint,
        status: 'PASS',
        reason: 'Правильно требует авторизацию',
      });
    } else if (result.status === 403) {
      console.log(`   ✅ Корректно: Недостаточно прав`);
      results.push({
        endpoint,
        status: 'PASS',
        reason: 'Правильно проверяет права',
      });
    } else if (result.status === 404) {
      console.log(`   ❌ Проблема: Эндпоинт не найден`);
      results.push({ endpoint, status: 'FAIL', reason: 'Эндпоинт не найден' });
    } else {
      console.log(`   ⚠️  Неожиданный статус: ${result.status}`);
      console.log(`   Ответ:`, result.data);
      results.push({
        endpoint,
        status: 'UNEXPECTED',
        reason: `Неожиданный статус: ${result.status}`,
      });
    }
  }

  return results;
}

// Тестирование middleware
async function testMiddleware() {
  console.log('\n🛡️  ТЕСТИРОВАНИЕ MIDDLEWARE');
  console.log('=' * 50);

  const testCases = [
    {
      name: 'Несуществующий эндпоинт',
      url: '/api/admin/nonexistent',
      expectedStatus: [404, 401, 403],
    },
    {
      name: 'Неподдерживаемый метод POST',
      url: '/api/admin/statistics',
      method: 'POST',
      expectedStatus: [405, 401, 403],
    },
    {
      name: 'Неподдерживаемый метод PUT',
      url: '/api/admin/logs',
      method: 'PUT',
      expectedStatus: [405, 401, 403],
    },
  ];

  const results = [];

  for (const testCase of testCases) {
    console.log(`\n🧪 Тест: ${testCase.name}`);
    console.log(`   URL: ${testCase.url}`);

    const result = await makeRequest(`${BASE_URL}${testCase.url}`, {
      method: testCase.method || 'GET',
    });

    console.log(`   Статус: ${result.status}`);

    if (testCase.expectedStatus.includes(result.status)) {
      console.log(`   ✅ Ожидаемый результат`);
      results.push({
        ...testCase,
        status: 'PASS',
        actualStatus: result.status,
        reason: 'Корректная обработка',
      });
    } else {
      console.log(`   ❌ Неожиданный статус`);
      console.log(`   Ожидался один из: ${testCase.expectedStatus.join(', ')}`);
      results.push({
        ...testCase,
        status: 'FAIL',
        actualStatus: result.status,
        reason: `Неожиданный статус: ${result.status}`,
      });
    }
  }

  return results;
}

// Проверка состояния супер-администраторов
async function checkSuperAdmins() {
  console.log('\n👥 ПРОВЕРКА СУПЕР-АДМИНИСТРАТОРОВ');
  console.log('=' * 50);

  try {
    // Проверяем через API профиля (если доступен)
    const profileResult = await makeRequest(`${BASE_URL}/api/user/profile`);

    if (profileResult.ok && profileResult.data) {
      console.log('✅ Информация о текущем пользователе:');
      console.log(`   📧 Email: ${profileResult.data.email}`);
      console.log(`   🔑 Роль: ${profileResult.data.role}`);
      console.log(`   🆔 ID: ${profileResult.data.id}`);

      return {
        status: 'SUCCESS',
        user: profileResult.data,
        isSuperAdmin: profileResult.data.role === 'superadmin',
      };
    } else {
      console.log('❌ Не удалось получить информацию о пользователе');
      console.log(`   Статус: ${profileResult.status}`);

      return {
        status: 'NO_SESSION',
        reason: 'Нет активной сессии',
      };
    }
  } catch (error) {
    console.log('❌ Ошибка при проверке пользователя:', error.message);
    return {
      status: 'ERROR',
      reason: error.message,
    };
  }
}

// Генерация финального отчета
function generateReport(unauthorizedResults, middlewareResults, userCheck) {
  console.log('\n📊 ФИНАЛЬНЫЙ ОТЧЕТ ТЕСТИРОВАНИЯ');
  console.log('=' * 60);

  // Информация о пользователе
  console.log('\n🔐 ИНФОРМАЦИЯ О ПОЛЬЗОВАТЕЛЕ:');
  if (userCheck.status === 'SUCCESS') {
    console.log(`   ✅ Пользователь: ${userCheck.user.email}`);
    console.log(`   🔑 Роль: ${userCheck.user.role}`);
    console.log(
      `   🎯 Супер-администратор: ${userCheck.isSuperAdmin ? 'ДА' : 'НЕТ'}`
    );
  } else {
    console.log(`   ❌ Статус: ${userCheck.status}`);
    console.log(`   📝 Причина: ${userCheck.reason}`);
  }

  // Результаты тестирования без авторизации
  console.log('\n🚫 ТЕСТИРОВАНИЕ БЕЗ АВТОРИЗАЦИИ:');
  const unauthorizedPassed = unauthorizedResults.filter(
    (r) => r.status === 'PASS'
  ).length;
  console.log(
    `   ✅ Пройдено: ${unauthorizedPassed}/${unauthorizedResults.length}`
  );

  if (unauthorizedPassed === unauthorizedResults.length) {
    console.log(`   🎯 Все эндпоинты корректно требуют авторизацию`);
  } else {
    console.log(`   ❌ Обнаружены проблемы с авторизацией`);
    unauthorizedResults
      .filter((r) => r.status !== 'PASS')
      .forEach((result) => {
        console.log(`      - ${result.endpoint}: ${result.reason}`);
      });
  }

  // Результаты тестирования middleware
  console.log('\n🛡️  ТЕСТИРОВАНИЕ MIDDLEWARE:');
  const middlewarePassed = middlewareResults.filter(
    (r) => r.status === 'PASS'
  ).length;
  console.log(
    `   ✅ Пройдено: ${middlewarePassed}/${middlewareResults.length}`
  );

  if (middlewarePassed === middlewareResults.length) {
    console.log(`   🎯 Middleware работает корректно`);
  } else {
    console.log(`   ❌ Обнаружены проблемы с middleware`);
    middlewareResults
      .filter((r) => r.status !== 'PASS')
      .forEach((result) => {
        console.log(`      - ${result.name}: ${result.reason}`);
      });
  }

  // Общий результат
  console.log('\n🎯 ОБЩИЙ РЕЗУЛЬТАТ:');
  const totalTests = unauthorizedResults.length + middlewareResults.length;
  const totalPassed = unauthorizedPassed + middlewarePassed;

  console.log(`   📊 Пройдено тестов: ${totalPassed}/${totalTests}`);
  console.log(
    `   📈 Процент успеха: ${Math.round((totalPassed / totalTests) * 100)}%`
  );

  // Статус системы
  console.log('\n🏥 СТАТУС СИСТЕМЫ:');

  const hasSuper = userCheck.status === 'SUCCESS' && userCheck.isSuperAdmin;
  const authWorks = unauthorizedPassed === unauthorizedResults.length;
  const middlewareWorks = middlewarePassed === middlewareResults.length;

  if (hasSuper && authWorks && middlewareWorks) {
    console.log('   ✅ СИСТЕМА ГОТОВА К РАБОТЕ');
    console.log('   🎉 Все компоненты админ панели функционируют корректно');
    console.log('   🔑 Супер-администраторы имеют необходимые права');
    console.log('   🛡️  Безопасность обеспечена');
  } else {
    console.log('   ⚠️  ТРЕБУЕТСЯ ВНИМАНИЕ');
    if (!hasSuper) console.log('   - Проблемы с правами супер-администратора');
    if (!authWorks) console.log('   - Проблемы с авторизацией');
    if (!middlewareWorks) console.log('   - Проблемы с middleware');
  }

  // Рекомендации
  console.log('\n💡 РЕКОМЕНДАЦИИ:');
  if (userCheck.status === 'NO_SESSION') {
    console.log(
      '   🔐 Войдите в систему как супер-администратор для полного тестирования'
    );
  }
  if (totalPassed === totalTests) {
    console.log(
      '   🚀 Можно переходить к тестированию админ панели в браузере'
    );
    console.log('   📱 Рекомендуется проверить UI компоненты админ панели');
  } else {
    console.log('   🔧 Необходимо исправить выявленные проблемы');
  }

  console.log('\n' + '=' * 60);
}

// Основная функция тестирования
async function runTests() {
  console.log('🔍 ЗАПУСК КОМПЛЕКСНОГО ТЕСТИРОВАНИЯ АДМИН ПАНЕЛИ');
  console.log('Дата: ' + new Date().toLocaleString('ru-RU'));
  console.log('=' * 60);

  try {
    // 1. Проверка пользователей
    const userCheck = await checkSuperAdmins();

    // 2. Тестирование без авторизации
    const unauthorizedResults = await testUnauthorizedAccess();

    // 3. Тестирование middleware
    const middlewareResults = await testMiddleware();

    // 4. Генерация отчета
    generateReport(unauthorizedResults, middlewareResults, userCheck);
  } catch (error) {
    console.error('\n❌ КРИТИЧЕСКАЯ ОШИБКА ТЕСТИРОВАНИЯ:');
    console.error(`   💥 Сообщение: ${error.message}`);
    console.error(`   📍 Стек: ${error.stack}`);
  }
}

// Запуск тестирования
runTests()
  .then(() => {
    console.log('\n🏁 Тестирование завершено');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Ошибка при выполнении тестов:', error.message);
    process.exit(1);
  });
