import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import prisma from '../../../lib/prisma';
// Импортируем OpenRouter API
import openRouterApiModule from '../../../lib/utils/openRouterApi';
const {
  getAnswer: getOpenRouterAnswer,
  getCachedResponse,
  cacheResponse,
} = openRouterApiModule;

/**
 * API endpoint для генерации ответа на вопрос флеш-карточки через OpenRouter AI
 * POST /api/flashcards/generate-answer
 *
 * Параметры тела запроса:
 * - questionId: number - ID вопроса
 * - questionText: string - текст вопроса
 * - context: object - контекст (topic, difficulty, tags)
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Метод не поддерживается' });
  }

  try {
    // Проверяем авторизацию
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ message: 'Необходима авторизация' });
    }

    // Получаем параметры из тела запроса
    const { questionId, questionText, context = {} } = req.body;

    // Валидация обязательных параметров
    if (!questionId) {
      return res
        .status(400)
        .json({ message: 'Параметр questionId обязателен' });
    }

    if (!questionText || questionText.trim() === '') {
      return res
        .status(400)
        .json({ message: 'Параметр questionText обязателен' });
    }

    const userId = session.user.id;

    // Проверяем, существует ли вопрос
    const question = await prisma.question.findUnique({
      where: { id: parseInt(questionId) },
      include: {
        userProgress: {
          where: { userId },
          take: 1,
        },
      },
    });

    if (!question) {
      return res.status(404).json({ message: 'Вопрос не найден' });
    }

    // Проверяем, есть ли уже готовый ответ в базе данных
    if (question.answer && question.answer.trim() !== '') {
      console.log(`Найден готовый ответ для вопроса ${questionId}`);

      return res.status(200).json({
        answer: question.answer,
        generatedAt: question.updatedAt || question.createdAt,
        cached: true,
        tokensUsed: 0,
        source: 'database',
      });
    }

    // Формируем контекст для генерации ответа
    const { topic, difficulty, tags } = context;

    // Создаем улучшенный промпт для флеш-карточек
    let enhancedQuestion = questionText;

    if (topic || difficulty || tags) {
      enhancedQuestion += '\n\nКонтекст:';
      if (topic) enhancedQuestion += `\nТема: ${topic}`;
      if (difficulty) enhancedQuestion += `\nСложность: ${difficulty}`;
      if (tags && Array.isArray(tags) && tags.length > 0) {
        enhancedQuestion += `\nТеги: ${tags.join(', ')}`;
      }
    }

    enhancedQuestion +=
      '\n\nДай подробный, структурированный ответ для изучения. Используй маркдаун для форматирования. Включи примеры кода, где это уместно.';

    console.log(
      `Генерация ответа для вопроса ${questionId}, пользователь ${userId}`
    );

    // Проверяем кэш перед генерацией
    const cachedResult = await getCachedResponse(enhancedQuestion);

    if (cachedResult.answer) {
      console.log(`Найден кэшированный ответ для вопроса ${questionId}`);

      // Сохраняем кэшированный ответ в базу данных для вопроса, если его там нет
      try {
        await prisma.question.update({
          where: { id: parseInt(questionId) },
          data: { answer: cachedResult.answer },
        });
      } catch (updateError) {
        console.warn('Не удалось обновить ответ в базе данных:', updateError);
      }

      return res.status(200).json({
        answer: cachedResult.answer,
        generatedAt: new Date().toISOString(),
        cached: true,
        tokensUsed: 0,
        source: 'cache',
      });
    }

    // Генерируем новый ответ через OpenRouter API
    const result = await getOpenRouterAnswer(
      enhancedQuestion,
      userId,
      'flashcard', // категория
      null, // company
      null // interviewDate
    );

    if (!result.answer) {
      throw new Error('Не удалось получить ответ от AI');
    }

    // Сохраняем сгенерированный ответ в базу данных
    try {
      await prisma.question.update({
        where: { id: parseInt(questionId) },
        data: {
          answer: result.answer,
          updatedAt: new Date(),
        },
      });
      console.log(`Ответ сохранен в базу данных для вопроса ${questionId}`);
    } catch (updateError) {
      console.warn('Не удалось сохранить ответ в базе данных:', updateError);
    }

    // Кэшируем ответ для будущих запросов
    try {
      await cacheResponse(enhancedQuestion, result.answer);
      console.log(`Ответ кэширован для вопроса ${questionId}`);
    } catch (cacheError) {
      console.warn('Не удалось кэшировать ответ:', cacheError);
    }

    console.log(
      `Ответ успешно сгенерирован для вопроса ${questionId}, токенов использовано: ${
        result.tokensUsed || 0
      }`
    );

    return res.status(200).json({
      answer: result.answer,
      generatedAt: new Date().toISOString(),
      cached: false,
      tokensUsed: result.tokensUsed || 0,
      source: 'ai_generated',
    });
  } catch (error) {
    console.error('=== ОШИБКА ГЕНЕРАЦИИ ОТВЕТА ===');
    console.error('🚨 Детали ошибки:', error);
    console.error('🚨 Стек ошибки:', error.stack);
    console.error('🚨 Параметры запроса:', {
      questionId,
      questionText: questionText?.substring(0, 100) + '...',
      context,
    });
    console.error('🚨 Пользователь:', session?.user?.id || 'не авторизован');
    console.error('=== КОНЕЦ ОШИБКИ ===');

    // Обработка специфических ошибок OpenRouter API
    if (error.message.includes('Превышен дневной лимит запросов')) {
      return res.status(429).json({
        message:
          'Превышен дневной лимит запросов. Пожалуйста, попробуйте завтра.',
        error: 'DAILY_LIMIT_EXCEEDED',
      });
    }

    if (
      error.message.includes('API ключ OpenRouter не найден') ||
      error.message.includes('Настройки API OpenRouter не найдены')
    ) {
      return res.status(500).json({
        message:
          'Ошибка настройки OpenRouter API. Пожалуйста, обратитесь к администратору.',
        error: 'API_CONFIG_ERROR',
      });
    }

    if (error.message.includes('QUOTA_EXCEEDED_ERROR')) {
      return res.status(429).json({
        message: 'Превышена квота API. Пожалуйста, попробуйте позже.',
        error: 'QUOTA_EXCEEDED',
      });
    }

    // Обработка ошибок сети
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      return res.status(503).json({
        message: 'Сервис временно недоступен. Попробуйте позже.',
        error: 'SERVICE_UNAVAILABLE',
      });
    }

    // Обработка ошибок таймаута
    if (error.code === 'ETIMEDOUT' || error.message.includes('timeout')) {
      return res.status(408).json({
        message: 'Превышено время ожидания. Попробуйте еще раз.',
        error: 'TIMEOUT_ERROR',
      });
    }

    return res.status(500).json({
      message: 'Внутренняя ошибка сервера при генерации ответа',
      error:
        process.env.NODE_ENV === 'development'
          ? error.message
          : 'INTERNAL_SERVER_ERROR',
    });
  } finally {
    await prisma.$disconnect();
  }
}
