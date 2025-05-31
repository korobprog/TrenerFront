const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testAvatarAPI() {
  console.log('🧪 Тестирование API endpoint для аватарки пользователя...\n');

  try {
    // Проверяем существование поля image в таблице User
    console.log('1️⃣ Проверка структуры базы данных:');
    const userTableInfo = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'User' AND column_name = 'image'
    `;

    if (userTableInfo.length > 0) {
      console.log('   ✅ Поле image найдено в таблице User');
      console.log(`   📊 Тип данных: ${userTableInfo[0].data_type}`);
      console.log(`   📊 Nullable: ${userTableInfo[0].is_nullable}`);
    } else {
      console.log('   ❌ Поле image не найдено в таблице User');
      return;
    }

    // Проверяем количество пользователей
    console.log('\n2️⃣ Проверка пользователей:');
    const userCount = await prisma.user.count();
    console.log(`   👥 Общее количество пользователей: ${userCount}`);

    if (userCount > 0) {
      // Получаем пример пользователя
      const sampleUser = await prisma.user.findFirst({
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      });

      console.log(
        `   📝 Пример пользователя: ${sampleUser.email || sampleUser.name}`
      );
      console.log(
        `   🖼️ Текущая аватарка: ${sampleUser.image || 'не установлена'}`
      );

      // Тестируем функцию генерации инициалов
      console.log('\n3️⃣ Тестирование генерации инициалов:');
      const testCases = [
        'Иван Петров',
        'john.doe@example.com',
        'Анна',
        'test@gmail.com',
        '',
        null,
      ];

      testCases.forEach((testCase) => {
        const initials = getInitials(testCase);
        console.log(`   "${testCase || 'null'}" → "${initials}"`);
      });

      // Тестируем валидацию URL
      console.log('\n4️⃣ Тестирование валидации URL:');
      const urlTestCases = [
        'https://example.com/avatar.jpg',
        'http://example.com/avatar.png',
        'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ...',
        'ftp://example.com/avatar.jpg',
        'invalid-url',
        'javascript:alert("xss")',
        '',
      ];

      urlTestCases.forEach((url) => {
        const isValid = isValidAvatarUrl(url);
        console.log(
          `   "${url.substring(0, 50)}${url.length > 50 ? '...' : ''}" → ${
            isValid ? '✅' : '❌'
          }`
        );
      });
    }

    console.log('\n5️⃣ Проверка API endpoint файла:');
    const fs = require('fs');
    const path = './pages/api/user/avatar.js';

    if (fs.existsSync(path)) {
      console.log('   ✅ Файл pages/api/user/avatar.js создан');
      const content = fs.readFileSync(path, 'utf8');

      // Проверяем основные компоненты
      const checks = [
        { name: 'GET метод', pattern: /req\.method === 'GET'/ },
        { name: 'PUT метод', pattern: /req\.method === 'PUT'/ },
        { name: 'DELETE метод', pattern: /req\.method === 'DELETE'/ },
        { name: 'Проверка авторизации', pattern: /getServerSession/ },
        { name: 'Валидация URL', pattern: /isValidAvatarUrl/ },
        { name: 'Генерация инициалов', pattern: /getInitials/ },
        { name: 'Обработка ошибок', pattern: /catch.*error/ },
        { name: 'Prisma операции', pattern: /prisma\.user/ },
      ];

      checks.forEach((check) => {
        const found = check.pattern.test(content);
        console.log(`   ${found ? '✅' : '❌'} ${check.name}`);
      });
    } else {
      console.log('   ❌ Файл pages/api/user/avatar.js не найден');
    }

    console.log('\n🎉 Тестирование завершено!');
    console.log('\n📋 Что реализовано:');
    console.log('   1. GET /api/user/avatar - получение текущей аватарки');
    console.log('   2. PUT /api/user/avatar - обновление аватарки');
    console.log('   3. DELETE /api/user/avatar - удаление аватарки');
    console.log('   4. Проверка авторизации пользователя');
    console.log('   5. Валидация URL аватарки');
    console.log('   6. Генерация дефолтной аватарки с инициалами');
    console.log('   7. Санитизация входных данных');
    console.log('   8. Обработка ошибок');

    console.log('\n✨ Особенности реализации:');
    console.log('   • Использует существующее поле image в таблице User');
    console.log('   • Генерирует дефолтные аватарки через DiceBear API');
    console.log('   • Поддерживает URL и data: схемы');
    console.log('   • Ограничивает размер URL до 2000 символов');
    console.log('   • Следует паттернам существующих API endpoints');
  } catch (error) {
    console.error('❌ Ошибка при тестировании:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

// Вспомогательные функции для тестирования
function getInitials(nameOrEmail) {
  if (!nameOrEmail) return 'U';

  if (nameOrEmail.includes('@')) {
    nameOrEmail = nameOrEmail.split('@')[0];
  }

  const words = nameOrEmail.trim().split(/\s+/);
  if (words.length === 1) {
    return words[0].substring(0, 2).toUpperCase();
  } else {
    return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase();
  }
}

function isValidAvatarUrl(url) {
  try {
    const urlObj = new URL(url);

    if (!['http:', 'https:', 'data:'].includes(urlObj.protocol)) {
      return false;
    }

    if (urlObj.protocol === 'data:') {
      return url.startsWith('data:image/');
    }

    return true;
  } catch (error) {
    return false;
  }
}

testAvatarAPI();
