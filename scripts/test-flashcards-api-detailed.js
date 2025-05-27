const { PrismaClient } = require('@prisma/client');
const fetch = require('node-fetch');

const prisma = new PrismaClient();

async function testFlashcardsAPI() {
  console.log('=== ДЕТАЛЬНАЯ ДИАГНОСТИКА API ФЛЕШ-КАРТОЧЕК ===');

  try {
    // 1. Проверяем подключение к базе данных
    console.log('\n1. Проверка подключения к базе данных...');
    const questionCount = await prisma.question.count();
    console.log(
      `✅ Подключение к БД успешно. Всего вопросов: ${questionCount}`
    );

    if (questionCount === 0) {
      console.log('❌ В базе данных нет вопросов!');
      return;
    }

    // 2. Проверяем структуру вопросов
    console.log('\n2. Проверка структуры вопросов...');
    const sampleQuestions = await prisma.question.findMany({
      take: 5,
      select: {
        id: true,
        text: true,
        question: true, // дублированное поле
        topic: true,
        difficulty: true,
        answer: true,
        createdAt: true,
      },
    });

    console.log('Примеры вопросов из БД:');
    sampleQuestions.forEach((q, index) => {
      console.log(`  ${index + 1}. ID: ${q.id}`);
      console.log(`     text: "${q.text?.substring(0, 50)}..."`);
      console.log(`     question: "${q.question?.substring(0, 50)}..."`);
      console.log(`     topic: ${q.topic || 'null'}`);
      console.log(`     difficulty: ${q.difficulty || 'null'}`);
      console.log(`     hasAnswer: ${!!q.answer}`);
      console.log('');
    });

    // 3. Проверяем наличие пустых текстов
    console.log('\n3. Проверка на пустые тексты...');
    const emptyTextCount = await prisma.question.count({
      where: {
        OR: [{ text: null }, { text: '' }, { text: { equals: '' } }],
      },
    });
    console.log(`Вопросов с пустым text: ${emptyTextCount}`);

    const emptyQuestionCount = await prisma.question.count({
      where: {
        OR: [
          { question: null },
          { question: '' },
          { question: { equals: '' } },
        ],
      },
    });
    console.log(`Вопросов с пустым question: ${emptyQuestionCount}`);

    // 4. Проверяем фильтры
    console.log('\n4. Проверка фильтров...');
    const topicCounts = await prisma.question.groupBy({
      by: ['topic'],
      _count: {
        id: true,
      },
    });
    console.log('Распределение по темам:');
    topicCounts.forEach((t) => {
      console.log(`  ${t.topic || 'null'}: ${t._count.id} вопросов`);
    });

    const difficultyCounts = await prisma.question.groupBy({
      by: ['difficulty'],
      _count: {
        id: true,
      },
    });
    console.log('Распределение по сложности:');
    difficultyCounts.forEach((d) => {
      console.log(`  ${d.difficulty || 'null'}: ${d._count.id} вопросов`);
    });

    // 5. Тестируем запрос как в API
    console.log('\n5. Тестирование запроса как в API...');
    const whereConditions = {
      text: {
        not: {
          in: [null, ''],
        },
      },
    };

    console.log('WHERE условия:', JSON.stringify(whereConditions, null, 2));

    const apiStyleQuestions = await prisma.question.findMany({
      where: whereConditions,
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        userProgress: {
          where: {
            userId: 'test-user-id', // фиктивный ID для теста
          },
          orderBy: {
            lastReviewed: 'desc',
          },
          take: 1,
        },
        favoriteQuestions: {
          where: {
            userId: 'test-user-id', // фиктивный ID для теста
          },
        },
      },
    });

    console.log(
      `Результат API-стиль запроса: ${apiStyleQuestions.length} вопросов`
    );

    if (apiStyleQuestions.length > 0) {
      console.log('Первые 3 результата:');
      apiStyleQuestions.slice(0, 3).forEach((q, index) => {
        console.log(
          `  ${index + 1}. ID: ${q.id}, text: "${q.text?.substring(0, 50)}..."`
        );
      });
    } else {
      console.log('❌ API-стиль запрос не вернул результатов!');

      // Дополнительная диагностика
      console.log('\n🔍 Дополнительная диагностика...');
      const allQuestions = await prisma.question.findMany({
        take: 5,
        select: {
          id: true,
          text: true,
          question: true,
        },
      });

      console.log('Проверка каждого вопроса на соответствие условиям:');
      allQuestions.forEach((q) => {
        const textValid = q.text && q.text.trim() !== '';
        const questionValid = q.question && q.question.trim() !== '';
        console.log(
          `  ID ${q.id}: text="${q.text}" (valid: ${textValid}), question="${q.question}" (valid: ${questionValid})`
        );
      });
    }

    // 6. Проверяем связанные таблицы
    console.log('\n6. Проверка связанных таблиц...');
    const userProgressCount = await prisma.userProgress.count();
    console.log(`Записей в UserProgress: ${userProgressCount}`);

    const favoriteQuestionsCount = await prisma.userFavoriteQuestion.count();
    console.log(`Записей в UserFavoriteQuestion: ${favoriteQuestionsCount}`);

    console.log('\n✅ Диагностика завершена');
  } catch (error) {
    console.error('❌ Ошибка во время диагностики:', error);
    console.error('Стек ошибки:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testFlashcardsAPI();
