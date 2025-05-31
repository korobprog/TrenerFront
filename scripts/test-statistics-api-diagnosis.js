/**
 * Диагностический скрипт для проверки API статистики
 * Проверяет структуру данных, возвращаемых API
 */

async function testStatisticsAPI() {
  console.log('🔍 ДИАГНОСТИКА API СТАТИСТИКИ');
  console.log('================================');

  try {
    // Тестируем запрос к API статистики
    console.log('📡 Отправляем запрос к /api/admin/statistics...');

    const response = await fetch('http://localhost:3000/api/admin/statistics', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Добавляем заголовки для имитации авторизованного запроса
        Cookie: 'next-auth.session-token=test',
      },
    });

    console.log('📊 Статус ответа:', response.status);
    console.log(
      '📊 Заголовки ответа:',
      Object.fromEntries(response.headers.entries())
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.log('❌ Ошибка API:', errorText);
      return;
    }

    const data = await response.json();
    console.log('✅ Ответ API получен успешно');
    console.log('📋 Полная структура ответа:');
    console.log(JSON.stringify(data, null, 2));

    // Анализируем структуру данных
    console.log('\n🔍 АНАЛИЗ СТРУКТУРЫ ДАННЫХ:');
    console.log('================================');

    console.log('🔸 Есть ли data.success?', 'success' in data);
    console.log('🔸 Есть ли data.data?', 'data' in data);

    if (data.data) {
      console.log('🔸 Есть ли data.data.users?', 'users' in data.data);
      console.log(
        '🔸 Есть ли data.data.interviews?',
        'interviews' in data.data
      );
      console.log('🔸 Есть ли data.data.points?', 'points' in data.data);
      console.log(
        '🔸 Есть ли data.data.adminActivity?',
        'adminActivity' in data.data
      );
    }

    // Проверяем, что ожидает фронтенд
    console.log('\n🎯 ЧТО ОЖИДАЕТ ФРОНТЕНД:');
    console.log('================================');
    console.log('🔸 data.summary.users.total');
    console.log('🔸 data.summary.interviews.total');
    console.log('🔸 data.summary.interviews.pending');
    console.log('🔸 data.summary.interviews.booked');
    console.log('🔸 data.summary.interviews.noShow');
    console.log('🔸 data.recentLogs');

    // Проверяем, что фактически возвращает API
    console.log('\n📤 ЧТО ФАКТИЧЕСКИ ВОЗВРАЩАЕТ API:');
    console.log('================================');
    if (data.data) {
      console.log('🔸 data.data.users.total:', data.data.users?.total);
      console.log(
        '🔸 data.data.interviews.active:',
        data.data.interviews?.active
      );
      console.log(
        '🔸 data.data.interviews.byStatus:',
        data.data.interviews?.byStatus
      );
      console.log('🔸 data.data.points:', data.data.points);
      console.log('🔸 data.data.adminActivity:', data.data.adminActivity);
    }

    // Симулируем ошибку фронтенда
    console.log('\n💥 СИМУЛЯЦИЯ ОШИБКИ ФРОНТЕНДА:');
    console.log('================================');
    try {
      // Это то, что пытается сделать фронтенд
      const usersCount = data.summary.users.total;
      console.log('✅ Успешно получили usersCount:', usersCount);
    } catch (error) {
      console.log('❌ Ошибка при попытке получить data.summary.users.total:');
      console.log('   ', error.message);
      console.log('   Тип ошибки:', error.constructor.name);
    }
  } catch (error) {
    console.error('❌ Критическая ошибка при тестировании API:', error);
  }
}

// Запускаем тест
testStatisticsAPI();
