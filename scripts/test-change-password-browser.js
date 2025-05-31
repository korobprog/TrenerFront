console.log('🧪 Тест API endpoint смены пароля в браузере...\n');

// Функция для тестирования API endpoint смены пароля
async function testChangePasswordAPI() {
  console.log('🔐 Начинаем тестирование API смены пароля...\n');

  // Тестовые данные
  const testData = {
    currentPassword: 'currentPass123!',
    newPassword: 'newSecurePass456@',
    confirmPassword: 'newSecurePass456@',
  };

  try {
    console.log('📡 Отправляем запрос на смену пароля...');
    console.log('URL:', '/api/user/change-password');
    console.log('Данные:', {
      currentPassword: '***скрыто***',
      newPassword: '***скрыто***',
      confirmPassword: '***скрыто***',
    });

    const response = await fetch('/api/user/change-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData),
    });

    console.log('\n📊 Ответ сервера:');
    console.log('Статус:', response.status);
    console.log('Статус текст:', response.statusText);

    const data = await response.json();
    console.log('Данные ответа:', data);

    // Анализируем ответ
    if (response.status === 401) {
      console.log('\n✅ Тест прошел успешно!');
      console.log('🔒 API правильно требует авторизации');
      console.log('📝 Ожидаемый результат: пользователь не авторизован');
    } else if (response.status === 400) {
      console.log('\n✅ Тест прошел успешно!');
      console.log('🔒 API правильно валидирует данные');
      console.log('📝 Ответ:', data.error);
    } else if (response.status === 200 && data.success) {
      console.log('\n✅ Тест прошел успешно!');
      console.log('🎉 Пароль успешно изменен');
      console.log('📝 Сообщение:', data.message);
    } else {
      console.log('\n⚠️ Неожиданный ответ:');
      console.log('Статус:', response.status);
      console.log('Данные:', data);
    }
  } catch (error) {
    console.error('\n❌ Ошибка при тестировании:', error);

    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      console.log('\n💡 Подсказка: Этот тест нужно запускать в браузере');
      console.log('1. Откройте консоль разработчика (F12)');
      console.log('2. Скопируйте и вставьте код этого файла');
      console.log('3. Нажмите Enter для выполнения');
    }
  }
}

// Функция для тестирования различных сценариев
async function testDifferentScenarios() {
  console.log('\n🧪 Тестирование различных сценариев...\n');

  const scenarios = [
    {
      name: 'Пустые данные',
      data: {},
      expectedStatus: 400,
    },
    {
      name: 'Отсутствует текущий пароль',
      data: {
        newPassword: 'newPass123!',
        confirmPassword: 'newPass123!',
      },
      expectedStatus: 400,
    },
    {
      name: 'Пароли не совпадают',
      data: {
        currentPassword: 'current123!',
        newPassword: 'newPass123!',
        confirmPassword: 'different123!',
      },
      expectedStatus: 400,
    },
    {
      name: 'Слабый новый пароль',
      data: {
        currentPassword: 'current123!',
        newPassword: '123',
        confirmPassword: '123',
      },
      expectedStatus: 400,
    },
    {
      name: 'Новый пароль совпадает с текущим',
      data: {
        currentPassword: 'samePass123!',
        newPassword: 'samePass123!',
        confirmPassword: 'samePass123!',
      },
      expectedStatus: 400,
    },
  ];

  for (const scenario of scenarios) {
    console.log(`\n🔍 Тест: ${scenario.name}`);

    try {
      const response = await fetch('/api/user/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(scenario.data),
      });

      const data = await response.json();

      if (
        response.status === scenario.expectedStatus ||
        response.status === 401
      ) {
        console.log(`   ✅ Ожидаемый статус: ${response.status}`);
        console.log(`   📝 Ошибка: ${data.error}`);
      } else {
        console.log(
          `   ⚠️ Неожиданный статус: ${response.status} (ожидался ${scenario.expectedStatus})`
        );
      }
    } catch (error) {
      console.log(`   ❌ Ошибка: ${error.message}`);
    }

    // Небольшая пауза между запросами
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

// Функция для проверки метода
async function testMethodValidation() {
  console.log('\n🔍 Тестирование валидации HTTP методов...\n');

  const methods = ['GET', 'PUT', 'DELETE', 'PATCH'];

  for (const method of methods) {
    console.log(`\n📡 Тестируем метод: ${method}`);

    try {
      const response = await fetch('/api/user/change-password', {
        method: method,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.status === 405) {
        console.log(`   ✅ Правильно отклонен метод ${method}`);
        console.log(`   📝 Ошибка: ${data.error}`);
      } else {
        console.log(
          `   ⚠️ Неожиданный ответ для метода ${method}: ${response.status}`
        );
      }
    } catch (error) {
      console.log(`   ❌ Ошибка: ${error.message}`);
    }
  }
}

// Основная функция тестирования
async function runAllTests() {
  console.log('🚀 Запуск полного тестирования API endpoint смены пароля\n');
  console.log('='.repeat(60));

  await testChangePasswordAPI();
  await testDifferentScenarios();
  await testMethodValidation();

  console.log('\n' + '='.repeat(60));
  console.log('🎉 Тестирование завершено!');
  console.log('\n💡 Инструкции для использования в браузере:');
  console.log('1. Откройте сайт в браузере');
  console.log('2. Откройте консоль разработчика (F12)');
  console.log('3. Скопируйте весь код этого файла');
  console.log('4. Вставьте в консоль и нажмите Enter');
  console.log('5. Выполните: runAllTests()');
  console.log('\n🔐 Для полного тестирования нужна авторизация!');
}

// Экспортируем функции для использования
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    testChangePasswordAPI,
    testDifferentScenarios,
    testMethodValidation,
    runAllTests,
  };
}

// Автоматический запуск в Node.js
if (typeof window === 'undefined') {
  console.log('💡 Этот тест предназначен для браузера');
  console.log('Для тестирования в браузере:');
  console.log('1. Откройте http://localhost:3000');
  console.log('2. Откройте консоль разработчика (F12)');
  console.log('3. Скопируйте код этого файла в консоль');
  console.log('4. Выполните: runAllTests()');
}
