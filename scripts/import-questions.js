const fs = require('fs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function importQuestions() {
  try {
    // Проверяем, существует ли файл с вопросами
    if (!fs.existsSync('questions.txt')) {
      console.error('Файл questions.txt не найден');
      return;
    }

    // Читаем файл с вопросами
    const questionsText = fs.readFileSync('questions.txt', 'utf-8');

    // Разбиваем текст на отдельные вопросы
    const questions = questionsText
      .split('\n')
      .filter((line) => line.trim() !== '')
      .map((text) => ({ text }));

    if (questions.length === 0) {
      console.log('Файл с вопросами пуст');
      return;
    }

    // Импортируем вопросы в базу данных
    const result = await prisma.question.createMany({
      data: questions,
      skipDuplicates: true,
    });

    console.log(`Импортировано ${result.count} вопросов`);
  } catch (error) {
    console.error('Ошибка при импорте вопросов:', error);
  } finally {
    await prisma.$disconnect();
  }
}

importQuestions();
