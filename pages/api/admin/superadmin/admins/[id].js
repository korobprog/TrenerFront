import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth/[...nextauth]';
import { withPrisma } from '../../../../../lib/prisma';

/**
 * API для управления отдельным администратором (только для супер-администраторов)
 * GET - получение информации об администраторе
 * PATCH - обновление администратора (блокировка/разблокировка, изменение роли)
 * DELETE - удаление администратора
 */
export default async function handler(req, res) {
  try {
    // Проверяем аутентификацию и права супер-администратора
    const session = await getServerSession(req, res, authOptions);

    if (!session || !session.user) {
      return res.status(401).json({
        success: false,
        message: 'Необходима авторизация',
      });
    }

    if (session.user.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Доступ запрещен. Требуются права супер-администратора',
      });
    }

    const { id } = req.query;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'ID администратора обязателен',
      });
    }

    if (req.method === 'GET') {
      return await handleGetAdmin(req, res, id);
    } else if (req.method === 'PATCH') {
      return await handleUpdateAdmin(req, res, id, session.user.id);
    } else if (req.method === 'DELETE') {
      return await handleDeleteAdmin(req, res, id, session.user.id);
    } else {
      res.setHeader('Allow', ['GET', 'PATCH', 'DELETE']);
      return res.status(405).json({
        success: false,
        message: `Метод ${req.method} не поддерживается`,
      });
    }
  } catch (error) {
    console.error('Ошибка в API управления администратором:', error);
    return res.status(500).json({
      success: false,
      message: 'Внутренняя ошибка сервера',
    });
  }
}

/**
 * Обработчик GET запроса - получение информации об администраторе
 */
async function handleGetAdmin(req, res, adminId) {
  return withPrisma(async (prisma) => {
    try {
      const admin = await prisma.user.findUnique({
        where: {
          id: adminId,
          role: {
            in: ['admin', 'superadmin'],
          },
        },
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          role: true,
          isBlocked: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              adminActions: true,
            },
          },
        },
      });

      if (!admin) {
        return res.status(404).json({
          success: false,
          message: 'Администратор не найден',
        });
      }

      // Получаем последние действия администратора
      const recentActions = await prisma.adminActionLog.findMany({
        where: { adminId: adminId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          action: true,
          details: true,
          createdAt: true,
        },
      });

      return res.status(200).json({
        success: true,
        admin: {
          ...admin,
          actionsCount: admin._count.adminActions,
          recentActions,
        },
      });
    } catch (error) {
      console.error(
        'Ошибка при получении информации об администраторе:',
        error
      );
      return res.status(500).json({
        success: false,
        message: 'Ошибка при получении информации об администраторе',
      });
    }
  });
}

/**
 * Обработчик PATCH запроса - обновление администратора
 */
async function handleUpdateAdmin(req, res, adminId, currentUserId) {
  return withPrisma(async (prisma) => {
    try {
      const { isBlocked, role } = req.body;

      // Проверяем, что администратор существует
      const existingAdmin = await prisma.user.findUnique({
        where: {
          id: adminId,
          role: {
            in: ['admin', 'superadmin'],
          },
        },
      });

      if (!existingAdmin) {
        return res.status(404).json({
          success: false,
          message: 'Администратор не найден',
        });
      }

      // Запрещаем блокировать самого себя
      if (adminId === currentUserId && isBlocked === true) {
        return res.status(400).json({
          success: false,
          message: 'Невозможно заблокировать собственную учетную запись',
        });
      }

      // Формируем данные для обновления
      const updateData = {};
      if (typeof isBlocked === 'boolean') {
        updateData.isBlocked = isBlocked;
      }
      if (role && ['admin', 'superadmin'].includes(role)) {
        updateData.role = role;
      }

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Нет данных для обновления',
        });
      }

      // Обновляем администратора
      const updatedAdmin = await prisma.user.update({
        where: { id: adminId },
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

      // Логируем изменения
      const changes = [];
      if (typeof isBlocked === 'boolean') {
        changes.push(
          `статус блокировки: ${isBlocked ? 'заблокирован' : 'разблокирован'}`
        );
      }
      if (role) {
        changes.push(`роль: ${role}`);
      }

      await prisma.adminActionLog.create({
        data: {
          adminId: currentUserId,
          action: 'UPDATE_ADMIN',
          entityType: 'USER',
          entityId: adminId,
          details: {
            message: `Обновлен администратор ${existingAdmin.name} (${
              existingAdmin.email
            }): ${changes.join(', ')}`,
            changes: changes,
            targetUser: {
              name: existingAdmin.name,
              email: existingAdmin.email,
            },
          },
        },
      });

      return res.status(200).json({
        success: true,
        message: 'Администратор успешно обновлен',
        admin: updatedAdmin,
      });
    } catch (error) {
      console.error('Ошибка при обновлении администратора:', error);
      return res.status(500).json({
        success: false,
        message: 'Ошибка при обновлении администратора',
      });
    }
  });
}

/**
 * Обработчик DELETE запроса - удаление администратора
 */
async function handleDeleteAdmin(req, res, adminId, currentUserId) {
  return withPrisma(async (prisma) => {
    try {
      // Запрещаем удалять самого себя
      if (adminId === currentUserId) {
        return res.status(400).json({
          success: false,
          message: 'Невозможно удалить собственную учетную запись',
        });
      }

      // Проверяем, что администратор существует
      const existingAdmin = await prisma.user.findUnique({
        where: {
          id: adminId,
          role: {
            in: ['admin', 'superadmin'],
          },
        },
      });

      if (!existingAdmin) {
        return res.status(404).json({
          success: false,
          message: 'Администратор не найден',
        });
      }

      // Удаляем администратора
      await prisma.user.delete({
        where: { id: adminId },
      });

      // Логируем удаление
      await prisma.adminActionLog.create({
        data: {
          adminId: currentUserId,
          action: 'DELETE_ADMIN',
          entityType: 'USER',
          entityId: adminId,
          details: {
            message: `Удален администратор ${existingAdmin.name} (${existingAdmin.email}) с ролью ${existingAdmin.role}`,
            deletedUser: {
              name: existingAdmin.name,
              email: existingAdmin.email,
              role: existingAdmin.role,
            },
          },
        },
      });

      return res.status(200).json({
        success: true,
        message: 'Администратор успешно удален',
      });
    } catch (error) {
      console.error('Ошибка при удалении администратора:', error);
      return res.status(500).json({
        success: false,
        message: 'Ошибка при удалении администратора',
      });
    }
  });
}
