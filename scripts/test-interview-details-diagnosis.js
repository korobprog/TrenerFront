// Тест для диагностики проблемы с получением деталей интервью
const testInterviewDetailsEndpoint = async () => {
  console.log('=== ДИАГНОСТИКА ПРОБЛЕМЫ С ПОЛУЧЕНИЕМ ДЕТАЛЕЙ ИНТЕРВЬЮ ===');

  const testId = 'cmbbbnswc0002mkxw9btm0t9n'; // ID из ошибки

  // 1. Проверяем существование API endpoint
  console.log('\n1. Проверка существования API endpoint:');
  try {
    const response = await fetch(
      `http://localhost:3000/api/mock-interviews/${testId}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('Статус ответа:', response.status);
    console.log('Статус текст:', response.statusText);
    console.log('URL запроса:', response.url);

    if (response.status === 404) {
      console.log('❌ ПОДТВЕРЖДЕНО: API endpoint не существует');
    } else {
      console.log('✅ API endpoint существует');
      const data = await response.json();
      console.log('Данные ответа:', data);
    }
  } catch (error) {
    console.error('Ошибка при запросе:', error.message);
  }

  // 2. Проверяем существование файла API route
  console.log('\n2. Проверка структуры файлов API:');
  const fs = require('fs');
  const path = require('path');

  const apiDir = path.join(process.cwd(), 'pages', 'api', 'mock-interviews');
  console.log('Директория API:', apiDir);

  try {
    const files = fs.readdirSync(apiDir);
    console.log('Файлы в директории mock-interviews:', files);

    const idFile = path.join(apiDir, '[id].js');
    const idFileExists = fs.existsSync(idFile);
    console.log('Файл [id].js существует:', idFileExists);

    if (!idFileExists) {
      console.log(
        '❌ ПОДТВЕРЖДЕНО: Файл pages/api/mock-interviews/[id].js отсутствует'
      );
    }
  } catch (error) {
    console.error('Ошибка при проверке файлов:', error.message);
  }

  // 3. Проверяем существование интервью в базе данных
  console.log('\n3. Проверка существования интервью в БД:');
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    const interview = await prisma.mockInterview.findUnique({
      where: { id: testId },
      include: {
        interviewer: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        interviewee: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        interviewFeedback: true,
        videoRoom: {
          select: {
            id: true,
            code: true,
            name: true,
            isActive: true,
          },
        },
      },
    });

    if (interview) {
      console.log('✅ Интервью найдено в БД:', {
        id: interview.id,
        status: interview.status,
        scheduledTime: interview.scheduledTime,
        interviewerId: interview.interviewerId,
        intervieweeId: interview.intervieweeId,
      });
    } else {
      console.log('❌ Интервью не найдено в БД');
    }

    await prisma.$disconnect();
  } catch (error) {
    console.error('Ошибка при проверке БД:', error.message);
  }

  console.log('\n=== ЗАКЛЮЧЕНИЕ ДИАГНОСТИКИ ===');
  console.log(
    'Основная проблема: Отсутствует API endpoint pages/api/mock-interviews/[id].js'
  );
  console.log(
    'Необходимо: Создать API endpoint для получения деталей интервью'
  );
};

// Запуск диагностики
if (require.main === module) {
  testInterviewDetailsEndpoint().catch(console.error);
}

module.exports = { testInterviewDetailsEndpoint };
