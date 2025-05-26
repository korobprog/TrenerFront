import {
  withSuperAdminAuth,
  logSuperAdminAction,
} from '../../../../../lib/middleware/superAdminAuth';
import { withPrisma } from '../../../../../lib/prisma';
import bcrypt from 'bcrypt';

/**
 * API для управления отдельным администратором (получение, обновление, удаление)
 * @param {Object} req - HTTP запрос
 * @param {Object} res - HTTP ответ
 */
async function handler(req, res) {
  const { method } = req;
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ message: 'Не указан ID администратора' });
  }

  switch (method) {
    case 'GET':
      return getAdmin(req, res, id);
    case 'PATCH':
      return updateAdmin(req, res, id);
    case 'DELETE':
      return deleteAdmin(req, res, id);
    default:
      res.setHeader('Allow', ['GET', 'PATCH', 'DELETE']);
      return res.status(405).json({ message: `Метод ${method} не разрешен` });
  }
}

/**
 * Получение информации об администраторе
 * @param {Object} req - HTTP запрос
 * @param {Object} res - HTTP ответ
 * @param {string} id - ID администратора
 */
async function getAdmin(req, res, id) {
  try {
    // Получаем администратора из базы данных
    const admin = await withPrisma(async (prisma) => {
      return await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          image: true,
          isBlocked: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              adminActions: true,
            },
          },
          adminActions: {
            take: 10,
            orderBy: {
              createdAt: 'desc',
            },
            select: {
              id: true,
              action: true,
              entityType: true,
              entityId: true,
              details: true,
              createdAt: true,
            },
          },
        },
      });
    });

    // Если администратор не найден, возвращаем ошибку
    if (!admin) {
      return res.status(404).json({ message: 'Администратор не найден' });
    }

    // Проверяем, является ли пользователь администратором или супер-администратором
    if (admin.role !== 'admin' && admin.role !== 'superadmin') {
      return res
        .status(400)
        .json({
          message: 'Указанный пользователь не является администратором',
        });
    }

    // Форматируем данные для ответа
    const formattedAdmin = {
      id: admin.id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
      image: admin.image,
      isBlocked: admin.isBlocked,
      lastLoginAt: admin.lastLoginAt,
      createdAt: admin.createdAt,
      updatedAt: admin.updatedAt,
      actionsCount: admin._count.adminActions,
      recentActions: admin.adminActions,
    };

    // Возвращаем информацию об администраторе
    return res.status(200).json({ admin: formattedAdmin });
  } catch (error) {
    console.error('Ошибка при получении информации об администраторе:', error);
    return res
      .status(500)
      .json({
        message: 'Ошибка сервера при получении информации об администраторе',
      });
  }
}

/**
 * Обновление информации об администраторе
 * @param {Object} req - HTTP запрос
 * @param {Object} res - HTTP ответ
 * @param {string} id - ID администратора
 */
