import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import prisma from '../../../lib/prisma';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Метод не поддерживается' });
  }

  try {
    // Проверяем авторизацию
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ message: 'Необходима авторизация' });
    }

    // Получаем параметры запроса
    const {
      topic = 'all',
      difficulty = 'all',
      status = 'all',
      search = '',
      mode = 'study',
      page = '1',
      limit = '10',
    } = req.query;

    // Преобразуем параметры
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const offset = (pageNum - 1) * limitNum;

    // Строим условия фильтрации
    const whereConditions = {};

    // Фильтр по теме
    if (topic !== 'all') {
      whereConditions.topic = topic;
    }

    // Фильтр по сложности
    if (difficulty !== 'all') {
      whereConditions.difficulty = difficulty;
    }

    // Поиск по тексту
    if (search) {
      whereConditions.OR = [
        { text: { contains: search, mode: 'insensitive' } },
        { answer: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Фильтр по статусу (на основе прогресса пользователя)
    let progressFilter = {};
    if (status !== 'all') {
      switch (status) {
        case 'new':
          // Вопросы, на которые пользователь еще не отвечал
          progressFilter = {
            NOT: {
              userProgress: {
                some: {
                  userId: session.user.id,
                },
              },
            },
          };
          break;
        case 'known':
          // Вопросы, на которые пользователь ответил правильно
          progressFilter = {
            userProgress: {
              some: {
                userId: session.user.id,
                isCorrect: true,
              },
            },
          };
          break;
        case 'unknown':
          // Вопросы, на которые пользователь ответил неправильно
          progressFilter = {
            userProgress: {
              some: {
                userId: session.user.id,
                isCorrect: false,
              },
            },
          };
          break;
        case 'repeat':
          // Вопросы, помеченные для повторения
          progressFilter = {
            userProgress: {
              some: {
                userId: session.user.id,
                needsReview: true,
              },
            },
          };
          break;
        case 'favorites':
          // Избранные вопросы
          progressFilter = {
            favoriteQuestions: {
              some: {
                userId: session.user.id,
              },
            },
          };
          break;
      }
    }

    // Объединяем условия
    const finalWhereConditions = {
      ...whereConditions,
      ...progressFilter,
    };

    // Определяем сортировку в зависимости от режима
    let orderBy = {};
    switch (mode) {
      case 'study':
        // Для изучения - сначала новые вопросы
        orderBy = { createdAt: 'asc' };
        break;
      case 'review':
        // Для повторения - сначала те, что давно не повторялись
        orderBy = { updatedAt: 'asc' };
        break;
      case 'exam':
      case 'sprint':
        // Для экзамена и спринта - случайный порядок
        // В PostgreSQL можно использовать RANDOM(), в MySQL - RAND()
        // Для простоты используем сортировку по ID с модификатором
        orderBy = { id: 'asc' };
        break;
      default:
        orderBy = { createdAt: 'asc' };
    }

    // Получаем общее количество вопросов
    const totalQuestions = await prisma.question.count({
      where: finalWhereConditions,
    });

    // Получаем вопросы с пагинацией
    const questions = await prisma.question.findMany({
      where: finalWhereConditions,
      orderBy,
      skip: offset,
      take: limitNum,
      include: {
        userProgress: {
          where: {
            userId: session.user.id,
          },
          orderBy: {
            lastReviewed: 'desc',
          },
          take: 1,
        },
        favoriteQuestions: {
          where: {
            userId: session.user.id,
          },
        },
      },
    });

    // Получаем доступные темы и сложности для фильтров
    const availableTopics = await prisma.question.findMany({
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

    const availableDifficulties = await prisma.question.findMany({
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

    // Форматируем ответ
    const formattedQuestions = questions.map((question) => ({
      id: question.id,
      question: question.question || question.text,
      text: question.text,
      answer: question.answer,
      options: question.options,
      topic: question.topic,
      difficulty: question.difficulty,
      tags: question.tags,
      estimatedTime: question.estimatedTime,
      category: question.category,
      userProgress: question.userProgress[0] || null,
      isFavorite:
        question.favoriteQuestions && question.favoriteQuestions.length > 0,
    }));

    const totalPages = Math.ceil(totalQuestions / limitNum);

    return res.status(200).json({
      questions: formattedQuestions,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalQuestions,
        totalPages,
      },
      filters: {
        availableTopics: availableTopics.map((t) => t.topic).filter(Boolean),
        availableDifficulties: availableDifficulties
          .map((d) => d.difficulty)
          .filter(Boolean),
      },
    });
  } catch (error) {
    console.error('Ошибка при получении вопросов для тренировки:', error);
    return res.status(500).json({
      message: 'Внутренняя ошибка сервера',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}
