/**
 * Утилиты для работы с ролями пользователей
 */

/**
 * Проверяет, является ли пользователь администратором (admin или superadmin)
 * @param {Object} user - объект пользователя
 * @returns {boolean} - true если пользователь admin или superadmin
 */
export function isAdmin(user) {
  if (!user || !user.role) return false;
  return user.role === 'admin' || user.role === 'superadmin';
}

/**
 * Проверяет, является ли пользователь суперадминистратором
 * @param {Object} user - объект пользователя
 * @returns {boolean} - true если пользователь superadmin
 */
export function isSuperAdmin(user) {
  if (!user || !user.role) return false;
  return user.role === 'superadmin';
}

/**
 * Проверяет, является ли пользователь обычным пользователем
 * @param {Object} user - объект пользователя
 * @returns {boolean} - true если пользователь user
 */
export function isUser(user) {
  if (!user || !user.role) return false;
  return user.role === 'user';
}

/**
 * Проверяет, имеет ли пользователь доступ к админ-панели
 * @param {Object} session - объект сессии NextAuth
 * @returns {boolean} - true если пользователь имеет доступ к админ-панели
 */
export function hasAdminAccess(session) {
  if (!session || !session.user) return false;
  return isAdmin(session.user);
}

/**
 * Проверяет, имеет ли пользователь доступ к функциям суперадмина
 * @param {Object} session - объект сессии NextAuth
 * @returns {boolean} - true если пользователь имеет доступ к функциям суперадмина
 */
export function hasSuperAdminAccess(session) {
  if (!session || !session.user) return false;
  return isSuperAdmin(session.user);
}

/**
 * Получает список доступных ролей для пользователя
 * @param {Object} user - объект пользователя
 * @returns {Array} - массив доступных ролей
 */
export function getAvailableRoles(user) {
  if (!user || !user.role) return [];

  switch (user.role) {
    case 'superadmin':
      return ['user', 'admin', 'superadmin'];
    case 'admin':
      return ['user', 'admin'];
    case 'user':
    default:
      return ['user'];
  }
}

/**
 * Проверяет, может ли пользователь управлять другим пользователем
 * @param {Object} currentUser - текущий пользователь
 * @param {Object} targetUser - целевой пользователь
 * @returns {boolean} - true если может управлять
 */
export function canManageUser(currentUser, targetUser) {
  if (!currentUser || !targetUser) return false;

  // Суперадмин может управлять всеми
  if (isSuperAdmin(currentUser)) return true;

  // Админ может управлять обычными пользователями, но не другими админами
  if (isAdmin(currentUser) && isUser(targetUser)) return true;

  return false;
}
