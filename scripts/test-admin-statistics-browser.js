/**
 * Тест для проверки исправления структуры данных статистики в браузере
 * Откройте консоль браузера на странице админ панели и выполните этот код
 */

async function testAdminStatisticsFix() {
  console.log('🔍 Тестирование исправления структуры данных статистики...\n');

  try {
    // Запрашиваем статистику
    const response = await fetch('/api/admin/statistics');

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Ошибка API: ${response.status} - ${JSON.stringify(errorData)}`
      );
    }

    const data = await response.json();
    console.log('✅ API статистики отвечает успешно');
    console.log('\n📊 Полная структура данных от API:');
    console.log(JSON.stringify(data, null, 2));

    // Проверяем структуру данных
    console.log('\n🔍 Анализ структуры данных:');

    if (data.success && data.data) {
      console.log('✅ Корректная структура: { success: true, data: {...} }');

      const apiData = data.data;

      // Проверяем пользователей
      if (apiData.users && typeof apiData.users.total === 'number') {
        console.log(`✅ Пользователи: total = ${apiData.users.total}`);
        console.log(
          `   - Новые за 30 дней: ${apiData.users.newLast30Days || 0}`
        );
        console.log(`   - Заблокированные: ${apiData.users.blocked || 0}`);
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
          console.log('   Детали по статусам:', apiData.interviews.byStatus);

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
        console.log('✅ Данные очков присутствуют:');
        console.log(`   - Всего выдано: ${apiData.points.totalIssued || 0}`);
        console.log(
          `   - Среднее на пользователя: ${apiData.points.averagePerUser || 0}`
        );
        console.log(
          `   - Пользователей с очками: ${apiData.points.usersWithPoints || 0}`
        );
      }

      // Проверяем активность админов
      if (apiData.adminActivity) {
        console.log('✅ Данные активности админов присутствуют:');
        console.log(
          `   - Действий за 7 дней: ${
            apiData.adminActivity.actionsLast7Days || 0
          }`
        );
      }

      console.log('\n🔧 Тестирование логики обработки данных фронтендом:');

      // Симулируем логику из исправленного кода
      const usersData = apiData.users || {};
      const interviewsData = apiData.interviews || {};
      const interviewsByStatus = interviewsData.byStatus || {};

      const totalInterviews = Object.values(interviewsByStatus).reduce(
        (sum, count) => sum + count,
        0
      );
      const activeInterviewsCount =
        (interviewsByStatus.pending || 0) +
        (interviewsByStatus.confirmed || 0) +
        (interviewsByStatus.in_progress || 0);

      const processedStatistics = {
        usersCount: usersData.total || 0,
        interviewsCount: totalInterviews,
        activeInterviewsCount: activeInterviewsCount,
        noShowCount: interviewsByStatus.no_show || 0,
        recentLogs: [], // API не возвращает recentLogs
      };

      console.log('📊 Обработанные данные для фронтенда:');
      console.log(JSON.stringify(processedStatistics, null, 2));
    } else {
      console.log('❌ Некорректная структура данных от API');
      console.log('Получена структура:', Object.keys(data));
    }

    console.log('\n✅ Тест завершен успешно');
    return data;
  } catch (error) {
    console.error('❌ Ошибка при тестировании:', error.message);
    console.error('Полная ошибка:', error);
    throw error;
  }
}

// Автоматически запускаем тест, если код выполняется в браузере
if (typeof window !== 'undefined') {
  console.log('🚀 Запуск теста статистики админ панели...');
  testAdminStatisticsFix().catch(console.error);
} else {
  console.log(
    '📝 Скопируйте этот код в консоль браузера на странице админ панели'
  );
}
