const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function testSuperAdminLogin() {
  try {
    console.log('Тестируем вход супер-администратора...');

    const email = 'korobprog@gmail.com';
    const testPassword = 'admin123';

    // Ищем пользователя с ролью superadmin
    const superAdmin = await prisma.user.findFirst({
      where: { role: 'superadmin' },
    });

    console.log('Результат поиска супер-администратора:');
    if (superAdmin) {
      console.log('- ID:', superAdmin.id);
      console.log('- Email:', superAdmin.email);
      console.log('- Имя:', superAdmin.name);
      console.log('- Роль:', superAdmin.role);
      console.log('- Пароль установлен:', superAdmin.password ? 'Да' : 'Нет');

      if (superAdmin.password) {
        // Тестируем пароль
        const isValidPassword = await bcrypt.compare(
          testPassword,
          superAdmin.password
        );
        console.log(
          '- Проверка пароля "admin123":',
          isValidPassword ? 'УСПЕШНО' : 'НЕУСПЕШНО'
        );

        // Тестируем различные варианты логина
        const validUsernames = ['admin', 'superadmin', superAdmin.email];

        console.log('\nВалидные логины для входа:');
        validUsernames.forEach((username) => {
          console.log(`- ${username}`);
        });
      }
    } else {
      console.log('Супер-администратор НЕ НАЙДЕН в базе данных!');
    }

    // Проверяем всех пользователей с ролью superadmin
    const allSuperAdmins = await prisma.user.findMany({
      where: { role: 'superadmin' },
    });

    console.log(
      `\nВсего супер-администраторов в базе: ${allSuperAdmins.length}`
    );
    allSuperAdmins.forEach((admin, index) => {
      console.log(`${index + 1}. Email: ${admin.email}, Имя: ${admin.name}`);
    });
  } catch (error) {
    console.error('Ошибка при тестировании:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testSuperAdminLogin();
