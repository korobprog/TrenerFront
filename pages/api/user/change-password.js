import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { PrismaClient } from '@prisma/client';
import {
  hashPassword,
  verifyPassword,
  validatePassword,
} from '../../../lib/utils/passwordUtils';

const prisma = new PrismaClient();

/**
 * API роут для смены пароля пользователя
 * POST /api/user/change-password - изменить пароль пользователя
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Метод не поддерживается',
    });
  }

  try {
    // Получаем сессию пользователя
    const session = await getServerSession(req, res, authOptions);

    if (!session || !session.user) {
      return res.status(401).json({
        success: false,
        error: 'Не авторизован',
      });
    }

    // Получаем данные из запроса
    const { currentPassword, newPassword, confirmPassword } = req.body;

    // Валидация входных данных
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        error: 'Все поля обязательны для заполнения',
      });
    }

    // Проверяем, что новый пароль совпадает с подтверждением
    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        error: 'Новый пароль и подтверждение не совпадают',
      });
    }

    // Проверяем, что новый пароль отличается от текущего
    if (currentPassword === newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Новый пароль должен отличаться от текущего',
      });
    }

    // Валидируем новый пароль
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        success: false,
        error: 'Новый пароль не соответствует требованиям безопасности',
        details: passwordValidation.errors,
      });
    }

    // Получаем пользователя из базы данных
    const user = await prisma.user.findUnique({
      where: {
        email: session.user.email,
      },
      select: {
        id: true,
        email: true,
        name: true,
        password: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Пользователь не найден',
      });
    }

    // Проверяем, что у пользователя есть пароль (не OAuth-пользователь)
    if (!user.password) {
      return res.status(400).json({
        success: false,
        error:
          'У вашего аккаунта нет пароля. Возможно, вы входите через Google или GitHub.',
      });
    }

    // Проверяем текущий пароль
    const isCurrentPasswordValid = await verifyPassword(
      currentPassword,
      user.password
    );
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        error: 'Неверный текущий пароль',
      });
    }

    // Хешируем новый пароль
    const hashedNewPassword = await hashPassword(newPassword);

    // Обновляем пароль в базе данных
    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        password: hashedNewPassword,
        updatedAt: new Date(),
      },
    });

    // Возвращаем успешный ответ
    return res.status(200).json({
      success: true,
      message: 'Пароль успешно изменен',
    });
  } catch (error) {
    console.error('Ошибка при смене пароля:', error);

    // Проверяем специфические ошибки валидации пароля
    if (error.message && error.message.includes('Пароль должен')) {
      return res.status(400).json({
        success: false,
        error: error.message,
      });
    }

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
