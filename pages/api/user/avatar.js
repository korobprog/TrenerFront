import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import prisma from '../../../lib/prisma';

// Кэш для предотвращения одновременных запросов генерации от одного пользователя
const generationCache = new Map();

/**
 * API роут для управления аватаркой пользователя
 * GET /api/user/avatar - получить текущую аватарку пользователя
 * PUT /api/user/avatar - обновить аватарку пользователя
 * DELETE /api/user/avatar - удалить аватарку (возврат к дефолтной)
 * POST /api/user/avatar - генерация, загрузка или сохранение аватарки
 *   - action: 'generate' - сгенерировать аватарку с инициалами
 *   - action: 'upload' - загрузить файл аватарки (пока не поддерживается)
 *   - action: 'url' - сохранить URL аватарки
 */
export default async function handler(req, res) {
  const timestamp = new Date().toISOString();
  console.log(`[AVATAR_DEBUG] ${timestamp} Avatar API вызван`, {
    method: req.method,
    url: req.url,
    userAgent: req.headers['user-agent']?.substring(0, 50),
    contentType: req.headers['content-type'],
    reason: 'Входящий запрос к Avatar API',
  });

  try {
    console.log('🔍 Avatar API вызван:', {
      method: req.method,
      url: req.url,
      headers: {
        'content-type': req.headers['content-type'],
        'user-agent': req.headers['user-agent']?.substring(0, 50) + '...',
      },
      body: req.method === 'POST' ? req.body : 'N/A',
    });

    // Получаем сессию пользователя
    const session = await getServerSession(req, res, authOptions);

    try {
      console.log(`[AVATAR_DEBUG] ${timestamp} Avatar API проверка сессии`, {
        hasSession: !!session,
        hasUser: !!session?.user,
        hasUserId: !!session?.user?.id,
        sessionUser: session?.user
          ? {
              id: session.user.id || 'не указано',
              name: session.user.name || 'не указано',
              email: session.user.email || 'не указано',
              image: session.user.image || 'не указано',
            }
          : 'отсутствует',
      });
    } catch (logError) {
      console.error(
        `[AVATAR_DEBUG] ${timestamp} Ошибка логирования проверки сессии:`,
        logError
      );
    }

    if (!session?.user?.id) {
      console.log(`[AVATAR_DEBUG] ${timestamp} Avatar API отказ в доступе`, {
        reason: 'Отсутствует сессия или ID пользователя',
        session: !!session,
        user: !!session?.user,
        userId: session?.user?.id,
      });
      console.log('❌ Нет авторизации');
      return res.status(401).json({
        success: false,
        error: 'Необходима авторизация',
      });
    }

    const userId = session.user.id;
    try {
      console.log(
        `[AVATAR_DEBUG] ${timestamp} Avatar API пользователь авторизован`,
        {
          userId,
          userName: session?.user?.name || 'не указано',
          userEmail: session?.user?.email || 'не указано',
          userImage: session?.user?.image || 'не указано',
        }
      );
      console.log('✅ Пользователь авторизован:', {
        userId,
        userName: session?.user?.name || 'не указано',
      });
    } catch (logError) {
      console.error(
        `[AVATAR_DEBUG] ${timestamp} Ошибка логирования авторизации:`,
        logError
      );
    }

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

    if (req.method === 'POST') {
      console.log(`[AVATAR_DEBUG] ${timestamp} Avatar API POST обработка`, {
        hasBody: !!req.body,
        bodyKeys: req.body ? Object.keys(req.body) : [],
        action: req.body?.action,
        reason: 'Обработка POST запроса',
      });

      // Обработка POST запросов (генерация, загрузка, сохранение URL)
      try {
        console.log('📝 POST запрос получен:', req.body);

        const { action } = req.body;

        console.log(
          `[AVATAR_DEBUG] ${timestamp} Avatar API действие определено`,
          {
            action,
            supportedActions: ['generate', 'upload', 'url'],
          }
        );

        if (action === 'generate') {
          // Проверяем, не идет ли уже генерация для этого пользователя
          const cacheKey = `generate_${userId}`;
          if (generationCache.has(cacheKey)) {
            const cachedPromise = generationCache.get(cacheKey);
            console.log(
              `[AVATAR_DEBUG] ${timestamp} Avatar API возврат кэшированного результата`,
              {
                userId,
                cacheKey,
                reason: 'Защита от одновременных запросов генерации',
              }
            );

            try {
              const result = await cachedPromise;
              return res.status(200).json(result);
            } catch (error) {
              // Если кэшированный запрос завершился ошибкой, удаляем из кэша и продолжаем
              generationCache.delete(cacheKey);
            }
          }

          console.log(
            `[AVATAR_DEBUG] ${timestamp} Avatar API генерация начата`,
            {
              userId,
              requestName: req.body.name,
              cacheKey,
              reason: 'Запрос на генерацию аватара с инициалами',
            }
          );

          // Создаем промис для генерации и кэшируем его
          const generationPromise = (async () => {
            try {
              // Генерация аватарки с инициалами
              const user = await prisma.user.findUnique({
                where: { id: userId },
                select: { name: true, email: true, image: true },
              });

              console.log(
                `[AVATAR_DEBUG] ${timestamp} Avatar API пользователь из БД`,
                {
                  found: !!user,
                  userName: user?.name,
                  userEmail: user?.email,
                  hasExistingImage: !!user?.image,
                }
              );

              if (!user) {
                console.log(
                  `[AVATAR_DEBUG] ${timestamp} Avatar API пользователь не найден`,
                  {
                    userId,
                    reason: 'Пользователь отсутствует в базе данных',
                  }
                );
                throw new Error('Пользователь не найден');
              }

              // Если у пользователя уже есть аватар, не генерируем новый
              if (user.image) {
                console.log(
                  `[AVATAR_DEBUG] ${timestamp} Avatar API аватар уже существует`,
                  {
                    userId,
                    existingImage: user.image,
                    reason:
                      'Пользователь уже имеет аватар, генерация не требуется',
                  }
                );
                return {
                  success: true,
                  message: 'Аватар уже существует',
                  avatarUrl: user.image,
                  alreadyExists: true,
                };
              }

              const name = req.body.name || user.name || user.email;
              const initials = getInitials(name);
              const avatarUrl = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
                initials
              )}&backgroundColor=3b82f6&textColor=ffffff`;

              console.log(
                `[AVATAR_DEBUG] ${timestamp} Avatar API аватар сгенерирован`,
                {
                  inputName: name,
                  generatedInitials: initials,
                  avatarUrl,
                  diceBearSeed: encodeURIComponent(initials),
                  operation: 'Генерация завершена успешно',
                }
              );

              console.log('✅ Аватарка сгенерирована:', {
                initials,
                avatarUrl,
              });

              return {
                success: true,
                message: 'Аватарка успешно сгенерирована',
                avatarUrl: avatarUrl,
                initials: initials,
              };
            } finally {
              // Удаляем из кэша после завершения (успешного или с ошибкой)
              generationCache.delete(cacheKey);
              console.log(`[AVATAR_DEBUG] ${timestamp} Avatar API кэш очищен`, {
                cacheKey,
                reason: 'Генерация завершена',
              });
            }
          })();

          // Кэшируем промис
          generationCache.set(cacheKey, generationPromise);

          try {
            const result = await generationPromise;
            return res.status(200).json(result);
          } catch (error) {
            console.error('Ошибка при генерации аватара:', error);
            return res.status(500).json({
              success: false,
              error: error.message || 'Ошибка при генерации аватара',
            });
          }
        } else if (action === 'upload') {
          // Обработка загрузки файла (пока заглушка)
          return res.status(400).json({
            success: false,
            error: 'Загрузка файлов пока не поддерживается. Используйте URL.',
          });
        } else if (action === 'url') {
          // Сохранение URL аватарки
          const { avatarUrl } = req.body;

          if (!avatarUrl || typeof avatarUrl !== 'string') {
            return res.status(400).json({
              success: false,
              error: 'Необходимо указать URL аватарки',
            });
          }

          if (!isValidAvatarUrl(avatarUrl)) {
            return res.status(400).json({
              success: false,
              error: 'Неверный формат URL аватарки',
            });
          }

          if (avatarUrl.length > 2000) {
            return res.status(400).json({
              success: false,
              error: 'URL аватарки слишком длинный (максимум 2000 символов)',
            });
          }

          const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: { image: avatarUrl },
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          });

          return res.status(200).json({
            success: true,
            message: 'Аватарка успешно сохранена',
            avatar: updatedUser.image,
            user: {
              id: updatedUser.id,
              name: updatedUser.name,
              email: updatedUser.email,
            },
          });
        } else {
          return res.status(400).json({
            success: false,
            error:
              'Неизвестное действие. Поддерживаются: generate, upload, url',
          });
        }
      } catch (error) {
        console.error('Ошибка при обработке POST запроса:', error);
        return res.status(500).json({
          success: false,
          error: 'Ошибка при обработке запроса',
        });
      }
    }

    // Метод не поддерживается
    console.log('❌ Метод не поддерживается:', {
      method: req.method,
      supportedMethods: ['GET', 'PUT', 'DELETE', 'POST'],
      body: req.body,
    });
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
