import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import prisma from '../../../prisma/client';
import crypto from 'crypto';
import { getAnswer as getHuggingfaceAnswer } from '../../../lib/utils/huggingfaceApi';

/**
 * Генерирует хэш запроса для использования в кэшировании
 * @param {string} query - Текст запроса пользователя
 * @returns {string} - Хэш запроса
 */
function generateQueryHash(query) {
  // Нормализуем запрос (удаляем лишние пробелы, приводим к нижнему регистру)
  const normalizedQuery = query.trim().toLowerCase();
  // Создаем хэш запроса
  return crypto.createHash('md5').update(normalizedQuery).digest('hex');
}

/**
 * Получает кэшированные подсказки для запроса, если они существуют и не истекли
 * @param {string} query - Текст запроса пользователя
 * @returns {Promise<Array|null>} - Кэшированные подсказки или null, если кэш не найден
 */
async function getCachedSuggestions(query) {
  const queryHash = generateQueryHash(query);

  try {
    const cachedResponse = await prisma.interviewAssistantCache.findFirst({
      where: {
        question: queryHash,
        expiresAt: {
          gt: new Date(), // Проверяем, что кэш не истек
        },
      },
    });

    if (cachedResponse) {
      console.log(
        'Найдены кэшированные подсказки для запроса:',
        query.substring(0, 50) + (query.length > 50 ? '...' : '')
      );
      // Парсим JSON из ответа
      return JSON.parse(cachedResponse.answer);
    }

    return null;
  } catch (error) {
    console.error('Ошибка при получении кэшированных подсказок:', error);
    return null;
  }
}

/**
 * Кэширует подсказки для запроса в базе данных
 * @param {string} query - Текст запроса пользователя
 * @param {Array} suggestions - Массив подсказок
 * @returns {Promise<Object>} - Объект с результатом кэширования
 */
async function cacheSuggestions(query, suggestions) {
  const queryHash = generateQueryHash(query);

  // Устанавливаем срок действия кэша на 24 часа
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24);

  try {
    // Проверяем, существует ли уже кэш для этого запроса
    const existingCache = await prisma.interviewAssistantCache.findFirst({
      where: {
        question: queryHash,
      },
    });

    // Сериализуем массив подсказок в JSON
    const serializedSuggestions = JSON.stringify(suggestions);

    if (existingCache) {
      // Обновляем существующий кэш
      return await prisma.interviewAssistantCache.update({
        where: {
          id: existingCache.id,
        },
        data: {
          answer: serializedSuggestions,
          expiresAt: expiresAt,
          createdAt: new Date(),
        },
      });
    } else {
      // Создаем новый кэш
      return await prisma.interviewAssistantCache.create({
        data: {
          question: queryHash,
          answer: serializedSuggestions,
          expiresAt: expiresAt,
        },
      });
    }
  } catch (error) {
    console.error('Ошибка при кэшировании подсказок:', error);
    return null;
  }
}

