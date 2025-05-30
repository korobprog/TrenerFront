import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  try {
    const session = await getServerSession(req, res, authOptions);

    if (!session) {
      return res.status(401).json({ error: 'Не авторизован' });
    }

    const { method } = req;

    switch (method) {
      case 'GET':
        return await searchUsers(req, res, session);
      default:
        res.setHeader('Allow', ['GET']);
        return res
          .status(405)
          .json({ error: `Метод ${method} не поддерживается` });
    }
  } catch (error) {
    console.error('Ошибка в API поиска пользователей:', error);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}

// Поиск пользователей
async function searchUsers(req, res, session) {
  try {
    const {
      q = '',
      limit = 10,
      offset = 0,
      includeStats = false,
      excludeCurrentUser = true,
    } = req.query;

    // Валидация параметров
    const searchLimit = Math.min(parseInt(limit) || 10, 50); // Максимум 50 результатов
    const searchOffset = parseInt(offset) || 0;
    const searchQuery = q.trim();

    if (searchQuery.length < 2 && searchQuery.length > 0) {
      return res.status(400).json({
        error: 'Поисковый запрос должен содержать минимум 2 символа',
      });
    }

    // Строим условия поиска
    let whereClause = {};

    // Исключаем текущего пользователя если требуется
    if (excludeCurrentUser === 'true') {
      whereClause.id = {
        not: session.user.id,
      };
    }

    // Добавляем поиск по имени и email
    if (searchQuery) {
      whereClause.OR = [
        {
          name: {
            contains: searchQuery,
            mode: 'insensitive',
          },
        },
        {
          email: {
            contains: searchQuery,
            mode: 'insensitive',
          },
        },
      ];
    }

    // Базовые поля для выборки
    const selectFields = {
      id: true,
      name: true,
      email: true,
      image: true,
      createdAt: true,
      role: true,
    };

    // Дополнительные поля если нужна статистика
    const includeFields = {};

    if (includeStats === 'true') {
      includeFields._count = {
        select: {
          interviews: true,
          pointsTransactions: true,
        },
      };

      includeFields.pointsTransactions = {
        select: {
          points: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 1,
      };
    }

    // Выполняем поиск
    const [users, totalCount] = await Promise.all([
      prisma.user.findMany({
        where: whereClause,
        select: selectFields,
        include: includeFields,
        orderBy: [{ name: 'asc' }, { email: 'asc' }],
        take: searchLimit,
        skip: searchOffset,
      }),
      prisma.user.count({
        where: whereClause,
      }),
    ]);

    // Форматируем результаты
    const formattedUsers = users.map((user) => {
      const result = {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        role: user.role,
        createdAt: user.createdAt,
      };

      // Добавляем статистику если запрошена
      if (includeStats === 'true') {
        result.stats = {
          interviewsCount: user._count?.interviews || 0,
          transactionsCount: user._count?.pointsTransactions || 0,
          currentPoints: user.pointsTransactions?.[0]?.points || 0,
        };
      }

      return result;
    });

    // Информация о пагинации
    const pagination = {
      total: totalCount,
      limit: searchLimit,
      offset: searchOffset,
      hasMore: searchOffset + searchLimit < totalCount,
    };

    return res.status(200).json({
      success: true,
      users: formattedUsers,
      pagination,
      query: searchQuery,
    });
  } catch (error) {
    console.error('Ошибка при поиске пользователей:', error);
    return res.status(500).json({ error: 'Ошибка при поиске пользователей' });
  }
}
