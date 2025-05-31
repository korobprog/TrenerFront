/**
 * Тест для проверки исправления структуры данных статистики админ панели
 */

const https = require('https');

// Создаем агент, который игнорирует самоподписанные сертификаты
const agent = new https.Agent({
  rejectUnauthorized: false,
});

async function testStatisticsAPI() {
  console.log('🔍 Тестирование API статистики админ панели...\n');

  try {
    // Получаем куки авторизации супер-админа
    const loginResponse = await fetch(
      'https://localhost:3000/api/auth/signin',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'korobprog@gmail.com',
          password: 'Qwerty123!',
        }),
        agent,
      }
    );

    if (!loginResponse.ok) {
      throw new Error(`Ошибка авторизации: ${loginResponse.status}`);
    }

    const cookies = loginResponse.headers.get('set-cookie');
    console.log('✅ Авторизация успешна');

    // Запрашиваем статистику
    const statsResponse = await fetch(
      'https://localhost:3000/api/admin/statistics',
      {
        method: 'GET',
        headers: {
          Cookie: cookies,
        },
        agent,
      }
    );

    if (!statsResponse.ok) {
      const errorData = await statsResponse.json().catch(() => ({}));
      throw new Error(
        `Ошибка API статистики: ${statsResponse.status} - ${JSON.stringify(
          errorData
        )}`
      );
    }

    const data = await statsResponse.json();
    console.log('✅ API статистики отвечает успешно');
    console.log('\n📊 Структура данных от API:');
    console.log(JSON.stringify(data, null, 2));

    // Проверяем структуру данных
    console.log('\n🔍 Анализ структуры данных:');

    if (data.success && data.data) {
      console.log('✅ Корректная структура: { success: true, data: {...} }');

      const apiData = data.data;

      // Проверяем пользователей
      if (apiData.users && typeof apiData.users.total === 'number') {
        console.log(`✅ Пользователи: total = ${apiData.users.total}`);
      } else {
        console.log('❌ Отсутствуют данные пользователей');
      }

      // Проверяем собеседования
      if (apiData.interviews) {
        console.log(`✅ Собеседования: active = ${apiData.interviews.active}`);
        if (apiData.interviews.byStatus) {
          console.log(
            '✅ Статусы собеседований:',
            Object.keys(apiData.interviews.byStatus)
          );

          // Рассчитываем общее количество
          const totalInterviews = Object.values(
            apiData.interviews.byStatus
          ).reduce((sum, count) => sum + count, 0);
          console.log(`📊 Общее количество собеседований: ${totalInterviews}`);

          // Рассчитываем активные
          const byStatus = apiData.interviews.byStatus;
          const activeCount =
            (byStatus.pending || 0) +
            (byStatus.confirmed || 0) +
            (byStatus.in_progress || 0);
          console.log(`📊 Активные собеседования: ${activeCount}`);
          console.log(`📊 Неявки: ${byStatus.no_show || 0}`);
        }
      } else {
        console.log('❌ Отсутствуют данные собеседований');
      }

      // Проверяем очки
      if (apiData.points) {
        console.log('✅ Данные очков присутствуют');
      }
    } else {
      console.log('❌ Некорректная структура данных от API');
    }

    console.log('\n✅ Тест завершен успешно');
  } catch (error) {
    console.error('❌ Ошибка при тестировании:', error.message);
    process.exit(1);
  }
}

// Запускаем тест
testStatisticsAPI();
