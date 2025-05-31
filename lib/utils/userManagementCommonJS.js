/**
 * Утилиты для управления пользователями (CommonJS версия)
 */

const prisma = require('../prismaCommonJS');
const bcrypt = require('bcrypt');

// Количество раундов для хеширования (рекомендуется 12-15 для продакшена)
const SALT_ROUNDS = 12;

/**
 * Хеширует пароль с использованием bcrypt
 * @param {string} password - Пароль для хеширования
 * @returns {Promise<string>} - Хешированный пароль
 */
async function hashPassword(password) {
  if (!password || typeof password !== 'string') {
    throw new Error('Пароль должен быть непустой строкой');
  }

  if (password.length < 6) {
    throw new Error('Пароль должен содержать минимум 6 символов');
  }

  try {
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    return hashedPassword;
  } catch (error) {
    console.error('Ошибка при хешировании пароля:', error);
    throw new Error('Не удалось хешировать пароль');
  }
}

/**
 * Проверяет соответствие пароля хешу
 * @param {string} password - Пароль для проверки
 * @param {string} hashedPassword - Хешированный пароль
 * @returns {Promise<boolean>} - true если пароль совпадает
 */
async function verifyPassword(password, hashedPassword) {
  if (!password || !hashedPassword) {
    return false;
  }

  try {
    const isValid = await bcrypt.compare(password, hashedPassword);
    return isValid;
  } catch (error) {
    console.error('Ошибка при проверке пароля:', error);
    return false;
  }
}

/**
 * Валидирует пароль по критериям безопасности
 * @param {string} password - Пароль для валидации
 * @returns {Object} - Объект с результатом валидации
 */
function validatePassword(password) {
  const result = {
    isValid: true,
    errors: [],
  };

  if (!password || typeof password !== 'string') {
    result.isValid = false;
    result.errors.push('Пароль должен быть строкой');
    return result;
  }

  // Минимальная длина
  if (password.length < 8) {
    result.isValid = false;
    result.errors.push('Пароль должен содержать минимум 8 символов');
  }

  // Максимальная длина
  if (password.length > 128) {
    result.isValid = false;
    result.errors.push('Пароль не должен превышать 128 символов');
  }

  // Проверка на наличие цифр
  if (!/\d/.test(password)) {
    result.isValid = false;
    result.errors.push('Пароль должен содержать хотя бы одну цифру');
  }

  // Проверка на наличие букв
  if (!/[a-zA-Z]/.test(password)) {
    result.isValid = false;
    result.errors.push('Пароль должен содержать хотя бы одну букву');
  }

  // Проверка на наличие специальных символов
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    result.isValid = false;
    result.errors.push(
      'Пароль должен содержать хотя бы один специальный символ'
    );
  }

  return result;
}

/**
 * Валидирует email адрес
 * @param {string} email - Email для валидации
 * @returns {boolean} - true если email валиден
 */
function validateEmail(email) {
  if (!email || typeof email !== 'string') {
    return false;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Валидирует username
 * @param {string} username - Username для валидации
 * @returns {Object} - Объект с результатом валидации
 */
function validateUsername(username) {
  const result = {
    isValid: true,
    errors: [],
  };

  if (!username || typeof username !== 'string') {
    result.isValid = false;
    result.errors.push('Имя пользователя должно быть строкой');
    return result;
  }

  // Минимальная длина
  if (username.length < 3) {
    result.isValid = false;
    result.errors.push('Имя пользователя должно содержать минимум 3 символа');
  }

  // Максимальная длина
  if (username.length > 30) {
    result.isValid = false;
    result.errors.push('Имя пользователя не должно превышать 30 символов');
  }

  // Проверка на допустимые символы (буквы, цифры, подчеркивание, дефис)
  if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
    result.isValid = false;
    result.errors.push(
      'Имя пользователя может содержать только буквы, цифры, подчеркивание и дефис'
    );
  }

  // Не должно начинаться с цифры
  if (/^\d/.test(username)) {
    result.isValid = false;
    result.errors.push('Имя пользователя не должно начинаться с цифры');
  }

  return result;
}

/**
 * Создает нового пользователя с паролем
 * @param {Object} userData - Данные пользователя
 * @param {string} userData.email - Email пользователя
 * @param {string} userData.password - Пароль пользователя
 * @param {string} userData.name - Имя пользователя
 * @param {string} userData.role - Роль пользователя (по умолчанию 'user')
 * @returns {Promise<Object>} - Созданный пользователь (без пароля)
 */
async function createUserWithPassword(userData) {
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
 * Создает суперадминистратора с паролем
 * @param {Object} adminData - Данные администратора
 * @param {string} adminData.email - Email администратора
 * @param {string} adminData.password - Пароль администратора
 * @param {string} adminData.name - Имя администратора
 * @returns {Promise<Object>} - Созданный администратор
 */
async function createSuperAdmin(adminData) {
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
 * Получает пользователя по email
 * @param {string} email - Email пользователя
 * @returns {Promise<Object|null>} - Пользователь или null
 */
async function getUserByEmail(email) {
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
async function hasSuperAdmin() {
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

module.exports = {
  hashPassword,
  verifyPassword,
  validatePassword,
  validateEmail,
  validateUsername,
  createUserWithPassword,
  createSuperAdmin,
  getUserByEmail,
  hasSuperAdmin,
};
