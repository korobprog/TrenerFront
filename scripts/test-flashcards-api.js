const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testFlashcardsAPI() {
  try {
    console.log('🔍 Тестирование API логики флеш-карточек...\n');

    // Имитируем логику API эндпоинта
    const topic = null;
    const difficulty = null;
    const mode = 'study';
    const limit = 10;
    const excludeAnswered = false;

    // Строим условия фильтрации (как в API)
    const whereConditions = {};

    // Фильтр по теме
    if (topic) {
      whereConditions.topic = topic;
    }

    // Фильтр по сложности
    if (difficulty) {
      whereConditions.difficulty = difficulty;
    }

    // Исключаем вопросы без текста
    whereConditions.text = {
      not: '',
    };

    console.log(
      '📋 Условия фильтрации:',
      JSON.stringify(whereConditions, null, 2)
    );

    // Получаем общее количество доступных вопросов
    const totalAvailable = await prisma.question.count({
      where: whereConditions,
    });

    console.log(`📊 Общее количество доступных вопросов: ${totalAvailable}`);

    // Определяем сортировку в зависимости от режима
    let orderBy = {};
    switch (mode) {
      case 'study':
        orderBy = [{ createdAt: 'asc' }];
        break;
      case 'review':
        orderBy = [{ updatedAt: 'asc' }];
        break;
      case 'exam':
        orderBy = [{ id: 'asc' }];
        break;
      default:
        orderBy = [{ createdAt: 'asc' }];
    }

    console.log('🔄 Сортировка:', JSON.stringify(orderBy, null, 2));

    // Получаем вопросы (имитируем запрос без пользователя)
    const questions = await prisma.question.findMany({
      where: whereConditions,
      orderBy,
      take: limit,
      select: {
        id: true,
        text: true,
        topic: true,
        difficulty: true,
        tags: true,
        estimatedTime: true,
        category: true,
        answer: true,
        createdAt: true,
      },
    });

    console.log(`\n📝 Найдено вопросов: ${questions.length}`);

    if (questions.length > 0) {
      console.log('\n🔍 Первые 3 вопроса:');
      questions.slice(0, 3).forEach((question, index) => {
        console.log(`${index + 1}. ID: ${question.id}`);
        console.log(`   Текст: ${question.text?.substring(0, 80)}...`);
        console.log(`   Тема: ${question.topic || 'не указана'}`);
        console.log(`   Сложность: ${question.difficulty || 'не указана'}`);
        console.log(`   Категория: ${question.category || 'не указана'}`);
        console.log(`   Есть ответ: ${!!question.answer}`);
        console.log(`   Создан: ${question.createdAt}`);
        console.log('');
      });
    } else {
      console.log('❌ Вопросы не найдены!');
    }

    // Тестируем различные фильтры
    console.log('\n🧪 Тестирование различных фильтров:');

    // Тест 1: Фильтр по теме JavaScript
    const jsQuestions = await prisma.question.count({
      where: {
        ...whereConditions,
        topic: 'JavaScript',
      },
    });
    console.log(`   JavaScript вопросы: ${jsQuestions}`);

    // Тест 2: Фильтр по сложности easy
    const easyQuestions = await prisma.question.count({
      where: {
        ...whereConditions,
        difficulty: 'easy',
      },
    });
    console.log(`   Легкие вопросы: ${easyQuestions}`);

    // Тест 3: Фильтр по теме React
    const reactQuestions = await prisma.question.count({
      where: {
        ...whereConditions,
        topic: 'React',
      },
    });
    console.log(`   React вопросы: ${reactQuestions}`);

    // Проверяем последние добавленные вопросы
    console.log('\n🕒 Последние 5 добавленных вопросов (по дате создания):');
    const recentQuestions = await prisma.question.findMany({
      where: whereConditions,
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        text: true,
        topic: true,
        createdAt: true,
      },
    });

    recentQuestions.forEach((q, index) => {
      console.log(
        `${index + 1}. ID: ${q.id} - ${q.text?.substring(0, 60)}... (${
          q.topic
        }) - ${q.createdAt}`
      );
    });

    console.log('\n✅ Тестирование API логики завершено!');
  } catch (error) {
    console.error('❌ Ошибка при тестировании API:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testFlashcardsAPI();
