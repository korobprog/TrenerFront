import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import prisma from '../../../lib/prisma';

/**
 * API роут для управления аватаркой пользователя
 * GET /api/user/avatar - получить текущую аватарку пользователя
 * PUT /api/user/avatar - обновить аватарку пользователя
 * DELETE /api/user/avatar - удалить аватарку (возврат к дефолтной)
 */
export default async function handler(req, res) {
  try {
    // Получаем сессию пользователя
    const session = await getServerSession(req, res, authOptions);

    if (!session?.user?.id) {
      return res.status(401).json({
        success: false,
        error: 'Необходима авторизация',
      });
    }

    const userId = session.user.id;

    if (req.method === 'GET') {
      // Получение текущей аватарки
      try {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        });

        if (!user) {
          return res.status(404).json({
            success: false,
            error: 'Пользователь не найден',
          });
        }

        // Генерируем дефолтную аватарку если её нет
        let avatarUrl = user.image;
        if (!avatarUrl) {
          // Генерируем аватарку с инициалами через DiceBear API
          const initials = getInitials(user.name || user.email);
          avatarUrl = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
            initials
          )}&backgroundColor=3b82f6&textColor=ffffff`;
        }

        return res.status(200).json({
          success: true,
          avatar: avatarUrl,
          hasCustomAvatar: !!user.image,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
          },
        });
      } catch (error) {
        console.error('Ошибка при получении аватарки:', error);
        return res.status(500).json({
          success: false,
          error: 'Ошибка при получении аватарки',
        });
      }
    }

    if (req.method === 'PUT') {
      // Обновление аватарки
      try {
        const { avatar } = req.body;

        // Валидация входных данных
        if (!avatar || typeof avatar !== 'string') {
          return res.status(400).json({
            success: false,
            error: 'Необходимо указать URL аватарки',
          });
        }

        // Валидация URL
        if (!isValidAvatarUrl(avatar)) {
          return res.status(400).json({
            success: false,
            error: 'Неверный формат URL аватарки',
          });
        }

        // Валидация размера URL (ограничиваем до 2000 символов)
        if (avatar.length > 2000) {
          return res.status(400).json({
            success: false,
            error: 'URL аватарки слишком длинный (максимум 2000 символов)',
          });
        }

        // Обновляем аватарку пользователя
        const updatedUser = await prisma.user.update({
          where: { id: userId },
          data: { image: avatar },
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        });

        return res.status(200).json({
          success: true,
          message: 'Аватарка успешно обновлена',
          avatar: updatedUser.image,
          user: {
            id: updatedUser.id,
            name: updatedUser.name,
            email: updatedUser.email,
          },
        });
      } catch (error) {
        console.error('Ошибка при обновлении аватарки:', error);
        return res.status(500).json({
          success: false,
          error: 'Ошибка при обновлении аватарки',
        });
      }
    }

    if (req.method === 'DELETE') {
      // Удаление аватарки (возврат к дефолтной)
      try {
        const updatedUser = await prisma.user.update({
          where: { id: userId },
          data: { image: null },
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        });

        // Генерируем дефолтную аватарку
        const initials = getInitials(updatedUser.name || updatedUser.email);
        const defaultAvatar = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
          initials
        )}&backgroundColor=3b82f6&textColor=ffffff`;

        return res.status(200).json({
          success: true,
          message: 'Аватарка удалена, установлена дефолтная',
          avatar: defaultAvatar,
          hasCustomAvatar: false,
          user: {
            id: updatedUser.id,
            name: updatedUser.name,
            email: updatedUser.email,
          },
        });
      } catch (error) {
        console.error('Ошибка при удалении аватарки:', error);
        return res.status(500).json({
          success: false,
          error: 'Ошибка при удалении аватарки',
        });
      }
    }

    // Метод не поддерживается
    return res.status(405).json({
      success: false,
      error: 'Метод не поддерживается',
    });
  } catch (error) {
    console.error('Общая ошибка в API аватарки:', error);
    return res.status(500).json({
      success: false,
      error: 'Внутренняя ошибка сервера',
    });
  }
}

/**
 * Получает инициалы из имени или email
 * @param {string} nameOrEmail - Имя пользователя или email
 * @returns {string} Инициалы (максимум 2 символа)
 */
function getInitials(nameOrEmail) {
  if (!nameOrEmail) return 'U';

  // Если это email, берем часть до @
  if (nameOrEmail.includes('@')) {
    nameOrEmail = nameOrEmail.split('@')[0];
  }

  // Разбиваем на слова и берем первые буквы
  const words = nameOrEmail.trim().split(/\s+/);
  if (words.length === 1) {
    // Если одно слово, берем первые 2 символа
    return words[0].substring(0, 2).toUpperCase();
  } else {
    // Если несколько слов, берем первые буквы первых двух слов
    return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase();
  }
}

/**
 * Валидирует URL аватарки
 * @param {string} url - URL для проверки
 * @returns {boolean} true если URL валидный
 */
function isValidAvatarUrl(url) {
  try {
    const urlObj = new URL(url);

    // Проверяем протокол
    if (!['http:', 'https:', 'data:'].includes(urlObj.protocol)) {
      return false;
    }

    // Если это data URL, проверяем что это изображение
    if (urlObj.protocol === 'data:') {
      return url.startsWith('data:image/');
    }

    // Для HTTP/HTTPS URL проверяем базовую структуру
    return true;
  } catch (error) {
    return false;
  }
}
