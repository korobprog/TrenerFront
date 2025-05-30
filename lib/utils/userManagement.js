import prisma from '../prisma';
import {
  hashPassword,
  validatePassword,
  validateEmail,
  validateUsername,
} from './passwordUtils';

/**
 * Утилиты для управления пользователями
 */

/**
 * Создает нового пользователя с паролем
 * @param {Object} userData - Данные пользователя
 * @param {string} userData.email - Email пользователя
 * @param {string} userData.password - Пароль пользователя
 * @param {string} userData.name - Имя пользователя
 * @param {string} userData.role - Роль пользователя (по умолчанию 'user')
 * @returns {Promise<Object>} - Созданный пользователь (без пароля)
 */
export async function createUserWithPassword(userData) {
  const { email, password, name, role = 'user' } = userData;

  // Валидация email
  if (!validateEmail(email)) {
    throw new Error('Неверный формат email адреса');
  }

  // Валидация пароля
  const passwordValidation = validatePassword(password);
  if (!passwordValidation.isValid) {
    throw new Error(
      `Пароль не соответствует требованиям: ${passwordValidation.errors.join(
        ', '
      )}`
    );
  }

  // Проверка существования пользователя
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new Error('Пользователь с таким email уже существует');
  }

  // Хеширование пароля
  const hashedPassword = await hashPassword(password);

  try {
    // Создание пользователя
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        isBlocked: true,
      },
    });

    console.log('Создан новый пользователь:', {
      id: user.id,
      email: user.email,
      role: user.role,
    });
    return user;
  } catch (error) {
    console.error('Ошибка при создании пользователя:', error);
    throw new Error('Не удалось создать пользователя');
  }
}

/**
 * Обновляет пароль пользователя
 * @param {string} userId - ID пользователя
 * @param {string} newPassword - Новый пароль
 * @returns {Promise<boolean>} - true если пароль обновлен успешно
 */
export async function updateUserPassword(userId, newPassword) {
  // Валидация пароля
  const passwordValidation = validatePassword(newPassword);
  if (!passwordValidation.isValid) {
    throw new Error(
      `Пароль не соответствует требованиям: ${passwordValidation.errors.join(
        ', '
      )}`
    );
  }

  // Проверка существования пользователя
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error('Пользователь не найден');
  }

  // Хеширование нового пароля
  const hashedPassword = await hashPassword(newPassword);

  try {
    await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        updatedAt: new Date(),
      },
    });

    console.log('Пароль пользователя обновлен:', { userId, email: user.email });
    return true;
  } catch (error) {
    console.error('Ошибка при обновлении пароля:', error);
    throw new Error('Не удалось обновить пароль');
  }
}

/**
 * Создает суперадминистратора с паролем
 * @param {Object} adminData - Данные администратора
 * @param {string} adminData.email - Email администратора
 * @param {string} adminData.password - Пароль администратора
 * @param {string} adminData.name - Имя администратора
 * @returns {Promise<Object>} - Созданный администратор
 */
export async function createSuperAdmin(adminData) {
  const { email, password, name } = adminData;

  try {
    const admin = await createUserWithPassword({
      email,
      password,
      name,
      role: 'superadmin',
    });

    console.log('Создан суперадминистратор:', {
      id: admin.id,
      email: admin.email,
    });
    return admin;
  } catch (error) {
    console.error('Ошибка при создании суперадминистратора:', error);
    throw error;
  }
}

/**
 * Создает администратора с паролем
 * @param {Object} adminData - Данные администратора
 * @param {string} adminData.email - Email администратора
 * @param {string} adminData.password - Пароль администратора
 * @param {string} adminData.name - Имя администратора
 * @returns {Promise<Object>} - Созданный администратор
 */
export async function createAdmin(adminData) {
  const { email, password, name } = adminData;

  try {
    const admin = await createUserWithPassword({
      email,
      password,
      name,
      role: 'admin',
    });

    console.log('Создан администратор:', { id: admin.id, email: admin.email });
    return admin;
  } catch (error) {
    console.error('Ошибка при создании администратора:', error);
    throw error;
  }
}

/**
 * Блокирует/разблокирует пользователя
 * @param {string} userId - ID пользователя
 * @param {boolean} isBlocked - Статус блокировки
 * @returns {Promise<boolean>} - true если статус обновлен успешно
 */
export async function updateUserBlockStatus(userId, isBlocked) {
  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        isBlocked,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        email: true,
        isBlocked: true,
      },
    });

    console.log(
      `Пользователь ${isBlocked ? 'заблокирован' : 'разблокирован'}:`,
      {
        id: user.id,
        email: user.email,
      }
    );

    return true;
  } catch (error) {
    console.error('Ошибка при обновлении статуса блокировки:', error);
    throw new Error('Не удалось обновить статус пользователя');
  }
}

/**
 * Получает пользователя по email
 * @param {string} email - Email пользователя
 * @returns {Promise<Object|null>} - Пользователь или null
 */
export async function getUserByEmail(email) {
  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isBlocked: true,
        createdAt: true,
        lastLoginAt: true,
      },
    });

    return user;
  } catch (error) {
    console.error('Ошибка при поиске пользователя:', error);
    return null;
  }
}

/**
 * Проверяет, существует ли суперадминистратор
 * @returns {Promise<boolean>} - true если суперадминистратор существует
 */
export async function hasSuperAdmin() {
  try {
    const superAdmin = await prisma.user.findFirst({
      where: { role: 'superadmin' },
    });

    return !!superAdmin;
  } catch (error) {
    console.error(
      'Ошибка при проверке существования суперадминистратора:',
      error
    );
    return false;
  }
}

/**
 * Мигрирует существующего суперадминистратора на новую систему паролей
 * @param {string} newPassword - Новый пароль для суперадминистратора
 * @returns {Promise<boolean>} - true если миграция успешна
 */
export async function migrateSuperAdminPassword(newPassword) {
  try {
    const superAdmin = await prisma.user.findFirst({
      where: { role: 'superadmin' },
    });

    if (!superAdmin) {
      throw new Error('Суперадминистратор не найден');
    }

    // Обновляем пароль суперадминистратора
    await updateUserPassword(superAdmin.id, newPassword);

    console.log('Пароль суперадминистратора успешно мигрирован');
    return true;
  } catch (error) {
    console.error('Ошибка при миграции пароля суперадминистратора:', error);
    throw error;
  }
}
