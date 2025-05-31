import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import { withPrisma } from '../../../../lib/prisma';

/**
 * API для управления администраторами (только для супер-администраторов)
 * GET - получение списка администраторов с пагинацией и сортировкой
 * POST - создание нового администратора
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

    if (req.method === 'GET') {
      return await handleGetAdmins(req, res);
    } else if (req.method === 'POST') {
      return await handleCreateAdmin(req, res);
    } else {
      res.setHeader('Allow', ['GET', 'POST']);
      return res.status(405).json({
        success: false,
        message: `Метод ${req.method} не поддерживается`,
      });
    }
  } catch (error) {
    console.error('Ошибка в API управления администраторами:', error);
    return res.status(500).json({
      success: false,
      message: 'Внутренняя ошибка сервера',
    });
  }
}

/**
 * Обработчик GET запроса - получение списка администраторов
 */
async function handleGetAdmins(req, res) {
  return withPrisma(async (prisma) => {
    try {
      const {
        page = 1,
        limit = 10,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        search = '',
      } = req.query;

      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const skip = (pageNum - 1) * limitNum;

      // Формируем условия поиска
      const searchConditions = search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {};

      // Условия для фильтрации только администраторов
      const whereConditions = {
        AND: [
          {
            role: {
              in: ['admin', 'superadmin'],
            },
          },
          searchConditions,
        ],
      };

      // Получаем общее количество администраторов
      const total = await prisma.user.count({
        where: whereConditions,
      });

      // Получаем список администраторов с пагинацией
      const admins = await prisma.user.findMany({
        where: whereConditions,
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
        orderBy: {
          [sortBy]: sortOrder,
        },
        skip,
        take: limitNum,
      });

      // Добавляем количество действий для каждого администратора
      const adminsWithActions = admins.map((admin) => ({
        ...admin,
        actionsCount: admin._count.adminActions,
      }));

      const totalPages = Math.ceil(total / limitNum);

      return res.status(200).json({
        success: true,
        admins: adminsWithActions,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: totalPages,
        },
      });
    } catch (error) {
      console.error('Ошибка при получении списка администраторов:', error);
      return res.status(500).json({
        success: false,
        message: 'Ошибка при получении списка администраторов',
      });
    }
  });
}

/**
 * Обработчик POST запроса - создание нового администратора
 */
async function handleCreateAdmin(req, res) {
  return withPrisma(async (prisma) => {
    try {
      const { name, email, role = 'admin' } = req.body;

      // Валидация входных данных
      if (!name || !email) {
        return res.status(400).json({
          success: false,
          message: 'Имя и email обязательны для заполнения',
        });
      }

      if (!['admin', 'superadmin'].includes(role)) {
        return res.status(400).json({
          success: false,
          message: 'Недопустимая роль. Разрешены только admin и superadmin',
        });
      }

      // Проверяем, не существует ли уже пользователь с таким email
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'Пользователь с таким email уже существует',
        });
      }

      // Создаем нового администратора
      const newAdmin = await prisma.user.create({
        data: {
          name,
          email,
          role,
          isBlocked: false,
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isBlocked: true,
          createdAt: true,
        },
      });

      // Логируем создание администратора
      await prisma.adminActionLog.create({
        data: {
          adminId: req.session?.user?.id || 'system',
          action: 'CREATE_ADMIN',
          entityType: 'USER',
          entityId: newAdmin.id,
          details: {
            message: `Создан новый администратор: ${name} (${email}) с ролью ${role}`,
            name,
            email,
            role,
          },
        },
      });

      return res.status(201).json({
        success: true,
        message: 'Администратор успешно создан',
        admin: newAdmin,
      });
    } catch (error) {
      console.error('Ошибка при создании администратора:', error);
      return res.status(500).json({
        success: false,
        message: 'Ошибка при создании администратора',
      });
    }
  });
}
