import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Метод не разрешен' });
  }

  try {
    // Получаем вопросы, которые пользователь не знает или хочет повторить
    // Также включаем вопросы, которые еще не были просмотрены
    const questions = await prisma.question.findMany({
      where: {
        OR: [
          {
            userProgress: {
              some: {
                status: 'unknown',
              },
            },
          },
          {
            userProgress: {
              some: {
                status: 'repeat',
              },
            },
          },
          {
            userProgress: {
              none: {},
            },
          },
        ],
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
