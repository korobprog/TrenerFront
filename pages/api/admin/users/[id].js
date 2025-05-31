import {
  withAdminAuth,
  logAdminAction,
} from '../../../../lib/middleware/adminAuth';
import { withPrisma } from '../../../../lib/prisma';

/**
 * Обработчик API запросов для управления конкретным пользователем
 * @param {Object} req - HTTP запрос
 * @param {Object} res - HTTP ответ
 */
async function handler(req, res) {
  // Получаем ID пользователя из параметров запроса
  const { id } = req.query;

  console.log(
    `Admin User Details API: Запрос ${req.method} для пользователя ${id} от администратора ${req.admin.id}`
  );

  // Проверяем, что ID пользователя предоставлен
  if (!id) {
    console.error('Admin User Details API: ID пользователя не указан');
    return res.status(400).json({
      success: false,
      message: 'ID пользователя не указан',
    });
  }

  // Обработка GET запроса - получение детальной информации о пользователе
  if (req.method === 'GET') {
    try {
      console.log(
        `Admin User Details API: Получение информации о пользователе ${id}`
      );

      // Получаем пользователя из базы данных
      const user = await withPrisma(async (prisma) => {
        return await prisma.user.findUnique({
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
      });

      // Если пользователь не найден, возвращаем ошибку
      if (!user) {
        console.error(`Admin User Details API: Пользователь ${id} не найден`);
        return res.status(404).json({
          success: false,
          message: 'Пользователь не найден',
        });
      }

      // Логируем действие администратора
      await logAdminAction(req.admin.id, 'view_user_details', 'user', id, {});

      console.log(
        `Admin User Details API: Информация о пользователе ${id} успешно получена`
      );

      // 🔍 ДИАГНОСТИКА API: Логируем структуру возвращаемых данных
      console.log('🔍 ДИАГНОСТИКА API: Структура user объекта:', {
        id: user.id,
        name: user.name,
        email: user.email,
        hasName: !!user.name,
        nameType: typeof user.name,
        nameValue: user.name,
      });

      // Возвращаем информацию о пользователе
      return res.status(200).json({
        success: true,
        data: user,
      });
    } catch (error) {
      console.error(
        'Admin User Details API: Ошибка при получении информации о пользователе:',
        error
      );
      return res.status(500).json({
        success: false,
        message: 'Ошибка сервера при получении информации о пользователе',
      });
    }
  }

  // Обработка PATCH запроса - обновление информации о пользователе
  if (req.method === 'PATCH') {
    try {
      const { name, email, role, isBlocked } = req.body;

      console.log(`Admin User Details API: Обновление пользователя ${id}:`, {
        name,
        email,
        role,
        isBlocked,
      });

      const result = await withPrisma(async (prisma) => {
        // Проверяем, что пользователь существует
        const existingUser = await prisma.user.findUnique({
          where: { id },
          select: {
            id: true,
            role: true,
            isBlocked: true,
            name: true,
            email: true,
          },
        });

        if (!existingUser) {
          throw new Error('Пользователь не найден');
        }

        // Запрещаем изменение собственной роли или блокировку себя
        if (id === req.admin.id) {
          if (role !== undefined && role !== existingUser.role) {
            throw new Error('Нельзя изменить собственную роль');
          }
          if (isBlocked === true) {
            throw new Error('Нельзя заблокировать собственный аккаунт');
          }
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

        return { updatedUser, existingUser };
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
            role: result.existingUser.role,
            isBlocked: result.existingUser.isBlocked,
            name: result.existingUser.name,
            email: result.existingUser.email,
          },
          updatedData: { name, email, role, isBlocked },
        }
      );

      console.log(
        `Admin User Details API: Пользователь ${id} успешно обновлен`
      );

      // Возвращаем обновленную информацию о пользователе
      return res.status(200).json({
        success: true,
        data: result.updatedUser,
        message: 'Пользователь успешно обновлен',
      });
    } catch (error) {
      console.error(
        'Admin User Details API: Ошибка при обновлении пользователя:',
        error
      );
      return res.status(500).json({
        success: false,
        message: error.message || 'Ошибка сервера при обновлении пользователя',
      });
    }
  }

  // Обработка DELETE запроса - удаление пользователя
  if (req.method === 'DELETE') {
    try {
      console.log(`Admin User Details API: Удаление пользователя ${id}`);

      // Запрещаем удаление самого себя
      if (id === req.admin.id) {
        return res.status(400).json({
          success: false,
          message: 'Нельзя удалить собственный аккаунт',
        });
      }

      const deletedUser = await withPrisma(async (prisma) => {
        // Проверяем, что пользователь существует
        const existingUser = await prisma.user.findUnique({
          where: { id },
          select: { id: true, name: true, email: true, role: true },
        });

        if (!existingUser) {
          throw new Error('Пользователь не найден');
        }

        // Удаляем пользователя
        await prisma.user.delete({
          where: { id },
        });

        return existingUser;
      });

      // Логируем действие администратора
      await logAdminAction(req.admin.id, 'delete_user', 'user', id, {
        deletedUser: {
          id: deletedUser.id,
          name: deletedUser.name,
          email: deletedUser.email,
          role: deletedUser.role,
        },
      });

      console.log(`Admin User Details API: Пользователь ${id} успешно удален`);

      // Возвращаем успешный ответ
      return res.status(200).json({
        success: true,
        message: 'Пользователь успешно удален',
      });
    } catch (error) {
      console.error(
        'Admin User Details API: Ошибка при удалении пользователя:',
        error
      );
      return res.status(500).json({
        success: false,
        message: error.message || 'Ошибка сервера при удалении пользователя',
      });
    }
  }

  // Если метод запроса не поддерживается
  console.error(`Admin User Details API: Неподдерживаемый метод ${req.method}`);
  return res.status(405).json({
    success: false,
    message: 'Метод не поддерживается',
  });
}

export default withAdminAuth(handler);
