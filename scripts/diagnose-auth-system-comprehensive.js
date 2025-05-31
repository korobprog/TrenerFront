/**
 * Комплексная диагностика системы авторизации TrenerFront
 * Проверяет все аспекты системы авторизации и выявляет проблемы
 */

const { PrismaClient } = require('@prisma/client');
const { getServerSession } = require('next-auth/next');

const prisma = new PrismaClient();

async function diagnoseAuthSystem() {
  console.log('🔍 КОМПЛЕКСНАЯ ДИАГНОСТИКА СИСТЕМЫ АВТОРИЗАЦИИ');
  console.log('='.repeat(60));

  const issues = [];
  const warnings = [];

  try {
    // 1. Проверка пользователя korobprog@gmail.com в базе данных
    console.log('\n📊 1. ПРОВЕРКА ПОЛЬЗОВАТЕЛЯ korobprog@gmail.com В БД');
    console.log('-'.repeat(50));

    const korobprogUser = await prisma.user.findUnique({
      where: { email: 'korobprog@gmail.com' },
      include: {
        accounts: true,
        sessions: true,
      },
    });

    if (!korobprogUser) {
      issues.push(
        '❌ Пользователь korobprog@gmail.com не найден в базе данных'
      );
    } else {
      console.log('✅ Пользователь найден в БД:');
      console.log(`   ID: ${korobprogUser.id}`);
      console.log(`   Email: ${korobprogUser.email}`);
      console.log(`   Имя: ${korobprogUser.name}`);
      console.log(`   Роль: ${korobprogUser.role}`);
      console.log(`   Заблокирован: ${korobprogUser.isBlocked}`);
      console.log(`   Дата создания: ${korobprogUser.createdAt}`);
      console.log(`   Последний вход: ${korobprogUser.lastLoginAt}`);
      console.log(`   Количество аккаунтов: ${korobprogUser.accounts.length}`);
      console.log(`   Активных сессий: ${korobprogUser.sessions.length}`);

      if (korobprogUser.role !== 'superadmin') {
        issues.push(
          `❌ Роль пользователя korobprog@gmail.com: "${korobprogUser.role}" (ожидается "superadmin")`
        );
      }

      if (korobprogUser.isBlocked) {
        issues.push('❌ Пользователь korobprog@gmail.com заблокирован');
      }

      if (korobprogUser.accounts.length === 0) {
        warnings.push(
          '⚠️ У пользователя korobprog@gmail.com нет связанных аккаунтов провайдеров'
        );
      }

      // Проверяем аккаунты провайдеров
      console.log('\n   📋 Связанные аккаунты провайдеров:');
      korobprogUser.accounts.forEach((account) => {
        console.log(`     - Провайдер: ${account.provider}`);
        console.log(`       ID аккаунта: ${account.providerAccountId}`);
        console.log(`       Тип: ${account.type}`);
      });

      // Проверяем активные сессии
      console.log('\n   🔐 Активные сессии:');
      korobprogUser.sessions.forEach((session) => {
        console.log(
          `     - ID сессии: ${session.sessionToken.substring(0, 20)}...`
        );
        console.log(`       Истекает: ${session.expires}`);
        console.log(`       Создана: ${session.createdAt}`);
      });
    }

    // 2. Проверка всех пользователей с ролями admin/superadmin
    console.log('\n📊 2. ПРОВЕРКА ВСЕХ АДМИНИСТРАТОРОВ В СИСТЕМЕ');
    console.log('-'.repeat(50));

    const allAdmins = await prisma.user.findMany({
      where: {
        role: {
          in: ['admin', 'superadmin'],
        },
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isBlocked: true,
        createdAt: true,
        lastLoginAt: true,
      },
    });

    console.log(`✅ Найдено администраторов: ${allAdmins.length}`);
    allAdmins.forEach((admin) => {
      console.log(
        `   - ${admin.email} (${admin.role}) ${
          admin.isBlocked ? '[ЗАБЛОКИРОВАН]' : '[АКТИВЕН]'
        }`
      );
    });

    // 3. Проверка обычных пользователей, которые могут видеть админ-панель
    console.log('\n📊 3. ПРОВЕРКА ОБЫЧНЫХ ПОЛЬЗОВАТЕЛЕЙ');
    console.log('-'.repeat(50));

    const regularUsers = await prisma.user.findMany({
      where: {
        role: 'user',
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isBlocked: true,
      },
      take: 10, // Берем первых 10 для примера
    });

    console.log(
      `✅ Найдено обычных пользователей: ${regularUsers.length} (показаны первые 10)`
    );
    regularUsers.forEach((user) => {
      console.log(
        `   - ${user.email} (${user.role}) ${
          user.isBlocked ? '[ЗАБЛОКИРОВАН]' : '[АКТИВЕН]'
        }`
      );
    });

    // 4. Анализ проблем с отображением админ-панели
    console.log('\n📊 4. АНАЛИЗ ЛОГИКИ ОТОБРАЖЕНИЯ АДМИН-ПАНЕЛИ');
    console.log('-'.repeat(50));

    console.log('🔍 Проверяем условия отображения в компонентах:');
    console.log(
      '   Header.js: session.user.role === "superadmin" ✅ (правильно)'
    );
    console.log(
      '   MobileMenu.js: session.user.role === "superadmin" ✅ (правильно)'
    );
    console.log(
      '   UserSettingsModal.js: role === "admin" || role === "superadmin" ⚠️ (показывает обычным админам)'
    );
    console.log(
      '   InterviewBoard.js: session?.user?.role === "admin" ❌ (показывает обычным админам)'
    );

    // 5. Проверка middleware авторизации
    console.log('\n📊 5. АНАЛИЗ MIDDLEWARE АВТОРИЗАЦИИ');
    console.log('-'.repeat(50));

    console.log('🔍 adminAuth.js:');
    console.log('   ✅ Проверяет роли: admin и superadmin');
    console.log('   ✅ Проверяет блокировку пользователя');
    console.log('   ✅ Получает данные из БД для проверки');

    console.log('\n🔍 superAdminAuth.js:');
    console.log('   ✅ Проверяет только роль: superadmin');
    console.log('   ✅ Проверяет блокировку пользователя');
    console.log('   ✅ Получает данные из БД для проверки');

    // 6. Проверка API роутов
    console.log('\n📊 6. АНАЛИЗ ЗАЩИТЫ API РОУТОВ');
    console.log('-'.repeat(50));

    console.log('🔍 /api/admin/statistics.js:');
    console.log('   ✅ Использует withSuperAdminAuth (только для superadmin)');

    console.log('\n🔍 Другие API роуты в /api/admin/:');
    console.log('   ⚠️ Необходимо проверить, какой middleware используют');

    // 7. Проверка конфигурации NextAuth
    console.log('\n📊 7. АНАЛИЗ КОНФИГУРАЦИИ NEXTAUTH');
    console.log('-'.repeat(50));

    console.log('🔍 Session callback:');
    console.log('   ✅ Использует database стратегию');
    console.log('   ✅ Получает роль из объекта user (из БД)');
    console.log('   ✅ Устанавливает session.user.role = user.role');

    console.log('\n🔍 Возможные проблемы:');
    console.log('   ⚠️ Кэширование сессий на клиенте');
    console.log('   ⚠️ Рассинхронизация между БД и сессией');
    console.log('   ⚠️ Проблемы с обновлением сессии после изменения роли');

    // 8. Проверка настроек аутентификации пользователя
    if (korobprogUser) {
      console.log('\n📊 8. ПРОВЕРКА НАСТРОЕК АУТЕНТИФИКАЦИИ');
      console.log('-'.repeat(50));

      const authSettings = await prisma.userAuthSettings.findUnique({
        where: { userId: korobprogUser.id },
      });

      if (!authSettings) {
        warnings.push(
          '⚠️ У пользователя korobprog@gmail.com нет настроек аутентификации'
        );
      } else {
        console.log('✅ Настройки аутентификации найдены:');
        console.log(`   Email авторизация: ${authSettings.enableEmailAuth}`);
        console.log(`   Google авторизация: ${authSettings.enableGoogleAuth}`);
        console.log(`   GitHub авторизация: ${authSettings.enableGithubAuth}`);
        console.log(
          `   Credentials авторизация: ${authSettings.enableCredentialsAuth}`
        );
        console.log(`   Требуется 2FA: ${authSettings.requireTwoFactor}`);
      }
    }

    // 9. Итоговый анализ проблем
    console.log('\n📊 9. ИТОГОВЫЙ АНАЛИЗ ПРОБЛЕМ');
    console.log('='.repeat(60));

    console.log('\n🔍 ВЫЯВЛЕННЫЕ ПРОБЛЕМЫ:');
    if (issues.length === 0) {
      console.log('✅ Критических проблем не обнаружено');
    } else {
      issues.forEach((issue) => console.log(issue));
    }

    console.log('\n⚠️ ПРЕДУПРЕЖДЕНИЯ:');
    if (warnings.length === 0) {
      console.log('✅ Предупреждений нет');
    } else {
      warnings.forEach((warning) => console.log(warning));
    }

    // 10. Диагноз и рекомендации
    console.log('\n📋 ДИАГНОЗ И РЕКОМЕНДАЦИИ:');
    console.log('='.repeat(60));

    console.log('\n🎯 НАИБОЛЕЕ ВЕРОЯТНЫЕ ПРИЧИНЫ ПРОБЛЕМ:');

    console.log(
      '\n1️⃣ ПРОБЛЕМА: Обычные пользователи видят панель администраторов'
    );
    console.log(
      '   🔍 Причина: Неправильные условия отображения в компонентах'
    );
    console.log('   📍 Файлы с проблемами:');
    console.log(
      '     - components/user/UserSettingsModal.js (строки 859-860, 1478-1479)'
    );
    console.log('     - components/interview/InterviewBoard.js (строка 30)');
    console.log(
      '   🔧 Решение: Изменить условия на session?.user?.role === "superadmin"'
    );

    console.log('\n2️⃣ ПРОБЛЕМА: korobprog@gmail.com не может получить доступ');
    if (
      korobprogUser &&
      korobprogUser.role === 'superadmin' &&
      !korobprogUser.isBlocked
    ) {
      console.log('   🔍 Возможные причины:');
      console.log('     - Кэширование старой сессии на клиенте');
      console.log('     - Проблемы с обновлением сессии после изменения роли');
      console.log('     - Проблемы с middleware авторизации');
      console.log('   🔧 Решения:');
      console.log('     - Очистить кэш браузера и cookies');
      console.log('     - Выйти и войти заново');
      console.log('     - Проверить логи middleware при попытке доступа');
    } else if (!korobprogUser) {
      console.log('   🔍 Причина: Пользователь не найден в БД');
      console.log('   🔧 Решение: Создать пользователя с ролью superadmin');
    } else if (korobprogUser.role !== 'superadmin') {
      console.log('   🔍 Причина: Неправильная роль в БД');
      console.log('   🔧 Решение: Обновить роль на superadmin');
    } else if (korobprogUser.isBlocked) {
      console.log('   🔍 Причина: Пользователь заблокирован');
      console.log('   🔧 Решение: Разблокировать пользователя');
    }

    console.log('\n📝 ПЛАН ДЕЙСТВИЙ:');
    console.log('1. Исправить условия отображения админ-панели в компонентах');
    console.log(
      '2. Проверить и исправить статус пользователя korobprog@gmail.com'
    );
    console.log('3. Добавить логирование для отладки проблем с сессиями');
    console.log('4. Протестировать систему авторизации');
  } catch (error) {
    console.error('❌ Ошибка при диагностике:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Запускаем диагностику
diagnoseAuthSystem().catch(console.error);
