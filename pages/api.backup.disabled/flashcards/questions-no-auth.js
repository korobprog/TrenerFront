import prisma from '../../../lib/prisma';
import { v4 as uuidv4 } from 'uuid';

/**
 * API endpoint для получения вопросов для флеш-карточек БЕЗ АВТОРИЗАЦИИ (для тестирования)
 * GET /api/flashcards/questions-no-auth
 *
 * Параметры запроса:
 * - topic: string - тема вопросов (опционально)
 * - difficulty: string - сложность ('easy'|'medium'|'hard') (опционально)
 * - mode: string - режим ('study'|'review'|'exam') (по умолчанию 'study')
 * - limit: number - количество вопросов (по умолчанию 10, максимум 50)
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Метод не поддерживается' });
  }

  try {
    console.log('=== ТЕСТ API ФЛЕШКАРТ БЕЗ АВТОРИЗАЦИИ ===');

    // Получаем параметры запроса
    const { topic, difficulty, mode = 'study', limit = '10' } = req.query;

    // Валидация параметров
    const limitNum = Math.min(parseInt(limit, 10) || 10, 50); // Максимум 50 вопросов

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

    // Исключаем вопросы с пустым текстом
    whereConditions.text = {
      not: {
        equals: '',
      },
    };

    // Определяем сортировку в зависимости от режима
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

    // Получаем общее количество доступных вопросов
    const totalAvailable = await prisma.question.count({
      where: whereConditions,
    });

    console.log('🔍 Условия поиска:', JSON.stringify(whereConditions, null, 2));
    console.log('🔍 Найдено вопросов:', totalAvailable);

    // Получаем вопросы (без связанных данных пользователя)
    const questions = await prisma.question.findMany({
      where: whereConditions,
      orderBy,
      take: limitNum,
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
      hasAnswer: !!question.answer,
      // Без пользовательских данных
      userProgress: null,
      isFavorite: false,
    }));

    console.log('✅ Успешно получено вопросов:', formattedQuestions.length);
    console.log(
      '🔍 Первые 3 вопроса:',
      formattedQuestions.slice(0, 3).map((q) => ({
        id: q.id,
        text: q.questionText?.substring(0, 50) + '...',
        topic: q.topic,
        difficulty: q.difficulty,
      }))
    );

    // Проверяем, есть ли вопросы для возврата
    if (formattedQuestions.length === 0) {
      console.log('⚠️ Не найдено вопросов с текущими фильтрами');

      // Пытаемся найти вопросы без фильтров
      const fallbackQuestions = await prisma.question.findMany({
        where: {
          text: { not: '' },
        },
        orderBy: { createdAt: 'desc' },
        take: Math.min(limitNum, 5),
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
        userProgress: null,
        isFavorite: false,
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
          },
          fallback: true,
          message:
            'Показаны общие вопросы, так как с выбранными фильтрами ничего не найдено',
          authRequired: false,
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
      },
      authRequired: false,
    });
  } catch (error) {
    console.error('=== ОШИБКА В API ФЛЕШ-КАРТОЧЕК БЕЗ АВТОРИЗАЦИИ ===');
    console.error('🚨 Детали ошибки:', error);
    console.error('🚨 Стек ошибки:', error.stack);
    console.error('🚨 Параметры запроса:', req.query);
    console.error('=== КОНЕЦ ОШИБКИ ===');

    return res.status(500).json({
      message: 'Внутренняя ошибка сервера',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  } finally {
    await prisma.$disconnect();
  }
}
