const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const crypto = require('crypto');

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
 * Функция для добавления настроек OpenRouter API в базу данных
 * @param {string} apiKey - API ключ OpenRouter
 */
async function addOpenRouterSettings(apiKey) {
  try {
    // Проверяем валидность API ключа
    if (!apiKey || apiKey.trim() === '') {
      throw new Error('API ключ не может быть пустым');
    }

    console.log('Проверка API ключа OpenRouter...');

    // Проверяем, есть ли уже настройки OpenRouter API
    const existingSettings = await prisma.interviewAssistantSettings.findFirst({
      where: { apiType: 'openrouter' },
    });

    // Модель по умолчанию для OpenRouter
    const defaultModel = 'google/gemma-3-12b-it:free';
    console.log(`Используемая модель: ${defaultModel}`);

    if (existingSettings) {
      console.log('Настройки OpenRouter API уже существуют, обновляем...');

      // Обновляем существующие настройки, используя отдельные поля для OpenRouter
      await prisma.interviewAssistantSettings.update({
        where: { id: existingSettings.id },
        data: {
          apiKey: encryptApiKey(apiKey),
          isActive: true,
          apiType: 'openrouter',
          // Используем отдельные поля для настроек OpenRouter
          openRouterApiKey: encryptApiKey(apiKey),
          openRouterBaseUrl: 'https://openrouter.ai/api/v1',
          openRouterModel: defaultModel,
          openRouterTemperature: 0.7,
          openRouterMaxTokens: 4000,
          // Обновляем enabledModels для обратной совместимости
          enabledModels: 'gemini,anthropic,langdock,huggingface,openrouter',
        },
      });

      console.log('Настройки OpenRouter API успешно обновлены');
    } else {
      console.log('Настройки OpenRouter API не найдены, создаем новые...');

      // Создаем новые настройки, используя отдельные поля для OpenRouter
      await prisma.interviewAssistantSettings.create({
        data: {
          apiKey: encryptApiKey(apiKey),
          isActive: true,
          apiType: 'openrouter',
          maxQuestionsPerDay: 10,
          maxTokensPerQuestion: 4000,
          // Используем отдельные поля для настроек OpenRouter
          openRouterApiKey: encryptApiKey(apiKey),
          openRouterBaseUrl: 'https://openrouter.ai/api/v1',
          openRouterModel: defaultModel,
          openRouterTemperature: 0.7,
          openRouterMaxTokens: 4000,
          // Устанавливаем enabledModels для обратной совместимости
          enabledModels: 'gemini,anthropic,langdock,huggingface,openrouter',
        },
      });

      console.log('Настройки OpenRouter API успешно созданы');
    }
  } catch (error) {
    console.error('Ошибка при добавлении настроек OpenRouter API:', error);
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
    'Пожалуйста, укажите API ключ OpenRouter в качестве аргумента командной строки'
  );
  console.error('Пример: node scripts/add-openrouter-settings.js YOUR_API_KEY');
  process.exit(1);
}

// Добавляем настройки OpenRouter API
addOpenRouterSettings(apiKey)
  .then(() => {
    console.log('Скрипт успешно выполнен');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Ошибка при выполнении скрипта:', error);
    process.exit(1);
  });
