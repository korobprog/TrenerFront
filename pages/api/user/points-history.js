import { getSession } from 'next-auth/react';
import prisma from '../../../lib/prisma';

export default async function handler(req, res) {
  const session = await getSession({ req });

  if (!session) {
    return res.status(401).json({ message: 'Необходима авторизация' });
  }

  // Обработка только GET запросов
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Метод не поддерживается' });
  }

  try {
    // Получаем параметры фильтрации из запроса
    const { type, limit = 20, offset = 0 } = req.query;

    // Формируем условия фильтрации
    const where = {
      userId: session.user.id,
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
      skip: parseInt(offset, 10),
      take: parseInt(limit, 10),
    });

    // Получаем текущий баланс пользователя
    const userPoints = await prisma.userPoints.findUnique({
      where: { userId: session.user.id },
    });

    return res.status(200).json({
      transactions,
      totalCount,
      currentPoints: userPoints?.points || 0,
    });
  } catch (error) {
    console.error('Ошибка при получении истории транзакций:', error);
    return res
      .status(500)
      .json({ message: 'Ошибка сервера при получении истории транзакций' });
  }
}
