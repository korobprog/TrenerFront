import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';
import * as langdockApi from '../../lib/utils/langdockApi';

/**
 * API-обработчик для генерации текста с использованием LangDock API
 *
 * @param {Object} req - HTTP запрос
 * @param {Object} res - HTTP ответ
 * @returns {Promise<void>}
 */
export default async function handler(req, res) {
  // Проверяем, что метод запроса - POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Метод не разрешен' });
  }

  try {
    // Получаем сессию пользователя
    const session = await getServerSession(req, res, authOptions);

    // Проверяем авторизацию
    if (!session || !session.user) {
      return res.status(401).json({ error: 'Не авторизован' });
    }

    // Получаем данные из запроса
    const {
      text,
      category = null,
      company = null,
      interviewDate = null,
      forceRefresh = false,
    } = req.body;

    // Проверяем наличие текста
    if (!text || typeof text !== 'string' || text.trim() === '') {
      return res
        .status(400)
        .json({ error: 'Текст для генерации не указан или пуст' });
    }

    // Преобразуем строку даты в объект Date, если она указана
    let parsedInterviewDate = null;
    if (interviewDate) {
      parsedInterviewDate = new Date(interviewDate);

      // Проверяем валидность даты
      if (isNaN(parsedInterviewDate.getTime())) {
        return res
          .status(400)
          .json({ error: 'Некорректный формат даты собеседования' });
      }
    }

    console.log('Запрос на генерацию текста с использованием LangDock API:', {
      userId: session.user.id,
      textLength: text.length,
      category,
      company,
      interviewDate: parsedInterviewDate,
      forceRefresh,
    });

    // Получаем ответ от LangDock API
    const result = await langdockApi.getAnswer(
      text,
      session.user.id,
      category,
      company,
      parsedInterviewDate,
      forceRefresh
    );

    // Возвращаем результат
    return res.status(200).json({
      answer: result.answer,
      fromCache: result.fromCache,
      tokensUsed: result.tokensUsed,
      apiCost: result.apiCost,
    });
  } catch (error) {
    console.error(
      'Ошибка при генерации текста с использованием LangDock API:',
      error
    );

    // Определяем код ошибки в зависимости от типа ошибки
    let statusCode = 500;
    let errorMessage = 'Внутренняя ошибка сервера';

    if (error.message.includes('Превышен дневной лимит')) {
      statusCode = 429;
      errorMessage = 'Превышен дневной лимит запросов к API';
    } else if (error.message.includes('Настройки API не найдены')) {
      statusCode = 503;
      errorMessage = 'Сервис временно недоступен: настройки API не найдены';
    } else if (
      error.message.includes('Ошибка API') ||
      error.message.includes('Ошибка при запросе к LangDock API')
    ) {
      statusCode = 502;
      errorMessage = 'Ошибка при обращении к LangDock API';
    }

    return res.status(statusCode).json({ error: errorMessage });
  }
}
