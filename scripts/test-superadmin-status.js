const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkSuperadminStatus() {
  console.log('🔍 Проверка статуса супер-администраторов...\n');

  try {
    // Проверяем пользователя korobprog@gmail.com
    console.log('📧 Проверка korobprog@gmail.com:');
    const korobprog = await prisma.user.findUnique({
      where: { email: 'korobprog@gmail.com' },
      select: {
        id: true,
        email: true,
        role: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (korobprog) {
      console.log(`✅ Пользователь найден:`);
      console.log(`   ID: ${korobprog.id}`);
      console.log(`   Email: ${korobprog.email}`);
      console.log(`   Имя: ${korobprog.name || 'Не указано'}`);
      console.log(`   Роль: ${korobprog.role}`);
      console.log(`   Создан: ${korobprog.createdAt}`);
      console.log(`   Обновлен: ${korobprog.updatedAt}`);

      if (korobprog.role === 'superadmin') {
        console.log('✅ Роль superadmin подтверждена');
      } else {
        console.log(`❌ Роль НЕ superadmin (текущая: ${korobprog.role})`);
      }
    } else {
      console.log('❌ Пользователь korobprog@gmail.com НЕ НАЙДЕН');
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // Проверяем пользователя makstreid@yandex.ru
    console.log('📧 Проверка makstreid@yandex.ru:');
    const makstreid = await prisma.user.findUnique({
      where: { email: 'makstreid@yandex.ru' },
      select: {
        id: true,
        email: true,
        role: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (makstreid) {
      console.log(`✅ Пользователь найден:`);
      console.log(`   ID: ${makstreid.id}`);
      console.log(`   Email: ${makstreid.email}`);
      console.log(`   Имя: ${makstreid.name || 'Не указано'}`);
      console.log(`   Роль: ${makstreid.role}`);
      console.log(`   Создан: ${makstreid.createdAt}`);
      console.log(`   Обновлен: ${makstreid.updatedAt}`);

      if (makstreid.role === 'superadmin') {
        console.log('✅ Роль superadmin подтверждена');
      } else {
        console.log(`❌ Роль НЕ superadmin (текущая: ${makstreid.role})`);
      }
    } else {
      console.log('❌ Пользователь makstreid@yandex.ru НЕ НАЙДЕН');
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // Дополнительная проверка по ID
    console.log('🔍 Дополнительная проверка по указанным ID:');

    const korobprogById = await prisma.user.findUnique({
      where: { id: 'cmb9k4mtb0000mkc4b5uwfgtz' },
      select: {
        id: true,
        email: true,
        role: true,
        name: true,
      },
    });

    if (korobprogById) {
      console.log(
        `📧 ID cmb9k4mtb0000mkc4b5uwfgtz принадлежит: ${korobprogById.email}`
      );
      console.log(`   Роль: ${korobprogById.role}`);
    } else {
      console.log('❌ ID cmb9k4mtb0000mkc4b5uwfgtz НЕ НАЙДЕН');
    }

    const makstreidById = await prisma.user.findUnique({
      where: { id: 'cmbbcczhj000emkxw3fub8ld3' },
      select: {
        id: true,
        email: true,
        role: true,
        name: true,
      },
    });

    if (makstreidById) {
      console.log(
        `📧 ID cmbbcczhj000emkxw3fub8ld3 принадлежит: ${makstreidById.email}`
      );
      console.log(`   Роль: ${makstreidById.role}`);
    } else {
      console.log('❌ ID cmbbcczhj000emkxw3fub8ld3 НЕ НАЙДЕН');
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // Показываем всех супер-администраторов
    console.log('👑 Все пользователи с ролью superadmin:');
    const allSuperadmins = await prisma.user.findMany({
      where: { role: 'superadmin' },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
      },
    });

    if (allSuperadmins.length > 0) {
      allSuperadmins.forEach((admin, index) => {
        console.log(`${index + 1}. ${admin.email} (ID: ${admin.id})`);
        console.log(`   Имя: ${admin.name || 'Не указано'}`);
        console.log(`   Создан: ${admin.createdAt}`);
        console.log('');
      });
    } else {
      console.log('❌ НЕТ пользователей с ролью superadmin');
    }

    // Итоговый отчет
    console.log('📊 ИТОГОВЫЙ ОТЧЕТ:');
    console.log('='.repeat(30));

    const korobprogStatus =
      korobprog?.role === 'superadmin' ? '✅ SUPERADMIN' : '❌ НЕ SUPERADMIN';
    const makstreidStatus =
      makstreid?.role === 'superadmin' ? '✅ SUPERADMIN' : '❌ НЕ SUPERADMIN';

    console.log(`korobprog@gmail.com: ${korobprogStatus}`);
    console.log(`makstreid@yandex.ru: ${makstreidStatus}`);
    console.log(`Всего супер-администраторов: ${allSuperadmins.length}`);

    // Рекомендации
    console.log('\n💡 РЕКОМЕНДАЦИИ:');
    if (korobprog?.role !== 'superadmin') {
      console.log(
        '- Необходимо установить роль superadmin для korobprog@gmail.com'
      );
    }
    if (makstreid?.role !== 'superadmin') {
      console.log(
        '- Необходимо установить роль superadmin для makstreid@yandex.ru'
      );
    }
    if (korobprog?.role === 'superadmin' && makstreid?.role === 'superadmin') {
      console.log(
        '- Все пользователи имеют корректные роли супер-администраторов'
      );
    }
  } catch (error) {
    console.error('❌ Ошибка при проверке статуса:', error);
    console.error('Детали ошибки:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkSuperadminStatus();
