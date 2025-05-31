import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import prisma from '../../../prisma/client';
import { getAnswer as getHuggingfaceAnswer } from '../../../lib/utils/huggingfaceApi';

/**
 * API эндпоинт для работы с компаниями
 * GET: получение списка компаний для автоподсказок
 * POST: сохранение новой компании в базе данных
 *
 * @param {Object} req - HTTP запрос
 * @param {Object} res - HTTP ответ
 */
export default async function handler(req, res) {
  // Проверяем аутентификацию
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ message: 'Необходима аутентификация' });
  }

  const userId = session.user.id;

  try {
    // Обработка GET запроса для получения списка компаний
    if (req.method === 'GET') {
      const { query } = req.query;

      if (!query || query.trim() === '') {
        return res.status(400).json({ message: 'Параметр query обязателен' });
      }

      // Ищем компании, соответствующие запросу
      const companies = await prisma.interviewAssistantCompany.findMany({
        where: {
          name: {
            contains: query,
            mode: 'insensitive', // Поиск без учета регистра
          },
        },
        orderBy: [
          { count: 'desc' }, // Сначала самые популярные
          { name: 'asc' }, // Затем по алфавиту
        ],
        take: 10, // Ограничиваем количество результатов
        select: {
          name: true,
        },
      });

      // Извлекаем только названия компаний
      const companyNames = companies.map((company) => company.name);

      return res.status(200).json({ companies: companyNames });
    }

    // Обработка POST запроса для сохранения компании
    else if (req.method === 'POST') {
      const { company, interviewDate } = req.body;
      console.log('[DEBUG] POST запрос на сохранение компании:', {
        userId,
        company,
        interviewDate,
        sessionUserId: session?.user?.id,
        requestMethod: req.method,
      });

      if (!company || company.trim() === '') {
        console.log('[DEBUG] Ошибка: название компании не указано');
        return res
          .status(400)
          .json({ message: 'Название компании обязательно' });
      }

      const companyName = company.trim();
      console.log('[DEBUG] Название компании после обработки:', companyName);

      // Проверяем, существует ли уже такая компания
      const existingCompany = await prisma.interviewAssistantCompany.findUnique(
        {
          where: {
            name: companyName,
          },
        }
      );

      if (existingCompany) {
        // Если компания существует, увеличиваем счетчик
        await prisma.interviewAssistantCompany.update({
          where: {
            id: existingCompany.id,
          },
          data: {
            count: {
              increment: 1,
            },
            updatedAt: new Date(),
          },
        });
      } else {
        // Если компании нет, создаем новую
        await prisma.interviewAssistantCompany.create({
          data: {
            name: companyName,
            count: 1,
          },
        });
      }

      // Определяем, какой API использовать
      // Сначала проверяем пользовательские настройки
      const userSettings = await prisma.userApiSettings.findUnique({
        where: { userId: userId },
      });

      console.log('Детали пользовательских настроек API для компании:', {
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
        const globalSettings =
          await prisma.interviewAssistantSettings.findFirst({
            where: { isActive: true, apiType: 'huggingface' },
          });
        useHuggingfaceApi = !!globalSettings;
      } else {
        useHuggingfaceApi = true;
      }

      // Если доступен Hugging Face API, получаем информацию о компании
      if (useHuggingfaceApi) {
        try {
          console.log('Получение информации о компании через Hugging Face API');

          // Запрашиваем информацию о компании через Hugging Face API
          await getHuggingfaceAnswer(
            `Расскажи кратко о компании "${companyName}" для подготовки к собеседованию.`,
            userId,
            'company_info',
            companyName,
            interviewDate ? new Date(interviewDate) : null
          );

          console.log(
            'Информация о компании успешно запрошена через Hugging Face API'
          );
        } catch (apiError) {
          console.error(
            'Ошибка при получении информации о компании через Hugging Face API:',
            apiError
          );
          // Продолжаем выполнение даже при ошибке API
        }
      }

      // Сохраняем информацию о компании в статистике использования
      const currentDate = new Date();
      const dateString = currentDate.toISOString().split('T')[0];
      const usageId = `${userId}-${dateString}`;

      console.log(
        '[DEBUG] Сохранение информации о компании в InterviewAssistantUsage:',
        {
          userId,
          companyName,
          date: dateString,
          id: usageId,
          currentDateTime: currentDate.toISOString(),
        }
      );

      try {
        console.log(
          '[DEBUG] Перед вызовом prisma.interviewAssistantUsage.upsert'
        );
        console.log('[DEBUG] Параметры запроса:', {
          where: { id: usageId },
          update: { company: companyName },
          create: {
            id: usageId,
            userId: userId,
            date: currentDate,
            questionsCount: 0,
            tokensUsed: 0,
            apiCost: 0,
            company: companyName,
          },
        });

        const usageResult = await prisma.interviewAssistantUsage.upsert({
          where: {
            id: usageId, // Уникальный ID для текущего дня
          },
          update: {
            company: companyName,
          },
          create: {
            id: usageId,
            userId: userId,
            date: currentDate,
            questionsCount: 0,
            tokensUsed: 0,
            apiCost: 0,
            company: companyName,
          },
        });

        console.log('[DEBUG] Результат сохранения в InterviewAssistantUsage:', {
          success: !!usageResult,
          id: usageResult?.id,
          company: usageResult?.company,
          date: usageResult?.date?.toISOString(),
        });
      } catch (usageError) {
        console.error(
          '[DEBUG] Ошибка при сохранении в InterviewAssistantUsage:',
          usageError
        );
        console.error('[DEBUG] Детали ошибки:', {
          message: usageError.message,
          code: usageError.code,
          meta: usageError.meta,
          stack: usageError.stack,
        });
        // Продолжаем выполнение даже при ошибке сохранения
      }

      // Если указана дата собеседования, сохраняем её в модели InterviewAssistantUsage
      if (interviewDate) {
        console.log('[DEBUG] Сохранение даты собеседования:', interviewDate);
        try {
          // Обновляем запись в InterviewAssistantUsage, добавляя дату собеседования
          const interviewDateObj = new Date(interviewDate);
          console.log('[DEBUG] Объект даты собеседования:', {
            original: interviewDate,
            parsed: interviewDateObj.toISOString(),
            valid: !isNaN(interviewDateObj.getTime()),
          });

          const interviewDateResult =
            await prisma.interviewAssistantUsage.upsert({
              where: {
                id: usageId, // Уникальный ID для текущего дня
              },
              update: {
                company: companyName,
                interviewDate: interviewDateObj, // Сохраняем дату собеседования
              },
              create: {
                id: usageId,
                userId: userId,
                date: currentDate,
                questionsCount: 0,
                tokensUsed: 0,
                apiCost: 0,
                company: companyName,
                interviewDate: interviewDateObj, // Сохраняем дату собеседования
              },
            });

          console.log('[DEBUG] Результат сохранения даты собеседования:', {
            success: !!interviewDateResult,
            id: interviewDateResult?.id,
            company: interviewDateResult?.company,
            interviewDate: interviewDateResult?.interviewDate?.toISOString(),
          });
        } catch (dateError) {
          console.error(
            '[DEBUG] Ошибка при сохранении даты собеседования:',
            dateError
          );
          console.error('[DEBUG] Детали ошибки даты:', {
            message: dateError.message,
            stack: dateError.stack,
          });
          // Продолжаем выполнение даже при ошибке сохранения даты
        }
      }

      console.log('[DEBUG] Отправка успешного ответа клиенту');
      return res.status(200).json({
        success: true,
        message: 'Компания успешно сохранена',
        company: companyName,
        interviewDate: interviewDate || null,
        userId: userId,
        usageId: usageId,
      });
    }

    // Если метод не поддерживается
    else {
      return res.status(405).json({ message: 'Метод не разрешен' });
    }
  } catch (error) {
    console.error('[DEBUG] Ошибка при обработке запроса:', error);
    console.error('[DEBUG] Детали ошибки:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
    });
    return res.status(500).json({
      message: 'Внутренняя ошибка сервера',
      error: error.message,
    });
  } finally {
    try {
      await prisma.$disconnect();
      console.log('[DEBUG] Соединение с базой данных закрыто');
    } catch (disconnectError) {
      console.error(
        '[DEBUG] Ошибка при закрытии соединения с базой данных:',
        disconnectError
      );
    }
  }
}
