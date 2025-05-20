// Скрипт для проверки существования супер-администратора и его учетных данных
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function checkSuperAdmin() {
  try {
    // Находим супер-администратора
    const superAdmin = await prisma.user.findFirst({
      where: { role: 'superadmin' },
    });

    if (!superAdmin) {
      console.log('Супер-администратор не найден в системе');
      console.log(
        'Запустите скрипт create-superadmin.js для создания супер-администратора'
      );
      return;
    }

    console.log('Супер-администратор найден:');
    console.log(`- ID: ${superAdmin.id}`);
    console.log(`- Email: ${superAdmin.email}`);
    console.log(`- Имя: ${superAdmin.name}`);
    console.log(`- Роль: ${superAdmin.role}`);
    console.log(`- Пароль хеширован: ${superAdmin.password ? 'Да' : 'Нет'}`);

    // Проверяем пароль
    if (superAdmin.password) {
      const testPassword = 'krishna1284radha';
      const passwordMatch = await bcrypt.compare(
        testPassword,
        superAdmin.password
      );

      console.log(
        `- Проверка пароля '${testPassword}': ${
          passwordMatch ? 'Успешно' : 'Неуспешно'
        }`
      );

      if (!passwordMatch) {
        console.log(
          'Пароль не соответствует ожидаемому. Возможно, пароль был изменен или хеширован неправильно.'
        );
        console.log(
          'Рекомендуется запустить скрипт update-superadmin.js для обновления пароля.'
        );
      }
    } else {
      console.log(
        'Пароль не установлен. Необходимо обновить пароль с помощью скрипта update-superadmin.js'
      );
    }
  } catch (error) {
    console.error('Ошибка при проверке супер-администратора:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Вызываем функцию проверки супер-администратора
checkSuperAdmin().catch((error) => {
  console.error('Ошибка при выполнении скрипта:', error);
  process.exit(1);
});
