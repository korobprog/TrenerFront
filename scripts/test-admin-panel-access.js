const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testAdminPanelAccess() {
  console.log('🔐 Тестирование доступа к админ панели...\n');

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

    // Проверяем количество интервью (админ функция)
    const totalInterviews = await prisma.interview.count();
    console.log(`   Всего интервью в системе: ${totalInterviews}`);

    // Проверяем последние логи (супер-админ функция)
    const recentLogs = await prisma.log.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        action: true,
        createdAt: true,
        userId: true,
      },
    });
    console.log(`   Последние логи (${recentLogs.length} записей):`);
    recentLogs.forEach((log, index) => {
      console.log(
        `     ${index + 1}. ${log.action} (${log.createdAt.toISOString()})`
      );
    });

    // Проверяем доступ к настройкам системы
    console.log('\n⚙️ Проверка системных настроек:');

    // Проверяем, есть ли таблица настроек
    try {
      const settings =
        await prisma.$queryRaw`SELECT name FROM sqlite_master WHERE type='table' AND name='Setting'`;
      if (settings.length > 0) {
        const systemSettings = await prisma.setting.findMany({
          select: {
            key: true,
            value: true,
            updatedAt: true,
          },
        });
        console.log(`   Системных настроек: ${systemSettings.length}`);
        systemSettings.forEach((setting) => {
          console.log(`     ${setting.key}: ${setting.value}`);
        });
      } else {
        console.log('   Таблица настроек не найдена');
      }
    } catch (error) {
      console.log('   Таблица настроек недоступна или не существует');
    }

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

    if (
      korobprogIsAdmin &&
      korobprogIsSuperAdmin &&
      makstreidIsAdmin &&
      makstreidIsSuperAdmin
    ) {
      console.log('\n🎉 ВСЕ ПРОВЕРКИ ПРОЙДЕНЫ УСПЕШНО!');
      console.log('Оба пользователя имеют полный доступ к админ панели.');
    } else {
      console.log('\n⚠️ ОБНАРУЖЕНЫ ПРОБЛЕМЫ С ДОСТУПОМ!');
    }
  } catch (error) {
    console.error('❌ Ошибка при тестировании доступа:', error);
    console.error('Детали ошибки:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testAdminPanelAccess();
