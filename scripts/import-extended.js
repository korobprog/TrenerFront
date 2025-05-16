const fs = require('fs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function importExtendedQuestions() {
  try {
    // Проверяем, существует ли файл с вопросами
    if (!fs.existsSync('txt')) {
      console.error('Файл txt не найден');
      return;
    }

    // Читаем файл с вопросами
    const questionsText = fs.readFileSync('txt', 'utf-8');

    // Разбиваем текст на строки
    const lines = questionsText
      .split('\n')
      .filter((line) => line.trim() !== '');

    // Пропускаем заголовки таблицы и пустые строки
    const questionLines = lines.filter((line) => {
      const trimmed = line.trim();
      return (
        trimmed !== '' &&
        !trimmed.startsWith('Шанс\tВопрос\tТег') &&
        trimmed.includes('\t')
      );
    });

    if (questionLines.length === 0) {
      console.log(
        'Файл с вопросами пуст или не содержит вопросов в правильном формате'
      );
      return;
    }

    // Парсим вопросы
    const questions = questionLines
      .map((line) => {
        const parts = line.split('\t');

        // Проверяем, что строка содержит все необходимые части
        if (parts.length < 2) {
          console.warn(`Пропускаем строку с неверным форматом: ${line}`);
          return null;
        }

        // Извлекаем шанс (если есть)
        let chance = null;
        if (parts[0] && parts[0].includes('%')) {
          chance = parseInt(parts[0].replace('%', ''), 10);
          if (isNaN(chance)) chance = null;
        }

        // Извлекаем текст вопроса
        const text = parts[1] ? parts[1].trim() : '';
        if (!text) {
          console.warn(`Пропускаем строку без текста вопроса: ${line}`);
          return null;
        }

        // Извлекаем тег (если есть)
        const tag =
          parts.length > 2 && parts[2] && parts[2].trim() !== 'Нет'
            ? parts[2].trim()
            : null;

        return {
          text,
          category: tag,
          metadata: chance ? { chance } : {},
        };
      })
      .filter((q) => q !== null);

    // Проверяем, что есть вопросы для импорта
    if (questions.length === 0) {
      console.log('Нет вопросов для импорта после фильтрации');
      return;
    }

    console.log(`Подготовлено ${questions.length} вопросов для импорта`);

    // Импортируем вопросы в базу данных
    let importedCount = 0;
    let skippedCount = 0;

    // Обрабатываем вопросы по одному, чтобы избежать дубликатов
    for (const question of questions) {
      // Проверяем, существует ли уже такой вопрос
      const existingQuestion = await prisma.question.findFirst({
        where: {
          text: question.text,
        },
      });

      if (existingQuestion) {
        // Обновляем категорию, если она не была установлена ранее
        if (!existingQuestion.category && question.category) {
          await prisma.question.update({
            where: { id: existingQuestion.id },
            data: { category: question.category },
          });
          console.log(`Обновлена категория для вопроса: ${question.text}`);
        }
        skippedCount++;
      } else {
        // Создаем новый вопрос
        await prisma.question.create({
          data: question,
        });
        importedCount++;
      }
    }

    console.log(`Импортировано ${importedCount} новых вопросов`);
    console.log(`Пропущено ${skippedCount} существующих вопросов`);
  } catch (error) {
    console.error('Ошибка при импорте вопросов:', error);
  } finally {
    await prisma.$disconnect();
  }
}

importExtendedQuestions();
