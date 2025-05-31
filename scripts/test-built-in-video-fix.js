/**
 * Диагностика проблемы с валидацией времени при создании встроенной видеокомнаты
 *
 * ПРОБЛЕМА: При создании интервью с встроенной видеосистемой возникает ошибка
 * "Время начала должно быть в будущем", даже когда выбрана дата 30 мая 2025 г. и время 09:00.
 * Текущее время 23:32, а выбранное время 09:00 уже прошло в этот день.
 */

console.log('=== ДИАГНОСТИКА ПРОБЛЕМЫ С ВАЛИДАЦИЕЙ ВРЕМЕНИ ===\n');

// Получаем текущее время
const now = new Date();
console.log('Текущее время сервера:', now.toISOString());
console.log(
  'Текущее время (Москва):',
  now.toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })
);
console.log('Часовой пояс:', Intl.DateTimeFormat().resolvedOptions().timeZone);

console.log('\n=== АНАЛИЗ ВОЗМОЖНЫХ ИСТОЧНИКОВ ПРОБЛЕМЫ ===\n');

console.log('1. ПРОБЛЕМА С ПАРСИНГОМ ДАТЫ И ВРЕМЕНИ');
console.log('   - Клиент отправляет дату 30.05.2025 09:00');
console.log('   - Сервер может неправильно интерпретировать часовой пояс');

console.log('\n2. ПРОБЛЕМА С ВАЛИДАЦИЕЙ В API');
console.log('   - Код в video-conferences.js строки 212-221');
console.log('   - Сравнение startTime <= now может быть некорректным');

console.log('\n3. ПРОБЛЕМА С ЧАСОВЫМИ ПОЯСАМИ');
console.log(
  '   - Клиент в MSK (UTC+3), сервер может быть в другом часовом поясе'
);
console.log('   - 09:00 MSK = 06:00 UTC');

console.log('\n=== ТЕСТИРОВАНИЕ РАЗЛИЧНЫХ ФОРМАТОВ ВРЕМЕНИ ===\n');

// Тестируем различные способы передачи времени
const testCases = [
  {
    name: 'ISO строка с UTC (как может прийти с клиента)',
    value: '2025-05-30T09:00:00.000Z',
    description: '30 мая 2025, 09:00 UTC (12:00 MSK)',
  },
  {
    name: 'ISO строка с московским временем',
    value: '2025-05-30T06:00:00.000Z',
    description: '30 мая 2025, 06:00 UTC (09:00 MSK)',
  },
  {
    name: 'Завтрашний день 09:00 MSK',
    value: '2025-05-31T06:00:00.000Z',
    description: '31 мая 2025, 06:00 UTC (09:00 MSK)',
  },
  {
    name: 'Сегодня 09:00 MSK (проблемный случай)',
    value: new Date(2025, 4, 30, 6, 0, 0).toISOString(), // Месяц 4 = май
    description: 'Сегодня 09:00 MSK через Date конструктор',
  },
];

testCases.forEach((testCase, index) => {
  console.log(`\nТест ${index + 1}: ${testCase.name}`);
  console.log(`Описание: ${testCase.description}`);
  console.log(`Значение: ${testCase.value}`);

  const scheduledTime = new Date(testCase.value);
  console.log(`Парсинг: ${scheduledTime.toISOString()}`);
  console.log(
    `Локальное время: ${scheduledTime.toLocaleString('ru-RU', {
      timeZone: 'Europe/Moscow',
    })}`
  );

  // Симуляция валидации из API (строки 212-221 в video-conferences.js)
  const isValid = scheduledTime > now;
  console.log(`Валидация (scheduledTime > now): ${isValid}`);
  console.log(
    `Разница в часах: ${(
      (scheduledTime.getTime() - now.getTime()) /
      (1000 * 60 * 60)
    ).toFixed(2)}`
  );

  if (!isValid) {
    console.log('❌ ОШИБКА: Время начала должно быть в будущем');
  } else {
    console.log('✅ УСПЕХ: Время валидно');
  }
});

console.log('\n=== ДИАГНОСТИКА НАИБОЛЕЕ ВЕРОЯТНЫХ ПРИЧИН ===\n');

console.log('НАИБОЛЕЕ ВЕРОЯТНАЯ ПРИЧИНА #1: ПРОБЛЕМА С ЧАСОВЫМИ ПОЯСАМИ');
console.log('- Клиент отправляет время в локальном часовом поясе');
console.log('- Сервер интерпретирует его как UTC');
console.log('- 09:00 MSK интерпретируется как 09:00 UTC');
console.log('- 09:00 UTC = 12:00 MSK, что уже прошло если сейчас 23:32 MSK');

console.log('\nНАИБОЛЕЕ ВЕРОЯТНАЯ ПРИЧИНА #2: СТРОГАЯ ВАЛИДАЦИЯ');
console.log('- Валидация использует <= вместо <');
console.log('- Не учитывается погрешность в несколько секунд');
console.log('- Время может быть равно текущему из-за задержек обработки');

console.log('\n=== РЕКОМЕНДУЕМЫЕ ИСПРАВЛЕНИЯ ===\n');

console.log('1. ИСПРАВИТЬ ВАЛИДАЦИЮ ВРЕМЕНИ:');
console.log('   - Добавить буферное время (например, 1 минута)');
console.log('   - Использовать < вместо <=');
console.log('   - Добавить подробное логирование');

console.log('\n2. ИСПРАВИТЬ ОБРАБОТКУ ЧАСОВЫХ ПОЯСОВ:');
console.log('   - Убедиться, что клиент отправляет время в UTC');
console.log('   - Добавить явное преобразование часовых поясов');
console.log('   - Валидировать формат входящих данных');

console.log('\n3. ДОБАВИТЬ ДИАГНОСТИЧЕСКИЕ ЛОГИ:');
console.log('   - Логировать исходное время от клиента');
console.log('   - Логировать результат парсинга');
console.log('   - Логировать текущее время сервера');
console.log('   - Логировать результат сравнения');

// Функция для тестирования улучшенной валидации
function improvedTimeValidation(scheduledStartTime) {
  console.log('\n=== ТЕСТ УЛУЧШЕННОЙ ВАЛИДАЦИИ ===');

  const startTime = new Date(scheduledStartTime);
  const now = new Date();
  const bufferMinutes = 1; // Буферное время в минутах
  const minValidTime = new Date(now.getTime() + bufferMinutes * 60 * 1000);

  console.log('Исходное время:', scheduledStartTime);
  console.log('Парсинг времени:', startTime.toISOString());
  console.log('Текущее время:', now.toISOString());
  console.log(
    'Минимальное валидное время (с буфером):',
    minValidTime.toISOString()
  );
  console.log(
    'Разница в минутах:',
    ((startTime.getTime() - now.getTime()) / (1000 * 60)).toFixed(2)
  );

  if (startTime < minValidTime) {
    console.log('❌ ОШИБКА: Время начала должно быть минимум через 1 минуту');
    return false;
  }

  console.log('✅ УСПЕХ: Время валидно с учетом буфера');
  return true;
}

// Тестируем улучшенную валидацию
improvedTimeValidation('2025-05-30T06:00:00.000Z'); // 09:00 MSK

console.log('\n=== ЗАКЛЮЧЕНИЕ ===\n');
console.log('Проблема скорее всего в неправильной обработке часовых поясов');
console.log('и слишком строгой валидации времени в API video-conferences.js');
console.log('Требуется исправление логики валидации и добавление логирования.');
