/**
 * Скрипт для тестирования переменных окружения и аутентификации
 * Исправленная версия с поддержкой ES modules
 */
async function testEnvironmentAndAuth() {
  console.log('=== ТЕСТИРОВАНИЕ ПЕРЕМЕННЫХ ОКРУЖЕНИЯ И АУТЕНТИФИКАЦИИ ===');

  try {
    // 1. Проверяем критические переменные окружения
    console.log('\n🔍 ПРОВЕРКА ПЕРЕМЕННЫХ ОКРУЖЕНИЯ:');

    const requiredEnvVars = [
      'NEXTAUTH_SECRET',
      'NEXTAUTH_URL',
      'DATABASE_URL',
      'NODE_ENV',
    ];

    const optionalEnvVars = [
      'GOOGLE_CLIENT_ID',
      'GOOGLE_CLIENT_SECRET',
      'GITHUB_CLIENT_ID',
      'GITHUB_CLIENT_SECRET',
    ];

    let missingRequired = [];
    let missingOptional = [];

    // Проверяем обязательные переменные
    requiredEnvVars.forEach((varName) => {
      const value = process.env[varName];
      if (!value) {
        missingRequired.push(varName);
        console.log(`❌ ${varName}: НЕ УСТАНОВЛЕНА`);
      } else {
        console.log(
          `✅ ${varName}: ${varName === 'NEXTAUTH_SECRET' ? '[СКРЫТО]' : value}`
        );
      }
    });

    // Проверяем опциональные переменные
    console.log('\n🔍 ОПЦИОНАЛЬНЫЕ ПЕРЕМЕННЫЕ:');
    optionalEnvVars.forEach((varName) => {
      const value = process.env[varName];
      if (!value) {
        missingOptional.push(varName);
        console.log(`⚠️ ${varName}: НЕ УСТАНОВЛЕНА`);
      } else {
        console.log(
          `✅ ${varName}: ${varName.includes('SECRET') ? '[СКРЫТО]' : value}`
        );
      }
    });

    // 2. Проверяем подключение к базе данных с помощью простого Prisma клиента
    console.log('\n🔍 ПРОВЕРКА ПОДКЛЮЧЕНИЯ К БАЗЕ ДАННЫХ:');

    try {
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();

      await prisma.$connect();
      console.log('✅ Подключение к базе данных: УСПЕШНО');

      // Проверяем количество пользователей
      const userCount = await prisma.user.count();
      console.log(`✅ Количество пользователей в базе: ${userCount}`);

      // Проверяем количество вопросов
      const questionCount = await prisma.question.count();
      console.log(`✅ Количество вопросов в базе: ${questionCount}`);

      // Проверяем количество вопросов с текстом (исправленный запрос)
      const validQuestionCount = await prisma.question.count({
        where: {
          text: {
            not: null,
          },
          NOT: {
            text: '',
          },
        },
      });
      console.log(`✅ Количество валидных вопросов: ${validQuestionCount}`);

      await prisma.$disconnect();
    } catch (dbError) {
      console.log('❌ Подключение к базе данных: ОШИБКА');
      console.log('   Детали:', dbError.message);
    }

    // 3. Проверяем доступность файлов конфигурации
    console.log('\n🔍 ПРОВЕРКА ФАЙЛОВ КОНФИГУРАЦИИ:');

    const fs = await import('fs');
    const path = await import('path');

    const configFiles = [
      '.env.development',
      '.env.production',
      'pages/api/auth/[...nextauth].js',
      'pages/api/flashcards/questions.js',
      'lib/prisma.js',
    ];

    configFiles.forEach((filePath) => {
      try {
        if (fs.existsSync(filePath)) {
          console.log(`✅ ${filePath}: СУЩЕСТВУЕТ`);
        } else {
          console.log(`❌ ${filePath}: НЕ НАЙДЕН`);
        }
      } catch (error) {
        console.log(`❌ ${filePath}: ОШИБКА ПРОВЕРКИ - ${error.message}`);
      }
    });

    // 4. Проверяем структуру NextAuth
    console.log('\n🔍 ПРОВЕРКА NEXTAUTH СТРУКТУРЫ:');

    try {
      // Проверяем, что NEXTAUTH_SECRET установлен и имеет достаточную длину
      const secret = process.env.NEXTAUTH_SECRET;
      if (secret && secret.length >= 32) {
        console.log('✅ NEXTAUTH_SECRET: Корректная длина');
      } else if (secret) {
        console.log(
          '⚠️ NEXTAUTH_SECRET: Слишком короткий (рекомендуется минимум 32 символа)'
        );
      } else {
        console.log('❌ NEXTAUTH_SECRET: НЕ УСТАНОВЛЕН');
      }

      // Проверяем NEXTAUTH_URL
      const nextAuthUrl = process.env.NEXTAUTH_URL;
      if (nextAuthUrl) {
        try {
          new URL(nextAuthUrl);
          console.log('✅ NEXTAUTH_URL: Корректный формат URL');
        } catch {
          console.log('❌ NEXTAUTH_URL: Некорректный формат URL');
        }
      }
    } catch (authError) {
      console.log('❌ Проверка NextAuth: ОШИБКА');
      console.log('   Детали:', authError.message);
    }

    // 5. Итоговый отчет
    console.log('\n📊 ИТОГОВЫЙ ОТЧЕТ:');

    if (missingRequired.length > 0) {
      console.log('❌ КРИТИЧЕСКИЕ ПРОБЛЕМЫ:');
      missingRequired.forEach((varName) => {
        console.log(`   - Отсутствует обязательная переменная: ${varName}`);
      });
    } else {
      console.log('✅ Все обязательные переменные окружения установлены');
    }

    if (missingOptional.length > 0) {
      console.log('⚠️ ПРЕДУПРЕЖДЕНИЯ:');
      missingOptional.forEach((varName) => {
        console.log(`   - Отсутствует опциональная переменная: ${varName}`);
      });
    }

    console.log('\n🔧 РЕКОМЕНДАЦИИ:');
    if (missingRequired.length > 0) {
      console.log(
        '1. Убедитесь, что файл .env.development существует и содержит все необходимые переменные'
      );
      console.log('2. Перезапустите приложение после добавления переменных');
    }

    if (
      process.env.NODE_ENV !== 'development' &&
      process.env.NODE_ENV !== 'production'
    ) {
      console.log('3. Установите NODE_ENV в development или production');
    }

    console.log(
      '4. Для тестирования аутентификации войдите в систему через веб-интерфейс'
    );
    console.log('5. Запустите приложение командой: npm run dev');
  } catch (error) {
    console.error('🚨 КРИТИЧЕСКАЯ ОШИБКА ПРИ ТЕСТИРОВАНИИ:');
    console.error('   Сообщение:', error.message);
    console.error('   Стек:', error.stack);
  } finally {
    console.log('\n=== ТЕСТИРОВАНИЕ ЗАВЕРШЕНО ===');
  }
}

// Запускаем тестирование
testEnvironmentAndAuth().catch(console.error);
