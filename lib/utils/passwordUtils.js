import bcrypt from 'bcrypt';

/**
 * Утилиты для безопасной работы с паролями
 */

// Количество раундов для хеширования (рекомендуется 12-15 для продакшена)
const SALT_ROUNDS = 12;

/**
 * Хеширует пароль с использованием bcrypt
 * @param {string} password - Пароль для хеширования
 * @returns {Promise<string>} - Хешированный пароль
 */
export async function hashPassword(password) {
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
export async function verifyPassword(password, hashedPassword) {
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
export function validatePassword(password) {
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
export function validateEmail(email) {
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
export function validateUsername(username) {
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
 * Генерирует случайный пароль
 * @param {number} length - Длина пароля (по умолчанию 12)
 * @returns {string} - Сгенерированный пароль
 */
export function generateRandomPassword(length = 12) {
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';

  const allChars = lowercase + uppercase + numbers + symbols;

  let password = '';

  // Гарантируем наличие хотя бы одного символа каждого типа
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];

  // Заполняем остальную длину случайными символами
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }

  // Перемешиваем символы
  return password
    .split('')
    .sort(() => Math.random() - 0.5)
    .join('');
}
