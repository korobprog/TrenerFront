import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import prisma from '../../../lib/prisma';

/**
 * API роут для получения истории транзакций баллов пользователя
 * GET /api/user/points-history - получить историю транзакций с пагинацией
 *
 * Параметры запроса:
 * - limit: количество записей на страницу (по умолчанию 10)
 * - offset: смещение для пагинации (по умолчанию 0)
 * - type: фильтр по типу транзакции (опционально)
 */
export default async function handler(req, res) {
  // Валидация Prisma клиента
  if (!prisma) {
    console.error(
      '❌ [POINTS HISTORY API] КРИТИЧЕСКАЯ ОШИБКА: Prisma клиент не инициализирован'
    );
    return res.status(500).json({ error: 'Ошибка подключения к базе данных' });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Метод не поддерживается' });
  }

  try {
    // Получаем параметры запроса и валидируем их сначала
    const { limit = '10', offset = '0', type } = req.query;

    // Валидация параметров
    const limitNum = parseInt(limit, 10);
    const offsetNum = parseInt(offset, 10);

    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      return res
        .status(400)
        .json({ error: 'Параметр limit должен быть числом от 1 до 100' });
    }

    if (isNaN(offsetNum) || offsetNum < 0) {
      return res
        .status(400)
        .json({ error: 'Параметр offset должен быть неотрицательным числом' });
    }

    // Получаем сессию пользователя
    const session = await getServerSession(req, res, authOptions);

    if (!session || !session.user) {
      return res.status(401).json({ error: 'Не авторизован' });
    }

    // Получаем пользователя из базы данных
    const user = await prisma.user.findUnique({
      where: {
        email: session.user.email,
      },
      select: {
        id: true,
        email: true,
        name: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    // Формируем условия фильтрации
    const where = {
      userId: user.id,
      ...(type && { type }), // Добавляем фильтр по типу, если он указан
    };

    // Получаем общее количество транзакций для пагинации
    const totalCount = await prisma.pointsTransaction.count({
      where,
    });

    // Получаем историю транзакций с учетом фильтрации и пагинации
    const transactions = await prisma.pointsTransaction.findMany({
      where,
      orderBy: {
        createdAt: 'desc', // Сортировка по дате создания (сначала новые)
      },
      skip: offsetNum,
      take: limitNum,
      select: {
        id: true,
        amount: true,
        type: true,
        description: true,
        createdAt: true,
      },
    });

    // Получаем текущий баланс пользователя
    const userPoints = await prisma.userPoints.findUnique({
      where: { userId: user.id },
      select: {
        points: true,
      },
    });

    // Возвращаем результат
    return res.status(200).json({
      success: true,
      data: {
        transactions,
        pagination: {
          totalCount,
          limit: limitNum,
          offset: offsetNum,
          hasMore: offsetNum + limitNum < totalCount,
        },
        currentPoints: userPoints?.points || 0,
        userId: user.id,
      },
    });
  } catch (error) {
    console.error('Ошибка при получении истории транзакций баллов:', error);
    return res.status(500).json({
      error: 'Внутренняя ошибка сервера',
      message: 'Не удалось загрузить историю транзакций',
      details:
        process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}
