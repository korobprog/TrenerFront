import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import prisma from '../../../lib/prisma';

export default async function handler(req, res) {
  try {
    // Проверяем авторизацию
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ message: 'Необходима авторизация' });
    }

    const userId = session.user.id;

    if (req.method === 'GET') {
      // Получение списка избранных вопросов
      const { page = '1', limit = '10' } = req.query;
      const pageNum = parseInt(page, 10);
      const limitNum = parseInt(limit, 10);
      const offset = (pageNum - 1) * limitNum;

      try {
        // Получаем общее количество избранных вопросов
        const totalFavorites = await prisma.userFavoriteQuestion.count({
          where: { userId },
        });

        // Получаем избранные вопросы с пагинацией
        const favoriteQuestions = await prisma.userFavoriteQuestion.findMany({
          where: { userId },
          include: {
            question: {
              include: {
                userProgress: {
                  where: { userId },
                  orderBy: { lastReviewed: 'desc' },
                  take: 1,
                },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip: offset,
          take: limitNum,
        });

        // Форматируем ответ
        const formattedQuestions = favoriteQuestions.map((fav) => ({
          id: fav.question.id,
          text: fav.question.text,
          question: fav.question.question || fav.question.text, // Для совместимости
          answer: fav.question.answer,
          options: fav.question.options,
          topic: fav.question.topic,
          difficulty: fav.question.difficulty,
          tags: fav.question.tags,
          estimatedTime: fav.question.estimatedTime,
          category: fav.question.category,
          createdAt: fav.question.createdAt,
          isFavorite: true,
          favoriteAddedAt: fav.createdAt,
          userProgress: fav.question.userProgress[0] || null,
        }));

        const totalPages = Math.ceil(totalFavorites / limitNum);

        return res.status(200).json({
          questions: formattedQuestions,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total: totalFavorites,
            totalPages,
          },
        });
      } catch (error) {
        console.error('Ошибка при получении избранных вопросов:', error);
        return res.status(500).json({
          message: 'Ошибка при получении избранных вопросов',
          error:
            process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
      }
    } else if (req.method === 'POST') {
      // Добавление/удаление вопроса из избранного
      const { questionId, action } = req.body;

      if (!questionId || !action) {
        return res.status(400).json({
          message: 'Необходимо указать questionId и action (add/remove)',
        });
      }

      if (!['add', 'remove'].includes(action)) {
        return res.status(400).json({
          message: 'action должен быть "add" или "remove"',
        });
      }

      try {
        // Проверяем, существует ли вопрос
        const question = await prisma.question.findUnique({
          where: { id: parseInt(questionId, 10) },
        });

        if (!question) {
          return res.status(404).json({ message: 'Вопрос не найден' });
        }

        if (action === 'add') {
          // Добавляем в избранное (если еще не добавлен)
          const existingFavorite = await prisma.userFavoriteQuestion.findUnique(
            {
              where: {
                userId_questionId: {
                  userId,
                  questionId: parseInt(questionId, 10),
                },
              },
            }
          );

          if (existingFavorite) {
            return res.status(200).json({
              message: 'Вопрос уже в избранном',
              isFavorite: true,
            });
          }

          await prisma.userFavoriteQuestion.create({
            data: {
              userId,
              questionId: parseInt(questionId, 10),
            },
          });

          return res.status(201).json({
            message: 'Вопрос добавлен в избранное',
            isFavorite: true,
          });
        } else if (action === 'remove') {
          // Удаляем из избранного
          const deletedFavorite = await prisma.userFavoriteQuestion.deleteMany({
            where: {
              userId,
              questionId: parseInt(questionId, 10),
            },
          });

          if (deletedFavorite.count === 0) {
            return res.status(404).json({
              message: 'Вопрос не найден в избранном',
              isFavorite: false,
            });
          }

          return res.status(200).json({
            message: 'Вопрос удален из избранного',
            isFavorite: false,
          });
        }
      } catch (error) {
        console.error('Ошибка при работе с избранными:', error);
        return res.status(500).json({
          message: 'Ошибка при работе с избранными',
          error:
            process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
      }
    } else {
      return res.status(405).json({ message: 'Метод не поддерживается' });
    }
  } catch (error) {
    console.error('Общая ошибка в API избранных:', error);
    return res.status(500).json({
      message: 'Внутренняя ошибка сервера',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}
