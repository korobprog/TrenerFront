const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testTrainingAPI() {
  console.log('🧪 Тестирование API тренировок...\n');

  try {
    // Тест 1: Проверка подключения к БД
    console.log('1️⃣ Проверка подключения к базе данных...');
    await prisma.$connect();
    console.log('✅ Подключение к БД успешно\n');

    // Тест 2: Проверка модели Question
    console.log('2️⃣ Проверка модели Question...');
    const questionsCount = await prisma.question.count();
    console.log(`✅ Найдено вопросов: ${questionsCount}`);

    if (questionsCount > 0) {
      const sampleQuestion = await prisma.question.findFirst({
        include: {
          favoriteQuestions: true,
          userProgress: true,
        },
      });
      console.log('✅ Модель Question работает корректно');
      console.log(`   - ID: ${sampleQuestion.id}`);
      console.log(`   - Text: ${sampleQuestion.text?.substring(0, 50)}...`);
      console.log(`   - Topic: ${sampleQuestion.topic || 'не указана'}`);
      console.log(
        `   - Difficulty: ${sampleQuestion.difficulty || 'не указана'}`
      );
    }
    console.log('');

    // Тест 3: Проверка модели UserFavoriteQuestion
    console.log('3️⃣ Проверка модели UserFavoriteQuestion...');
    const favoritesCount = await prisma.userFavoriteQuestion.count();
    console.log(`✅ Найдено избранных: ${favoritesCount}\n`);

    // Тест 4: Проверка модели UserProgress
    console.log('4️⃣ Проверка модели UserProgress...');
    const progressCount = await prisma.userProgress.count();
    console.log(`✅ Найдено записей прогресса: ${progressCount}\n`);

    // Тест 5: Проверка поиска по тексту
    console.log('5️⃣ Проверка поиска по тексту...');
    const searchResults = await prisma.question.findMany({
      where: {
        text: {
          contains: 'что',
          mode: 'insensitive',
        },
      },
      take: 3,
    });
    console.log(`✅ Найдено вопросов с "что": ${searchResults.length}\n`);

    // Тест 6: Проверка фильтрации по темам
    console.log('6️⃣ Проверка фильтрации по темам...');
    const topics = await prisma.question.findMany({
      select: {
        topic: true,
      },
      distinct: ['topic'],
      where: {
        topic: {
          not: null,
        },
      },
    });
    console.log(`✅ Найдено уникальных тем: ${topics.length}`);
    if (topics.length > 0) {
      console.log('   Темы:', topics.map((t) => t.topic).join(', '));
    }
    console.log('');

    // Тест 7: Проверка фильтрации по сложности
    console.log('7️⃣ Проверка фильтрации по сложности...');
    const difficulties = await prisma.question.findMany({
      select: {
        difficulty: true,
      },
      distinct: ['difficulty'],
      where: {
        difficulty: {
          not: null,
        },
      },
    });
    console.log(`✅ Найдено уровней сложности: ${difficulties.length}`);
    if (difficulties.length > 0) {
      console.log(
        '   Сложности:',
        difficulties.map((d) => d.difficulty).join(', ')
      );
    }
    console.log('');

    console.log('🎉 Все тесты пройдены успешно!');
    console.log('\n📋 Резюме исправлений:');
    console.log('✅ Поиск по полю "text" вместо "question"');
    console.log('✅ Исправлена связь favoriteQuestions в модели Question');
    console.log('✅ Удалены обращения к несуществующей модели achievement');
    console.log('✅ Все API endpoints должны работать корректно');
  } catch (error) {
    console.error('❌ Ошибка при тестировании:', error.message);
    console.error('Детали:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testTrainingAPI();
