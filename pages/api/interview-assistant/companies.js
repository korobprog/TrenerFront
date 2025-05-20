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

      if (!company || company.trim() === '') {
        return res
          .status(400)
          .json({ message: 'Название компании обязательно' });
      }

      const companyName = company.trim();

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
      await prisma.interviewAssistantUsage.upsert({
        where: {
          id: `${userId}-${new Date().toISOString().split('T')[0]}`, // Уникальный ID для текущего дня
        },
        update: {
          company: companyName,
        },
        create: {
          id: `${userId}-${new Date().toISOString().split('T')[0]}`,
          userId: userId,
          date: new Date(),
          questionsCount: 0,
          tokensUsed: 0,
          apiCost: 0,
          company: companyName,
        },
      });

      // Если указана дата собеседования, сохраняем её в модели InterviewAssistantUsage
      if (interviewDate) {
        // Обновляем запись в InterviewAssistantUsage, добавляя дату собеседования
        await prisma.interviewAssistantUsage.upsert({
          where: {
            id: `${userId}-${new Date().toISOString().split('T')[0]}`, // Уникальный ID для текущего дня
          },
          update: {
            company: companyName,
            interviewDate: new Date(interviewDate), // Сохраняем дату собеседования
          },
          create: {
            id: `${userId}-${new Date().toISOString().split('T')[0]}`,
            userId: userId,
            date: new Date(),
            questionsCount: 0,
            tokensUsed: 0,
            apiCost: 0,
            company: companyName,
            interviewDate: new Date(interviewDate), // Сохраняем дату собеседования
          },
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Компания успешно сохранена',
        company: companyName,
        interviewDate: interviewDate || null,
      });
    }

    // Если метод не поддерживается
    else {
      return res.status(405).json({ message: 'Метод не разрешен' });
    }
  } catch (error) {
    console.error('Ошибка при обработке запроса:', error);
    return res.status(500).json({ message: 'Внутренняя ошибка сервера' });
  } finally {
    await prisma.$disconnect();
  }
}
