const { PrismaClient } = require('@prisma/client');

async function testFlashcardsAPIFixed() {
  const prisma = new PrismaClient();

  try {
    console.log('=== ИСПРАВЛЕННЫЙ ТЕСТ API ФЛЕШ-КАРТОЧЕК ===');

    // 1. Проверяем подключение к базе данных
    console.log('🔍 Проверяем подключение к базе данных...');
    await prisma.$connect();
    console.log('✅ Подключение к базе данных успешно');

    // 2. Проверяем общее количество вопросов
    console.log('🔍 Проверяем количество вопросов...');
    const totalQuestions = await prisma.question.count();
    console.log(`📊 Общее количество вопросов: ${totalQuestions}`);

    // 3. Правильная проверка вопросов с непустым текстом
    // Поскольку text - обязательное поле, проверяем только на пустую строку
    console.log('🔍 Проверяем вопросы с непустым текстом...');
    const questionsWithText = await prisma.question.count({
      where: {
        text: {
          not: '', // Только проверяем, что не пустая строка
        },
      },
    });
    console.log(`📝 Вопросов с непустым текстом: ${questionsWithText}`);

    // 4. Проверяем вопросы с пустым текстом
    const questionsWithEmptyText = await prisma.question.count({
      where: {
        text: '',
      },
    });
    console.log(`❌ Вопросов с пустым текстом: ${questionsWithEmptyText}`);

    // 5. Тестируем правильный запрос как в API
    console.log('🔍 Тестируем исправленный запрос...');

    const whereConditions = {
      text: {
        not: '', // Исправленное условие
      },
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
        console.log(`     Длина текста: ${q.text?.length || 0} символов`);
        console.log(`     Создан: ${q.createdAt}`);
      });
    }

    // 6. Проверяем примеры вопросов с пустым текстом
    if (questionsWithEmptyText > 0) {
      console.log('❌ Примеры вопросов с пустым текстом:');
      const emptyQuestions = await prisma.question.findMany({
        where: {
          text: '',
        },
        take: 3,
        select: {
          id: true,
          text: true,
          topic: true,
          difficulty: true,
        },
      });

      emptyQuestions.forEach((q, i) => {
        console.log(
          `  ${i + 1}. ID: ${q.id}, Тема: ${q.topic || 'не указана'}, Текст: '${
            q.text
          }'`
        );
      });
    }

    console.log('=== ТЕСТ ЗАВЕРШЕН УСПЕШНО ===');
  } catch (error) {
    console.error('🚨 КРИТИЧЕСКАЯ ОШИБКА В ТЕСТЕ:');
    console.error('   Сообщение:', error.message);
    console.error('   Код ошибки:', error.code);
    console.error('   Стек:', error.stack);
  } finally {
    await prisma.$disconnect();
    console.log('🔌 Соединение с базой данных закрыто');
  }
}

testFlashcardsAPIFixed();