export default async function handler(req, res) {
  // Проверяем аутентификацию
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ message: 'Необходима аутентификация' });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Метод не разрешен' });
  }

  // Получаем параметр query из запроса
  const { query } = req.query;

  if (!query || query.trim() === '') {
    return res.status(400).json({ message: 'Параметр query обязателен' });
  }

  const userId = session.user.id;

  try {
    // Проверяем наличие кэшированных подсказок
    const cachedSuggestions = await getCachedSuggestions(query);
    if (cachedSuggestions) {
      return res.status(200).json({ suggestions: cachedSuggestions });
    }

    // Определяем, какой API использовать
    // Сначала проверяем пользовательские настройки
    const userSettings = await prisma.userApiSettings.findUnique({
      where: { userId: userId },
    });

    console.log('Детали пользовательских настроек API для подсказок:', {
      найдены: !!userSettings,
      useCustomApi: userSettings?.useCustomApi,
      apiType: userSettings?.apiType,
      hasHuggingfaceApiKey: !!userSettings?.huggingfaceApiKey,
    });

    // Проверяем, использует ли пользователь собственный Hugging Face API
    const useCustomHuggingfaceApi =
      userSettings?.useCustomApi &&
      userSettings?.apiType === 'huggingface' &&
      userSettings?.huggingfaceApiKey;

    // Проверяем, доступен ли глобальный Hugging Face API
    let useHuggingfaceApi = false;
    if (!useCustomHuggingfaceApi) {
      const globalSettings = await prisma.interviewAssistantSettings.findFirst({
        where: { isActive: true, apiType: 'huggingface' },
      });
      useHuggingfaceApi = !!globalSettings;
    } else {
      useHuggingfaceApi = true;
    }

    // Если доступен Hugging Face API, пробуем использовать его для получения подсказок
    if (useHuggingfaceApi && query.length > 5) {
      try {
        console.log('Попытка получения подсказок через Hugging Face API');

        // Формируем запрос к Hugging Face API для получения подсказок
        const huggingfaceResult = await getHuggingfaceAnswer(
          `Предложи 5 вопросов для собеседования по фронтенд-разработке, связанных с: "${query}". Верни только список вопросов без нумерации и дополнительного текста.`,
          userId
        );

        if (huggingfaceResult && huggingfaceResult.answer) {
          // Парсим ответ от API, разбивая его на отдельные вопросы
          const suggestions = huggingfaceResult.answer
            .split('\n')
            .filter((line) => line.trim().length > 10)
            .map((line) => line.trim().replace(/^[-*•]?\s*/, ''))
            .slice(0, 5);

          if (suggestions.length > 0) {
            // Кэшируем результаты
            await cacheSuggestions(query, suggestions);
            return res.status(200).json({ suggestions, source: 'huggingface' });
          }
        }
      } catch (apiError) {
        console.error(
          'Ошибка при получении подсказок через Hugging Face API:',
          apiError
        );
        // Продолжаем выполнение и используем стандартный метод поиска подсказок
      }
    }

    // Ищем похожие вопросы в базе данных
    // Используем ILIKE для поиска без учета регистра (PostgreSQL)
    const similarQuestions = await prisma.interviewAssistantQA.findMany({
      where: {
        question: {
          contains: query,
          mode: 'insensitive', // Поиск без учета регистра
        },
      },
      select: {
        question: true,
      },
      orderBy: {
        createdAt: 'desc', // Сначала новые вопросы
      },
      take: 5, // Ограничиваем количество результатов
    });

    // Если не нашли похожие вопросы по точному совпадению,
    // ищем по частичному совпадению слов
    if (similarQuestions.length === 0) {
      // Разбиваем запрос на слова длиной от 3 символов
      const queryWords = query
        .toLowerCase()
        .split(/\s+/)
        .filter((word) => word.length >= 3);

      if (queryWords.length > 0) {
        // Создаем условия для поиска по каждому слову
        const wordConditions = queryWords.map((word) => ({
          question: {
            contains: word,
            mode: 'insensitive',
          },
        }));

        // Ищем вопросы, содержащие хотя бы одно из слов запроса
        const wordBasedQuestions = await prisma.interviewAssistantQA.findMany({
          where: {
            OR: wordConditions,
          },
          select: {
            question: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 10, // Берем больше результатов для последующей фильтрации
        });

        // Сортируем результаты по релевантности (количеству совпадающих слов)
        const scoredQuestions = wordBasedQuestions.map((item) => {
          const question = item.question.toLowerCase();
          // Считаем, сколько слов из запроса содержится в вопросе
          const score = queryWords.filter((word) =>
            question.includes(word)
          ).length;
          return { question: item.question, score };
        });

        // Сортируем по убыванию релевантности и берем топ-5
        scoredQuestions.sort((a, b) => b.score - a.score);
        const topQuestions = scoredQuestions
          .slice(0, 5)
          .map((item) => item.question);

        // Если нашли релевантные вопросы, используем их
        if (topQuestions.length > 0) {
          // Кэшируем результаты
          await cacheSuggestions(query, topQuestions);
          return res.status(200).json({ suggestions: topQuestions });
        }
      }
    }

    // Извлекаем только тексты вопросов
    const suggestions = similarQuestions.map((item) => item.question);

    // Кэшируем результаты
    await cacheSuggestions(query, suggestions);

    return res.status(200).json({ suggestions });
  } catch (error) {
    console.error('Ошибка при получении подсказок:', error);
    return res.status(500).json({ message: 'Внутренняя ошибка сервера' });
  } finally {
    await prisma.$disconnect();
  }
}
