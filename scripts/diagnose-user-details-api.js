/**
 * Диагностический скрипт для проверки API получения данных пользователя
 * Проверяет корректность работы эндпоинта /api/admin/users/[id]
 */

const USER_ID = 'cmb9k4mtb0000mkc4b5uwfgtz';
const BASE_URL = 'http://localhost:3000';

async function testUserDetailsAPI() {
  console.log('🔍 ДИАГНОСТИКА: Проверка API получения данных пользователя');
  console.log(`📋 ID пользователя: ${USER_ID}`);
  console.log('=' * 60);

  try {
    // Тест 1: Проверка получения данных пользователя
    console.log('\n📊 ТЕСТ 1: Получение данных пользователя');
    const response = await fetch(`${BASE_URL}/api/admin/users/${USER_ID}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Cookie: 'next-auth.session-token=3621ebb0-8151-4e84-9b65-7e6ec958852a',
      },
    });

    console.log(`📡 Статус ответа: ${response.status}`);
    console.log(`📡 Статус текст: ${response.statusText}`);

    if (!response.ok) {
      console.error(
        `❌ Ошибка HTTP: ${response.status} ${response.statusText}`
      );
      const errorText = await response.text();
      console.error(`❌ Текст ошибки: ${errorText}`);
      return;
    }

    const userData = await response.json();
    console.log('✅ Данные получены успешно');

    // Проверка структуры ответа
    console.log('\n🔍 АНАЛИЗ СТРУКТУРЫ ОТВЕТА:');
    console.log(`📋 success: ${userData.success}`);
    console.log(`📋 data присутствует: ${!!userData.data}`);

    if (userData.data) {
      const user = userData.data;
      console.log('\n👤 ДАННЫЕ ПОЛЬЗОВАТЕЛЯ:');
      console.log(`📋 ID: ${user.id}`);
      console.log(`📋 name: ${user.name || 'undefined'}`);
      console.log(`📋 email: ${user.email || 'undefined'}`);
      console.log(`📋 role: ${user.role || 'undefined'}`);
      console.log(`📋 isBlocked: ${user.isBlocked}`);
      console.log(`📋 createdAt: ${user.createdAt || 'undefined'}`);

      // Проверка связанных данных
      console.log('\n🔗 СВЯЗАННЫЕ ДАННЫЕ:');
      console.log(`📋 userPoints: ${!!user.userPoints}`);
      if (user.userPoints) {
        console.log(`   💰 points: ${user.userPoints.points}`);
      }

      console.log(`📋 _count: ${!!user._count}`);
      if (user._count) {
        console.log(
          `   📊 interviewerSessions: ${user._count.interviewerSessions}`
        );
        console.log(
          `   📊 intervieweeSessions: ${user._count.intervieweeSessions}`
        );
        console.log(`   📊 violations: ${user._count.violations}`);
        console.log(
          `   📊 pointsTransactions: ${user._count.pointsTransactions}`
        );
      }

      console.log(
        `📋 interviewerSessions: ${
          user.interviewerSessions?.length || 0
        } записей`
      );
      console.log(
        `📋 intervieweeSessions: ${
          user.intervieweeSessions?.length || 0
        } записей`
      );
      console.log(`📋 violations: ${user.violations?.length || 0} записей`);
      console.log(
        `📋 pointsTransactions: ${user.pointsTransactions?.length || 0} записей`
      );

      // Проверка проблемных полей
      console.log('\n🚨 ПРОВЕРКА ПРОБЛЕМНЫХ ПОЛЕЙ:');
      if (!user.name || user.name === 'undefined') {
        console.log('❌ ПРОБЛЕМА: Поле name отсутствует или undefined');
      } else {
        console.log('✅ Поле name корректно');
      }

      if (!user.userPoints) {
        console.log('❌ ПРОБЛЕМА: Поле userPoints отсутствует');
      } else if (user.userPoints.points === 0) {
        console.log('⚠️  ВНИМАНИЕ: Баллы пользователя равны 0');
      } else {
        console.log('✅ Поле userPoints корректно');
      }

      if (!user._count) {
        console.log('❌ ПРОБЛЕМА: Поле _count отсутствует');
      } else {
        console.log('✅ Поле _count корректно');
      }
    }

    // Тест 2: Проверка API изменения баллов (несуществующий эндпоинт)
    console.log('\n📊 ТЕСТ 2: Проверка API изменения баллов');
    const pointsResponse = await fetch(
      `${BASE_URL}/api/admin/users/${USER_ID}/points`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie:
            'next-auth.session-token=3621ebb0-8151-4e84-9b65-7e6ec958852a',
        },
        body: JSON.stringify({
          userId: USER_ID,
          amount: 10,
          type: 'admin_adjustment',
          description: 'Тестовое изменение баллов',
        }),
      }
    );

    console.log(`📡 Статус ответа API баллов: ${pointsResponse.status}`);

    if (pointsResponse.status === 404) {
      console.log('❌ ПРОБЛЕМА: API эндпоинт для изменения баллов не найден');
      console.log('📋 Ожидаемый путь: /api/admin/users/[id]/points.js');
    } else {
      console.log(`📡 Ответ API баллов: ${await pointsResponse.text()}`);
    }
  } catch (error) {
    console.error('❌ Ошибка при выполнении диагностики:', error);
  }
}

// Запуск диагностики
testUserDetailsAPI().catch(console.error);
