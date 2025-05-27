const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Скрипт для тестирования переменных окружения и аутентификации
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

      // Проверяем количество вопросов с текстом
      const validQuestionCount = await prisma.question.count({
        where: {
          AND: [{ text: { not: null } }, { text: { not: { equals: '' } } }],
        },
      });
      console.log(`✅ Количество валидных вопросов: ${validQuestionCount}`);
    } catch (dbError) {
      console.log('❌ Подключение к базе данных: ОШИБКА');
      console.log('   Детали:', dbError.message);
    }

    // 3. Тестируем NextAuth конфигурацию
    console.log('\n🔍 ПРОВЕРКА NEXTAUTH КОНФИГУРАЦИИ:');

    try {
      // Импортируем authOptions
      const { authOptions } = require('../pages/api/auth/[...nextauth].js');

      console.log('✅ NextAuth конфигурация загружена успешно');
      console.log(`✅ Количество провайдеров: ${authOptions.providers.length}`);
      console.log(`✅ Стратегия сессии: ${authOptions.session.strategy}`);
      console.log(
        `✅ Максимальный возраст сессии: ${authOptions.session.maxAge} секунд`
      );

      // Проверяем провайдеры
      authOptions.providers.forEach((provider, index) => {
        console.log(
          `✅ Провайдер ${index + 1}: ${provider.name || provider.id}`
        );
      });
    } catch (authError) {
      console.log('❌ NextAuth конфигурация: ОШИБКА');
      console.log('   Детали:', authError.message);
    }

    // 4. Симулируем запрос к API флеш-карточек
    console.log('\n🔍 СИМУЛЯЦИЯ ЗАПРОСА К API ФЛЕШ-КАРТОЧЕК:');

    try {
      // Создаем мок-объекты для req и res
      const mockReq = {
        method: 'GET',
        query: {
          limit: '5',
          mode: 'study',
        },
      };

      const mockRes = {
        status: (code) => ({
          json: (data) => {
            console.log(`📤 Ответ API: статус ${code}`);
            if (code === 401) {
              console.log('❌ API возвращает 401 - Необходима авторизация');
            } else if (code === 200) {
              console.log('✅ API работает корректно');
              console.log(
                `✅ Количество вопросов в ответе: ${
                  data.questions?.length || 0
                }`
              );
            } else {
              console.log(`⚠️ API возвращает статус: ${code}`);
            }
            return { status: code, data };
          },
        }),
      };

      // Импортируем обработчик API
      const flashcardsHandler =
        require('../pages/api/flashcards/questions.js').default;

      // Вызываем без сессии (должно вернуть 401)
      console.log('🔍 Тестируем запрос без авторизации...');
      await flashcardsHandler(mockReq, mockRes);
    } catch (apiError) {
      console.log('❌ Ошибка при тестировании API флеш-карточек:');
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
