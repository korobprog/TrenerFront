/**
 * Тест API профиля пользователя
 * Проверяет работу endpoint /api/user/profile
 */

const fetch = require('node-fetch');

async function testProfileAPI() {
  console.log('🧪 Тестирование API профиля пользователя...\n');

  try {
    // Тестируем GET запрос к API профиля
    console.log('📡 Отправляем GET запрос к /api/user/profile...');

    const response = await fetch('http://localhost:3000/api/user/profile', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Здесь должны быть куки сессии для авторизации
      },
    });

    console.log(`📊 Статус ответа: ${response.status}`);
    console.log(`📊 Статус текст: ${response.statusText}`);

    const data = await response.json();
    console.log('📊 Ответ API:');
    console.log(JSON.stringify(data, null, 2));

    if (response.status === 401) {
      console.log('\n⚠️  Ожидаемая ошибка: пользователь не авторизован');
      console.log('   Это нормально для теста без сессии');
    } else if (response.status === 200) {
      console.log('\n✅ API работает корректно');
    } else {
      console.log('\n❌ Неожиданный статус ответа');
    }
  } catch (error) {
    console.error('❌ Ошибка при тестировании API:', error.message);

    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Убедитесь, что сервер запущен: npm run dev');
    }
  }
}

// Дополнительная проверка структуры файла API
function checkAPIFile() {
  console.log('\n🔍 Проверка файла API...');

  const fs = require('fs');
  const path = './pages/api/user/profile.js';

  if (fs.existsSync(path)) {
    console.log('✅ Файл API существует');

    const content = fs.readFileSync(path, 'utf8');

    // Проверяем основные элементы
    const checks = [
      { name: 'Импорт getServerSession', pattern: /getServerSession/ },
      { name: 'Импорт authOptions', pattern: /authOptions/ },
      { name: 'Импорт prisma', pattern: /prisma/ },
      { name: 'Экспорт handler', pattern: /export default.*handler/ },
      { name: 'Обработка GET', pattern: /req\.method.*GET/ },
      { name: 'Обработка PUT', pattern: /req\.method.*PUT/ },
    ];

    checks.forEach((check) => {
      if (check.pattern.test(content)) {
        console.log(`✅ ${check.name}`);
      } else {
        console.log(`❌ ${check.name}`);
      }
    });
  } else {
    console.log('❌ Файл API не найден');
  }
}

// Проверка базы данных
async function checkDatabase() {
  console.log('\n🗄️  Проверка подключения к базе данных...');

  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    // Простой запрос для проверки подключения
    const userCount = await prisma.user.count();
    console.log(
      `✅ Подключение к БД работает. Пользователей в БД: ${userCount}`
    );

    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Ошибка подключения к БД:', error.message);
  }
}

async function runTests() {
  checkAPIFile();
  await checkDatabase();
  await testProfileAPI();

  console.log('\n📋 Рекомендации:');
  console.log('1. Убедитесь, что сервер запущен: npm run dev');
  console.log('2. Убедитесь, что пользователь авторизован в браузере');
  console.log('3. Проверьте консоль браузера на наличие ошибок');
  console.log('4. Проверьте логи сервера на наличие ошибок');
}

if (require.main === module) {
  runTests();
}

module.exports = { testProfileAPI, checkAPIFile, checkDatabase };
