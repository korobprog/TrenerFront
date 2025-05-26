import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';
import prisma from '../../prisma/client';

export default async function handler(req, res) {
  // Проверяем аутентификацию
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ message: 'Необходима аутентификация' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Метод не разрешен' });
  }

  const { questionId, status, isSearch, userId } = req.body;

  // Используем userId из сессии, если он не был передан в запросе
  const userIdToUse = userId || session.user.id;

  if (!questionId || (!status && !isSearch)) {
    return res
      .status(400)
      .json({ message: 'Отсутствуют обязательные параметры' });
  }

  if (status && !['known', 'unknown', 'repeat'].includes(status)) {
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
    const updateData = {};

    if (status) {
      updateData.status = status;
      updateData.lastReviewed = new Date();
      updateData.reviewCount = { increment: 1 };

      // Увеличиваем счетчик для соответствующего статуса
      if (status === 'known') {
        updateData.knownCount = { increment: 1 };
      } else if (status === 'unknown') {
        updateData.unknownCount = { increment: 1 };
      } else if (status === 'repeat') {
        updateData.repeatCount = { increment: 1 };
      }
    }

    if (isSearch) {
      updateData.searchCount = { increment: 1 };
    }

    const progress = await prisma.userProgress.upsert({
      where: {
        questionId_userId: {
          questionId,
          userId: userIdToUse,
        },
      },
      update: updateData,
      create: {
        questionId,
        userId: userIdToUse,
        status: status || 'unknown',
        reviewCount: status ? 1 : 0,
        knownCount: status === 'known' ? 1 : 0,
        unknownCount: status === 'unknown' ? 1 : 0,
        repeatCount: status === 'repeat' ? 1 : 0,
        searchCount: isSearch ? 1 : 0,
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