async function updateAdmin(req, res, id) {
  try {
    const { name, email, password, role, isBlocked } = req.body;
    const updateData = {};
    const logDetails = {};

    // Проверяем, существует ли администратор
    const existingAdmin = await withPrisma(async (prisma) => {
      return await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          email: true,
          role: true,
          isBlocked: true,
        },
      });
    });

    if (!existingAdmin) {
      return res.status(404).json({ message: 'Администратор не найден' });
    }

    // Проверяем, является ли пользователь администратором или супер-администратором
    if (existingAdmin.role !== 'admin' && existingAdmin.role !== 'superadmin') {
      return res
        .status(400)
        .json({
          message: 'Указанный пользователь не является администратором',
        });
    }

    // Запрещаем супер-администратору блокировать самого себя
    if (id === req.superAdmin.id && isBlocked === true) {
      return res
        .status(400)
        .json({
          message: 'Невозможно заблокировать собственную учетную запись',
        });
    }

    // Формируем данные для обновления
    if (name !== undefined) {
      updateData.name = name;
      logDetails.name = name;
    }

    if (email !== undefined && email !== existingAdmin.email) {
      // Проверяем, не занят ли email другим пользователем
      const emailExists = await withPrisma(async (prisma) => {
        return await prisma.user.findFirst({
          where: {
            email,
            id: { not: id },
          },
        });
      });

      if (emailExists) {
        return res
          .status(400)
          .json({ message: 'Пользователь с таким email уже существует' });
      }

      updateData.email = email;
      logDetails.email = email;
    }

    if (password) {
      // Хешируем новый пароль
      updateData.password = await bcrypt.hash(password, 10);
      logDetails.passwordChanged = true;
    }

    if (role !== undefined) {
      // Проверяем корректность роли
      if (role !== 'admin' && role !== 'superadmin') {
        return res
          .status(400)
          .json({
            message:
              'Некорректная роль. Допустимые значения: admin, superadmin',
          });
      }

      // Запрещаем супер-администратору понижать свою роль
      if (id === req.superAdmin.id && role !== 'superadmin') {
        return res
          .status(400)
          .json({
            message: 'Невозможно понизить роль собственной учетной записи',
          });
      }

      updateData.role = role;
      logDetails.role = role;
    }

    if (isBlocked !== undefined) {
      updateData.isBlocked = isBlocked;
      logDetails.isBlocked = isBlocked;
    }

    // Если нет данных для обновления, возвращаем ошибку
    if (Object.keys(updateData).length === 0) {
      return res
        .status(400)
        .json({ message: 'Не указаны данные для обновления' });
    }

    // Обновляем администратора в базе данных
    const updatedAdmin = await withPrisma(async (prisma) => {
      return await prisma.user.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isBlocked: true,
          updatedAt: true,
        },
      });
    });

    // Логируем действие супер-администратора
    await logSuperAdminAction(
      req.superAdmin.id,
      'update_admin',
      'user',
      id,
      logDetails
    );

    // Возвращаем обновленные данные администратора
    return res.status(200).json({
      message: 'Информация об администраторе успешно обновлена',
      admin: updatedAdmin,
    });
  } catch (error) {
    console.error('Ошибка при обновлении информации об администраторе:', error);
    return res
      .status(500)
      .json({
        message: 'Ошибка сервера при обновлении информации об администраторе',
      });
  }
}

/**
 * Удаление администратора
 * @param {Object} req - HTTP запрос
 * @param {Object} res - HTTP ответ
 * @param {string} id - ID администратора
 */
async function deleteAdmin(req, res, id) {
  try {
    // Проверяем, существует ли администратор
    const existingAdmin = await withPrisma(async (prisma) => {
      return await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      });
    });

    if (!existingAdmin) {
      return res.status(404).json({ message: 'Администратор не найден' });
    }

    // Проверяем, является ли пользователь администратором или супер-администратором
    if (existingAdmin.role !== 'admin' && existingAdmin.role !== 'superadmin') {
      return res
        .status(400)
        .json({
          message: 'Указанный пользователь не является администратором',
        });
    }

    // Запрещаем супер-администратору удалять самого себя
    if (id === req.superAdmin.id) {
      return res
        .status(400)
        .json({ message: 'Невозможно удалить собственную учетную запись' });
    }

    // Удаляем администратора из базы данных
    await withPrisma(async (prisma) => {
      return await prisma.user.delete({
        where: { id },
      });
    });

    // Логируем действие супер-администратора
    await logSuperAdminAction(req.superAdmin.id, 'delete_admin', 'user', id, {
      name: existingAdmin.name,
      email: existingAdmin.email,
      role: existingAdmin.role,
    });

    // Возвращаем успешный ответ
    return res.status(200).json({
      message: 'Администратор успешно удален',
      adminId: id,
    });
  } catch (error) {
    console.error('Ошибка при удалении администратора:', error);
    return res
      .status(500)
      .json({ message: 'Ошибка сервера при удалении администратора' });
  }
}

// Оборачиваем обработчик в middleware для проверки прав супер-администратора
export default withSuperAdminAuth(handler);
