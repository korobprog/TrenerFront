const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Имитируем функциональность API напрямую
async function testApiLogic() {
  console.log('🚀 Тестирование логики API флеш-карточек напрямую');
  console.log('='.repeat(60));

  try {
    // Имитируем различные сценарии запросов
    const testCases = [
      {
        name: 'Базовый запрос',
        params: { limit: 10, mode: 'study' },
      },
      {
        name: 'Фильтр по сложности easy',
        params: { difficulty: 'easy', limit: 5, mode: 'study' },
      },
      {
        name: 'Фильтр по сложности medium',
        params: { difficulty: 'medium', limit: 5, mode: 'study' },
      },
      {
        name: 'Фильтр по теме JavaScript',
        params: { topic: 'JavaScript', limit: 5, mode: 'study' },
      },
      {
        name: 'Режим review',
        params: { mode: 'review', limit: 5 },
      },
      {
        name: 'Режим exam',
        params: { mode: 'exam', limit: 5 },
      },
      {
        name: 'Большой лимит (должен ограничиться до 50)',
        params: { limit: 100, mode: 'study' },
      },
    ];

    for (const testCase of testCases) {
      console.log(`\n🔬 Тест: ${testCase.name}`);
      console.log(`🎯 Параметры:`, testCase.params);

      const {
        topic,
        difficulty,
        mode = 'study',
        limit = '10',
      } = testCase.params;

      // Валидация параметров (как в API)
      const limitNum = Math.min(parseInt(limit, 10) || 10, 50);

      // Строим условия фильтрации (исправленная логика)
      const whereConditions = {};

      if (topic) {
        whereConditions.topic = topic;
      }

      if (difficulty) {
        whereConditions.difficulty = difficulty;
      }

      // Исключаем вопросы без текста (исправленный синтаксис)
      whereConditions.AND = [
        { text: { not: null } },
        { text: { not: { equals: '' } } },
      ];

      // Определяем сортировку
      let orderBy = {};
      switch (mode) {
        case 'study':
          orderBy = [{ createdAt: 'desc' }];
          break;
        case 'review':
          orderBy = [{ updatedAt: 'asc' }];
          break;
        case 'exam':
          orderBy = [{ id: 'asc' }];
          break;
        default:
          orderBy = [{ createdAt: 'desc' }];
      }

      console.log(
        `🔍 WHERE условия:`,
        JSON.stringify(whereConditions, null, 2)
      );
      console.log(`🔍 Сортировка:`, JSON.stringify(orderBy, null, 2));
      console.log(`🔍 Лимит: ${limitNum}`);

      try {
        // Получаем общее количество доступных вопросов
        const totalAvailable = await prisma.question.count({
          where: whereConditions,
        });

        console.log(`📊 Всего доступных вопросов: ${totalAvailable}`);

        // Получаем вопросы
        const questions = await prisma.question.findMany({
          where: whereConditions,
          orderBy,
          take: limitNum,
          select: {
            id: true,
            text: true,
            topic: true,
            difficulty: true,
            tags: true,
            estimatedTime: true,
            category: true,
            answer: true,
          },
        });

        console.log(`✅ Получено вопросов: ${questions.length}`);

        if (questions.length > 0) {
          console.log(`📋 Первые 3 вопроса:`);
          questions.slice(0, 3).forEach((q, i) => {
            console.log(
              `  ${i + 1}. [${q.difficulty}] ${q.topic}: ${q.text?.substring(
                0,
                50
              )}...`
            );
          });

          // Проверяем фильтрацию
          if (difficulty) {
            const wrongDifficulty = questions.find(
              (q) => q.difficulty !== difficulty
            );
            if (wrongDifficulty) {
              console.log(
                `❌ Ошибка фильтрации: найден вопрос с неправильной сложностью ${wrongDifficulty.difficulty}`
              );
            } else {
              console.log(`✅ Фильтрация по сложности работает корректно`);
            }
          }

          if (topic) {
            const wrongTopic = questions.find((q) => q.topic !== topic);
            if (wrongTopic) {
              console.log(
                `❌ Ошибка фильтрации: найден вопрос с неправильной темой ${wrongTopic.topic}`
              );
            } else {
              console.log(`✅ Фильтрация по теме работает корректно`);
            }
          }

          // Проверяем, что нет пустых текстов
          const emptyText = questions.find(
            (q) => !q.text || q.text.trim() === ''
          );
          if (emptyText) {
            console.log(
              `❌ КРИТИЧЕСКАЯ ОШИБКА: найден вопрос с пустым текстом! ID: ${emptyText.id}`
            );
          } else {
            console.log(`✅ Все вопросы имеют текст (исправление работает)`);
          }
        } else {
          console.log(`⚠️ Не найдено вопросов с данными фильтрами`);

          // Проверяем fallback логику
          console.log(`🔄 Тестируем fallback логику...`);
          const fallbackQuestions = await prisma.question.findMany({
            where: {
              AND: [{ text: { not: null } }, { text: { not: '' } }],
            },
            orderBy: { createdAt: 'desc' },
            take: Math.min(limitNum, 5),
            select: {
              id: true,
              text: true,
              topic: true,
              difficulty: true,
            },
          });

          if (fallbackQuestions.length > 0) {
            console.log(
              `✅ Fallback логика работает: найдено ${fallbackQuestions.length} общих вопросов`
            );
          } else {
            console.log(
              `❌ Fallback логика не работает: не найдено общих вопросов`
            );
          }
        }
      } catch (error) {
        console.log(`❌ ОШИБКА ВЫПОЛНЕНИЯ ЗАПРОСА:`, error.message);
        console.log(`🔧 Стек ошибки:`, error.stack);
      }
    }

    // Дополнительные проверки
    console.log('\n🔍 ДОПОЛНИТЕЛЬНЫЕ ПРОВЕРКИ');
    console.log('='.repeat(40));

    // Проверяем, есть ли вопросы с пустым текстом
    console.log('\n📊 Проверка вопросов с пустым текстом...');
    try {
      const questionsWithNullText = await prisma.question.count({
        where: { text: null },
      });

      const questionsWithEmptyText = await prisma.question.count({
        where: { text: '' },
      });

      console.log(`📊 Вопросов с text = null: ${questionsWithNullText}`);
      console.log(`📊 Вопросов с text = '': ${questionsWithEmptyText}`);

      if (questionsWithNullText === 0 && questionsWithEmptyText === 0) {
        console.log(`✅ Отлично! Нет вопросов с пустым текстом`);
      } else {
        console.log(
          `⚠️ Найдены вопросы с пустым текстом - это может влиять на результаты`
        );
      }
    } catch (error) {
      console.log(`❌ Ошибка проверки пустых текстов:`, error.message);
    }

    // Проверяем исправленный синтаксис AND условий
    console.log('\n🔧 Проверка исправленного синтаксиса Prisma...');
    try {
      const validQuestions = await prisma.question.count({
        where: {
          AND: [{ text: { not: null } }, { text: { not: '' } }],
        },
      });
      console.log(
        `✅ Исправленный синтаксис работает! Найдено ${validQuestions} валидных вопросов`
      );
    } catch (error) {
      console.log(
        `❌ КРИТИЧЕСКАЯ ОШИБКА: исправленный синтаксис не работает!`,
        error.message
      );
    }
  } catch (error) {
    console.error('💥 Критическая ошибка тестирования:', error);
  }
}

// Запуск тестирования
testApiLogic()
  .then(() => {
    console.log('\n' + '='.repeat(60));
    console.log('📊 ИТОГОВЫЕ ВЫВОДЫ');
    console.log('='.repeat(60));
    console.log('✅ Тестирование логики API завершено');
    console.log(
      '📝 Если все тесты прошли успешно - исправление работает корректно'
    );
    console.log('🔧 Если есть ошибки - требуется дополнительная диагностика');
  })
  .catch((error) => {
    console.error('💥 Критическая ошибка:', error);
  })
  .finally(async () => {
    await prisma.$disconnect();
    console.log('\n🔌 Подключение к БД закрыто');
  });
