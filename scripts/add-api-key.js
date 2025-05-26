// Скрипт для добавления API ключа Anthropic Claude в базу данных
import prisma from '../prisma/client.js';

/**
 * Функция для парсинга аргументов командной строки
 * @returns {Object} - Объект с параметрами
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const params = {
    apiKey: null,
    maxQuestionsPerDay: 10,
    maxTokensPerQuestion: 4000,
    isActive: true,
  };

  // Проверяем, что API ключ передан
  if (args.length === 0) {
    console.error('Ошибка: API ключ не указан');
    console.log(
      'Использование: node scripts/add-api-key.js <API_KEY> [--maxQuestions=10] [--maxTokens=4000] [--isActive=true]'
    );
    process.exit(1);
  }

  // Первый аргумент - API ключ
  params.apiKey = args[0];

  // Парсим остальные аргументы
  for (let i = 1; i < args.length; i++) {
    const arg = args[i];

    if (arg.startsWith('--maxQuestions=')) {
      const value = parseInt(arg.split('=')[1]);
      if (!isNaN(value)) {
        params.maxQuestionsPerDay = value;
      }
    } else if (arg.startsWith('--maxTokens=')) {
      const value = parseInt(arg.split('=')[1]);
      if (!isNaN(value)) {
        params.maxTokensPerQuestion = value;
      }
    } else if (arg.startsWith('--isActive=')) {
      const value = arg.split('=')[1].toLowerCase();
      params.isActive = value === 'true';
    }
  }

  return params;
}

/**
 * Функция для добавления или обновления API ключа в базе данных
 */
async function addApiKey() {
  try {
    // Получаем параметры из командной строки
    const params = parseArgs();

    console.log('Параметры:');
    console.log(`- maxQuestionsPerDay: ${params.maxQuestionsPerDay}`);
    console.log(`- maxTokensPerQuestion: ${params.maxTokensPerQuestion}`);
    console.log(`- isActive: ${params.isActive}`);

    // Проверяем, существует ли уже запись
    const existingSettings = await prisma.interviewAssistantSettings.findFirst({
      where: {
        isActive: true,
      },
    });

    if (existingSettings) {
      // Обновляем существующую запись
      await prisma.interviewAssistantSettings.update({
        where: {
          id: existingSettings.id,
        },
        data: {
          apiKey: params.apiKey,
          maxQuestionsPerDay: params.maxQuestionsPerDay,
          maxTokensPerQuestion: params.maxTokensPerQuestion,
          isActive: params.isActive,
        },
      });
      console.log('API ключ и настройки успешно обновлены');
    } else {
      // Создаем новую запись
      await prisma.interviewAssistantSettings.create({
        data: {
          apiKey: params.apiKey,
          maxQuestionsPerDay: params.maxQuestionsPerDay,
          maxTokensPerQuestion: params.maxTokensPerQuestion,
          isActive: params.isActive,
        },
      });
      console.log('API ключ и настройки успешно добавлены');
    }
  } catch (error) {
    console.error('Ошибка при добавлении API ключа:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Запускаем функцию
addApiKey();
