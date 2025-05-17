import {
  withAdminAuth,
  logAdminAction,
} from '../../../../../lib/middleware/adminAuth';
import { withPrisma } from '../../../../../lib/prisma';

/**
 * Обработчик API запросов для управления баллами пользователя
 * @param {Object} req - HTTP запрос
 * @param {Object} res - HTTP ответ
 */
async function handler(req, res) {
  // Получаем ID пользователя из параметров запроса
  const { id } = req.query;

  // Проверяем, что ID пользователя предоставлен
  if (!id) {
    return res.status(400).json({ message: 'ID пользователя не указан' });
  }

  // Обработка только POST запросов
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Метод не поддерживается' });
  }

  try {
    // Получаем данные из тела запроса
    const { amount, type, description } = req.body;

    // Валидация входных данных
    if (amount === undefined || amount === null) {
      return res.status(400).json({ message: 'Сумма баллов не указана' });
    }

    // Преобразуем amount в число
    const pointsAmount = Number(amount);

    // Проверяем, что amount является числом
    if (isNaN(pointsAmount)) {
      return res
        .status(400)
        .json({ message: 'Сумма баллов должна быть числом' });
    }

    // Проверяем тип операции
    const allowedTypes = ['admin_adjustment', 'bonus', 'penalty'];
    if (!allowedTypes.includes(type)) {
      return res.status(400).json({
        message:
          'Недопустимый тип операции. Разрешенные типы: admin_adjustment, bonus, penalty',
      });
    }

    // Проверяем описание
    if (!description) {
      return res.status(400).json({ message: 'Описание операции не указано' });
    }

    // Проверяем, что пользователь существует
    const user = await withPrisma(async (prisma) => {
      return await prisma.user.findUnique({
        where: { id },
        include: { userPoints: true },
      });
    });

    if (!user) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }

    // Выполняем транзакцию для обновления баллов и создания записи в истории
    const result = await withPrisma(async (prisma) => {
      return await prisma.$transaction(async (tx) => {
        // Создаем запись в истории транзакций
        const transaction = await tx.pointsTransaction.create({
          data: {
            userId: id,
            amount: pointsAmount,
            type,
            description,
          },
        });

        // Получаем текущий баланс пользователя или создаем новый, если не существует
        let userPoints;
        if (user.userPoints) {
          // Обновляем существующий баланс
          userPoints = await tx.userPoints.update({
            where: { userId: id },
            data: {
              points: { increment: pointsAmount },
            },
          });
        } else {
          // Создаем новый баланс
          userPoints = await tx.userPoints.create({
            data: {
              userId: id,
              points: pointsAmount,
            },
          });
        }

        return { transaction, userPoints };
      });
    });

    // Логируем действие администратора
    await logAdminAction(req.admin.id, 'update_user_points', 'user', id, {
      amount: pointsAmount,
      type,
      description,
      previousBalance: user.userPoints?.points || 0,
      newBalance: result.userPoints.points,
    });

    // Возвращаем результат
    return res.status(200).json({
      message: 'Баллы пользователя успешно обновлены',
      transaction: result.transaction,
      userPoints: result.userPoints,
    });
  } catch (error) {
    console.error('Ошибка при обновлении баллов пользователя:', error);
    return res.status(500).json({
      message: 'Ошибка сервера при обновлении баллов пользователя',
      error: error.message,
    });
  }
}

export default withAdminAuth(handler);
