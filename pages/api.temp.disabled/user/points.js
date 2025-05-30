import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * API роут для получения баллов пользователя
 * GET /api/user/points - получить текущие баллы пользователя
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Метод не поддерживается' });
  }

  try {
    // Получаем сессию пользователя
    const session = await getServerSession(req, res, authOptions);

    if (!session || !session.user) {
      return res.status(401).json({ error: 'Не авторизован' });
    }

    // Получаем пользователя из базы данных с баллами
    const user = await prisma.user.findUnique({
      where: {
        email: session.user.email,
      },
      select: {
        id: true,
        email: true,
        name: true,
        userPoints: {
          select: {
            points: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    // Получаем баллы из связанной таблицы UserPoints
    // Если записи нет, создаем её с 0 баллами
    let points = 0;
    if (user.userPoints) {
      points = user.userPoints.points;
    } else {
      // Создаем запись баллов для пользователя, если её нет
      const newUserPoints = await prisma.userPoints.create({
        data: {
          userId: user.id,
          points: 0,
        },
      });
      points = newUserPoints.points;
    }

    // Возвращаем баллы пользователя
    return res.status(200).json({
      points: points,
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
    });
  } catch (error) {
    console.error('Ошибка при получении баллов пользователя:', error);
    return res.status(500).json({
      error: 'Внутренняя ошибка сервера',
      details:
        process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  } finally {
    await prisma.$disconnect();
  }
}
