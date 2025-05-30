const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Темы и сложности для разных типов вопросов
const topicsAndDifficulties = [
  {
    keywords: ['javascript', 'js', 'замыкание', 'функция', 'переменная'],
    topic: 'JavaScript',
    difficulty: 'medium',
  },
  {
    keywords: ['react', 'компонент', 'jsx', 'хук'],
    topic: 'React',
    difficulty: 'medium',
  },
  {
    keywords: ['css', 'стиль', 'селектор', 'flexbox', 'grid'],
    topic: 'CSS',
    difficulty: 'easy',
  },
  {
    keywords: ['html', 'тег', 'элемент', 'атрибут'],
    topic: 'HTML',
    difficulty: 'easy',
  },
  {
    keywords: ['node', 'сервер', 'express', 'api'],
    topic: 'Node.js',
    difficulty: 'hard',
  },
  {
    keywords: ['база данных', 'sql', 'запрос', 'таблица'],
    topic: 'Базы данных',
    difficulty: 'medium',
  },
  {
    keywords: ['алгоритм', 'сложность', 'структура данных'],
    topic: 'Алгоритмы',
    difficulty: 'hard',
  },
  {
    keywords: ['git', 'версия', 'коммит', 'ветка'],
    topic: 'Git',
    difficulty: 'easy',
  },
  {
    keywords: ['тест', 'unit', 'интеграционный'],
    topic: 'Тестирование',
    difficulty: 'medium',
  },
  {
    keywords: ['безопасность', 'xss', 'csrf', 'аутентификация'],
    topic: 'Безопасность',
    difficulty: 'hard',
  },
];

function determineTopicAndDifficulty(text) {
  const lowerText = text.toLowerCase();

  for (const item of topicsAndDifficulties) {
    if (item.keywords.some((keyword) => lowerText.includes(keyword))) {
      return { topic: item.topic, difficulty: item.difficulty };
    }
  }

  // Определяем сложность по длине вопроса и сложности слов
  const wordCount = text.split(' ').length;
  let difficulty = 'easy';

  if (
    wordCount > 20 ||
    lowerText.includes('почему') ||
    lowerText.includes('объясните')
  ) {
    difficulty = 'medium';
  }
  if (
    wordCount > 30 ||
    lowerText.includes('реализуйте') ||
    lowerText.includes('оптимизируйте')
  ) {
    difficulty = 'hard';
  }

  return { topic: 'Общие вопросы', difficulty };
}

async function updateQuestionsMetadata() {
  console.log('🔄 Обновление метаданных вопросов...\n');

  try {
    // Получаем все вопросы без темы или сложности
    const questions = await prisma.question.findMany({
      where: {
        OR: [
          { topic: null },
          { difficulty: null },
          { topic: '' },
          { difficulty: '' },
        ],
      },
    });

    console.log(`📝 Найдено вопросов для обновления: ${questions.length}\n`);

    let updatedCount = 0;
    const topicStats = {};
    const difficultyStats = {};

    for (const question of questions) {
      const { topic, difficulty } = determineTopicAndDifficulty(question.text);

      await prisma.question.update({
        where: { id: question.id },
        data: {
          topic,
          difficulty,
        },
      });

      // Статистика
      topicStats[topic] = (topicStats[topic] || 0) + 1;
      difficultyStats[difficulty] = (difficultyStats[difficulty] || 0) + 1;

      updatedCount++;
      console.log(
        `✅ Обновлен вопрос ${question.id}: ${topic} (${difficulty})`
      );
    }

    console.log(`\n🎉 Обновлено вопросов: ${updatedCount}`);

    console.log('\n📊 Статистика по темам:');
    Object.entries(topicStats).forEach(([topic, count]) => {
      console.log(`   ${topic}: ${count} вопросов`);
    });

    console.log('\n📊 Статистика по сложности:');
    Object.entries(difficultyStats).forEach(([difficulty, count]) => {
      console.log(`   ${difficulty}: ${count} вопросов`);
    });

    // Проверяем итоговое состояние
    console.log('\n🔍 Финальная проверка...');
    const totalQuestions = await prisma.question.count();
    const questionsWithTopic = await prisma.question.count({
      where: { topic: { not: null } },
    });
    const questionsWithDifficulty = await prisma.question.count({
      where: { difficulty: { not: null } },
    });

    console.log(`   Всего вопросов: ${totalQuestions}`);
    console.log(`   С темами: ${questionsWithTopic}`);
    console.log(`   Со сложностью: ${questionsWithDifficulty}`);
  } catch (error) {
    console.error('❌ Ошибка при обновлении:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

updateQuestionsMetadata();
