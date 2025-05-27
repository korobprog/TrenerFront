// Загружаем переменные окружения из .env файлов
require('dotenv').config({ path: '.env.development' });
require('dotenv').config({ path: '.env.production' });

const { PrismaClient } = require('@prisma/client');

/**
 * Скрипт для тестирования переменных окружения и аутентификации с загрузкой dotenv
 */
async function testEnvironmentAndAuth() {
  console.log('=== ТЕСТИРОВАНИЕ ПЕРЕМЕННЫХ ОКРУЖЕНИЯ И АУТЕНТИФИКАЦИИ ===');

  const prisma = new PrismaClient();

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

    // 2. Проверяем подключение к базе данных
    console.log('\n🔍 ПРОВЕРКА ПОДКЛЮЧЕНИЯ К БАЗЕ ДАННЫХ:');

    try {
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
          NOT: [{ text: '' }, { text: null }],
        },
      });
      console.log(`✅ Количество валидных вопросов: ${validQuestionCount}`);

      // Получаем примеры валидных вопросов
      if (validQuestionCount > 0) {
        const sampleQuestions = await prisma.question.findMany({
          where: {
            text: {
              not: null,
            },
            NOT: [{ text: '' }, { text: null }],
          },
          take: 3,
          select: {
            id: true,
            text: true,
            topic: true,
            difficulty: true,
          },
        });

        console.log('\n📝 ПРИМЕРЫ ВАЛИДНЫХ ВОПРОСОВ:');
        sampleQuestions.forEach((q, i) => {
          console.log(
            `  ${i + 1}. ID: ${q.id}, Тема: ${q.topic || 'не указана'}`
          );
          console.log(`     Текст: ${q.text?.substring(0, 80)}...`);
        });
      }
    } catch (dbError) {
      console.log('❌ Подключение к базе данных: ОШИБКА');
      console.log('   Детали:', dbError.message);
    }

    // 3. Проверяем структуру NextAuth
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

    // 4. Тестируем API флеш-карточек (симуляция)
    console.log('\n🔍 СИМУЛЯЦИЯ API ФЛЕШ-КАРТОЧЕК:');

    try {
      // Проверяем, что есть вопросы для флеш-карточек
      const flashcardQuestions = await prisma.question.findMany({
        where: {
          text: {
            not: null,
          },
          NOT: [{ text: '' }, { text: null }],
        },
        take: 5,
        select: {
          id: true,
          text: true,
          topic: true,
          difficulty: true,
        },
      });

      if (flashcardQuestions.length > 0) {
        console.log(
          `✅ Найдено ${flashcardQuestions.length} вопросов для флеш-карточек`
        );
        console.log(
          '✅ API флеш-карточек должен работать корректно при наличии авторизации'
        );
      } else {
        console.log('❌ Не найдено вопросов для флеш-карточек');
      }
    } catch (apiError) {
      console.log('❌ Ошибка при симуляции API флеш-карточек:');
      console.log('   Детали:', apiError.message);
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

    console.log('\n🔧 РЕКОМЕНДАЦИИ ДЛЯ ИСПРАВЛЕНИЯ ПРОБЛЕМ:');

    if (missingRequired.length === 0) {
      console.log('✅ Переменные окружения настроены корректно');
      console.log('✅ Для тестирования запустите: npm run dev');
      console.log(
        '✅ Затем откройте http://localhost:3000 и войдите в систему'
      );
      console.log('✅ После авторизации перейдите на страницу флеш-карточек');
    } else {
      console.log('1. Проверьте файлы .env.development и .env.production');
      console.log('2. Убедитесь, что все переменные установлены корректно');
      console.log('3. Перезапустите приложение после изменений');
    }
  } catch (error) {
    console.error('🚨 КРИТИЧЕСКАЯ ОШИБКА ПРИ ТЕСТИРОВАНИИ:');
    console.error('   Сообщение:', error.message);
    console.error('   Стек:', error.stack);
  } finally {
    await prisma.$disconnect();
    console.log('\n=== ТЕСТИРОВАНИЕ ЗАВЕРШЕНО ===');
  }
}

// Запускаем тестирование
testEnvironmentAndAuth().catch(console.error);
