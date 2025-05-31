const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testAdminPanelAccessFixed() {
  console.log(
    '🔐 Тестирование доступа к админ панели (исправленная версия)...\n'
  );

  try {
    // Проверяем функцию проверки роли администратора
    async function isAdmin(userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });
      return user?.role === 'admin' || user?.role === 'superadmin';
    }

    async function isSuperAdmin(userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });
      return user?.role === 'superadmin';
    }

    // Тестируем доступ для korobprog@gmail.com
    console.log('👤 Тестирование доступа для korobprog@gmail.com:');
    const korobprogId = 'cmb9k4mtb0000mkc4b5uwfgtz';

    const korobprogIsAdmin = await isAdmin(korobprogId);
    const korobprogIsSuperAdmin = await isSuperAdmin(korobprogId);

    console.log(
      `   Доступ к админ панели: ${
        korobprogIsAdmin ? '✅ РАЗРЕШЕН' : '❌ ЗАПРЕЩЕН'
      }`
    );
    console.log(
      `   Права супер-администратора: ${
        korobprogIsSuperAdmin ? '✅ ЕСТЬ' : '❌ НЕТ'
      }`
    );

    // Тестируем доступ для makstreid@yandex.ru
    console.log('\n👤 Тестирование доступа для makstreid@yandex.ru:');
    const makstreidId = 'cmbbcczhj000emkxw3fub8ld3';

    const makstreidIsAdmin = await isAdmin(makstreidId);
    const makstreidIsSuperAdmin = await isSuperAdmin(makstreidId);

    console.log(
      `   Доступ к админ панели: ${
        makstreidIsAdmin ? '✅ РАЗРЕШЕН' : '❌ ЗАПРЕЩЕН'
      }`
    );
    console.log(
      `   Права супер-администратора: ${
        makstreidIsSuperAdmin ? '✅ ЕСТЬ' : '❌ НЕТ'
      }`
    );

    // Проверяем структуру админ API
    console.log('\n🔍 Проверка доступных админ функций:');

    // Проверяем количество пользователей (админ функция)
    const totalUsers = await prisma.user.count();
    console.log(`   Всего пользователей в системе: ${totalUsers}`);

    // Проверяем количество собеседований (админ функция)
    const totalMockInterviews = await prisma.mockInterview.count();
    console.log(`   Всего собеседований в системе: ${totalMockInterviews}`);

    // Проверяем последние админ логи (супер-админ функция)
    const recentLogs = await prisma.adminActionLog.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        action: true,
        createdAt: true,
        adminId: true,
        entityType: true,
      },
    });
    console.log(`   Последние админ логи (${recentLogs.length} записей):`);
    recentLogs.forEach((log, index) => {
      console.log(
        `     ${index + 1}. ${log.action} (${
          log.entityType
        }) - ${log.createdAt.toISOString()}`
      );
    });

    // Проверяем системную статистику
    console.log('\n📊 Проверка системной статистики:');
    const systemStats = await prisma.systemStatistics.findMany({
      take: 3,
      orderBy: { date: 'desc' },
      select: {
        date: true,
        totalUsers: true,
        totalInterviews: true,
        completedInterviews: true,
      },
    });

    if (systemStats.length > 0) {
      console.log(`   Записей статистики: ${systemStats.length}`);
      systemStats.forEach((stat, index) => {
        console.log(
          `     ${index + 1}. ${stat.date.toISOString().split('T')[0]}: ${
            stat.totalUsers
          } пользователей, ${stat.totalInterviews} интервью`
        );
      });
    } else {
      console.log('   Записей статистики не найдено');
    }

    // Проверяем настройки интервью-ассистента (супер-админ функция)
    console.log('\n⚙️ Проверка настроек интервью-ассистента:');
    try {
      const assistantSettings =
        await prisma.interviewAssistantSettings.findFirst({
          select: {
            id: true,
            isActive: true,
            apiType: true,
            maxQuestionsPerDay: true,
          },
        });

      if (assistantSettings) {
        console.log(
          `   Настройки найдены: API ${assistantSettings.apiType}, активен: ${assistantSettings.isActive}`
        );
        console.log(
          `   Максимум вопросов в день: ${assistantSettings.maxQuestionsPerDay}`
        );
      } else {
        console.log('   Настройки интервью-ассистента не найдены');
      }
    } catch (error) {
      console.log('   Ошибка при получении настроек интервью-ассистента');
    }

    // Проверяем количество активных пользователей
    console.log('\n👥 Проверка активности пользователей:');
    const activeUsers = await prisma.user.count({
      where: { isBlocked: false },
    });
    const blockedUsers = await prisma.user.count({
      where: { isBlocked: true },
    });

    console.log(`   Активных пользователей: ${activeUsers}`);
    console.log(`   Заблокированных пользователей: ${blockedUsers}`);

    // Проверяем роли всех пользователей
    console.log('\n🔑 Распределение ролей пользователей:');
    const roleStats = await prisma.user.groupBy({
      by: ['role'],
      _count: {
        role: true,
      },
    });

    roleStats.forEach((stat) => {
      console.log(`   ${stat.role}: ${stat._count.role} пользователей`);
    });

    console.log('\n📊 ИТОГОВЫЙ ОТЧЕТ ДОСТУПА:');
    console.log('='.repeat(40));
    console.log(`korobprog@gmail.com:`);
    console.log(`  - Админ доступ: ${korobprogIsAdmin ? '✅' : '❌'}`);
    console.log(
      `  - Супер-админ права: ${korobprogIsSuperAdmin ? '✅' : '❌'}`
    );
    console.log(`makstreid@yandex.ru:`);
    console.log(`  - Админ доступ: ${makstreidIsAdmin ? '✅' : '❌'}`);
    console.log(
      `  - Супер-админ права: ${makstreidIsSuperAdmin ? '✅' : '❌'}`
    );

    console.log('\n📈 Системная информация:');
    console.log(`  - Всего пользователей: ${totalUsers}`);
    console.log(`  - Всего собеседований: ${totalMockInterviews}`);
    console.log(`  - Активных пользователей: ${activeUsers}`);
    console.log(`  - Заблокированных: ${blockedUsers}`);

    if (
      korobprogIsAdmin &&
      korobprogIsSuperAdmin &&
      makstreidIsAdmin &&
      makstreidIsSuperAdmin
    ) {
      console.log('\n🎉 ВСЕ ПРОВЕРКИ ПРОЙДЕНЫ УСПЕШНО!');
      console.log('Оба пользователя имеют полный доступ к админ панели.');
      console.log('Система готова к работе с двумя супер-администраторами.');
    } else {
      console.log('\n⚠️ ОБНАРУЖЕНЫ ПРОБЛЕМЫ С ДОСТУПОМ!');
    }
  } catch (error) {
    console.error('❌ Ошибка при тестировании доступа:', error);
    console.error('Детали ошибки:', error.message);
    console.error('Стек ошибки:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testAdminPanelAccessFixed();
