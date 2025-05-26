const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Функция для проверки наличия суперадминистратора в базе данных
 */
async function checkSuperAdmin() {
  try {
    console.log('Проверка наличия суперадминистратора в базе данных...');

    // Проверяем соединение с базой данных
    const connectionTest = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('Соединение с базой данных установлено успешно!');

    // Ищем пользователя с ролью superadmin
    const superAdmin = await prisma.user.findFirst({
      where: { role: 'superadmin' },
      include: {
        accounts: true,
        sessions: true,
      },
    });

    if (!superAdmin) {
      console.log('ОШИБКА: Суперадминистратор не найден в базе данных!');
      console.log(
        'Необходимо создать суперадминистратора с помощью скрипта update-superadmin.js'
      );
      return;
    }

    console.log('Суперадминистратор найден в базе данных:');
    console.log('- ID:', superAdmin.id);
    console.log('- Email:', superAdmin.email);
    console.log('- Имя:', superAdmin.name);
    console.log('- Роль:', superAdmin.role);
    console.log(
      '- Пароль:',
      superAdmin.password ? 'установлен' : 'не установлен'
    );
    console.log('- Заблокирован:', superAdmin.isBlocked ? 'да' : 'нет');
    console.log('- Дата создания:', superAdmin.createdAt);
    console.log('- Дата последнего обновления:', superAdmin.updatedAt);

    // Проверяем связанные аккаунты
    console.log('\nСвязанные аккаунты:');
    if (superAdmin.accounts && superAdmin.accounts.length > 0) {
      superAdmin.accounts.forEach((account, index) => {
        console.log(`Аккаунт #${index + 1}:`);
        console.log('- Провайдер:', account.provider);
        console.log('- ID провайдера:', account.providerAccountId);
        console.log('- Тип:', account.type);
        console.log(
          '- Токен доступа:',
          account.access_token ? 'присутствует' : 'отсутствует'
        );
        console.log(
          '- Токен обновления:',
          account.refresh_token ? 'присутствует' : 'отсутствует'
        );
        console.log(
          '- Срок действия токена:',
          account.expires_at
            ? new Date(account.expires_at * 1000).toISOString()
            : 'не указан'
        );
      });
    } else {
      console.log('Связанные аккаунты отсутствуют');
    }

    // Проверяем активные сессии
    console.log('\nАктивные сессии:');
    if (superAdmin.sessions && superAdmin.sessions.length > 0) {
      superAdmin.sessions.forEach((session, index) => {
        console.log(`Сессия #${index + 1}:`);
        console.log('- ID:', session.id);
        console.log(
          '- Токен сессии:',
          session.sessionToken ? 'присутствует' : 'отсутствует'
        );
        console.log('- Срок действия:', session.expires);
        console.log(
          '- Истекла:',
          new Date() > new Date(session.expires) ? 'да' : 'нет'
        );
      });
    } else {
      console.log('Активные сессии отсутствуют');
    }

    // Проверяем наличие других администраторов
    const adminsCount = await prisma.user.count({
      where: { role: 'admin' },
    });

    console.log('\nКоличество обычных администраторов в системе:', adminsCount);
  } catch (error) {
    console.error('Ошибка при проверке суперадминистратора:');
    console.error(error);
  } finally {
    // Закрываем соединение
    await prisma.$disconnect();
  }
}

// Запускаем функцию проверки
checkSuperAdmin().catch((error) => {
  console.error('Ошибка при выполнении скрипта:', error);
  process.exit(1);
});
