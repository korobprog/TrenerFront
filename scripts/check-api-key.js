// Скрипт для проверки наличия API ключа в базе данных
import prisma from '../prisma/client.js';

async function checkApiKey() {
  try {
    // Ищем активные настройки
    const settings = await prisma.interviewAssistantSettings.findFirst({
      where: {
        isActive: true,
      },
    });

    if (settings) {
      console.log('Найдены настройки интервью-ассистента:');
      console.log(`- ID: ${settings.id}`);
      console.log(
        `- API ключ: ${settings.apiKey.substring(
          0,
          5
        )}...${settings.apiKey.substring(settings.apiKey.length - 5)}`
      );
      console.log(`- Максимум вопросов в день: ${settings.maxQuestionsPerDay}`);
      console.log(
        `- Максимум токенов на вопрос: ${settings.maxTokensPerQuestion}`
      );
      console.log(`- Активен: ${settings.isActive}`);
    } else {
      console.log('Настройки интервью-ассистента не найдены');
    }
  } catch (error) {
    console.error('Ошибка при проверке API ключа:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Запускаем функцию
checkApiKey();
