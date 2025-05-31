import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  try {
    const session = await getServerSession(req, res, authOptions);

    if (!session) {
      return res.status(401).json({
        success: false,
        error: 'Не авторизован',
      });
    }

    const { method } = req;

    switch (method) {
      case 'GET':
        return await getNotificationSettings(req, res, session);
      case 'POST':
        return await subscribeToPushNotifications(req, res, session);
      case 'PUT':
        return await updateNotificationSettings(req, res, session);
      case 'DELETE':
        return await unsubscribeFromNotifications(req, res, session);
      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
        return res.status(405).json({
          success: false,
          error: `Метод ${method} не поддерживается`,
        });
    }
  } catch (error) {
    console.error('Ошибка в API уведомлений:', error);
    return res.status(500).json({
      success: false,
      error: 'Внутренняя ошибка сервера',
      details:
        process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  } finally {
    await prisma.$disconnect();
  }
}

// Получение настроек уведомлений пользователя
async function getNotificationSettings(req, res, session) {
  try {
    // Получаем настройки пользователя
    let userPreferences = await prisma.userPreferences.findUnique({
      where: { userId: session.user.id },
    });

    // Если настроек нет, создаем их с дефолтными значениями
    if (!userPreferences) {
      userPreferences = await prisma.userPreferences.create({
        data: {
          userId: session.user.id,
          emailNotifications: true,
          pushNotifications: true,
          reminderMinutes: 15,
        },
      });
    }

    // Получаем активные подписки на push уведомления
    const pushSubscriptions = await prisma.notificationSubscription.findMany({
      where: {
        userId: session.user.id,
        isActive: true,
      },
      select: {
        id: true,
        endpoint: true,
        userAgent: true,
        createdAt: true,
      },
    });

    return res.status(200).json({
      success: true,
      data: {
        preferences: {
          emailNotifications: userPreferences.emailNotifications,
          pushNotifications: userPreferences.pushNotifications,
          reminderMinutes: userPreferences.reminderMinutes,
          timezone: userPreferences.timezone,
          defaultCalendarView: userPreferences.defaultCalendarView,
          workingHoursStart: userPreferences.workingHoursStart,
          workingHoursEnd: userPreferences.workingHoursEnd,
        },
        pushSubscriptions: pushSubscriptions.map((sub) => ({
          id: sub.id,
          endpoint: sub.endpoint.substring(0, 50) + '...', // Скрываем полный endpoint
          userAgent: sub.userAgent,
          createdAt: sub.createdAt,
        })),
        subscriptionCount: pushSubscriptions.length,
      },
      message: 'Настройки уведомлений получены',
    });
  } catch (error) {
    console.error('Ошибка при получении настроек уведомлений:', error);
    return res.status(500).json({
      success: false,
      error: 'Ошибка при получении настроек уведомлений',
      details:
        process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

// Подписка на push уведомления
async function subscribeToPushNotifications(req, res, session) {
  try {
    const { endpoint, p256dh, auth, userAgent } = req.body;

    // Валидация обязательных полей
    if (!endpoint || !p256dh || !auth) {
      return res.status(400).json({
        success: false,
        error: 'Обязательные поля: endpoint, p256dh, auth',
      });
    }

    // Проверяем, не существует ли уже такая подписка
    const existingSubscription =
      await prisma.notificationSubscription.findUnique({
        where: {
          userId_endpoint: {
            userId: session.user.id,
            endpoint: endpoint,
          },
        },
      });

    if (existingSubscription) {
      // Если подписка существует, но неактивна - активируем её
      if (!existingSubscription.isActive) {
        const updatedSubscription =
          await prisma.notificationSubscription.update({
            where: { id: existingSubscription.id },
            data: {
              isActive: true,
              p256dh,
              auth,
              userAgent: userAgent || null,
            },
          });

        return res.status(200).json({
          success: true,
          data: {
            id: updatedSubscription.id,
            endpoint: updatedSubscription.endpoint,
            isActive: updatedSubscription.isActive,
          },
          message: 'Подписка на уведомления активирована',
        });
      } else {
        return res.status(409).json({
          success: false,
          error: 'Подписка уже существует',
        });
      }
    }

    // Создаем новую подписку
    const subscription = await prisma.notificationSubscription.create({
      data: {
        userId: session.user.id,
        endpoint,
        p256dh,
        auth,
        userAgent: userAgent || null,
        isActive: true,
      },
    });

    // Обновляем настройки пользователя, включая push уведомления
    await prisma.userPreferences.upsert({
      where: { userId: session.user.id },
      update: { pushNotifications: true },
      create: {
        userId: session.user.id,
        pushNotifications: true,
        emailNotifications: true,
        reminderMinutes: 15,
      },
    });

    return res.status(201).json({
      success: true,
      data: {
        id: subscription.id,
        endpoint: subscription.endpoint,
        isActive: subscription.isActive,
        createdAt: subscription.createdAt,
      },
      message: 'Подписка на push уведомления создана',
    });
  } catch (error) {
    console.error('Ошибка при создании подписки на уведомления:', error);
    return res.status(500).json({
      success: false,
      error: 'Ошибка при создании подписки на уведомления',
      details:
        process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

// Обновление настроек уведомлений
async function updateNotificationSettings(req, res, session) {
  try {
    const {
      emailNotifications,
      pushNotifications,
      reminderMinutes,
      timezone,
      defaultCalendarView,
      workingHoursStart,
      workingHoursEnd,
    } = req.body;

    // Подготовка данных для обновления
    const updateData = {};

    if (emailNotifications !== undefined) {
      updateData.emailNotifications = Boolean(emailNotifications);
    }

    if (pushNotifications !== undefined) {
      updateData.pushNotifications = Boolean(pushNotifications);
    }

    if (reminderMinutes !== undefined) {
      if (reminderMinutes < 0 || reminderMinutes > 1440) {
        // максимум 24 часа
        return res.status(400).json({
          success: false,
          error: 'Время напоминания должно быть от 0 до 1440 минут',
        });
      }
      updateData.reminderMinutes = reminderMinutes;
    }

    if (timezone !== undefined) {
      updateData.timezone = timezone;
    }

    if (defaultCalendarView !== undefined) {
      if (!['month', 'week', 'day'].includes(defaultCalendarView)) {
        return res.status(400).json({
          success: false,
          error: 'Вид календаря должен быть: month, week или day',
        });
      }
      updateData.defaultCalendarView = defaultCalendarView;
    }

    if (workingHoursStart !== undefined) {
      if (workingHoursStart < 0 || workingHoursStart > 23) {
        return res.status(400).json({
          success: false,
          error: 'Время начала рабочего дня должно быть от 0 до 23',
        });
      }
      updateData.workingHoursStart = workingHoursStart;
    }

    if (workingHoursEnd !== undefined) {
      if (workingHoursEnd < 1 || workingHoursEnd > 24) {
        return res.status(400).json({
          success: false,
          error: 'Время окончания рабочего дня должно быть от 1 до 24',
        });
      }
      updateData.workingHoursEnd = workingHoursEnd;
    }

    // Проверяем корректность рабочих часов
    const startHour = updateData.workingHoursStart ?? 9;
    const endHour = updateData.workingHoursEnd ?? 18;

    if (endHour <= startHour) {
      return res.status(400).json({
        success: false,
        error: 'Время окончания должно быть позже времени начала рабочего дня',
      });
    }

    // Обновляем или создаем настройки
    const preferences = await prisma.userPreferences.upsert({
      where: { userId: session.user.id },
      update: updateData,
      create: {
        userId: session.user.id,
        emailNotifications: updateData.emailNotifications ?? true,
        pushNotifications: updateData.pushNotifications ?? true,
        reminderMinutes: updateData.reminderMinutes ?? 15,
        timezone: updateData.timezone ?? 'Europe/Moscow',
        defaultCalendarView: updateData.defaultCalendarView ?? 'month',
        workingHoursStart: updateData.workingHoursStart ?? 9,
        workingHoursEnd: updateData.workingHoursEnd ?? 18,
      },
    });

    // Если push уведомления отключены, деактивируем все подписки
    if (updateData.pushNotifications === false) {
      await prisma.notificationSubscription.updateMany({
        where: {
          userId: session.user.id,
          isActive: true,
        },
        data: {
          isActive: false,
        },
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        emailNotifications: preferences.emailNotifications,
        pushNotifications: preferences.pushNotifications,
        reminderMinutes: preferences.reminderMinutes,
        timezone: preferences.timezone,
        defaultCalendarView: preferences.defaultCalendarView,
        workingHoursStart: preferences.workingHoursStart,
        workingHoursEnd: preferences.workingHoursEnd,
        updatedAt: preferences.updatedAt,
      },
      message: 'Настройки уведомлений обновлены',
    });
  } catch (error) {
    console.error('Ошибка при обновлении настроек уведомлений:', error);
    return res.status(500).json({
      success: false,
      error: 'Ошибка при обновлении настроек уведомлений',
      details:
        process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

// Отписка от уведомлений
async function unsubscribeFromNotifications(req, res, session) {
  try {
    const { endpoint } = req.body;

    if (!endpoint) {
      return res.status(400).json({
        success: false,
        error: 'Endpoint обязателен для отписки',
      });
    }

    // Находим и деактивируем подписку
    const subscription = await prisma.notificationSubscription.findUnique({
      where: {
        userId_endpoint: {
          userId: session.user.id,
          endpoint: endpoint,
        },
      },
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        error: 'Подписка не найдена',
      });
    }

    if (!subscription.isActive) {
      return res.status(409).json({
        success: false,
        error: 'Подписка уже неактивна',
      });
    }

    // Деактивируем подписку
    await prisma.notificationSubscription.update({
      where: { id: subscription.id },
      data: { isActive: false },
    });

    // Проверяем, остались ли активные подписки
    const activeSubscriptions = await prisma.notificationSubscription.count({
      where: {
        userId: session.user.id,
        isActive: true,
      },
    });

    // Если активных подписок не осталось, отключаем push уведомления в настройках
    if (activeSubscriptions === 0) {
      await prisma.userPreferences.upsert({
        where: { userId: session.user.id },
        update: { pushNotifications: false },
        create: {
          userId: session.user.id,
          pushNotifications: false,
          emailNotifications: true,
          reminderMinutes: 15,
        },
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Подписка на уведомления отключена',
      data: {
        remainingSubscriptions: activeSubscriptions,
      },
    });
  } catch (error) {
    console.error('Ошибка при отписке от уведомлений:', error);
    return res.status(500).json({
      success: false,
      error: 'Ошибка при отписке от уведомлений',
      details:
        process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}
