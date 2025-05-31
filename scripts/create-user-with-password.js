/**
 * Скрипт для создания пользователей с паролями
 */

const { PrismaClient } = require('@prisma/client');
const {
  createUserWithPassword,
  createSuperAdmin,
  createAdmin,
} = require('../lib/utils/userManagement');
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

async function createUser() {
  try {
    console.log('👤 Создание нового пользователя');
    console.log('===============================\n');

    // Выбор типа пользователя
    console.log('Выберите тип пользователя:');
    console.log('1. Обычный пользователь (user)');
    console.log('2. Администратор (admin)');
    console.log('3. Суперадминистратор (superadmin)');

    const userType = await askQuestion('\nВведите номер (1-3): ');

    let role = 'user';
    switch (userType) {
      case '1':
        role = 'user';
        break;
      case '2':
        role = 'admin';
        break;
      case '3':
        role = 'superadmin';
        break;
      default:
        console.log('❌ Неверный выбор. Используется роль "user" по умолчанию');
        role = 'user';
    }

    // Ввод данных пользователя
    const email = await askQuestion('Email: ');
    if (!email) {
      console.log('❌ Email обязателен');
      return;
    }

    const name = await askQuestion('Имя пользователя: ');
    if (!name) {
      console.log('❌ Имя пользователя обязательно');
      return;
    }

    console.log('\nТребования к паролю:');
    console.log('- Минимум 8 символов');
    console.log('- Хотя бы одна цифра');
    console.log('- Хотя бы одна буква');
    console.log('- Хотя бы один специальный символ');

    const password = await askQuestion('\nПароль: ');
    if (!password) {
      console.log('❌ Пароль обязателен');
      return;
    }

    const confirmPassword = await askQuestion('Подтвердите пароль: ');
    if (password !== confirmPassword) {
      console.log('❌ Пароли не совпадают');
      return;
    }

    // Создание пользователя
    console.log('\n🔄 Создание пользователя...');

    let user;
    const userData = { email, password, name };

    switch (role) {
      case 'superadmin':
        user = await createSuperAdmin(userData);
        break;
      case 'admin':
        user = await createAdmin(userData);
        break;
      default:
        user = await createUserWithPassword({ ...userData, role });
    }

    console.log('\n✅ Пользователь успешно создан!');
    console.log(`   ID: ${user.id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Имя: ${user.name}`);
    console.log(`   Роль: ${user.role}`);
    console.log(`   Дата создания: ${user.createdAt}`);

    console.log('\nПользователь может войти в систему используя:');
    console.log(`   Email: ${user.email}`);
    console.log(`   Пароль: [введенный пароль]`);
  } catch (error) {
    console.error('❌ Ошибка при создании пользователя:', error.message);

    if (error.message.includes('уже существует')) {
      console.log('\n💡 Попробуйте использовать другой email адрес');
    } else if (error.message.includes('требованиям')) {
      console.log('\n💡 Убедитесь, что пароль соответствует всем требованиям');
    }
  } finally {
    rl.close();
    await prisma.$disconnect();
  }
}

async function listUsers() {
  try {
    console.log('📋 Список пользователей');
    console.log('=======================\n');

    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isBlocked: true,
        createdAt: true,
        lastLoginAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (users.length === 0) {
      console.log('Пользователи не найдены');
      return;
    }

    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name || 'Без имени'} (${user.email})`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Роль: ${user.role}`);
      console.log(
        `   Статус: ${user.isBlocked ? '🔒 Заблокирован' : '✅ Активен'}`
      );
      console.log(`   Создан: ${user.createdAt.toLocaleString('ru-RU')}`);
      console.log(
        `   Последний вход: ${
          user.lastLoginAt
            ? user.lastLoginAt.toLocaleString('ru-RU')
            : 'Никогда'
        }`
      );
      console.log('');
    });

    console.log(`Всего пользователей: ${users.length}`);
  } catch (error) {
    console.error(
      '❌ Ошибка при получении списка пользователей:',
      error.message
    );
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--list') || args.includes('-l')) {
    await listUsers();
    return;
  }

  if (args.includes('--help') || args.includes('-h')) {
    console.log('Использование:');
    console.log(
      '  node scripts/create-user-with-password.js          - Создать нового пользователя'
    );
    console.log(
      '  node scripts/create-user-with-password.js --list   - Показать список пользователей'
    );
    console.log(
      '  node scripts/create-user-with-password.js --help   - Показать эту справку'
    );
    return;
  }

  await createUser();
}

// Запуск скрипта
if (require.main === module) {
  main();
}

module.exports = { createUser, listUsers };
