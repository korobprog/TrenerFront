import {
  withAdminAuth,
  logAdminAction,
} from '../../../../../lib/middleware/adminAuth';
import { withPrisma } from '../../../../../lib/prisma';

/**
 * Обработчик API запросов для изменения баллов пользователя
 * @param {Object} req - HTTP запрос
 * @param {Object} res - HTTP ответ
 */
async function handler(req, res) {
  // Получаем ID пользователя из параметров запроса
  const { id } = req.query;

  console.log(
    `Admin Points API: Запрос ${req.method} для пользователя ${id} от администратора ${req.admin.id}`
  );

  // Проверяем, что ID пользователя предоставлен
  if (!id) {
    console.error('Admin Points API: ID пользователя не указан');
    return res.status(400).json({
      success: false,
      message: 'ID пользователя не указан',
    });
  }

  // Обработка POST запроса - изменение баллов пользователя
  if (req.method === 'POST') {
    try {
      const { userId, amount, type, description } = req.body;

      console.log(`Admin Points API: Изменение баллов пользователя ${id}:`, {
        userId,
        amount,
        type,
        description,
      });

      // Валидация входящих данных
      if (!amount || typeof amount !== 'number') {
        console.error('Admin Points API: Некорректное значение amount');
        return res.status(400).json({
          success: false,
          message: 'Некорректное значение количества баллов',
        });
      }

      if (!type) {
        console.error('Admin Points API: Тип операции не указан');
        return res.status(400).json({
          success: false,
          message: 'Тип операции не указан',
        });
      }

      if (!description) {
        console.error('Admin Points API: Описание операции не указано');
        return res.status(400).json({
          success: false,
          message: 'Описание операции не указано',
        });
      }

      // Проверяем, что userId соответствует id из URL
      if (userId && userId !== id) {
        console.error('Admin Points API: Несоответствие ID пользователя');
        return res.status(400).json({
          success: false,
          message: 'Несоответствие ID пользователя',
        });
      }

      const result = await withPrisma(async (prisma) => {
        // Проверяем, что пользователь существует
        const existingUser = await prisma.user.findUnique({
          where: { id },
          select: {
            id: true,
            name: true,
            email: true,
            userPoints: true,
          },
        });

        if (!existingUser) {
          throw new Error('Пользователь не найден');
        }

        console.log(`Admin Points API: Найден пользователь:`, {
          id: existingUser.id,
          name: existingUser.name,
          currentPoints: existingUser.userPoints?.points || 0,
        });

        // Получаем текущие баллы пользователя
        let currentPoints = 0;
        if (existingUser.userPoints) {
          currentPoints = existingUser.userPoints.points;
        }

        // Вычисляем новое количество баллов
        const newPoints = Math.max(0, currentPoints + amount); // Не позволяем баллам стать отрицательными

        console.log(`Admin Points API: Изменение баллов:`, {
          currentPoints,
          amount,
          newPoints,
        });

        // Обновляем или создаем запись UserPoints
        const updatedUserPoints = await prisma.userPoints.upsert({
          where: { userId: id },
          update: {
            points: newPoints,
          },
          create: {
            userId: id,
            points: newPoints,
          },
        });

        // Создаем запись в истории транзакций
        await prisma.pointsTransaction.create({
          data: {
            userId: id,
            amount: amount,
            type: type,
            description: description,
          },
        });

        // Получаем обновленную информацию о пользователе
        const updatedUser = await prisma.user.findUnique({
          where: { id },
          select: {
            id: true,
            name: true,
            email: true,
            userPoints: true,
          },
        });

        return { updatedUser, previousPoints: currentPoints, newPoints };
      });

      // Логируем действие администратора
      await logAdminAction(req.admin.id, 'update_user_points', 'user', id, {
        previousPoints: result.previousPoints,
        newPoints: result.newPoints,
        amount: amount,
        type: type,
        description: description,
      });

      console.log(
        `Admin Points API: Баллы пользователя ${id} успешно обновлены с ${result.previousPoints} до ${result.newPoints}`
      );

      // Возвращаем обновленную информацию о пользователе
      return res.status(200).json({
        success: true,
        user: {
          id: result.updatedUser.id,
          name: result.updatedUser.name,
          points: result.updatedUser.userPoints?.points || 0,
        },
        message: 'Баллы пользователя успешно обновлены',
      });
    } catch (error) {
      console.error(
        'Admin Points API: Ошибка при изменении баллов пользователя:',
        error
      );
      return res.status(500).json({
        success: false,
        message:
          error.message || 'Ошибка сервера при изменении баллов пользователя',
      });
    }
  }

  // Если метод запроса не поддерживается
  console.error(`Admin Points API: Неподдерживаемый метод ${req.method}`);
  return res.status(405).json({
    success: false,
    message: 'Метод не поддерживается',
  });
}

export default withAdminAuth(handler);
