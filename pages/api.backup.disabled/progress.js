import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';
import prisma from '../../prisma/client';

export default async function handler(req, res) {
  // Проверяем аутентификацию
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ message: 'Необходима аутентификация' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Метод не разрешен' });
  }

  const {
    questionId: rawQuestionId,
    status,
    isSearch,
    userId,
    selectedAnswer,
    isCorrect,
    timeSpent,
  } = req.body;

  // Преобразуем questionId в число, если он пришел как строка
  const questionId = parseInt(rawQuestionId);

  // Используем userId из сессии, если он не был передан в запросе
  const userIdToUse = userId || session.user.id;

  if (
    !questionId ||
    isNaN(questionId) ||
    (!status && !isSearch && selectedAnswer === undefined)
  ) {
    return res
      .status(400)
      .json({
        message: 'Отсутствуют обязательные параметры или неверный questionId',
      });
  }

  if (status && !['known', 'unknown', 'repeat'].includes(status)) {
    return res.status(400).json({ message: 'Недопустимый статус' });
  }

  try {
    console.log('=== ДИАГНОСТИКА СОХРАНЕНИЯ ОТВЕТА ===');
    console.log('Данные запроса:', {
      questionId,
      status,
      isSearch,
      userId: userIdToUse,
      selectedAnswer,
      isCorrect,
      timeSpent,
    });

    // Проверяем, существует ли вопрос
    const question = await prisma.question.findUnique({
      where: { id: questionId },
    });

    console.log(
      'Найден вопрос:',
      question ? `ID: ${question.id}` : 'НЕ НАЙДЕН'
    );

    if (!question) {
      return res.status(404).json({ message: 'Вопрос не найден' });
    }

    // Обновляем или создаем запись о прогрессе пользователя
    const updateData = {};
    console.log('Начинаем формирование updateData...');

    if (status) {
      updateData.status = status;
      updateData.lastReviewed = new Date();
      updateData.reviewCount = { increment: 1 };

      // Увеличиваем счетчик для соответствующего статуса
      if (status === 'known') {
        updateData.knownCount = { increment: 1 };
      } else if (status === 'unknown') {
        updateData.unknownCount = { increment: 1 };
      } else if (status === 'repeat') {
        updateData.repeatCount = { increment: 1 };
      }
    }

    // Обработка ответов с таймером
    if (selectedAnswer !== undefined) {
      updateData.lastAnswer = selectedAnswer;
      updateData.isCorrect = isCorrect;
      updateData.lastReviewed = new Date();
      updateData.reviewCount = { increment: 1 };

      // Определяем статус на основе правильности ответа
      if (isCorrect) {
        updateData.status = 'known';
        updateData.knownCount = { increment: 1 };
      } else {
        updateData.status = 'unknown';
        updateData.unknownCount = { increment: 1 };
      }
    }

    // Сохраняем время ответа
    if (timeSpent !== undefined && timeSpent > 0) {
      updateData.timeSpent = timeSpent;
    }

    if (isSearch) {
      updateData.searchCount = { increment: 1 };
    }

    console.log('Данные для обновления (updateData):', updateData);

    const createData = {
      questionId,
      userId: userIdToUse,
      status: status || (isCorrect ? 'known' : 'unknown'),
      reviewCount: status || selectedAnswer !== undefined ? 1 : 0,
      knownCount: status === 'known' || isCorrect ? 1 : 0,
      unknownCount:
        status === 'unknown' || (selectedAnswer !== undefined && !isCorrect)
          ? 1
          : 0,
      repeatCount: status === 'repeat' ? 1 : 0,
      searchCount: isSearch ? 1 : 0,
      lastAnswer: selectedAnswer || null,
      isCorrect: isCorrect || false,
      timeSpent: timeSpent || 0,
    };

    console.log('Данные для создания (createData):', createData);
    console.log('Выполняем upsert операцию...');

    const progress = await prisma.userProgress.upsert({
      where: {
        questionId_userId: {
          questionId,
          userId: userIdToUse,
        },
      },
      update: updateData,
      create: createData,
    });

    console.log('Upsert выполнен успешно:', progress);

    return res.status(200).json(progress);
  } catch (error) {
    console.error('=== ОШИБКА ПРИ СОХРАНЕНИИ ПРОГРЕССА ===');
    console.error('Тип ошибки:', error.constructor.name);
    console.error('Сообщение ошибки:', error.message);
    console.error('Код ошибки:', error.code);
    console.error('Мета информация:', error.meta);
    console.error('Полная ошибка:', error);
    console.error('=== КОНЕЦ ДИАГНОСТИКИ ОШИБКИ ===');

    // Возвращаем более детальную информацию об ошибке для диагностики
    return res.status(500).json({
      message: 'Не удалось сохранить ответ',
      error: error.message,
      code: error.code,
      details: error.meta,
    });
  } finally {
    await prisma.$disconnect();
  }
}
