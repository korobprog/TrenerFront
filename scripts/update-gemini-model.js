// Скрипт для обновления модели Gemini с 'gemini-1.0-pro' на 'gemini-1.5-pro'
// в настройках пользователей и глобальных настройках

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateGeminiModel() {
  console.log('Начало обновления моделей Gemini...');

  try {
    // Обновляем настройки пользователей
    const updatedUserSettings = await prisma.userApiSettings.updateMany({
      where: {
        geminiModel: 'gemini-1.0-pro',
      },
      data: {
        geminiModel: 'gemini-1.5-pro',
      },
    });

    console.log(
      `Обновлено настроек пользователей: ${updatedUserSettings.count}`
    );

    // Обновляем глобальные настройки
    const updatedGlobalSettings =
      await prisma.interviewAssistantSettings.updateMany({
        where: {
          geminiModel: 'gemini-1.0-pro',
        },
        data: {
          geminiModel: 'gemini-1.5-pro',
        },
      });

    console.log(
      `Обновлено глобальных настроек: ${updatedGlobalSettings.count}`
    );

    console.log('Обновление моделей Gemini успешно завершено!');
  } catch (error) {
    console.error('Ошибка при обновлении моделей Gemini:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Запускаем функцию обновления
updateGeminiModel()
  .then(() => {
    console.log('Скрипт успешно выполнен');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Ошибка при выполнении скрипта:', error);
    process.exit(1);
  });
