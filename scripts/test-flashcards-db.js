const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testFlashcardsDatabase() {
  try {
    console.log('🔍 Диагностика базы данных флеш-карточек...\n');

    // 1. Проверяем общее количество вопросов
    const totalQuestions = await prisma.question.count();
    console.log(`📊 Общее количество вопросов в базе: ${totalQuestions}`);

    if (totalQuestions === 0) {
      console.log('❌ В базе данных нет вопросов!');
      return;
    }

    // 2. Проверяем последние добавленные вопросы
    const recentQuestions = await prisma.question.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        text: true,
        topic: true,
        difficulty: true,
        category: true,
        createdAt: true,
      },
    });

    console.log('\n📝 Последние 5 добавленных вопросов:');
    recentQuestions.forEach((q, index) => {
      console.log(`${index + 1}. ID: ${q.id}`);
      console.log(`   Текст: ${q.text?.substring(0, 80)}...`);
      console.log(`   Тема: ${q.topic || 'не указана'}`);
      console.log(`   Сложность: ${q.difficulty || 'не указана'}`);
      console.log(`   Категория: ${q.category || 'не указана'}`);
      console.log(`   Создан: ${q.createdAt}`);
      console.log('');
    });

    // 3. Проверяем распределение по темам
    const topicStats = await prisma.question.groupBy({
      by: ['topic'],
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
    });

    console.log('📈 Распределение вопросов по темам:');
    topicStats.forEach((stat) => {
      console.log(`   ${stat.topic || 'Без темы'}: ${stat._count.id} вопросов`);
    });

    // 4. Проверяем распределение по сложности
    const difficultyStats = await prisma.question.groupBy({
      by: ['difficulty'],
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
    });

    console.log('\n🎯 Распределение вопросов по сложности:');
    difficultyStats.forEach((stat) => {
      console.log(
        `   ${stat.difficulty || 'Без сложности'}: ${stat._count.id} вопросов`
      );
    });

    // 5. Проверяем вопросы с пустым текстом
    const emptyTextQuestions = await prisma.question.count({
      where: {
        OR: [{ text: null }, { text: '' }],
      },
    });

    console.log(`\n⚠️  Вопросы с пустым текстом: ${emptyTextQuestions}`);

    // 6. Тестируем API запрос (имитируем)
    console.log('\n🔧 Тестирование условий фильтрации API:');

    const apiTestConditions = {
      text: {
        not: null,
      },
    };

    const apiFilteredQuestions = await prisma.question.count({
      where: apiTestConditions,
    });

    console.log(`   Вопросы с непустым текстом: ${apiFilteredQuestions}`);

    // 7. Проверяем недавно добавленные вопросы (за последние 24 часа)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const recentlyAdded = await prisma.question.count({
      where: {
        createdAt: {
          gte: yesterday,
        },
      },
    });

    console.log(
      `\n🕒 Вопросы, добавленные за последние 24 часа: ${recentlyAdded}`
    );

    if (recentlyAdded > 0) {
      const newQuestions = await prisma.question.findMany({
        where: {
          createdAt: {
            gte: yesterday,
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 3,
        select: {
          id: true,
          text: true,
          createdAt: true,
        },
      });

      console.log('\n🆕 Новые вопросы:');
      newQuestions.forEach((q, index) => {
        console.log(
          `${index + 1}. ID: ${q.id} - ${q.text?.substring(0, 60)}... (${
            q.createdAt
          })`
        );
      });
    }

    console.log('\n✅ Диагностика завершена!');
  } catch (error) {
    console.error('❌ Ошибка при диагностике базы данных:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testFlashcardsDatabase();
