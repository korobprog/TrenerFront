import { getSession } from 'next-auth/react';
import prisma, { withPrisma } from '../../../lib/prisma';

export default async function handler(req, res) {
  // Добавляем детальные логи для отладки запроса
  console.log('API user/points: Детали запроса', {
    method: req.method,
    query: JSON.stringify(req.query),
    cookies: req.headers.cookie,
  });

  const session = await getSession({ req });

  // Добавляем детальные логи для отладки сессии
  console.log('API user/points: Детали сессии', {
    id: session?.user?.id,
    email: session?.user?.email,
    role: session?.user?.role,
    timestamp: session?.timestamp,
  });

  if (!session) {
    console.log('API user/points: Сессия отсутствует, возвращаем 401');
    return res.status(401).json({ message: 'Необходима авторизация' });
  }

  // Обработка только GET запросов
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Метод не поддерживается' });
  }

  try {
    console.log('Получение баллов для пользователя:', session.user.id);
    console.log(
      'Полная информация о пользователе в сессии:',
      JSON.stringify(session.user, null, 2)
    );

    // Проверяем, есть ли у пользователя запись о баллах
    let userPoints = await withPrisma(async (prisma) => {
      return await prisma.userPoints.findUnique({
        where: { userId: session.user.id },
      });
    });

    console.log(
      'Текущие баллы пользователя:',
      userPoints ? userPoints.points : 'запись не найдена'
    );

    if (userPoints) {
      console.log(
        'Детали записи о баллах:',
        JSON.stringify(userPoints, null, 2)
      );
    }

    // Если у пользователя нет записи о баллах, создаем её с 1 баллом
    if (!userPoints) {
      console.log('Создаем новую запись с 1 баллом');
      try {
        userPoints = await withPrisma(async (prisma) => {
          return await prisma.userPoints.create({
            data: {
              userId: session.user.id,
              points: 1,
            },
          });
        });
        console.log(
          'Запись успешно создана:',
          JSON.stringify(userPoints, null, 2)
        );
      } catch (createError) {
        console.error('Ошибка при создании записи о баллах:', createError);
        throw createError;
      }
    }
    // Если у пользователя есть запись о баллах, но баллов 0, обновляем до 1
    else if (userPoints.points === 0) {
      console.log('Обновляем баллы с 0 до 1');
      try {
        userPoints = await withPrisma(async (prisma) => {
          return await prisma.userPoints.update({
            where: { userId: session.user.id },
            data: {
              points: 1,
            },
          });
        });
        console.log(
          'Запись успешно обновлена:',
          JSON.stringify(userPoints, null, 2)
        );
      } catch (updateError) {
        console.error('Ошибка при обновлении баллов:', updateError);
        throw updateError;
      }
    }

    console.log('Итоговые баллы пользователя:', userPoints.points);

    return res.status(200).json({
      points: userPoints.points,
      userId: userPoints.userId,
      createdAt: userPoints.createdAt,
      updatedAt: userPoints.updatedAt,
    });
  } catch (error) {
    console.error('Ошибка при получении баллов пользователя:', error);
    return res
      .status(500)
      .json({ message: 'Ошибка сервера при получении баллов пользователя' });
  }
}
