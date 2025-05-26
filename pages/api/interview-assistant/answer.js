import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { getAnswer as getAnthropicAnswer } from '../../../lib/utils/anthropicApi';
import { getAnswer as getLangdockAnswer } from '../../../lib/utils/langdockApi';
import { getAnswer as getGeminiAnswer } from '../../../lib/utils/geminiApi';
import { getAnswer as getHuggingfaceAnswer } from '../../../lib/utils/huggingfaceApi';
// Импортируем CommonJS модуль и получаем нужную функцию
import openRouterApiModule from '../../../lib/utils/openRouterApi';
const getOpenRouterAnswer = openRouterApiModule.getAnswer;
import prisma from '../../../prisma/client';

/**
 * API эндпоинт для получения ответа на вопрос
 *
 * @param {Object} req - Объект запроса
 * @param {Object} res - Объект ответа
 * @returns {Promise<void>}
 */
export default async function handler(req, res) {
  // Проверяем аутентификацию
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ message: 'Необходима аутентификация' });
  }

  // Проверяем метод запроса
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Метод не разрешен' });
  }

  // Получаем вопрос из тела запроса
  const { question, category } = req.body;

  if (!question || question.trim() === '') {
    return res.status(400).json({ message: 'Параметр question обязателен' });
  }

  const userId = session.user.id;

  try {
    // Получаем информацию о компании и дате собеседования из модели InterviewAssistantUsage
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const usage = await prisma.interviewAssistantUsage.findFirst({
      where: {
        userId: userId,
        date: {
          gte: today,
          lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
        },
      },
      select: {
        company: true,
        interviewDate: true,
      },
    });

    console.log(
      `Получение ответа для пользователя: ${userId}, компания: ${
        usage?.company || 'не указана'
      }, дата собеседования: ${usage?.interviewDate || 'не указана'}`
    );

    // Определяем, какой API использовать
    // Сначала проверяем пользовательские настройки
    const userSettings = await prisma.userApiSettings.findUnique({
      where: { userId: userId },
    });

    console.log('Детали пользовательских настроек API:', {
      найдены: !!userSettings,
      useCustomApi: userSettings?.useCustomApi,
      apiType: userSettings?.apiType,
      hasApiKey: !!userSettings?.apiKey,
      hasGeminiApiKey: !!userSettings?.geminiApiKey,
      hasAnthropicApiKey: !!userSettings?.apiKey,
      hasHuggingfaceApiKey: !!userSettings?.huggingfaceApiKey,
    });

    // Проверяем, использует ли пользователь собственный API
    const useCustomApi =
      userSettings?.useCustomApi &&
      ((userSettings?.apiType === 'gemini' && userSettings?.geminiApiKey) ||
        (userSettings?.apiType === 'anthropic' && userSettings?.apiKey) ||
        (userSettings?.apiType === 'langdock' &&
          userSettings?.langdockApiKey) ||
        (userSettings?.apiType === 'huggingface' &&
          userSettings?.huggingfaceApiKey) ||
        (userSettings?.apiType === 'openrouter' &&
          userSettings?.openRouterApiKey));

    console.log('Использование пользовательского API:', useCustomApi);

    // Если пользователь использует собственный API, проверяем его тип
    let apiType = 'gemini'; // По умолчанию используем Gemini API

    if (useCustomApi) {
      // Если у пользователя есть собственные настройки, используем их
      apiType = userSettings.apiType || 'anthropic';
      console.log('Используются пользовательские настройки API:', apiType);
    } else {
      // Иначе используем глобальные настройки
      const globalSettings = await prisma.interviewAssistantSettings.findFirst({
        where: { isActive: true },
      });

      console.log('Глобальные настройки API:', {
        найдены: !!globalSettings,
        apiType: globalSettings?.apiType,
      });

      if (globalSettings) {
        apiType = globalSettings.apiType || 'gemini';
      }
    }

    console.log(`Используемый API: ${apiType}`);

    // Получаем ответ на вопрос с использованием соответствующего API
    let result;
    if (apiType === 'langdock') {
      result = await getLangdockAnswer(
        question,
        userId,
        category,
        usage?.company,
        usage?.interviewDate
      );
    } else if (apiType === 'anthropic') {
      result = await getAnthropicAnswer(
        question,
        userId,
        category,
        usage?.company,
        usage?.interviewDate
      );
    } else if (apiType === 'huggingface') {
      result = await getHuggingfaceAnswer(
        question,
        userId,
        category,
        usage?.company,
        usage?.interviewDate
      );
    } else if (apiType === 'openrouter') {
      result = await getOpenRouterAnswer(
        question,
        userId,
        category,
        usage?.company,
        usage?.interviewDate
      );
    } else {
      // По умолчанию используем Gemini API
      result = await getGeminiAnswer(
        question,
        userId,
        category,
        usage?.company,
        usage?.interviewDate
      );
    }

    // Логируем результат перед отправкой клиенту
    console.log('Результат запроса к API:', {
      answer: result.answer ? result.answer.substring(0, 100) + '...' : 'пусто',
      answerLength: result.answer ? result.answer.length : 0,
      answerType: typeof result.answer,
      fromCache: result.fromCache,
      apiType: apiType,
    });

    // Возвращаем ответ клиенту
    return res.status(200).json({
      answer: result.answer,
      fromCache: result.fromCache,
      tokensUsed: result.tokensUsed,
      apiCost: result.apiCost,
      apiType: apiType, // Добавляем информацию о типе API
    });
  } catch (error) {
    console.error('Ошибка при получении ответа:', error);

    // Проверяем, связана ли ошибка с превышением лимита запросов
    if (error.message.includes('Превышен дневной лимит запросов')) {
      return res.status(429).json({
        message:
          'Превышен дневной лимит запросов. Пожалуйста, попробуйте завтра.',
      });
    }

    // Проверяем ошибки Gemini API
    if (
      error.message.includes('API ключ Gemini не найден') ||
      error.message.includes('Ошибка при получении настроек API Gemini')
    ) {
      return res.status(500).json({
        message:
          'Ошибка настройки Gemini API. Пожалуйста, обратитесь к администратору.',
      });
    }

    // Проверяем ошибки Hugging Face API
    if (
      error.message.includes('API ключ Hugging Face не найден') ||
      error.message.includes(
        'Ошибка при получении настроек API Hugging Face'
      ) ||
      error.message.includes(
        'Настройки API Hugging Face не найдены или неактивны'
      )
    ) {
      return res.status(500).json({
        message:
          'Ошибка настройки Hugging Face API. Пожалуйста, обратитесь к администратору.',
      });
    }

    // Проверяем ошибки OpenRouter API
    if (
      error.message.includes('API ключ OpenRouter не найден') ||
      error.message.includes('Ошибка при получении настроек API OpenRouter') ||
      error.message.includes(
        'Настройки API OpenRouter не найдены или неактивны'
      )
    ) {
      return res.status(500).json({
        message:
          'Ошибка настройки OpenRouter API. Пожалуйста, обратитесь к администратору.',
      });
    }

    // Обработка ошибки превышения квоты Gemini API
    if (error.message.includes('QUOTA_EXCEEDED_ERROR')) {
      console.log(
        'Обнаружена ошибка превышения квоты Gemini API, пробуем использовать альтернативный API'
      );

      try {
        // Определяем, какой альтернативный API использовать
        // Сначала пробуем Hugging Face, затем Anthropic, затем LangDock
        let alternativeApiType = 'openrouter';
        let alternativeResult;

        // Сначала пробуем OpenRouter как альтернативу
        try {
          console.log('Пробуем использовать OpenRouter API как альтернативу');
          alternativeResult = await getOpenRouterAnswer(
            question,
            userId,
            category,
            usage?.company,
            usage?.interviewDate
          );
        } catch (openRouterError) {
          console.error(
            'Ошибка при использовании OpenRouter API:',
            openRouterError
          );

          // Если OpenRouter недоступен, пробуем Hugging Face
          try {
            console.log(
              'Пробуем использовать Hugging Face API как альтернативу'
            );
            alternativeApiType = 'huggingface';
            alternativeResult = await getHuggingfaceAnswer(
              question,
              userId,
              category,
              usage?.company,
              usage?.interviewDate
            );
          } catch (huggingfaceError) {
            console.error(
              'Ошибка при использовании Hugging Face API:',
              huggingfaceError
            );

            // Если Hugging Face недоступен, пробуем Anthropic
            try {
              console.log(
                'Пробуем использовать Anthropic API как альтернативу'
              );
              alternativeApiType = 'anthropic';
              alternativeResult = await getAnthropicAnswer(
                question,
                userId,
                category,
                usage?.company,
                usage?.interviewDate
              );
            } catch (anthropicError) {
              console.error(
                'Ошибка при использовании Anthropic API:',
                anthropicError
              );

              // Если Anthropic недоступен, пробуем LangDock
              console.log('Пробуем использовать LangDock API как альтернативу');
              alternativeApiType = 'langdock';
              alternativeResult = await getLangdockAnswer(
                question,
                userId,
                category,
                usage?.company,
                usage?.interviewDate
              );
            }
          }
        }

        // Если получили результат от альтернативного API, возвращаем его
        if (alternativeResult) {
          console.log(
            `Успешно получен ответ от альтернативного API (${alternativeApiType})`
          );
          return res.status(200).json({
            answer: alternativeResult.answer,
            fromCache: alternativeResult.fromCache,
            tokensUsed: alternativeResult.tokensUsed,
            apiCost: alternativeResult.apiCost,
            apiType: alternativeApiType,
            fallbackUsed: true, // Флаг, указывающий на использование резервного API
            fallbackReason: 'Превышена квота Gemini API',
          });
        }
      } catch (fallbackError) {
        console.error(
          'Ошибка при использовании альтернативных API:',
          fallbackError
        );
        // Если все альтернативные API недоступны, возвращаем понятное сообщение об ошибке
        return res.status(429).json({
          message:
            'Превышена квота Gemini API, и альтернативные API недоступны. Пожалуйста, попробуйте позже или обратитесь к администратору.',
          fallbackAttempted: true,
        });
      }
    }

    return res.status(500).json({
      message: `Ошибка при получении ответа: ${error.message}`,
    });
  } finally {
    await prisma.$disconnect();
  }
}
