import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';
import prisma from '../../prisma/client';

export default async function handler(req, res) {
  // Проверяем аутентификацию
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ message: 'Необходима аутентификация' });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Метод не разрешен' });
  }

  const userId = session.user.id;

  try {
    // Получаем вопросы, которые пользователь не знает или хочет повторить
    // Также включаем вопросы, которые еще не были просмотрены этим пользователем
    const questions = await prisma.question.findMany({
      where: {
        OR: [
          {
            userProgress: {
              some: {
                status: 'unknown',
                userId: userId,
              },
            },
          },
          {
            userProgress: {
              some: {
                status: 'repeat',
                userId: userId,
              },
            },
          },
          {
            // Вопросы, которые пользователь еще не просматривал
            userProgress: {
              none: {
                userId: userId,
              },
            },
          },
        ],
      },
      include: {
        userProgress: {
          where: {
            userId: userId,
          },
        },
      },
      orderBy: {
        // Сначала показываем вопросы, которые пользователь не знает
        userProgress: {
          _count: 'desc',
        },
      },
    });

    return res.status(200).json(questions);
  } catch (error) {
    console.error('Ошибка при получении вопросов:', error);
    return res.status(500).json({ message: 'Внутренняя ошибка сервера' });
  } finally {
    await prisma.$disconnect();
  }
}
