import {
  withAdminAuth,
  logAdminAction,
} from '../../../../lib/middleware/adminAuth';
import prisma from '../../../../lib/prisma';

/**
 * Обработчик API запросов для управления конкретным пользователем
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

  // Обработка GET запроса - получение детальной информации о пользователе
  if (req.method === 'GET') {
    try {
      // Получаем пользователя из базы данных
      const user = await prisma.user.findUnique({
        where: { id },
        include: {
          userPoints: true,
          interviewerSessions: {
            take: 5,
            orderBy: { scheduledTime: 'desc' },
            include: {
              interviewee: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  image: true,
                },
              },
              interviewFeedback: true,
            },
          },
          intervieweeSessions: {
            take: 5,
            orderBy: { scheduledTime: 'desc' },
            include: {
              interviewer: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  image: true,
                },
              },
              interviewFeedback: true,
            },
          },
          violations: {
            orderBy: { createdAt: 'desc' },
          },
          pointsTransactions: {
            take: 10,
            orderBy: { createdAt: 'desc' },
          },
          _count: {
            select: {
              interviewerSessions: true,
              intervieweeSessions: true,
              violations: true,
              pointsTransactions: true,
            },
          },
        },
      });

      // Если пользователь не найден, возвращаем ошибку
      if (!user) {
        return res.status(404).json({ message: 'Пользователь не найден' });
      }

      // Логируем действие администратора
      await logAdminAction(req.admin.id, 'view_user_details', 'user', id, {});

      // Возвращаем информацию о пользователе
      return res.status(200).json(user);
    } catch (error) {
      console.error('Ошибка при получении информации о пользователе:', error);
      return res
        .status(500)
        .json({
          message: 'Ошибка сервера при получении информации о пользователе',
        });
    }
  }

  // Обработка PATCH запроса - обновление информации о пользователе
  if (req.method === 'PATCH') {
    try {
      const { name, email, role, isBlocked } = req.body;

      // Проверяем, что пользователь существует
      const existingUser = await prisma.user.findUnique({
        where: { id },
        select: { id: true, role: true, isBlocked: true },
      });

      if (!existingUser) {
        return res.status(404).json({ message: 'Пользователь не найден' });
      }

      // Формируем данные для обновления
      const updateData = {};

      if (name !== undefined) updateData.name = name;
      if (email !== undefined) updateData.email = email;
      if (role !== undefined) updateData.role = role;
      if (isBlocked !== undefined) updateData.isBlocked = isBlocked;

      // Обновляем пользователя
      const updatedUser = await prisma.user.update({
        where: { id },
        data: updateData,
        include: {
          userPoints: true,
        },
      });

      // Логируем действие администратора
      await logAdminAction(
        req.admin.id,
        isBlocked !== undefined
          ? isBlocked
            ? 'block_user'
            : 'unblock_user'
          : 'update_user',
        'user',
        id,
        {
          previousData: {
            role: existingUser.role,
            isBlocked: existingUser.isBlocked,
          },
          updatedData: updateData,
        }
      );

      // Возвращаем обновленную информацию о пользователе
      return res.status(200).json(updatedUser);
    } catch (error) {
      console.error('Ошибка при обновлении пользователя:', error);
      return res
        .status(500)
        .json({ message: 'Ошибка сервера при обновлении пользователя' });
    }
  }

  // Обработка DELETE запроса - удаление пользователя
  if (req.method === 'DELETE') {
    try {
      // Проверяем, что пользователь существует
      const existingUser = await prisma.user.findUnique({
        where: { id },
        select: { id: true, name: true, email: true },
      });

      if (!existingUser) {
        return res.status(404).json({ message: 'Пользователь не найден' });
      }

      // Удаляем пользователя
      await prisma.user.delete({
        where: { id },
      });

      // Логируем действие администратора
      await logAdminAction(req.admin.id, 'delete_user', 'user', id, {
        deletedUser: {
          id: existingUser.id,
          name: existingUser.name,
          email: existingUser.email,
        },
      });

      // Возвращаем успешный ответ
      return res.status(200).json({ message: 'Пользователь успешно удален' });
    } catch (error) {
      console.error('Ошибка при удалении пользователя:', error);
      return res
        .status(500)
        .json({ message: 'Ошибка сервера при удалении пользователя' });
    }
  }

  // Если метод запроса не поддерживается
  return res.status(405).json({ message: 'Метод не поддерживается' });
}

export default withAdminAuth(handler);
