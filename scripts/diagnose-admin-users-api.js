/**
 * Диагностический скрипт для проблемы с настройками пользователей в админ-панели
 * Проверяет API эндпоинты и добавляет логи для валидации предположений
 */

const fetch = require('node-fetch');

// Конфигурация
const BASE_URL = 'http://localhost:3000';
const TEST_USER_ID = 'cmb9k4mtb0000mkc4b5uwfgtz'; // ID из логов

async function diagnoseAdminUsersAPI() {
  console.log(
    '🔍 ДИАГНОСТИКА: Проблема с настройками пользователей в админ-панели'
  );
  console.log('='.repeat(80));

  // 1. Проверяем существование API эндпоинта для списка пользователей
  console.log('\n1️⃣ Проверка API эндпоинта для списка пользователей...');
  try {
    const response = await fetch(`${BASE_URL}/api/admin/users`, {
      method: 'GET',
      headers: {
        Cookie: 'next-auth.session-token=3621ebb0-8151-4e84-9b65-7e6ec958852a',
      },
    });

    console.log(`   ✅ Статус ответа: ${response.status}`);
    if (response.ok) {
      const data = await response.json();
      console.log(`   ✅ API для списка пользователей работает`);
      console.log(
        `   📊 Количество пользователей: ${
          data.data?.users?.length || 'неизвестно'
        }`
      );
    } else {
      console.log(`   ❌ Ошибка API: ${response.statusText}`);
    }
  } catch (error) {
    console.log(`   ❌ Ошибка подключения: ${error.message}`);
  }

  // 2. Проверяем существование API эндпоинта для конкретного пользователя
  console.log('\n2️⃣ Проверка API эндпоинта для конкретного пользователя...');
  try {
    const response = await fetch(
      `${BASE_URL}/api/admin/users/${TEST_USER_ID}`,
      {
        method: 'GET',
        headers: {
          Cookie:
            'next-auth.session-token=3621ebb0-8151-4e84-9b65-7e6ec958852a',
        },
      }
    );

    console.log(`   📡 Запрос к: /api/admin/users/${TEST_USER_ID}`);
    console.log(`   📊 Статус ответа: ${response.status}`);

    if (response.status === 404) {
      console.log(
        `   ❌ ПРОБЛЕМА НАЙДЕНА: API эндпоинт /api/admin/users/[id] НЕ СУЩЕСТВУЕТ`
      );
      console.log(`   🔧 Это объясняет ошибку "не найден"`);
    } else if (response.ok) {
      const data = await response.json();
      console.log(`   ✅ API для конкретного пользователя работает`);
      console.log(`   👤 Пользователь: ${data.name || 'неизвестно'}`);
    } else {
      console.log(
        `   ⚠️  Неожиданный статус: ${response.status} - ${response.statusText}`
      );
    }
  } catch (error) {
    console.log(`   ❌ Ошибка подключения: ${error.message}`);
  }

  // 3. Проверяем структуру файлов API
  console.log('\n3️⃣ Анализ структуры файлов API...');
  const fs = require('fs');
  const path = require('path');

  const apiAdminPath = path.join(__dirname, 'pages', 'api', 'admin');
  const usersApiPath = path.join(apiAdminPath, 'users.js');
  const usersIdApiPath = path.join(apiAdminPath, 'users', '[id].js');
  const backupUsersIdPath = path.join(
    __dirname,
    'pages',
    'api.backup.disabled',
    'admin',
    'users',
    '[id].js'
  );

  console.log(`   📁 Проверка: ${usersApiPath}`);
  console.log(
    `   ${fs.existsSync(usersApiPath) ? '✅' : '❌'} pages/api/admin/users.js`
  );

  console.log(`   📁 Проверка: ${usersIdApiPath}`);
  console.log(
    `   ${
      fs.existsSync(usersIdApiPath) ? '✅' : '❌'
    } pages/api/admin/users/[id].js`
  );

  console.log(`   📁 Проверка backup: ${backupUsersIdPath}`);
  console.log(
    `   ${
      fs.existsSync(backupUsersIdPath) ? '✅' : '❌'
    } pages/api.backup.disabled/admin/users/[id].js`
  );

  if (!fs.existsSync(usersIdApiPath) && fs.existsSync(backupUsersIdPath)) {
    console.log(`   🔧 РЕШЕНИЕ: Нужно восстановить файл из backup`);
  }

  // 4. Проверяем страницу, которая делает запрос
  console.log('\n4️⃣ Анализ страницы пользователя...');
  const userPagePath = path.join(
    __dirname,
    'pages',
    'admin',
    'users',
    '[id].js'
  );
  console.log(`   📁 Проверка: ${userPagePath}`);
  console.log(
    `   ${fs.existsSync(userPagePath) ? '✅' : '❌'} pages/admin/users/[id].js`
  );

  if (fs.existsSync(userPagePath)) {
    const content = fs.readFileSync(userPagePath, 'utf8');
    const hasApiCall = content.includes('/api/admin/users/${id}');
    console.log(
      `   ${
        hasApiCall ? '✅' : '❌'
      } Страница делает запрос к /api/admin/users/\${id}`
    );
  }

  // 5. Проверяем логи браузера на предмет title warning
  console.log('\n5️⃣ Анализ возможных проблем с title...');
  console.log(
    '   ⚠️  Для проверки title warning нужно открыть браузер и посмотреть консоль'
  );
  console.log(
    '   🔍 Поищите сообщения типа: "Warning: validateDOMNesting(...): <title> cannot appear as a child"'
  );

  // Выводим диагноз
  console.log('\n' + '='.repeat(80));
  console.log('📋 ДИАГНОЗ:');
  console.log('='.repeat(80));

  console.log('\n🎯 ОСНОВНАЯ ПРОБЛЕМА:');
  console.log('   ❌ Отсутствует API эндпоинт /api/admin/users/[id]');
  console.log('   📁 Файл pages/api/admin/users/[id].js не существует');
  console.log(
    '   💾 Но есть backup версия в pages/api.backup.disabled/admin/users/[id].js'
  );

  console.log('\n🔧 РЕКОМЕНДУЕМОЕ РЕШЕНИЕ:');
  console.log('   1. Создать папку pages/api/admin/users/');
  console.log('   2. Скопировать файл [id].js из backup папки');
  console.log('   3. Обновить импорты в восстановленном файле');

  console.log('\n⚠️  ДОПОЛНИТЕЛЬНАЯ ПРОБЛЕМА:');
  console.log(
    '   🔍 Предупреждение о title элементе требует проверки в браузере'
  );
  console.log('   📱 Откройте /admin/users в браузере и проверьте консоль');
}

// Запускаем диагностику
diagnoseAdminUsersAPI().catch(console.error);
