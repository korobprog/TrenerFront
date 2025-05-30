import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import prisma from '../../../lib/prisma';
import { v4 as uuidv4 } from 'uuid';

/**
 * API endpoint для получения вопросов для флеш-карточек
 * GET /api/flashcards/questions
 *
 * Параметры запроса:
 * - topic: string - тема вопросов (опционально)
 * - difficulty: string - сложность ('easy'|'medium'|'hard') (опционально)
 * - mode: string - режим ('study'|'review'|'exam') (по умолчанию 'study')
 * - limit: number - количество вопросов (по умолчанию 10, максимум 50)
 * - excludeAnswered: boolean - исключить отвеченные вопросы (по умолчанию false)
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Метод не поддерживается' });
  }

  try {
    // Проверяем авторизацию с улучшенной обработкой ошибок
    let session = null;
    let userId = null;

    try {
      session = await getServerSession(req, res, authOptions);
      console.log(
        '🔍 Результат getServerSession:',
        session ? 'сессия найдена' : 'сессия не найдена'
      );

      if (session && session.user && session.user.id) {
        userId = session.user.id;
        console.log('✅ Пользователь авторизован:', userId);
      } else {
        console.log('❌ Сессия не содержит данных пользователя');
      }
    } catch (authError) {
      console.error('🚨 Ошибка при проверке авторизации:', authError);
      // Продолжаем без авторизации для диагностики
    }

    // ВРЕМЕННО: разрешаем доступ без авторизации для диагностики
    // TODO: Вернуть проверку авторизации после исправления проблемы
    if (!session) {
      console.log(
        '⚠️ ВНИМАНИЕ: API работает без авторизации (режим диагностики)'
      );
      // return res.status(401).json({ message: 'Необходима авторизация' });
    }

    // Получаем параметры запроса
    const {
      topic,
      difficulty,
      mode = 'study',
      limit = '10',
      excludeAnswered = 'false',
    } = req.query;

    // Валидация параметров
    const limitNum = Math.min(parseInt(limit, 10) || 10, 50); // Максимум 50 вопросов
    const excludeAnsweredBool = excludeAnswered === 'true';

    // Валидация режима
    const validModes = ['study', 'review', 'exam'];
    if (!validModes.includes(mode)) {
      return res.status(400).json({
        message: 'Недопустимый режим. Допустимые значения: study, review, exam',
      });
    }

    // Валидация сложности
    const validDifficulties = ['easy', 'medium', 'hard'];
    if (difficulty && !validDifficulties.includes(difficulty)) {
      return res.status(400).json({
        message:
          'Недопустимая сложность. Допустимые значения: easy, medium, hard',
      });
    }

    // Строим условия фильтрации
    const whereConditions = {};

    // Фильтр по теме
    if (topic) {
      whereConditions.topic = topic;
    }

    // Фильтр по сложности
    if (difficulty) {
      whereConditions.difficulty = difficulty;
    }

    // Исключаем вопросы с пустым текстом (поле text обязательное в схеме)
    whereConditions.text = {
      not: {
        equals: '',
      },
    };

    // Фильтр для исключения отвеченных вопросов (только если есть авторизация)
    if (excludeAnsweredBool && userId) {
      whereConditions.NOT = {
        userProgress: {
          some: {
            userId: userId,
            status: {
              in: ['known', 'completed'],
            },
          },
        },
      };
    }

    // Определяем сортировку в зависимости от режима
    let orderBy = {};
    switch (mode) {
      case 'study':
        // Для изучения - сначала новые вопросы, затем те, что требуют повторения
        orderBy = [{ createdAt: 'desc' }];
        break;
      case 'review':
        // Для повторения - сначала те, что давно не повторялись или помечены для повторения
        orderBy = [{ updatedAt: 'asc' }];
        break;
      case 'exam':
        // Для экзамена - случайный порядок (используем модификатор ID)
        orderBy = [{ id: 'asc' }];
        break;
      default:
        orderBy = [{ createdAt: 'desc' }];
    }

    // Получаем общее количество доступных вопросов
    const totalAvailable = await prisma.question.count({
      where: whereConditions,
    });

    // Получаем вопросы (с пользовательскими данными только если есть авторизация)
    const includeUserData = userId
      ? {
          userProgress: {
            where: {
              userId: userId,
            },
            orderBy: {
              lastReviewed: 'desc',
            },
            take: 1,
          },
          favoriteQuestions: {
            where: {
              userId: userId,
            },
          },
        }
      : {};

    const questions = await prisma.question.findMany({
      where: whereConditions,
      orderBy,
      take: limitNum,
      include: includeUserData,
    });

    // Генерируем уникальный ID сессии для отслеживания прогресса
    const sessionId = uuidv4();

    // Форматируем вопросы для ответа
    const formattedQuestions = questions.map((question) => ({
      id: question.id,
      questionText: question.text,
      topic: question.topic,
      difficulty: question.difficulty,
      tags: question.tags,
      estimatedTime: question.estimatedTime,
      category: question.category,
      hasAnswer: !!question.answer, // Указываем, есть ли готовый ответ
      userProgress: question.userProgress[0] || null,
      isFavorite:
        question.favoriteQuestions && question.favoriteQuestions.length > 0,
      // Не включаем готовый ответ в ответ - он будет генерироваться отдельно
    }));

    console.log('=== ДИАГНОСТИКА ФЛЕШ-КАРТОЧЕК ===');
    console.log(`🔍 Пользователь: ${userId || 'не авторизован'}`);
    console.log(`🔍 Сессия: ${session ? 'найдена' : 'не найдена'}`);
    console.log(`🔍 Режим: ${mode}`);
    console.log(`🔍 Фильтры:`, {
      topic,
      difficulty,
      excludeAnswered: excludeAnsweredBool,
    });
    console.log(`🔍 Условия WHERE:`, JSON.stringify(whereConditions, null, 2));
    console.log(`🔍 Сортировка:`, JSON.stringify(orderBy, null, 2));
    console.log(`🔍 Лимит: ${limitNum}`);
    console.log(`🔍 Всего доступных вопросов: ${totalAvailable}`);
    console.log(`🔍 Получено вопросов: ${formattedQuestions.length}`);
    console.log(
      `🔍 Первые 3 вопроса:`,
      formattedQuestions.slice(0, 3).map((q) => ({
        id: q.id,
        text: q.questionText?.substring(0, 50) + '...',
        topic: q.topic,
        difficulty: q.difficulty,
      }))
    );
    console.log('=== КОНЕЦ ДИАГНОСТИКИ ===');

    // Проверяем, есть ли вопросы для возврата
    if (formattedQuestions.length === 0) {
      console.log('⚠️ Не найдено вопросов с текущими фильтрами');

      // Пытаемся найти вопросы без фильтров
      const fallbackQuestions = await prisma.question.findMany({
        where: {
          text: { not: '' },
        },
        orderBy: { createdAt: 'desc' },
        take: Math.min(limitNum, 5), // Ограничиваем до 5 вопросов для fallback
        include: userId
          ? {
              userProgress: {
                where: {
                  userId: userId,
                },
                orderBy: {
                  lastReviewed: 'desc',
                },
                take: 1,
              },
              favoriteQuestions: {
                where: {
                  userId: userId,
                },
              },
            }
          : {},
      });

      const fallbackFormatted = fallbackQuestions.map((question) => ({
        id: question.id,
        questionText: question.text,
        topic: question.topic,
        difficulty: question.difficulty,
        tags: question.tags,
        estimatedTime: question.estimatedTime,
        category: question.category,
        hasAnswer: !!question.answer,
        userProgress: question.userProgress[0] || null,
        isFavorite:
          question.favoriteQuestions && question.favoriteQuestions.length > 0,
      }));

      if (fallbackFormatted.length > 0) {
        console.log(`✅ Найдено ${fallbackFormatted.length} fallback вопросов`);
        return res.status(200).json({
          questions: fallbackFormatted,
          sessionId,
          totalAvailable: fallbackFormatted.length,
          mode,
          filters: {
            topic,
            difficulty,
            excludeAnswered: excludeAnsweredBool,
          },
          fallback: true,
          message:
            'Показаны общие вопросы, так как с выбранными фильтрами ничего не найдено',
        });
      }
    }

    return res.status(200).json({
      questions: formattedQuestions,
      sessionId,
      totalAvailable,
      mode,
      filters: {
        topic,
        difficulty,
        excludeAnswered: excludeAnsweredBool,
      },
    });
  } catch (error) {
    console.error('=== ОШИБКА В API ФЛЕШ-КАРТОЧЕК ===');
    console.error('🚨 Детали ошибки:', error);
    console.error('🚨 Стек ошибки:', error.stack);
    console.error('🚨 Параметры запроса:', req.query);
    console.error('🚨 Пользователь:', userId || 'не авторизован');
    console.error('=== КОНЕЦ ОШИБКИ ===');

    return res.status(500).json({
      message: 'Внутренняя ошибка сервера',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  } finally {
    await prisma.$disconnect();
  }
}
