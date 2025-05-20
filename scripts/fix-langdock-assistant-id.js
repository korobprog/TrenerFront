/**
 * Скрипт для проверки и исправления формата ID ассистента LangDock в настройках
 *
 * Запуск: node scripts/fix-langdock-assistant-id.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Проверяет, соответствует ли строка формату UUID
 * @param {string} str - Строка для проверки
 * @returns {boolean} - true, если строка соответствует формату UUID
 */
function isValidUUID(str) {
  if (!str) return false;

  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

/**
 * Генерирует случайный UUID v4
 * @returns {string} - Случайный UUID v4
 */
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Проверяет и исправляет формат ID ассистента LangDock в настройках
 */
async function fixLangdockAssistantId() {
  console.log('Начало проверки и исправления ID ассистента LangDock...');

  try {
    // Проверяем глобальные настройки
    const globalSettings = await prisma.interviewAssistantSettings.findMany({
      where: {
        apiType: 'langdock',
      },
    });

    console.log(
      `Найдено ${globalSettings.length} глобальных настроек LangDock API`
    );

    for (const settings of globalSettings) {
      console.log(`Проверка настроек с ID: ${settings.id}`);
      console.log(`Текущий ID ассистента: ${settings.langdockAssistantId}`);

      if (!isValidUUID(settings.langdockAssistantId)) {
        console.log(
          'ID ассистента не соответствует формату UUID, исправление...'
        );

        // Генерируем новый UUID, если не указан в переменных окружения
        const newAssistantId =
          process.env.DEFAULT_LANGDOCK_ASSISTANT_ID || generateUUID();

        // Обновляем настройки
        await prisma.interviewAssistantSettings.update({
          where: {
            id: settings.id,
          },
          data: {
            langdockAssistantId: newAssistantId,
          },
        });

        console.log(`ID ассистента обновлен на: ${newAssistantId}`);
      } else {
        console.log(
          'ID ассистента соответствует формату UUID, исправление не требуется'
        );
      }
    }

    // Проверяем пользовательские настройки
    const userSettings = await prisma.userApiSettings.findMany({
      where: {
        apiType: 'langdock',
      },
    });

    console.log(
      `Найдено ${userSettings.length} пользовательских настроек LangDock API`
    );

    for (const settings of userSettings) {
      console.log(`Проверка настроек пользователя с ID: ${settings.userId}`);
      console.log(`Текущий ID ассистента: ${settings.langdockAssistantId}`);

      if (
        settings.langdockAssistantId &&
        !isValidUUID(settings.langdockAssistantId)
      ) {
        console.log(
          'ID ассистента не соответствует формату UUID, исправление...'
        );

        // Генерируем новый UUID, если не указан в переменных окружения
        const newAssistantId =
          process.env.DEFAULT_LANGDOCK_ASSISTANT_ID || generateUUID();

        // Обновляем настройки
        await prisma.userApiSettings.update({
          where: {
            id: settings.id,
          },
          data: {
            langdockAssistantId: newAssistantId,
          },
        });

        console.log(`ID ассистента обновлен на: ${newAssistantId}`);
      } else if (settings.langdockAssistantId) {
        console.log(
          'ID ассистента соответствует формату UUID, исправление не требуется'
        );
      } else {
        console.log('ID ассистента не указан, исправление не требуется');
      }
    }

    console.log(
      'Проверка и исправление ID ассистента LangDock завершены успешно'
    );
  } catch (error) {
    console.error(
      'Ошибка при проверке и исправлении ID ассистента LangDock:',
      error
    );
    console.error('Детали ошибки:', {
      message: error.message,
      stack: error.stack,
    });
  } finally {
    await prisma.$disconnect();
  }
}

// Запускаем функцию исправления
fixLangdockAssistantId()
  .then(() => {
    console.log('Скрипт завершен');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Ошибка при выполнении скрипта:', error);
    process.exit(1);
  });
