import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Метод не разрешен' });
  }

  const { questionId, status } = req.body;

  if (!questionId || !status) {
    return res
      .status(400)
      .json({ message: 'Отсутствуют обязательные параметры' });
  }

  if (!['known', 'unknown', 'repeat'].includes(status)) {
    return res.status(400).json({ message: 'Недопустимый статус' });
  }

  try {
    // Проверяем, существует ли вопрос
    const question = await prisma.question.findUnique({
      where: { id: questionId },
    });

    if (!question) {
      return res.status(404).json({ message: 'Вопрос не найден' });
    }

    // Обновляем или создаем запись о прогрессе пользователя
    const progress = await prisma.userProgress.upsert({
      where: {
        questionId,
      },
      update: {
        status,
        lastReviewed: new Date(),
        reviewCount: {
          increment: 1,
        },
      },
      create: {
        questionId,
        status,
        reviewCount: 1,
      },
    });

    return res.status(200).json(progress);
  } catch (error) {
    console.error('Ошибка при обновлении прогресса:', error);
    return res.status(500).json({ message: 'Внутренняя ошибка сервера' });
  } finally {
    await prisma.$disconnect();
  }
}
