const { PrismaClient } = require('@prisma/client');

async function testFlashcardsAPI() {
  const prisma = new PrismaClient();

  try {
    console.log('=== ТЕСТ API ФЛЕШ-КАРТОЧЕК ===');

    // 1. Проверяем подключение к базе данных
    console.log('🔍 Проверяем подключение к базе данных...');
    await prisma.$connect();
    console.log('✅ Подключение к базе данных успешно');

    // 2. Проверяем количество вопросов
    console.log('🔍 Проверяем количество вопросов...');
    const totalQuestions = await prisma.question.count();
    console.log(`📊 Общее количество вопросов: ${totalQuestions}`);

    // 3. Проверяем вопросы с текстом
    const questionsWithText = await prisma.question.count({
      where: {
        AND: [{ text: { not: null } }, { text: { not: { equals: '' } } }],
      },
    });
    console.log(`📝 Вопросов с текстом: ${questionsWithText}`);

    // 4. Проверяем структуру таблицы User
    console.log('🔍 Проверяем структуру пользователей...');
    const userCount = await prisma.user.count();
    console.log(`👥 Количество пользователей: ${userCount}`);

    if (userCount > 0) {
      const sampleUser = await prisma.user.findFirst({
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true,
        },
      });
      console.log('👤 Пример пользователя:', sampleUser);
    }

    // 5. Проверяем связанные таблицы
    console.log('🔍 Проверяем связанные таблицы...');

    try {
      const progressCount = await prisma.userProgress.count();
      console.log(`📈 Записей прогресса: ${progressCount}`);
    } catch (error) {
      console.log('❌ Ошибка при проверке UserProgress:', error.message);
    }

    try {
      const favoritesCount = await prisma.favoriteQuestion.count();
      console.log(`⭐ Избранных вопросов: ${favoritesCount}`);
    } catch (error) {
      console.log('❌ Ошибка при проверке FavoriteQuestion:', error.message);
    }

    // 6. Тестируем запрос как в API
    console.log('🔍 Тестируем запрос как в API...');

    const whereConditions = {
      AND: [{ text: { not: null } }, { text: { not: { equals: '' } } }],
    };

    console.log('🔍 Условия WHERE:', JSON.stringify(whereConditions, null, 2));

    const questions = await prisma.question.findMany({
      where: whereConditions,
      orderBy: [{ createdAt: 'desc' }],
      take: 5,
      include: {
        userProgress: {
          where: {
            userId: 'test-user-id', // Тестовый ID
          },
          orderBy: {
            lastReviewed: 'desc',
          },
          take: 1,
        },
        favoriteQuestions: {
          where: {
            userId: 'test-user-id', // Тестовый ID
          },
        },
      },
    });

    console.log(`✅ Получено вопросов: ${questions.length}`);

    if (questions.length > 0) {
      console.log('📋 Первые 3 вопроса:');
      questions.slice(0, 3).forEach((q, i) => {
        console.log(`  ${i + 1}. ID: ${q.id}`);
        console.log(`     Тема: ${q.topic || 'не указана'}`);
        console.log(`     Сложность: ${q.difficulty || 'не указана'}`);
        console.log(`     Текст: ${q.text?.substring(0, 100)}...`);
        console.log(`     Создан: ${q.createdAt}`);
      });
    }

    console.log('=== ТЕСТ ЗАВЕРШЕН УСПЕШНО ===');
  } catch (error) {
    console.error('🚨 КРИТИЧЕСКАЯ ОШИБКА В ТЕСТЕ:');
    console.error('   Сообщение:', error.message);
    console.error('   Код ошибки:', error.code);
    console.error('   Стек:', error.stack);

    // Дополнительная диагностика
    if (error.code === 'P2002') {
      console.error('   Тип: Нарушение уникального ограничения');
    } else if (error.code === 'P2025') {
      console.error('   Тип: Запись не найдена');
    } else if (error.code === 'P1001') {
      console.error('   Тип: Не удается подключиться к базе данных');
    } else if (error.code === 'P1017') {
      console.error('   Тип: Сервер базы данных закрыл соединение');
    }
  } finally {
    await prisma.$disconnect();
    console.log('🔌 Соединение с базой данных закрыто');
  }
}

testFlashcardsAPI();
