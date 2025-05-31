import {
  withAdminAuth,
  logAdminAction,
} from '../../../lib/middleware/adminAuth';
import { withPrisma } from '../../../lib/prisma';

/**
 * API эндпоинт для управления пользователями
 * Доступен администраторам и супер-администраторам
 */
async function handler(req, res) {
  try {
    console.log(
      'Admin Users API: Запрос от администратора:',
      req.admin.id,
      'Метод:',
      req.method
    );

    switch (req.method) {
      case 'GET':
        return await handleGetUsers(req, res);
      case 'PUT':
        return await handleUpdateUser(req, res);
      case 'DELETE':
        return await handleDeleteUser(req, res);
      default:
        return res.status(405).json({ message: 'Метод не поддерживается' });
    }
  } catch (error) {
    console.error('Admin Users API: Общая ошибка:', error);
    return res.status(500).json({
      success: false,
      message: 'Внутренняя ошибка сервера',
    });
  }
}

/**
 * Получение списка пользователей с пагинацией
 */
async function handleGetUsers(req, res) {
  try {
    const {
      page = 1,
      limit = 20,
      search = '',
      role = '',
      status = '',
    } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    console.log('Admin Users API: Параметры запроса:', {
      page: pageNum,
      limit: limitNum,
      search,
      role,
      status,
    });

    const users = await withPrisma(async (prisma) => {
      // Строим условия фильтрации
      const where = {};

      if (search) {
        where.OR = [
          { email: { contains: search, mode: 'insensitive' } },
          { name: { contains: search, mode: 'insensitive' } },
        ];
      }

      if (role && role !== 'all') {
        where.role = role;
      }

      if (status === 'blocked') {
        where.isBlocked = true;
      } else if (status === 'active') {
        where.isBlocked = false;
      }

      // Получаем пользователей с пагинацией
      const [usersList, totalCount] = await Promise.all([
        prisma.user.findMany({
          where,
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isBlocked: true,
            createdAt: true,
            lastLoginAt: true,
            conductedInterviewsCount: true,
            userPoints: {
              select: {
                points: true,
              },
            },
            _count: {
              select: {
                interviewerSessions: true,
                intervieweeSessions: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
          skip,
          take: limitNum,
        }),
        prisma.user.count({ where }),
      ]);

      return {
        users: usersList.map((user) => ({
          ...user,
          points: user.userPoints?.points || 0,
          totalInterviews:
            user._count.interviewerSessions + user._count.intervieweeSessions,
        })),
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: totalCount,
          pages: Math.ceil(totalCount / limitNum),
        },
      };
    });

    // Логируем действие администратора
    await logAdminAction(req.admin.id, 'VIEW_USERS', 'USER', 'list', {
      filters: { search, role, status },
      pagination: { page: pageNum, limit: limitNum },
    });

    console.log(
      'Admin Users API: Список пользователей успешно получен, количество:',
      users.users.length
    );
    return res.status(200).json({
      success: true,
      data: users,
    });
  } catch (error) {
    console.error(
      'Admin Users API: Ошибка при получении пользователей:',
      error
    );
    return res.status(500).json({
      success: false,
      message: 'Ошибка при получении списка пользователей',
    });
  }
}

/**
 * Изменение роли пользователя
 */
async function handleUpdateUser(req, res) {
  try {
    const { userId, role, isBlocked } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'ID пользователя обязателен',
      });
    }

    // Валидация роли
    const validRoles = ['user', 'admin', 'superadmin'];
    if (role && !validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Недопустимая роль пользователя',
      });
    }

    console.log('Admin Users API: Обновление пользователя:', {
      userId,
      role,
      isBlocked,
    });

    const updatedUser = await withPrisma(async (prisma) => {
      // Проверяем, что пользователь существует
      const existingUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, role: true, isBlocked: true },
      });

      if (!existingUser) {
        throw new Error('Пользователь не найден');
      }

      // Запрещаем изменение собственной роли
      if (userId === req.admin.id && role && role !== existingUser.role) {
        throw new Error('Нельзя изменить собственную роль');
      }

      // Подготавливаем данные для обновления
      const updateData = {};
      if (role !== undefined) updateData.role = role;
      if (isBlocked !== undefined) updateData.isBlocked = isBlocked;

      // Обновляем пользователя
      const user = await prisma.user.update({
        where: { id: userId },
        data: updateData,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isBlocked: true,
          createdAt: true,
          lastLoginAt: true,
        },
      });

      return { user, previousData: existingUser };
    });

    // Логируем действие администратора
    await logAdminAction(req.admin.id, 'UPDATE_USER', 'USER', userId, {
      changes: { role, isBlocked },
      previousData: updatedUser.previousData,
    });

    console.log('Admin Users API: Пользователь успешно обновлен:', userId);
    return res.status(200).json({
      success: true,
      data: updatedUser.user,
      message: 'Пользователь успешно обновлен',
    });
  } catch (error) {
    console.error(
      'Admin Users API: Ошибка при обновлении пользователя:',
      error
    );
    return res.status(500).json({
      success: false,
      message: error.message || 'Ошибка при обновлении пользователя',
    });
  }
}

/**
 * Удаление пользователя
 */
async function handleDeleteUser(req, res) {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'ID пользователя обязателен',
      });
    }

    // Запрещаем удаление самого себя
    if (userId === req.admin.id) {
      return res.status(400).json({
        success: false,
        message: 'Нельзя удалить собственный аккаунт',
      });
    }

    console.log('Admin Users API: Удаление пользователя:', userId);

    const deletedUser = await withPrisma(async (prisma) => {
      // Проверяем, что пользователь существует
      const existingUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, role: true },
      });

      if (!existingUser) {
        throw new Error('Пользователь не найден');
      }

      // Удаляем пользователя (каскадное удаление настроено в схеме)
      await prisma.user.delete({
        where: { id: userId },
      });

      return existingUser;
    });

    // Логируем действие администратора
    await logAdminAction(req.admin.id, 'DELETE_USER', 'USER', userId, {
      deletedUser: {
        email: deletedUser.email,
        role: deletedUser.role,
      },
    });

    console.log('Admin Users API: Пользователь успешно удален:', userId);
    return res.status(200).json({
      success: true,
      message: 'Пользователь успешно удален',
    });
  } catch (error) {
    console.error('Admin Users API: Ошибка при удалении пользователя:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Ошибка при удалении пользователя',
    });
  }
}

export default withAdminAuth(handler);
