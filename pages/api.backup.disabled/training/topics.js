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

    const userId = session.user.id;

    // Получаем все уникальные темы
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

    // Для каждой темы получаем статистику
    const topicsWithStats = await Promise.all(
      topics.map(async (topicObj) => {
        const topic = topicObj.topic;

        // Общее количество вопросов по теме
        const totalQuestions = await prisma.question.count({
          where: { topic },
        });

        // Количество вопросов по уровням сложности
        const difficultyBreakdown = await Promise.all([
          prisma.question.count({ where: { topic, difficulty: 'easy' } }),
          prisma.question.count({ where: { topic, difficulty: 'medium' } }),
          prisma.question.count({ where: { topic, difficulty: 'hard' } }),
        ]);

        // Прогресс пользователя по теме
        const userProgress = await prisma.userProgress.findMany({
          where: {
            userId,
            question: {
              topic,
            },
          },
          include: {
            question: {
              select: {
                difficulty: true,
              },
            },
          },
        });

        const answeredQuestions = userProgress.length;
        const correctAnswers = userProgress.filter((p) => p.isCorrect).length;
        const accuracy =
          answeredQuestions > 0
            ? (correctAnswers / answeredQuestions) * 100
            : 0;

        // Прогресс по уровням сложности
        const difficultyProgress = {
          easy: {
            total: difficultyBreakdown[0],
            answered: userProgress.filter(
              (p) => p.question.difficulty === 'easy'
            ).length,
            correct: userProgress.filter(
              (p) => p.question.difficulty === 'easy' && p.isCorrect
            ).length,
          },
          medium: {
            total: difficultyBreakdown[1],
            answered: userProgress.filter(
              (p) => p.question.difficulty === 'medium'
            ).length,
            correct: userProgress.filter(
              (p) => p.question.difficulty === 'medium' && p.isCorrect
            ).length,
          },
          hard: {
            total: difficultyBreakdown[2],
            answered: userProgress.filter(
              (p) => p.question.difficulty === 'hard'
            ).length,
            correct: userProgress.filter(
              (p) => p.question.difficulty === 'hard' && p.isCorrect
            ).length,
          },
        };

        // Добавляем процент точности для каждого уровня
        Object.keys(difficultyProgress).forEach((level) => {
          const progress = difficultyProgress[level];
          progress.accuracy =
            progress.answered > 0
              ? Math.round((progress.correct / progress.answered) * 100)
              : 0;
          progress.completion =
            progress.total > 0
              ? Math.round((progress.answered / progress.total) * 100)
              : 0;
        });

        // Последняя активность по теме
        const lastActivity = await prisma.userProgress.findFirst({
          where: {
            userId,
            question: {
              topic,
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        });

        // Время, потраченное на тему
        const timeSpent = userProgress.reduce(
          (sum, p) => sum + (p.timeSpent || 0),
          0
        );

        // Вопросы, требующие повторения
        const needsReview = await prisma.userProgress.count({
          where: {
            userId,
            question: {
              topic,
            },
            OR: [{ isCorrect: false }, { needsReview: true }],
          },
        });

        // Средняя оценка сложности (субъективная, на основе времени ответов)
        const avgTimePerQuestion =
          answeredQuestions > 0 ? timeSpent / answeredQuestions : 0;
        let perceivedDifficulty = 'easy';
        if (avgTimePerQuestion > 120) {
          // более 2 минут
          perceivedDifficulty = 'hard';
        } else if (avgTimePerQuestion > 60) {
          // более 1 минуты
          perceivedDifficulty = 'medium';
        }

        return {
          topic,
          totalQuestions,
          answeredQuestions,
          correctAnswers,
          accuracy: Math.round(accuracy),
          completion: Math.round((answeredQuestions / totalQuestions) * 100),
          difficultyBreakdown: {
            easy: difficultyBreakdown[0],
            medium: difficultyBreakdown[1],
            hard: difficultyBreakdown[2],
          },
          difficultyProgress,
          timeSpent,
          avgTimePerQuestion: Math.round(avgTimePerQuestion),
          perceivedDifficulty,
          needsReview,
          lastActivity: lastActivity?.createdAt || null,
          isCompleted: answeredQuestions >= totalQuestions,
          masteryLevel:
            accuracy >= 90
              ? 'expert'
              : accuracy >= 70
              ? 'proficient'
              : accuracy >= 50
              ? 'learning'
              : 'beginner',
        };
      })
    );

    // Сортируем темы по популярности (количество отвеченных вопросов)
    const sortedTopics = topicsWithStats.sort(
      (a, b) => b.answeredQuestions - a.answeredQuestions
    );

    // Добавляем общую статистику
    const totalQuestionsAllTopics = sortedTopics.reduce(
      (sum, topic) => sum + topic.totalQuestions,
      0
    );
    const totalAnsweredAllTopics = sortedTopics.reduce(
      (sum, topic) => sum + topic.answeredQuestions,
      0
    );
    const totalCorrectAllTopics = sortedTopics.reduce(
      (sum, topic) => sum + topic.correctAnswers,
      0
    );

    const overallStats = {
      totalTopics: sortedTopics.length,
      totalQuestions: totalQuestionsAllTopics,
      totalAnswered: totalAnsweredAllTopics,
      totalCorrect: totalCorrectAllTopics,
      overallAccuracy:
        totalAnsweredAllTopics > 0
          ? Math.round((totalCorrectAllTopics / totalAnsweredAllTopics) * 100)
          : 0,
      overallCompletion:
        totalQuestionsAllTopics > 0
          ? Math.round((totalAnsweredAllTopics / totalQuestionsAllTopics) * 100)
          : 0,
      completedTopics: sortedTopics.filter((t) => t.isCompleted).length,
      expertTopics: sortedTopics.filter((t) => t.masteryLevel === 'expert')
        .length,
      proficientTopics: sortedTopics.filter(
        (t) => t.masteryLevel === 'proficient'
      ).length,
    };

    // Рекомендации для изучения
    const recommendations = {
      nextToStudy: sortedTopics
        .filter(
          (t) => !t.isCompleted && t.answeredQuestions < t.totalQuestions * 0.5
        )
        .sort((a, b) => a.answeredQuestions - b.answeredQuestions)
        .slice(0, 3),
      needsReview: sortedTopics
        .filter((t) => t.needsReview > 0)
        .sort((a, b) => b.needsReview - a.needsReview)
        .slice(0, 3),
      almostCompleted: sortedTopics
        .filter((t) => !t.isCompleted && t.completion >= 80)
        .sort((a, b) => b.completion - a.completion)
        .slice(0, 3),
    };

    return res.status(200).json({
      topics: sortedTopics,
      overallStats,
      recommendations,
      metadata: {
        lastUpdated: new Date().toISOString(),
        userId,
      },
    });
  } catch (error) {
    console.error('Ошибка при получении тем для тренировки:', error);
    return res.status(500).json({
      message: 'Внутренняя ошибка сервера',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}
