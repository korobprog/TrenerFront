import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import prisma from '../../../lib/prisma';

/**
 * API endpoint для сохранения самооценки пользователя по флеш-карточке
 * POST /api/flashcards/evaluate
 *
 * Параметры тела запроса:
 * - questionId: number - ID вопроса
 * - sessionId: string - ID сессии флеш-карточек
 * - evaluation: string - оценка ('known'|'unknown'|'partial')
 * - timeSpent: number - время, потраченное на вопрос (в секундах)
 * - wasGenerated: boolean - был ли ответ сгенерирован AI
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Метод не поддерживается' });
  }

  try {
    // Проверяем авторизацию
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ message: 'Необходима авторизация' });
    }

    // Получаем параметры из тела запроса
    const {
      questionId,
      sessionId,
      evaluation,
      timeSpent,
      wasGenerated = false,
    } = req.body;

    // Валидация обязательных параметров
    if (!questionId) {
      return res
        .status(400)
        .json({ message: 'Параметр questionId обязателен' });
    }

    if (!sessionId) {
      return res.status(400).json({ message: 'Параметр sessionId обязателен' });
    }

    if (!evaluation) {
      return res
        .status(400)
        .json({ message: 'Параметр evaluation обязателен' });
    }

    // Валидация значения evaluation
    const validEvaluations = ['known', 'unknown', 'partial'];
    if (!validEvaluations.includes(evaluation)) {
      return res.status(400).json({
        message:
          'Недопустимое значение evaluation. Допустимые значения: known, unknown, partial',
      });
    }

    // Валидация timeSpent
    const timeSpentNum = timeSpent ? parseInt(timeSpent, 10) : 0;
    if (timeSpentNum < 0) {
      return res
        .status(400)
        .json({ message: 'Время не может быть отрицательным' });
    }

    const userId = session.user.id;
    const questionIdNum = parseInt(questionId);

    // Проверяем, существует ли вопрос
    const question = await prisma.question.findUnique({
      where: { id: questionIdNum },
    });

    if (!question) {
      return res.status(404).json({ message: 'Вопрос не найден' });
    }

    // Определяем статус и правильность ответа на основе оценки
    let status, isCorrect, needsReview;

    switch (evaluation) {
      case 'known':
        status = 'known';
        isCorrect = true;
        needsReview = false;
        break;
      case 'unknown':
        status = 'unknown';
        isCorrect = false;
        needsReview = true;
        break;
      case 'partial':
        status = 'partial';
        isCorrect = null; // частично правильный ответ
        needsReview = true;
        break;
    }

    // Вычисляем дату следующего повторения
    let nextReviewDate = null;
    if (needsReview) {
      nextReviewDate = new Date();
      // Для неизвестных - повторить через 1 день
      // Для частично известных - повторить через 3 дня
      const daysToAdd = evaluation === 'unknown' ? 1 : 3;
      nextReviewDate.setDate(nextReviewDate.getDate() + daysToAdd);
    } else {
      // Для известных вопросов - повторить через неделю
      nextReviewDate = new Date();
      nextReviewDate.setDate(nextReviewDate.getDate() + 7);
    }

    // Проверяем, есть ли уже запись прогресса для этого пользователя и вопроса
    const existingProgress = await prisma.userProgress.findUnique({
      where: {
        questionId_userId: {
          questionId: questionIdNum,
          userId: userId,
        },
      },
    });

    let updatedProgress;

    if (existingProgress) {
      // Обновляем существующую запись
      const updateData = {
        status,
        isCorrect,
        needsReview,
        lastReviewed: new Date(),
        reviewCount: existingProgress.reviewCount + 1,
        timeSpent: timeSpentNum,
      };

      // Увеличиваем соответствующие счетчики
      switch (evaluation) {
        case 'known':
          updateData.knownCount = existingProgress.knownCount + 1;
          break;
        case 'unknown':
          updateData.unknownCount = existingProgress.unknownCount + 1;
          break;
        case 'partial':
          updateData.repeatCount = existingProgress.repeatCount + 1;
          break;
      }

      updatedProgress = await prisma.userProgress.update({
        where: {
          questionId_userId: {
            questionId: questionIdNum,
            userId: userId,
          },
        },
        data: updateData,
      });
    } else {
      // Создаем новую запись прогресса
      const createData = {
        questionId: questionIdNum,
        userId: userId,
        status,
        isCorrect,
        needsReview,
        lastReviewed: new Date(),
        reviewCount: 1,
        timeSpent: timeSpentNum,
        knownCount: evaluation === 'known' ? 1 : 0,
        unknownCount: evaluation === 'unknown' ? 1 : 0,
        repeatCount: evaluation === 'partial' ? 1 : 0,
        searchCount: 0,
      };

      updatedProgress = await prisma.userProgress.create({
        data: createData,
      });
    }

    // Получаем обновленную статистику пользователя
    const userStats = await prisma.userProgress.aggregate({
      where: { userId: userId },
      _count: {
        id: true,
      },
      _sum: {
        knownCount: true,
        unknownCount: true,
        repeatCount: true,
        reviewCount: true,
      },
    });

    console.log(
      `Сохранена оценка для вопроса ${questionId}: ${evaluation}, пользователь ${userId}, сессия ${sessionId}`
    );

    return res.status(200).json({
      success: true,
      nextReviewDate: nextReviewDate.toISOString(),
      updatedStats: {
        totalQuestions: userStats._count.id || 0,
        knownCount: userStats._sum.knownCount || 0,
        unknownCount: userStats._sum.unknownCount || 0,
        partialCount: userStats._sum.repeatCount || 0,
        totalReviews: userStats._sum.reviewCount || 0,
      },
      progress: {
        id: updatedProgress.id,
        status: updatedProgress.status,
        isCorrect: updatedProgress.isCorrect,
        needsReview: updatedProgress.needsReview,
        reviewCount: updatedProgress.reviewCount,
        lastReviewed: updatedProgress.lastReviewed,
        timeSpent: updatedProgress.timeSpent,
      },
    });
  } catch (error) {
    console.error('Ошибка при сохранении оценки флеш-карточки:', error);

    // Обработка ошибок уникальности
    if (error.code === 'P2002') {
      return res.status(409).json({
        message: 'Конфликт данных при сохранении прогресса',
      });
    }

    return res.status(500).json({
      message: 'Внутренняя ошибка сервера при сохранении оценки',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  } finally {
    await prisma.$disconnect();
  }
}
