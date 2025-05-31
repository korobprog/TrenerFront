/**
 * Диагностический скрипт для проверки реального поведения страницы
 * Проверяет, как обрабатывается ответ API в реальном времени
 */

const USER_ID = 'cmb9k4mtb0000mkc4b5uwfgtz';
const BASE_URL = 'http://localhost:3000';

async function checkRealBehavior() {
  console.log('🔍 ДИАГНОСТИКА РЕАЛЬНОГО ПОВЕДЕНИЯ');
  console.log('=' * 50);

  try {
    // Получаем данные пользователя
    console.log('\n📊 Получение данных пользователя...');
    const response = await fetch(`${BASE_URL}/api/admin/users/${USER_ID}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Cookie: 'next-auth.session-token=3621ebb0-8151-4e84-9b65-7e6ec958852a',
      },
    });

    const userData = await response.json();
    console.log('✅ Данные получены');

    // Проверяем структуру ответа
    console.log('\n🔍 ПРОВЕРКА СТРУКТУРЫ ОТВЕТА:');
    console.log(`📋 Тип ответа: ${typeof userData}`);
    console.log(`📋 Ключи верхнего уровня: ${Object.keys(userData)}`);

    if (userData.success) {
      console.log('✅ success: true');
    } else {
      console.log('❌ success: false или отсутствует');
    }

    if (userData.data) {
      console.log('✅ data присутствует');
      const user = userData.data;

      // Детальная проверка полей пользователя
      console.log('\n👤 ДЕТАЛЬНАЯ ПРОВЕРКА ПОЛЕЙ:');
      console.log(`📋 user.id: "${user.id}" (тип: ${typeof user.id})`);
      console.log(`📋 user.name: "${user.name}" (тип: ${typeof user.name})`);
      console.log(`📋 user.email: "${user.email}" (тип: ${typeof user.email})`);

      // Проверка на undefined/null
      if (user.name === undefined) {
        console.log('❌ КРИТИЧЕСКАЯ ПРОБЛЕМА: user.name === undefined');
      } else if (user.name === null) {
        console.log('❌ КРИТИЧЕСКАЯ ПРОБЛЕМА: user.name === null');
      } else if (user.name === '') {
        console.log('❌ ПРОБЛЕМА: user.name является пустой строкой');
      } else {
        console.log('✅ user.name имеет корректное значение');
      }

      // Проверка userPoints
      console.log('\n💰 ПРОВЕРКА БАЛЛОВ:');
      if (user.userPoints) {
        console.log(
          `📋 userPoints.points: ${user.userPoints.points} (тип: ${typeof user
            .userPoints.points})`
        );
      } else {
        console.log('❌ userPoints отсутствует');
      }

      // Проверка _count
      console.log('\n📊 ПРОВЕРКА СЧЕТЧИКОВ:');
      if (user._count) {
        console.log(
          `📋 _count.interviewerSessions: ${user._count.interviewerSessions}`
        );
        console.log(
          `📋 _count.intervieweeSessions: ${user._count.intervieweeSessions}`
        );
        console.log(`📋 _count.violations: ${user._count.violations}`);
        console.log(
          `📋 _count.pointsTransactions: ${user._count.pointsTransactions}`
        );
      } else {
        console.log('❌ _count отсутствует');
      }

      // Симуляция логики отображения заголовка
      console.log('\n🎯 СИМУЛЯЦИЯ ОТОБРАЖЕНИЯ:');

      // Логика из pages/admin/users/[id].js строка 96
      const titleLogic = user
        ? `Пользователь: ${user.name}`
        : 'Информация о пользователе';
      console.log(`📋 Заголовок страницы: "${titleLogic}"`);

      if (titleLogic.includes('undefined')) {
        console.log(
          '❌ ПРОБЛЕМА НАЙДЕНА: В заголовке отображается "undefined"'
        );
        console.log('📋 Причина: user.name содержит undefined');
      } else {
        console.log('✅ Заголовок отображается корректно');
      }

      // Проверка JSON сериализации/десериализации
      console.log('\n🔄 ПРОВЕРКА СЕРИАЛИЗАЦИИ:');
      const serialized = JSON.stringify(user);
      const deserialized = JSON.parse(serialized);

      console.log(`📋 После сериализации user.name: "${deserialized.name}"`);
      if (deserialized.name !== user.name) {
        console.log('❌ ПРОБЛЕМА: Данные изменились после сериализации');
      } else {
        console.log('✅ Сериализация не влияет на данные');
      }
    } else {
      console.log('❌ data отсутствует в ответе');
    }

    // Проверка возможных проблем с кешированием
    console.log('\n🗄️ ПРОВЕРКА КЕШИРОВАНИЯ:');
    const response2 = await fetch(`${BASE_URL}/api/admin/users/${USER_ID}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Cookie: 'next-auth.session-token=3621ebb0-8151-4e84-9b65-7e6ec958852a',
        'Cache-Control': 'no-cache',
      },
    });

    const userData2 = await response2.json();

    if (JSON.stringify(userData) === JSON.stringify(userData2)) {
      console.log('✅ Повторный запрос возвращает те же данные');
    } else {
      console.log('⚠️  Повторный запрос возвращает разные данные');
    }
  } catch (error) {
    console.error('❌ Ошибка при диагностике:', error);
  }
}

// Запуск диагностики
checkRealBehavior().catch(console.error);
