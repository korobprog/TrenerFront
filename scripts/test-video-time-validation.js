/**
 * Тест для диагностики проблемы с валидацией времени при создании встроенной видеокомнаты
 */

// Симуляция различных сценариев времени
function testTimeValidation() {
  console.log('=== ДИАГНОСТИКА ПРОБЛЕМЫ С ВАЛИДАЦИЕЙ ВРЕМЕНИ ===\n');

  // Текущее время (как на сервере)
  const now = new Date();
  console.log('Текущее время сервера:', now.toISOString());
  console.log(
    'Текущее время (локальное):',
    now.toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })
  );
  console.log(
    'Часовой пояс сервера:',
    Intl.DateTimeFormat().resolvedOptions().timeZone
  );

  console.log('\n=== ТЕСТОВЫЕ СЦЕНАРИИ ===\n');

  // Сценарий 1: Дата 30 мая 2025, время 09:00 (проблемный случай)
  const testDate1 = new Date('2025-05-30T09:00:00.000Z');
  console.log('Сценарий 1 - Проблемный случай:');
  console.log('  Запланированное время (UTC):', testDate1.toISOString());
  console.log(
    '  Запланированное время (локальное):',
    testDate1.toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })
  );
  console.log('  Время больше текущего?', testDate1 > now);
  console.log(
    '  Разница в миллисекундах:',
    testDate1.getTime() - now.getTime()
  );
  console.log(
    '  Разница в часах:',
    (testDate1.getTime() - now.getTime()) / (1000 * 60 * 60)
  );

  // Сценарий 2: Дата 30 мая 2025, время 09:00 в московском времени
  const testDate2 = new Date('2025-05-30T06:00:00.000Z'); // 09:00 MSK = 06:00 UTC
  console.log('\nСценарий 2 - С учетом часового пояса:');
  console.log('  Запланированное время (UTC):', testDate2.toISOString());
  console.log(
    '  Запланированное время (MSK):',
    testDate2.toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })
  );
  console.log('  Время больше текущего?', testDate2 > now);
  console.log(
    '  Разница в миллисекундах:',
    testDate2.getTime() - now.getTime()
  );
  console.log(
    '  Разница в часах:',
    (testDate2.getTime() - now.getTime()) / (1000 * 60 * 60)
  );

  // Сценарий 3: Завтрашний день, время 09:00
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);
  console.log('\nСценарий 3 - Завтра в 09:00:');
  console.log('  Запланированное время (UTC):', tomorrow.toISOString());
  console.log(
    '  Запланированное время (локальное):',
    tomorrow.toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })
  );
  console.log('  Время больше текущего?', tomorrow > now);
  console.log('  Разница в миллисекундах:', tomorrow.getTime() - now.getTime());
  console.log(
    '  Разница в часах:',
    (tomorrow.getTime() - now.getTime()) / (1000 * 60 * 60)
  );

  console.log('\n=== АНАЛИЗ ПРОБЛЕМЫ ===\n');

  // Проверяем логику валидации из API
  function validateScheduledTime(scheduledStartTime) {
    const startTime = new Date(scheduledStartTime);
    const now = new Date();

    console.log('Валидация времени:');
    console.log('  startTime:', startTime.toISOString());
    console.log('  now:', now.toISOString());
    console.log('  startTime <= now:', startTime <= now);

    if (startTime <= now) {
      return { valid: false, error: 'Время начала должно быть в будущем' };
    }

    return { valid: true };
  }

  // Тестируем различные форматы времени
  const testCases = [
    '2025-05-30T09:00:00.000Z',
    '2025-05-30T06:00:00.000Z', // 09:00 MSK
    '2025-05-31T06:00:00.000Z', // Завтра 09:00 MSK
    new Date('2025-05-30T09:00:00.000Z').toISOString(),
    new Date(2025, 4, 30, 9, 0, 0).toISOString(), // Месяц 4 = май (0-индексированный)
  ];

  testCases.forEach((testCase, index) => {
    console.log(`\nТест ${index + 1}: ${testCase}`);
    const result = validateScheduledTime(testCase);
    console.log('  Результат:', result);
  });
}

// Функция для тестирования создания видеокомнаты
async function testVideoRoomCreation() {
  console.log('\n=== ТЕСТ СОЗДАНИЯ ВИДЕОКОМНАТЫ ===\n');

  const testData = {
    name: 'Тестовая комната',
    description: 'Тест валидации времени',
    isPrivate: true,
    maxParticipants: 2,
    scheduledStartTime: '2025-05-30T06:00:00.000Z', // 09:00 MSK
    recordingEnabled: false,
    settings: {
      allowScreenShare: true,
      allowChat: true,
      autoRecord: false,
    },
  };

  console.log(
    'Данные для создания комнаты:',
    JSON.stringify(testData, null, 2)
  );

  // Симуляция валидации из API
  const { scheduledStartTime } = testData;

  if (scheduledStartTime) {
    const startTime = new Date(scheduledStartTime);
    const now = new Date();

    console.log('\nДетальная валидация:');
    console.log('  Исходная строка времени:', scheduledStartTime);
    console.log('  Парсинг в Date объект:', startTime.toISOString());
    console.log('  Текущее время:', now.toISOString());
    console.log('  startTime.getTime():', startTime.getTime());
    console.log('  now.getTime():', now.getTime());
    console.log('  Разница (мс):', startTime.getTime() - now.getTime());
    console.log('  startTime <= now:', startTime <= now);

    if (startTime <= now) {
      console.log('  ❌ ОШИБКА: Время начала должно быть в будущем');
      return false;
    } else {
      console.log('  ✅ УСПЕХ: Время валидно');
      return true;
    }
  }
}

// Запускаем тесты
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { testTimeValidation, testVideoRoomCreation };
} else {
  testTimeValidation();
  testVideoRoomCreation();
}
