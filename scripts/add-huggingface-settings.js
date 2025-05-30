const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient();

/**
 * Функция для шифрования API ключа
 * @param {string} apiKey - API ключ для шифрования
 * @returns {string} - Зашифрованный API ключ
 */
function encryptApiKey(apiKey) {
  if (!apiKey) return '';

  try {
    console.log('Начало шифрования API ключа');

    // Шифруем API ключ
    const algorithm = 'aes-256-ctr';
    const secretKey =
      process.env.API_KEY_SECRET || 'default-secret-key-for-api-encryption';

    // Убедимся, что secretKey имеет правильную длину для алгоритма aes-256-ctr (32 байта)
    const key = crypto
      .createHash('sha256')
      .update(String(secretKey))
      .digest('base64')
      .substr(0, 32);

    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    const encrypted = Buffer.concat([cipher.update(apiKey), cipher.final()]);

    // Возвращаем зашифрованный ключ в формате iv:encrypted
    const result = `${iv.toString('hex')}:${encrypted.toString('hex')}`;
    console.log('API ключ успешно зашифрован');
    return result;
  } catch (error) {
    console.error('Ошибка при шифровании API ключа:', error);
    return '';
  }
}

/**
 * Функция для добавления настроек Hugging Face API в базу данных
 * @param {string} apiKey - API ключ Hugging Face
 */
/**
 * Проверяет доступность модели Hugging Face
 * @param {string} model - Название модели для проверки
 * @param {string} apiKey - API ключ
 * @returns {Promise<boolean>} - true, если модель доступна, false в противном случае
 */
async function checkModelAvailability(model, apiKey) {
  try {
    const baseUrl = `https://api-inference.huggingface.co/models/${model}`;
    console.log(`Проверка доступности модели: ${model}`);

    // Используем POST запрос с минимальным промптом для проверки доступности
    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        inputs: 'Hello',
        parameters: {
          max_new_tokens: 5,
        },
      }),
    });

    console.log(`Результат проверки модели ${model}:`, {
      status: response.status,
      statusText: response.statusText,
    });

    // Если получили ответ 200 OK, модель доступна
    if (response.ok) {
      return true;
    }

    // Если получили 404 Not Found или другую ошибку, модель недоступна
    console.log(`Модель недоступна: ${model}, статус: ${response.status}`);
    return false;
  } catch (error) {
    console.error(`Ошибка при проверке модели ${model}:`, error);
    return false;
  }
}

/**
 * Получает доступную модель из списка предпочтительных моделей
 * @param {string} apiKey - API ключ
 * @returns {Promise<string>} - Название доступной модели
 */
async function getAvailableModel(apiKey) {
  // Расширенный список моделей в порядке предпочтения
  // Включает как большие, так и маленькие модели для повышения шансов найти доступную
  const preferredModels = [
    'bigcode/starcoder2-7b', // Легковесная модель для программирования с поддержкой русского языка
    'mistralai/Mistral-7B-Instruct-v0.2',
    'meta-llama/Llama-2-7b-chat-hf',
    'gpt2',
    'distilgpt2',
    'facebook/bart-base',
    'google/flan-t5-small',
    'gpt2-medium',
    'EleutherAI/gpt-neo-125M',
    'microsoft/DialoGPT-small',
    'bert-base-uncased',
  ];

  console.log('Проверка доступности моделей...');

  // Проверяем каждую модель по порядку
  for (const model of preferredModels) {
    const isAvailable = await checkModelAvailability(model, apiKey);
    if (isAvailable) {
      console.log(`Найдена доступная модель: ${model}`);
      return model;
    }
  }

  // Если ни одна модель не доступна, возвращаем первую из списка
  // и добавляем предупреждение в лог
  console.warn(
    'Ни одна из предпочтительных моделей не доступна. Используем первую модель из списка, ' +
      'но это может привести к ошибкам при использовании API.'
  );
  return preferredModels[0];
}

async function addHuggingFaceSettings(apiKey) {
  try {
    // Проверяем валидность API ключа
    if (!apiKey || apiKey.trim() === '') {
      throw new Error('API ключ не может быть пустым');
    }

    console.log('Проверка API ключа и поиск доступной модели...');
    const availableModel = await getAvailableModel(apiKey);

    // Проверяем, есть ли уже настройки Hugging Face API
    const existingSettings = await prisma.interviewAssistantSettings.findFirst({
      where: { apiType: 'huggingface' },
    });

    if (existingSettings) {
      console.log('Настройки Hugging Face API уже существуют, обновляем...');
      console.log(`Используемая модель: ${availableModel}`);

      // Обновляем существующие настройки
      await prisma.interviewAssistantSettings.update({
        where: { id: existingSettings.id },
        data: {
          huggingfaceApiKey: encryptApiKey(apiKey),
          huggingfaceModel: availableModel,
          huggingfaceBaseUrl: 'https://api-inference.huggingface.co/models',
          huggingfaceTemperature: 0.7,
          huggingfaceMaxTokens: 2000,
          isActive: true,
          apiType: 'huggingface',
        },
      });

      console.log('Настройки Hugging Face API успешно обновлены');
    } else {
      console.log('Настройки Hugging Face API не найдены, создаем новые...');
      console.log(`Используемая модель: ${availableModel}`);

      // Создаем новые настройки
      await prisma.interviewAssistantSettings.create({
        data: {
          huggingfaceApiKey: encryptApiKey(apiKey),
          huggingfaceModel: availableModel,
          huggingfaceBaseUrl: 'https://api-inference.huggingface.co/models',
          huggingfaceTemperature: 0.7,
          huggingfaceMaxTokens: 2000,
          isActive: true,
          apiType: 'huggingface',
          apiKey: encryptApiKey(apiKey), // Для совместимости с другими полями
          maxQuestionsPerDay: 10,
          maxTokensPerQuestion: 4000,
        },
      });

      console.log('Настройки Hugging Face API успешно созданы');
    }
  } catch (error) {
    console.error('Ошибка при добавлении настроек Hugging Face API:', error);
    console.error('Детали ошибки:', {
      message: error.message,
      stack: error.stack,
    });
  } finally {
    await prisma.$disconnect();
  }
}

// Получаем API ключ из аргументов командной строки
const apiKey = process.argv[2];

if (!apiKey) {
  console.error(
    'Пожалуйста, укажите API ключ Hugging Face в качестве аргумента командной строки'
  );
  console.error(
    'Пример: node scripts/add-huggingface-settings.js YOUR_API_KEY'
  );
  process.exit(1);
}

// Добавляем настройки Hugging Face API
addHuggingFaceSettings(apiKey)
  .then(() => {
    console.log('Скрипт успешно выполнен');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Ошибка при выполнении скрипта:', error);
    process.exit(1);
  });
