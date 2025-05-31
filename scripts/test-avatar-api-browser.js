/**
 * Простой тест API аватарки для выполнения в браузере
 * Откройте консоль разработчика и выполните этот код
 */

async function testAvatarAPI() {
  console.log('🧪 Тестирование API аватарки в браузере...\n');

  try {
    // 1. Получение текущей аватарки
    console.log('1️⃣ Получение текущей аватарки...');
    const getResponse = await fetch('/api/user/avatar');
    const getData = await getResponse.json();

    if (getData.success) {
      console.log('✅ Аватарка получена:', getData.avatar);
      console.log(
        '📊 Пользовательская аватарка:',
        getData.hasCustomAvatar ? 'Да' : 'Нет'
      );
      console.log('👤 Пользователь:', getData.user.name || getData.user.email);
    } else {
      console.log('❌ Ошибка получения аватарки:', getData.error);
      return;
    }

    // 2. Обновление аватарки (тестовый URL)
    console.log('\n2️⃣ Обновление аватарки...');
    const testAvatarUrl =
      'https://api.dicebear.com/7.x/avataaars/svg?seed=test&backgroundColor=ff6b6b';

    const putResponse = await fetch('/api/user/avatar', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        avatar: testAvatarUrl,
      }),
    });

    const putData = await putResponse.json();

    if (putData.success) {
      console.log('✅ Аватарка обновлена:', putData.avatar);
      console.log('📝 Сообщение:', putData.message);
    } else {
      console.log('❌ Ошибка обновления аватарки:', putData.error);
    }

    // 3. Проверка обновленной аватарки
    console.log('\n3️⃣ Проверка обновленной аватарки...');
    const getResponse2 = await fetch('/api/user/avatar');
    const getData2 = await getResponse2.json();

    if (getData2.success) {
      console.log('✅ Обновленная аватарка:', getData2.avatar);
      console.log(
        '📊 Пользовательская аватарка:',
        getData2.hasCustomAvatar ? 'Да' : 'Нет'
      );
    }

    // 4. Удаление аватарки (возврат к дефолтной)
    console.log('\n4️⃣ Удаление аватарки...');
    const deleteResponse = await fetch('/api/user/avatar', {
      method: 'DELETE',
    });

    const deleteData = await deleteResponse.json();

    if (deleteData.success) {
      console.log('✅ Аватарка удалена:', deleteData.avatar);
      console.log('📝 Сообщение:', deleteData.message);
      console.log(
        '📊 Пользовательская аватарка:',
        deleteData.hasCustomAvatar ? 'Да' : 'Нет'
      );
    } else {
      console.log('❌ Ошибка удаления аватарки:', deleteData.error);
    }

    // 5. Финальная проверка
    console.log('\n5️⃣ Финальная проверка...');
    const getResponse3 = await fetch('/api/user/avatar');
    const getData3 = await getResponse3.json();

    if (getData3.success) {
      console.log('✅ Финальная аватарка:', getData3.avatar);
      console.log(
        '📊 Пользовательская аватарка:',
        getData3.hasCustomAvatar ? 'Да' : 'Нет'
      );
    }

    console.log('\n🎉 Тестирование завершено успешно!');

    // Возвращаем результаты для дальнейшего использования
    return {
      success: true,
      originalAvatar: getData.avatar,
      updatedAvatar: getData2.avatar,
      finalAvatar: getData3.avatar,
    };
  } catch (error) {
    console.error('❌ Ошибка при тестировании:', error);
    return { success: false, error: error.message };
  }
}

// Тест валидации (можно выполнить отдельно)
async function testAvatarValidation() {
  console.log('🔍 Тестирование валидации URL...\n');

  const testCases = [
    {
      name: 'Валидный HTTPS URL',
      url: 'https://example.com/avatar.jpg',
      shouldPass: true,
    },
    {
      name: 'Валидный HTTP URL',
      url: 'http://example.com/avatar.png',
      shouldPass: true,
    },
    {
      name: 'Валидный Data URL',
      url: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=',
      shouldPass: true,
    },
    {
      name: 'Невалидный FTP URL',
      url: 'ftp://example.com/avatar.jpg',
      shouldPass: false,
    },
    {
      name: 'Опасный JavaScript URL',
      url: 'javascript:alert("xss")',
      shouldPass: false,
    },
    {
      name: 'Пустая строка',
      url: '',
      shouldPass: false,
    },
    {
      name: 'Слишком длинный URL',
      url: 'https://example.com/' + 'a'.repeat(2000),
      shouldPass: false,
    },
  ];

  for (const testCase of testCases) {
    console.log(`Тестирование: ${testCase.name}`);

    try {
      const response = await fetch('/api/user/avatar', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          avatar: testCase.url,
        }),
      });

      const data = await response.json();
      const passed = data.success === testCase.shouldPass;

      console.log(
        `   ${passed ? '✅' : '❌'} ${
          testCase.shouldPass ? 'Должен пройти' : 'Должен провалиться'
        }: ${data.success ? 'Прошел' : 'Провалился'}`
      );

      if (!data.success) {
        console.log(`   📝 Ошибка: ${data.error}`);
      }
    } catch (error) {
      console.log(`   ❌ Ошибка запроса: ${error.message}`);
    }

    console.log('');
  }
}

// Функция для отображения аватарки в консоли (если поддерживается)
function displayAvatar(avatarUrl) {
  if (avatarUrl) {
    console.log(
      `%c `,
      `
      background-image: url(${avatarUrl});
      background-size: 50px 50px;
      background-repeat: no-repeat;
      padding: 25px;
      margin: 10px;
      border: 2px solid #ccc;
      border-radius: 50%;
    `
    );
  }
}

// Экспорт функций для использования в консоли
if (typeof window !== 'undefined') {
  window.testAvatarAPI = testAvatarAPI;
  window.testAvatarValidation = testAvatarValidation;
  window.displayAvatar = displayAvatar;

  console.log('🚀 Функции тестирования загружены!');
  console.log('Доступные команды:');
  console.log('  testAvatarAPI() - полный тест API');
  console.log('  testAvatarValidation() - тест валидации');
  console.log('  displayAvatar(url) - показать аватарку');
}

// Для Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    testAvatarAPI,
    testAvatarValidation,
    displayAvatar,
  };
}
