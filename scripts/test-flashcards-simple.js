const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testFlashcardsSimple() {
  console.log('=== УПРОЩЕННАЯ ДИАГНОСТИКА API ФЛЕШ-КАРТОЧЕК ===');

  try {
    // 1. Проверяем общее количество вопросов
    console.log('\n1. Общая статистика...');
    const totalQuestions = await prisma.question.count();
    console.log(`Всего вопросов в БД: ${totalQuestions}`);

    // 2. Проверяем вопросы с пустым text
    console.log('\n2. Проверка пустых текстов...');
    const questionsWithEmptyText = await prisma.question.findMany({
      where: {
        OR: [{ text: null }, { text: '' }],
      },
      select: {
        id: true,
        text: true,
        question: true,
      },
    });
    console.log(`Вопросов с пустым text: ${questionsWithEmptyText.length}`);

    // 3. Проверяем условие фильтрации как в API
    console.log('\n3. Тестирование условий фильтрации API...');
    const apiFilterConditions = {
      text: {
        not: {
          in: [null, ''],
        },
      },
    };

    const filteredQuestions = await prisma.question.findMany({
      where: apiFilterConditions,
      take: 5,
      select: {
        id: true,
        text: true,
        topic: true,
        difficulty: true,
      },
    });

    console.log(`Вопросов после фильтрации API: ${filteredQuestions.length}`);

    if (filteredQuestions.length === 0) {
      console.log('❌ ПРОБЛЕМА: API фильтр не возвращает вопросы!');

      // Проверяем альтернативные условия
      console.log('\n🔍 Проверка альтернативных условий...');

      const alternativeFilter1 = await prisma.question.findMany({
        where: {
          text: {
            not: null,
          },
        },
        take: 5,
        select: { id: true, text: true },
      });
      console.log(
        `С условием "text not null": ${alternativeFilter1.length} вопросов`
      );

      const alternativeFilter2 = await prisma.question.findMany({
        where: {
          text: {
            not: '',
          },
        },
        take: 5,
        select: { id: true, text: true },
      });
      console.log(
        `С условием "text not empty": ${alternativeFilter2.length} вопросов`
      );

      const alternativeFilter3 = await prisma.question.findMany({
        where: {
          AND: [{ text: { not: null } }, { text: { not: '' } }],
        },
        take: 5,
        select: { id: true, text: true },
      });
      console.log(
        `С условием AND (not null AND not empty): ${alternativeFilter3.length} вопросов`
      );
    } else {
      console.log('✅ API фильтр работает корректно');
      console.log('Примеры отфильтрованных вопросов:');
      filteredQuestions.forEach((q, index) => {
        console.log(
          `  ${index + 1}. ID: ${q.id}, text: "${q.text?.substring(0, 50)}..."`
        );
      });
    }

    // 4. Проверяем полный запрос как в API
    console.log('\n4. Полный тест API запроса...');
    const fullApiQuery = await prisma.question.findMany({
      where: apiFilterConditions,
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        userProgress: {
          where: {
            userId: 'test-user-id',
          },
          orderBy: {
            lastReviewed: 'desc',
          },
          take: 1,
        },
        favoriteQuestions: {
          where: {
            userId: 'test-user-id',
          },
        },
      },
    });

    console.log(`Полный API запрос вернул: ${fullApiQuery.length} вопросов`);

    // 5. Проверяем первые несколько вопросов детально
    console.log('\n5. Детальная проверка первых вопросов...');
    const firstQuestions = await prisma.question.findMany({
      take: 3,
      select: {
        id: true,
        text: true,
        question: true,
        topic: true,
        difficulty: true,
      },
    });

    firstQuestions.forEach((q, index) => {
      console.log(`\nВопрос ${index + 1}:`);
      console.log(`  ID: ${q.id}`);
      console.log(`  text: "${q.text}"`);
      console.log(`  question: "${q.question}"`);
      console.log(`  topic: ${q.topic}`);
      console.log(`  difficulty: ${q.difficulty}`);
      console.log(`  text пустой: ${!q.text || q.text.trim() === ''}`);
      console.log(`  text null: ${q.text === null}`);
      console.log(`  text undefined: ${q.text === undefined}`);
    });

    console.log('\n✅ Диагностика завершена');
  } catch (error) {
    console.error('❌ Ошибка во время диагностики:', error);
    console.error('Стек ошибки:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testFlashcardsSimple();
