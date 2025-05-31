/**
 * Скрипт для миграции пароля суперадминистратора на новую систему хеширования
 */

const { PrismaClient } = require('@prisma/client');
const { hashPassword } = require('../lib/utils/passwordUtils');
const readline = require('readline');

const prisma = new PrismaClient();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

async function migrateSuperAdminPassword() {
  try {
    console.log('🔐 Миграция пароля суперадминистратора');
    console.log('=====================================\n');

    // Поиск существующего суперадминистратора
    const superAdmin = await prisma.user.findFirst({
      where: { role: 'superadmin' },
    });

    if (!superAdmin) {
      console.log('❌ Суперадминистратор не найден в базе данных');
      console.log(
        'Используйте скрипт create-superadmin.js для создания нового суперадминистратора'
      );
      return;
    }

    console.log('✅ Найден суперадминистратор:');
    console.log(`   ID: ${superAdmin.id}`);
    console.log(`   Email: ${superAdmin.email}`);
    console.log(`   Имя: ${superAdmin.name || 'Не указано'}`);
    console.log(
      `   Пароль установлен: ${superAdmin.password ? 'Да' : 'Нет'}\n`
    );

    if (superAdmin.password) {
      const confirm = await askQuestion(
        'Пароль уже установлен. Хотите его изменить? (y/N): '
      );
      if (confirm.toLowerCase() !== 'y' && confirm.toLowerCase() !== 'yes') {
        console.log('Миграция отменена');
        return;
      }
    }

    // Запрос нового пароля
    console.log('Введите новый пароль для суперадминистратора:');
    console.log('Требования к паролю:');
    console.log('- Минимум 8 символов');
    console.log('- Хотя бы одна цифра');
    console.log('- Хотя бы одна буква');
    console.log('- Хотя бы один специальный символ\n');

    const newPassword = await askQuestion('Новый пароль: ');

    if (!newPassword) {
      console.log('❌ Пароль не может быть пустым');
      return;
    }

    // Валидация пароля
    const { validatePassword } = require('../lib/utils/passwordUtils');
    const validation = validatePassword(newPassword);

    if (!validation.isValid) {
      console.log('❌ Пароль не соответствует требованиям:');
      validation.errors.forEach((error) => console.log(`   - ${error}`));
      return;
    }

    // Подтверждение пароля
    const confirmPassword = await askQuestion('Подтвердите пароль: ');

    if (newPassword !== confirmPassword) {
      console.log('❌ Пароли не совпадают');
      return;
    }

    // Хеширование пароля
    console.log('\n🔄 Хеширование пароля...');
    const hashedPassword = await hashPassword(newPassword);

    // Обновление пароля в базе данных
    console.log('💾 Обновление пароля в базе данных...');
    await prisma.user.update({
      where: { id: superAdmin.id },
      data: {
        password: hashedPassword,
        updatedAt: new Date(),
      },
    });

    console.log('\n✅ Пароль суперадминистратора успешно обновлен!');
    console.log('\nТеперь вы можете войти в систему используя:');
    console.log(`   Email: ${superAdmin.email}`);
    console.log(`   Логин: admin или superadmin`);
    console.log(`   Пароль: [новый пароль]`);
  } catch (error) {
    console.error('❌ Ошибка при миграции пароля:', error.message);
    console.error('Детали ошибки:', error);
  } finally {
    rl.close();
    await prisma.$disconnect();
  }
}

// Запуск скрипта
if (require.main === module) {
  migrateSuperAdminPassword();
}

module.exports = { migrateSuperAdminPassword };
