import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import prisma from '../../../lib/prisma';

/**
 * API роут для управления профилем пользователя
 * GET /api/user/profile - получить профиль пользователя
 * PUT /api/user/profile - обновить профиль пользователя
 */
export default async function handler(req, res) {
  // ДИАГНОСТИЧЕСКОЕ ЛОГИРОВАНИЕ - НАЧАЛО
  console.log('🔍 [PROFILE API] Получен запрос:', {
    method: req.method,
    url: req.url,
    headers: {
      'user-agent': req.headers['user-agent'],
      'content-type': req.headers['content-type'],
      cookie: req.headers.cookie ? 'ПРИСУТСТВУЕТ' : 'ОТСУТСТВУЕТ',
    },
  });
  // ДИАГНОСТИЧЕСКОЕ ЛОГИРОВАНИЕ - КОНЕЦ

  // Валидация Prisma клиента
  if (!prisma) {
    console.error(
      '❌ [PROFILE API] КРИТИЧЕСКАЯ ОШИБКА: Prisma клиент не инициализирован'
    );
    return res.status(500).json({ error: 'Ошибка подключения к базе данных' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);

    // ДИАГНОСТИЧЕСКОЕ ЛОГИРОВАНИЕ - СЕССИЯ
    console.log('🔍 [PROFILE API] Сессия:', {
      exists: !!session,
      user: session?.user
        ? {
            email: session.user.email,
            name: session.user.name,
            id: session.user.id,
          }
        : null,
    });

    if (!session || !session.user) {
      return res.status(401).json({ error: 'Не авторизован' });
    }

    // Получаем пользователя из базы данных
    console.log(
      '🔍 [PROFILE API] Ищем пользователя по email:',
      session.user.email
    );

    const user = await prisma.user.findUnique({
      where: {
        email: session.user.email,
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        createdAt: true,
        lastLoginAt: true,
        conductedInterviewsCount: true,
        userPoints: {
          select: {
            points: true,
          },
        },
        pointsTransactions: {
          select: {
            amount: true,
            type: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 5, // Последние 5 транзакций
        },
        _count: {
          select: {
            interviewerSessions: true,
            intervieweeSessions: true,
            pointsTransactions: true,
          },
        },
      },
    });

    console.log('🔍 [PROFILE API] Результат поиска пользователя:', {
      found: !!user,
      userId: user?.id,
      userEmail: user?.email,
      userRole: user?.role,
    });

    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    if (req.method === 'GET') {
      return await handleGetProfile(req, res, user);
    } else if (req.method === 'PUT') {
      return await handleUpdateProfile(req, res, user);
    } else {
      return res.status(405).json({ error: 'Метод не поддерживается' });
    }
  } catch (error) {
    console.error('❌ [PROFILE API] КРИТИЧЕСКАЯ ОШИБКА:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code,
    });
    return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}

/**
 * Получение профиля пользователя
 */
async function handleGetProfile(req, res, user) {
  try {
    // Формируем ответ с профилем пользователя
    const profileData = {
      id: user.id,
      name: user.name || 'Не указано',
      email: user.email || 'Не указано',
      image: user.image,
      role: user.role,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
      conductedInterviewsCount: user.conductedInterviewsCount,

      // Статистика
      stats: {
        currentPoints: user.userPoints?.points || 0,
        totalInterviews:
          user._count.interviewerSessions + user._count.intervieweeSessions,
        conductedInterviews: user._count.interviewerSessions,
        participatedInterviews: user._count.intervieweeSessions,
        totalTransactions: user._count.pointsTransactions,
      },

      // Последние транзакции баллов
      recentTransactions: user.pointsTransactions.map((transaction) => ({
        amount: transaction.amount,
        type: transaction.type,
        createdAt: transaction.createdAt,
      })),
    };

    return res.status(200).json({
      success: true,
      data: profileData,
    });
  } catch (error) {
    console.error('Ошибка при получении профиля:', error);
    return res.status(500).json({ error: 'Ошибка при получении профиля' });
  }
}

/**
 * Обновление профиля пользователя
 */
async function handleUpdateProfile(req, res, user) {
  try {
    const { name, image } = req.body;

    // Валидация входных данных
    if (
      name !== undefined &&
      (typeof name !== 'string' || name.trim().length === 0)
    ) {
      return res
        .status(400)
        .json({ error: 'Имя должно быть непустой строкой' });
    }

    if (image !== undefined && typeof image !== 'string') {
      return res.status(400).json({ error: 'Изображение должно быть строкой' });
    }

    // Подготавливаем данные для обновления
    const updateData = {};
    if (name !== undefined) {
      updateData.name = name.trim();
    }
    if (image !== undefined) {
      updateData.image = image || null;
    }

    // Если нет данных для обновления
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'Нет данных для обновления' });
    }

    // Обновляем профиль пользователя
    const updatedUser = await prisma.user.update({
      where: {
        id: user.id,
      },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        createdAt: true,
        lastLoginAt: true,
        conductedInterviewsCount: true,
        userPoints: {
          select: {
            points: true,
          },
        },
        _count: {
          select: {
            interviewerSessions: true,
            intervieweeSessions: true,
            pointsTransactions: true,
          },
        },
      },
    });

    // Формируем ответ
    const profileData = {
      id: updatedUser.id,
      name: updatedUser.name || 'Не указано',
      email: updatedUser.email || 'Не указано',
      image: updatedUser.image,
      role: updatedUser.role,
      createdAt: updatedUser.createdAt,
      lastLoginAt: updatedUser.lastLoginAt,
      conductedInterviewsCount: updatedUser.conductedInterviewsCount,

      // Статистика
      stats: {
        currentPoints: updatedUser.userPoints?.points || 0,
        totalInterviews:
          updatedUser._count.interviewerSessions +
          updatedUser._count.intervieweeSessions,
        conductedInterviews: updatedUser._count.interviewerSessions,
        participatedInterviews: updatedUser._count.intervieweeSessions,
        totalTransactions: updatedUser._count.pointsTransactions,
      },
    };

    return res.status(200).json({
      success: true,
      message: 'Профиль успешно обновлен',
      data: profileData,
    });
  } catch (error) {
    console.error('Ошибка при обновлении профиля:', error);
    return res.status(500).json({ error: 'Ошибка при обновлении профиля' });
  }
}
