/**
 * Упрощенный диагностический скрипт для проверки авторизации в API флешкарт
 * Использует CommonJS для совместимости
 */

const { PrismaClient } = require('@prisma/client');

async function diagnoseFlashcardAuth() {
  console.log('=== ДИАГНОСТИКА АВТОРИЗАЦИИ ФЛЕШКАРТ ===');

  const prisma = new PrismaClient();

  try {
    // Тест 1: Проверка переменных окружения
    console.log('\n🔍 ТЕСТ 1: Проверка переменных окружения');
    console.log(
      '   NEXTAUTH_SECRET установлен:',
      !!process.env.NEXTAUTH_SECRET
    );
    console.log('   NEXTAUTH_URL:', process.env.NEXTAUTH_URL);
    console.log('   NODE_ENV:', process.env.NODE_ENV);
    console.log('   DATABASE_URL установлен:', !!process.env.DATABASE_URL);

    // Тест 2: Проверка подключения к базе данных
    console.log('\n🔍 ТЕСТ 2: Проверка подключения к базе данных');
    try {
      await prisma.$connect();
      console.log('   ✅ Подключение к базе данных успешно');

      // Проверяем количество пользователей
      const userCount = await prisma.user.count();
      console.log('   📊 Количество пользователей в базе:', userCount);

      if (userCount > 0) {
        const sampleUser = await prisma.user.findFirst({
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
          },
        });
        console.log('   👤 Пример пользователя:', {
          id: sampleUser.id,
          email: sampleUser.email,
          name: sampleUser.name,
          role: sampleUser.role,
        });
      }
    } catch (dbError) {
      console.log('   ❌ Ошибка подключения к базе данных:', dbError.message);
    }

    // Тест 3: Проверка структуры таблиц
    console.log('\n🔍 ТЕСТ 3: Проверка структуры таблиц');
    try {
      // Проверяем таблицу Session
      const sessionCount = await prisma.session.count();
      console.log('   📊 Количество сессий в базе:', sessionCount);

      // Проверяем таблицу Account
      const accountCount = await prisma.account.count();
      console.log('   📊 Количество аккаунтов в базе:', accountCount);
    } catch (tableError) {
      console.log('   ❌ Ошибка при проверке таблиц:', tableError.message);
    }

    // Тест 4: Симуляция проверки авторизации
    console.log('\n🔍 ТЕСТ 4: Симуляция проверки авторизации');

    // Проверяем, есть ли активные сессии
    try {
      const activeSessions = await prisma.session.findMany({
        where: {
          expires: {
            gt: new Date(),
          },
        },
        take: 3,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      });

      console.log('   📊 Активных сессий:', activeSessions.length);
      if (activeSessions.length > 0) {
        console.log('   👥 Пользователи с активными сессиями:');
        activeSessions.forEach((session, i) => {
          console.log(
            `     ${i + 1}. ${session.user.email} (ID: ${session.user.id})`
          );
        });
      }
    } catch (sessionError) {
      console.log('   ❌ Ошибка при проверке сессий:', sessionError.message);
    }

    // Тест 5: Проверка конфигурации NextAuth
    console.log('\n🔍 ТЕСТ 5: Проверка файлов NextAuth');
    const fs = require('fs');
    const path = require('path');

    const nextAuthPath = path.join(
      process.cwd(),
      'pages',
      'api',
      'auth',
      '[...nextauth].js'
    );
    const flashcardPath = path.join(
      process.cwd(),
      'pages',
      'api',
      'flashcards',
      'questions.js'
    );

    console.log('   📁 NextAuth файл существует:', fs.existsSync(nextAuthPath));
    console.log(
      '   📁 Flashcard API файл существует:',
      fs.existsSync(flashcardPath)
    );

    // Тест 6: Проверка импортов в API файле
    console.log('\n🔍 ТЕСТ 6: Анализ API файла флешкарт');
    if (fs.existsSync(flashcardPath)) {
      const flashcardContent = fs.readFileSync(flashcardPath, 'utf8');

      console.log(
        '   📝 Импорт getServerSession:',
        flashcardContent.includes('getServerSession')
      );
      console.log(
        '   📝 Импорт authOptions:',
        flashcardContent.includes('authOptions')
      );
      console.log(
        '   📝 Проверка сессии:',
        flashcardContent.includes('if (!session)')
      );
      console.log(
        '   📝 Возврат 401:',
        flashcardContent.includes('status(401)')
      );

      // Ищем строку с проверкой авторизации
      const authCheckMatch = flashcardContent.match(
        /const session = await getServerSession\([^)]+\);/
      );
      if (authCheckMatch) {
        console.log('   ✅ Найдена проверка авторизации:', authCheckMatch[0]);
      } else {
        console.log('   ❌ Проверка авторизации не найдена');
      }
    }

    // Тест 7: Проверка логов в консоли
    console.log('\n🔍 ТЕСТ 7: Рекомендации по диагностике');
    console.log('   💡 Для дальнейшей диагностики:');
    console.log('   1. Проверьте браузерные cookies (next-auth.session-token)');
    console.log('   2. Проверьте Network tab в DevTools при запросе к API');
    console.log('   3. Убедитесь, что пользователь авторизован в системе');
    console.log('   4. Проверьте логи сервера при выполнении запроса');
  } catch (error) {
    console.error('\n🚨 КРИТИЧЕСКАЯ ОШИБКА В ДИАГНОСТИКЕ:');
    console.error('   Сообщение:', error.message);
    console.error('   Стек:', error.stack);
  } finally {
    await prisma.$disconnect();
  }

  console.log('\n=== КОНЕЦ ДИАГНОСТИКИ ===');
}

// Запускаем диагностику
diagnoseFlashcardAuth().catch(console.error);
