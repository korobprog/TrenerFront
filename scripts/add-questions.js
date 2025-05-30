const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function addQuestions() {
  try {
    console.log('Подключение к базе данных...');

    // Читаем файл с вопросами
    const questionsFile = path.join(__dirname, '..', 'questions.txt');
    const questionsText = fs.readFileSync(questionsFile, 'utf8');
    const questions = questionsText
      .split('\n')
      .filter((q) => q.trim().length > 0);

    console.log(`Найдено ${questions.length} вопросов для добавления`);

    // Проверяем, есть ли уже вопросы в базе
    const existingCount = await prisma.question.count();
    console.log(`В базе уже есть ${existingCount} вопросов`);

    if (existingCount > 0) {
      console.log('Вопросы уже есть в базе. Пропускаем добавление.');
      return;
    }

    // Добавляем вопросы
    for (let i = 0; i < questions.length; i++) {
      const questionText = questions[i].trim();
      if (questionText) {
        await prisma.question.create({
          data: {
            text: questionText,
            category: 'Frontend',
          },
        });
        console.log(
          `Добавлен вопрос ${i + 1}: ${questionText.substring(0, 50)}...`
        );
      }
    }

    console.log(
      `Успешно добавлено ${questions.length} вопросов в базу данных!`
    );
  } catch (error) {
    console.error('Ошибка при добавлении вопросов:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addQuestions();
