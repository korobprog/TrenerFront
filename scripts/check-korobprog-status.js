const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: ['error', 'warn', 'info'],
});

async function checkUserStatus() {
  try {
    console.log('🔍 Подключение к базе данных...');

    // Проверяем подключение к базе данных
    await prisma.$connect();
    console.log('✅ Подключение к базе данных успешно');

    const email = 'korobprog@gmail.com';
    console.log(`\n🔍 Поиск пользователя с email: ${email}`);

    // Ищем пользователя с полной информацией
    const user = await prisma.user.findUnique({
      where: {
        email: email,
      },
      include: {
        userPoints: true,
        apiSettings: true,
        authSettings: true,
        accounts: true,
        sessions: true,
        pointsTransactions: {
          take: 5,
          orderBy: {
            createdAt: 'desc',
          },
        },
        adminActions: {
          take: 5,
          orderBy: {
            createdAt: 'desc',
          },
        },
        violations: {
          where: {
            expiresAt: {
              gt: new Date(),
            },
          },
        },
      },
    });

    if (!user) {
      console.log('❌ Пользователь не найден в базе данных');
      return;
    }

    console.log('\n📊 ИНФОРМАЦИЯ О ПОЛЬЗОВАТЕЛЕ:');
    console.log('='.repeat(50));

    // Основная информация
    console.log(`ID: ${user.id}`);
    console.log(`Email: ${user.email}`);
    console.log(`Имя: ${user.name || 'Не указано'}`);
    console.log(`Роль: ${user.role}`);
    console.log(`Заблокирован: ${user.isBlocked ? 'ДА' : 'НЕТ'}`);
    console.log(`Email подтвержден: ${user.emailVerified ? 'ДА' : 'НЕТ'}`);
    console.log(`Дата создания: ${user.createdAt.toLocaleString('ru-RU')}`);
    console.log(
      `Последнее обновление: ${user.updatedAt.toLocaleString('ru-RU')}`
    );
    console.log(
      `Последний вход: ${
        user.lastLoginAt ? user.lastLoginAt.toLocaleString('ru-RU') : 'Никогда'
      }`
    );
    console.log(`Проведено интервью: ${user.conductedInterviewsCount}`);

    // Проверяем права доступа
    console.log('\n🔐 ПРАВА ДОСТУПА:');
    console.log('='.repeat(30));

    const isAdmin = user.role === 'admin' || user.role === 'superadmin';
    const isSuperAdmin = user.role === 'superadmin';

    console.log(`Администратор: ${isAdmin ? 'ДА' : 'НЕТ'}`);
    console.log(`Супер администратор: ${isSuperAdmin ? 'ДА' : 'НЕТ'}`);

    // Информация о баллах
    if (user.userPoints) {
      console.log('\n💰 БАЛЛЫ:');
      console.log('='.repeat(20));
      console.log(`Текущие баллы: ${user.userPoints.points}`);
      console.log(
        `Баллы обновлены: ${user.userPoints.updatedAt.toLocaleString('ru-RU')}`
      );
    }

    // Последние транзакции баллов
    if (user.pointsTransactions.length > 0) {
      console.log('\n📈 ПОСЛЕДНИЕ ТРАНЗАКЦИИ БАЛЛОВ:');
      console.log('='.repeat(40));
      user.pointsTransactions.forEach((transaction, index) => {
        console.log(
          `${index + 1}. ${transaction.amount > 0 ? '+' : ''}${
            transaction.amount
          } баллов`
        );
        console.log(`   Тип: ${transaction.type}`);
        console.log(`   Описание: ${transaction.description || 'Не указано'}`);
        console.log(
          `   Дата: ${transaction.createdAt.toLocaleString('ru-RU')}`
        );
        console.log('');
      });
    }

    // Аккаунты (OAuth провайдеры)
    if (user.accounts.length > 0) {
      console.log('\n🔗 ПОДКЛЮЧЕННЫЕ АККАУНТЫ:');
      console.log('='.repeat(35));
      user.accounts.forEach((account, index) => {
        console.log(`${index + 1}. Провайдер: ${account.provider}`);
        console.log(`   Тип: ${account.type}`);
        console.log(`   ID провайдера: ${account.providerAccountId}`);
        console.log('');
      });
    }

    // Активные сессии
    const activeSessions = user.sessions.filter(
      (session) => session.expires > new Date()
    );
    console.log('\n🔄 СЕССИИ:');
    console.log('='.repeat(20));
    console.log(`Всего сессий: ${user.sessions.length}`);
    console.log(`Активных сессий: ${activeSessions.length}`);

    // Нарушения
    if (user.violations.length > 0) {
      console.log('\n⚠️  АКТИВНЫЕ НАРУШЕНИЯ:');
      console.log('='.repeat(30));
      user.violations.forEach((violation, index) => {
        console.log(`${index + 1}. Тип: ${violation.type}`);
        console.log(`   Описание: ${violation.description || 'Не указано'}`);
        console.log(
          `   Истекает: ${violation.expiresAt.toLocaleString('ru-RU')}`
        );
        console.log('');
      });
    } else {
      console.log('\n✅ НАРУШЕНИЙ НЕТ');
    }

    // Последние действия администратора
    if (user.adminActions.length > 0) {
      console.log('\n👨‍💼 ПОСЛЕДНИЕ ДЕЙСТВИЯ АДМИНИСТРАТОРА:');
      console.log('='.repeat(45));
      user.adminActions.forEach((action, index) => {
        console.log(`${index + 1}. Действие: ${action.action}`);
        console.log(`   Тип сущности: ${action.entityType}`);
        console.log(`   ID сущности: ${action.entityId}`);
        console.log(`   Дата: ${action.createdAt.toLocaleString('ru-RU')}`);
        if (action.details) {
          console.log(`   Детали: ${JSON.stringify(action.details, null, 2)}`);
        }
        console.log('');
      });
    }

    // Настройки API
    if (user.apiSettings) {
      console.log('\n🔧 НАСТРОЙКИ API:');
      console.log('='.repeat(25));
      console.log(
        `Использует кастомный API: ${
          user.apiSettings.useCustomApi ? 'ДА' : 'НЕТ'
        }`
      );
      console.log(`Тип API: ${user.apiSettings.apiType}`);
      console.log(
        `Выбранная модель: ${user.apiSettings.selectedModel || 'Не указана'}`
      );
    }

    // Настройки аутентификации
    if (user.authSettings) {
      console.log('\n🔐 НАСТРОЙКИ АУТЕНТИФИКАЦИИ:');
      console.log('='.repeat(40));
      console.log(
        `Email аутентификация: ${
          user.authSettings.enableEmailAuth ? 'Включена' : 'Отключена'
        }`
      );
      console.log(
        `Google аутентификация: ${
          user.authSettings.enableGoogleAuth ? 'Включена' : 'Отключена'
        }`
      );
      console.log(
        `GitHub аутентификация: ${
          user.authSettings.enableGithubAuth ? 'Включена' : 'Отключена'
        }`
      );
      console.log(
        `Логин/пароль: ${
          user.authSettings.enableCredentialsAuth ? 'Включен' : 'Отключен'
        }`
      );
      console.log(
        `Двухфакторная аутентификация: ${
          user.authSettings.requireTwoFactor ? 'Включена' : 'Отключена'
        }`
      );
      console.log(
        `Время жизни сессии: ${user.authSettings.sessionTimeout} часов`
      );
    }

    console.log('\n' + '='.repeat(50));
    console.log('✅ Проверка статуса пользователя завершена');
  } catch (error) {
    console.error('\n❌ ОШИБКА ПРИ ПРОВЕРКЕ СТАТУСА ПОЛЬЗОВАТЕЛЯ:');
    console.error('='.repeat(50));

    if (error.code === 'P1001') {
      console.error('🔌 Не удается подключиться к базе данных');
      console.error('Проверьте:');
      console.error('- Запущена ли база данных');
      console.error('- Правильность DATABASE_URL в .env файле');
      console.error('- Доступность сетевого подключения');
    } else if (error.code === 'P1003') {
      console.error('🗄️  База данных не существует');
      console.error('Выполните миграции: npx prisma migrate deploy');
    } else if (error.code === 'P1008') {
      console.error('⏱️  Превышено время ожидания подключения к базе данных');
    } else if (error.code === 'P1017') {
      console.error('🔐 Ошибка аутентификации в базе данных');
      console.error('Проверьте учетные данные в DATABASE_URL');
    } else {
      console.error('Неизвестная ошибка:');
      console.error(error.message);
      console.error('\nПолная информация об ошибке:');
      console.error(error);
    }
  } finally {
    await prisma.$disconnect();
    console.log('\n🔌 Отключение от базы данных');
  }
}

// Запускаем проверку
checkUserStatus();
