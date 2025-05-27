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

    // Получаем общую статистику
    const totalQuestions = await prisma.question.count();

    const userProgress = await prisma.userProgress.findMany({
      where: {
        userId: userId,
      },
      include: {
        question: {
          select: {
            topic: true,
            difficulty: true,
          },
        },
      },
    });

    // Подсчитываем общие метрики
    const answeredQuestions = userProgress.length;
    const correctAnswers = userProgress.filter((p) => p.isCorrect).length;
    const accuracy =
      answeredQuestions > 0 ? (correctAnswers / answeredQuestions) * 100 : 0;

    // Подсчитываем общее время
    const totalTimeSpent = userProgress.reduce(
      (sum, p) => sum + (p.timeSpent || 0),
      0
    );

    // Подсчитываем текущую серию правильных ответов
    const recentProgress = await prisma.userProgress.findMany({
      where: {
        userId: userId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 50, // Берем последние 50 ответов для подсчета серии
    });

    let currentStreak = 0;
    for (const progress of recentProgress) {
      if (progress.isCorrect) {
        currentStreak++;
      } else {
        break;
      }
    }

    // Статистика по темам
    const topicStats = {};
    const topics = [
      ...new Set(userProgress.map((p) => p.question.topic).filter(Boolean)),
    ];

    for (const topic of topics) {
      const topicProgress = userProgress.filter(
        (p) => p.question.topic === topic
      );
      const topicTotal = await prisma.question.count({
        where: { topic: topic },
      });
      const topicAnswered = topicProgress.length;
      const topicCorrect = topicProgress.filter((p) => p.isCorrect).length;
      const topicAccuracy =
        topicAnswered > 0 ? (topicCorrect / topicAnswered) * 100 : 0;

      topicStats[topic] = {
        total: topicTotal,
        answered: topicAnswered,
        correct: topicCorrect,
        accuracy: Math.round(topicAccuracy),
      };
    }

    // Достижения временно отключены
    // const achievements = await prisma.achievement.findMany({
    //   where: {
    //     userId: userId,
    //   },
    //   orderBy: {
    //     unlockedAt: 'desc',
    //   },
    // });

    // Статистика активности за последние 30 дней
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentActivity = await prisma.userProgress.findMany({
      where: {
        userId: userId,
        createdAt: {
          gte: thirtyDaysAgo,
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // Группируем активность по дням
    const activityByDay = {};
    recentActivity.forEach((progress) => {
      const date = progress.createdAt.toISOString().split('T')[0];
      if (!activityByDay[date]) {
        activityByDay[date] = {
          date,
          questionsAnswered: 0,
          timeSpent: 0,
          correctAnswers: 0,
        };
      }
      activityByDay[date].questionsAnswered++;
      activityByDay[date].timeSpent += progress.timeSpent || 0;
      if (progress.isCorrect) {
        activityByDay[date].correctAnswers++;
      }
    });

    const recentActivityArray = Object.values(activityByDay);

    // Статистика по сложности
    const difficultyStats = {};
    const difficulties = ['easy', 'medium', 'hard'];

    for (const difficulty of difficulties) {
      const difficultyProgress = userProgress.filter(
        (p) => p.question.difficulty === difficulty
      );
      const difficultyTotal = await prisma.question.count({
        where: { difficulty: difficulty },
      });
      const difficultyAnswered = difficultyProgress.length;
      const difficultyCorrect = difficultyProgress.filter(
        (p) => p.isCorrect
      ).length;
      const difficultyAccuracy =
        difficultyAnswered > 0
          ? (difficultyCorrect / difficultyAnswered) * 100
          : 0;

      difficultyStats[difficulty] = {
        total: difficultyTotal,
        answered: difficultyAnswered,
        correct: difficultyCorrect,
        accuracy: Math.round(difficultyAccuracy),
      };
    }

    // Подсчитываем вопросы, требующие повторения
    const needsReviewCount = await prisma.userProgress.count({
      where: {
        userId: userId,
        OR: [{ isCorrect: false }, { needsReview: true }],
      },
    });

    // Лучшая серия за все время
    let bestStreak = 0;
    let tempStreak = 0;
    const allProgress = await prisma.userProgress.findMany({
      where: {
        userId: userId,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    for (const progress of allProgress) {
      if (progress.isCorrect) {
        tempStreak++;
        bestStreak = Math.max(bestStreak, tempStreak);
      } else {
        tempStreak = 0;
      }
    }

    return res.status(200).json({
      overall: {
        totalQuestions,
        answeredQuestions,
        correctAnswers,
        accuracy: Math.round(accuracy),
        currentStreak,
        bestStreak,
        totalTimeSpent,
        needsReviewCount,
      },
      byTopic: topicStats,
      byDifficulty: difficultyStats,
      achievements: [], // Временно пустой массив
      recentActivity: recentActivityArray,
      summary: {
        questionsToday:
          recentActivityArray.find(
            (day) => day.date === new Date().toISOString().split('T')[0]
          )?.questionsAnswered || 0,
        averageAccuracy: Math.round(accuracy),
        mostActiveDay: recentActivityArray.reduce(
          (max, day) =>
            day.questionsAnswered > (max?.questionsAnswered || 0) ? day : max,
          null
        ),
        favoriteTopics: Object.entries(topicStats)
          .sort(([, a], [, b]) => b.answered - a.answered)
          .slice(0, 3)
          .map(([topic, stats]) => ({ topic, ...stats })),
      },
    });
  } catch (error) {
    console.error('Ошибка при получении статистики тренировки:', error);
    return res.status(500).json({
      message: 'Внутренняя ошибка сервера',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}
