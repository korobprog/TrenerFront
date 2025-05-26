import {
  withSuperAdminAuth,
  logSuperAdminAction,
} from '../../../../../lib/middleware/superAdminAuth';
import { withPrisma } from '../../../../../lib/prisma';
import bcrypt from 'bcrypt';

/**
 * API для управления администраторами (список и создание)
 * @param {Object} req - HTTP запрос
 * @param {Object} res - HTTP ответ
 */
async function handler(req, res) {
  const { method } = req;

  switch (method) {
    case 'GET':
      return getAdmins(req, res);
    case 'POST':
      return createAdmin(req, res);
    default:
      res.setHeader('Allow', ['GET', 'POST']);
      return res.status(405).json({ message: `Метод ${method} не разрешен` });
  }
}

/**
 * Получение списка администраторов
 * @param {Object} req - HTTP запрос
 * @param {Object} res - HTTP ответ
 */
async function getAdmins(req, res) {
  try {
    // Получаем параметры пагинации из запроса
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Получаем параметры поиска
    const search = req.query.search || '';

    // Формируем условие поиска
    const where = {
      OR: [{ role: 'admin' }, { role: 'superadmin' }],
    };

    // Добавляем поиск по имени или email, если указан
    if (search) {
      where.OR = [
        ...where.OR,
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Получаем список администраторов из базы данных
    const [admins, totalCount] = await withPrisma(async (prisma) => {
      const admins = await prisma.user.findMany({
        where,
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
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      });

      const totalCount = await prisma.user.count({
        where,
      });

      return [admins, totalCount];
    });

    // Форматируем данные для ответа
    const formattedAdmins = admins.map((admin) => ({
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
    }));

    // Возвращаем список администраторов с метаданными пагинации
    return res.status(200).json({
      admins: formattedAdmins,
      pagination: {
        total: totalCount,
        page,
        limit,
        pages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error('Ошибка при получении списка администраторов:', error);
    return res
      .status(500)
      .json({ message: 'Ошибка сервера при получении списка администраторов' });
  }
}

/**
 * Создание нового администратора
 * @param {Object} req - HTTP запрос
 * @param {Object} res - HTTP ответ
 */
async function createAdmin(req, res) {
  try {
    const { name, email, password, role = 'admin' } = req.body;

    // Проверяем обязательные поля
    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ message: 'Необходимо указать имя, email и пароль' });
    }

    // Проверяем корректность роли
    if (role !== 'admin' && role !== 'superadmin') {
      return res
        .status(400)
        .json({
          message: 'Некорректная роль. Допустимые значения: admin, superadmin',
        });
    }

    // Проверяем, существует ли пользователь с таким email
    const existingUser = await withPrisma(async (prisma) => {
      return await prisma.user.findUnique({
        where: { email },
      });
    });

    if (existingUser) {
      return res
        .status(400)
        .json({ message: 'Пользователь с таким email уже существует' });
    }

    // Хешируем пароль
    const hashedPassword = await bcrypt.hash(password, 10);

    // Создаем нового администратора
    const newAdmin = await withPrisma(async (prisma) => {
      return await prisma.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          role,
          emailVerified: new Date(), // Устанавливаем emailVerified, чтобы не требовалась верификация
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
        },
      });
    });

    // Логируем действие супер-администратора
    await logSuperAdminAction(
      req.superAdmin.id,
      'create_admin',
      'user',
      newAdmin.id,
      { name, email, role }
    );

    // Возвращаем данные созданного администратора
    return res.status(201).json({
      message: 'Администратор успешно создан',
      admin: newAdmin,
    });
  } catch (error) {
    console.error('Ошибка при создании администратора:', error);
    return res
      .status(500)
      .json({ message: 'Ошибка сервера при создании администратора' });
  }
}

// Оборачиваем обработчик в middleware для проверки прав супер-администратора
export default withSuperAdminAuth(handler);
