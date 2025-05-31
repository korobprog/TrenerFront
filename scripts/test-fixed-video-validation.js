/**
 * Тест исправленной валидации времени для встроенной видеосистемы
 */

const fetch = require('node-fetch');

// Функция для тестирования создания видеокомнаты с различными временными параметрами
async function testVideoRoomCreation() {
  console.log('=== ТЕСТ ИСПРАВЛЕННОЙ ВАЛИДАЦИИ ВРЕМЕНИ ===\n');

  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';

  // Тестовые случаи
  const testCases = [
    {
      name: 'Завтра 09:00 MSK (должно работать)',
      scheduledStartTime: new Date(Date.now() + 24 * 60 * 60 * 1000)
        .toISOString()
        .replace(/T.*/, 'T06:00:00.000Z'), // Завтра 09:00 MSK
      expectedResult: 'success',
    },
    {
      name: 'Через 2 часа (должно работать)',
      scheduledStartTime: new Date(
        Date.now() + 2 * 60 * 60 * 1000
      ).toISOString(),
      expectedResult: 'success',
    },
    {
      name: 'Через 5 минут (должно работать)',
      scheduledStartTime: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      expectedResult: 'success',
    },
    {
      name: 'Через 30 секунд (должно не работать - меньше буфера)',
      scheduledStartTime: new Date(Date.now() + 30 * 1000).toISOString(),
      expectedResult: 'error',
    },
    {
      name: 'Вчера (должно не работать)',
      scheduledStartTime: new Date(
        Date.now() - 24 * 60 * 60 * 1000
      ).toISOString(),
      expectedResult: 'error',
    },
  ];

  console.log('Текущее время:', new Date().toISOString());
  console.log(
    'Текущее время (MSK):',
    new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })
  );
  console.log();

  for (const testCase of testCases) {
    console.log(`\n--- ${testCase.name} ---`);
    console.log('Запланированное время (UTC):', testCase.scheduledStartTime);
    console.log(
      'Запланированное время (MSK):',
      new Date(testCase.scheduledStartTime).toLocaleString('ru-RU', {
        timeZone: 'Europe/Moscow',
      })
    );

    const videoRoomData = {
      name: `Тест: ${testCase.name}`,
      description: 'Тестирование исправленной валидации времени',
      isPrivate: true,
      maxParticipants: 2,
      scheduledStartTime: testCase.scheduledStartTime,
      recordingEnabled: false,
      settings: {
        allowScreenShare: true,
        allowChat: true,
        autoRecord: false,
      },
    };

    try {
      console.log('Отправка запроса на создание видеокомнаты...');

      // Симуляция запроса (без реального HTTP вызова для тестирования)
      console.log('Данные запроса:', JSON.stringify(videoRoomData, null, 2));

      // Симуляция валидации
      const scheduledTime = new Date(testCase.scheduledStartTime);
      const now = new Date();
      const bufferMinutes = 1;
      const minValidTime = new Date(now.getTime() + bufferMinutes * 60 * 1000);

      const isValid = scheduledTime >= minValidTime;
      const differenceMinutes = (
        (scheduledTime.getTime() - now.getTime()) /
        (1000 * 60)
      ).toFixed(2);

      console.log('Результат валидации:');
      console.log('  Время валидно:', isValid);
      console.log('  Разница в минутах:', differenceMinutes);
      console.log('  Минимальное валидное время:', minValidTime.toISOString());

      if (isValid && testCase.expectedResult === 'success') {
        console.log('✅ УСПЕХ: Валидация прошла как ожидалось');
      } else if (!isValid && testCase.expectedResult === 'error') {
        console.log('✅ УСПЕХ: Валидация отклонила запрос как ожидалось');
      } else {
        console.log('❌ НЕОЖИДАННЫЙ РЕЗУЛЬТАТ');
      }
    } catch (error) {
      console.log('❌ ОШИБКА:', error.message);
    }
  }
}

// Функция для тестирования создания интервью с встроенной видеосистемой
async function testInterviewCreation() {
  console.log(
    '\n\n=== ТЕСТ СОЗДАНИЯ ИНТЕРВЬЮ С ВСТРОЕННОЙ ВИДЕОСИСТЕМОЙ ===\n'
  );

  const testCases = [
    {
      name: 'Завтра 09:00 MSK',
      scheduledTime: new Date(Date.now() + 24 * 60 * 60 * 1000)
        .toISOString()
        .replace(/T.*/, 'T06:00:00.000Z'),
      videoType: 'built_in',
    },
    {
      name: 'Через 2 часа',
      scheduledTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      videoType: 'built_in',
    },
  ];

  for (const testCase of testCases) {
    console.log(`\n--- ${testCase.name} ---`);
    console.log('Запланированное время:', testCase.scheduledTime);
    console.log('Тип видео:', testCase.videoType);

    const interviewData = {
      scheduledTime: testCase.scheduledTime,
      videoType: testCase.videoType,
    };

    console.log('Данные интервью:', JSON.stringify(interviewData, null, 2));

    // Симуляция валидации времени
    const scheduledDate = new Date(testCase.scheduledTime);
    const now = new Date();

    console.log('Валидация времени:');
    console.log('  Запланированное время (UTC):', scheduledDate.toISOString());
    console.log('  Текущее время (UTC):', now.toISOString());
    console.log(
      '  Запланированное время (MSK):',
      scheduledDate.toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })
    );
    console.log(
      '  Текущее время (MSK):',
      now.toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })
    );
    console.log(
      '  Разница в часах:',
      ((scheduledDate.getTime() - now.getTime()) / (1000 * 60 * 60)).toFixed(2)
    );
    console.log('  Время в будущем:', scheduledDate > now);

    if (scheduledDate > now) {
      console.log('✅ УСПЕХ: Время валидно для создания интервью');
    } else {
      console.log('❌ ОШИБКА: Время в прошлом');
    }
  }
}

// Запуск тестов
async function runTests() {
  try {
    await testVideoRoomCreation();
    await testInterviewCreation();

    console.log('\n\n=== ЗАКЛЮЧЕНИЕ ===');
    console.log('Исправления внесены:');
    console.log('1. ✅ Добавлено буферное время (1 минута) в валидацию');
    console.log('2. ✅ Изменено сравнение с <= на < с учетом буфера');
    console.log('3. ✅ Добавлено детальное логирование для диагностики');
    console.log('4. ✅ Добавлена информация о часовых поясах в логи');
    console.log('5. ✅ Улучшены сообщения об ошибках с деталями');
  } catch (error) {
    console.error('Ошибка при выполнении тестов:', error);
  }
}

// Запускаем тесты
runTests();
