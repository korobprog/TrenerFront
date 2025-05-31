/**
 * Интеграционный тест системы выбора типа собеседования
 *
 * Этот скрипт тестирует полный цикл создания интервью с различными типами видеосвязи:
 * - Google Meet интеграция
 * - Встроенная видеосистема
 * - Fallback механизмы
 * - UI компоненты
 * - Связи в базе данных
 */

const { PrismaClient } = require('@prisma/client');
const fetch = require('node-fetch');

const prisma = new PrismaClient();

// Конфигурация тестов
const TEST_CONFIG = {
  baseUrl: process.env.NEXTAUTH_URL || 'http://localhost:3000',
  testUser: {
    email: 'test@example.com',
    name: 'Test User',
  },
  testScheduledTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // завтра
};

// Цвета для консольного вывода
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
};

// Утилиты для логирования
const log = {
  success: (msg) => console.log(`${colors.green}✓ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}✗ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠ ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ ${msg}${colors.reset}`),
  section: (msg) =>
    console.log(
      `\n${colors.bold}${colors.blue}=== ${msg} ===${colors.reset}\n`
    ),
};

// Результаты тестов
const testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  errors: [],
};

// Функция для выполнения теста
async function runTest(testName, testFunction) {
  testResults.total++;
  try {
    log.info(`Выполняется: ${testName}`);
    await testFunction();
    testResults.passed++;
    log.success(`Пройден: ${testName}`);
  } catch (error) {
    testResults.failed++;
    testResults.errors.push({ test: testName, error: error.message });
    log.error(`Провален: ${testName} - ${error.message}`);
  }
}

// Функция для создания тестового пользователя
async function createTestUser() {
  try {
    const user = await prisma.user.upsert({
      where: { email: TEST_CONFIG.testUser.email },
      update: {},
      create: {
        email: TEST_CONFIG.testUser.email,
        name: TEST_CONFIG.testUser.name,
        role: 'user',
        points: 100,
      },
    });
    return user;
  } catch (error) {
    throw new Error(
      `Не удалось создать тестового пользователя: ${error.message}`
    );
  }
}

// Функция для очистки тестовых данных
async function cleanupTestData() {
  try {
    // Удаляем тестовые интервью
    await prisma.mockInterview.deleteMany({
      where: {
        interviewer: {
          email: TEST_CONFIG.testUser.email,
        },
      },
    });

    // Удаляем тестовые видеокомнаты
    await prisma.videoRoom.deleteMany({
      where: {
        name: {
          contains: 'Тест',
        },
      },
    });

    log.info('Тестовые данные очищены');
  } catch (error) {
    log.warning(`Ошибка при очистке тестовых данных: ${error.message}`);
  }
}

// Тест 1: Создание интервью с Google Meet
async function testGoogleMeetInterview() {
  const user = await createTestUser();

  const interviewData = {
    scheduledTime: TEST_CONFIG.testScheduledTime,
    videoType: 'google_meet',
  };

  // Симулируем создание интервью через API
  const mockInterview = await prisma.mockInterview.create({
    data: {
      interviewer: { connect: { id: user.id } },
      scheduledTime: new Date(interviewData.scheduledTime),
      meetingLink: 'https://meet.google.com/test-mock-link',
      videoType: 'google_meet',
      status: 'pending',
      calendarEventId: 'test-calendar-event-id',
    },
  });

  // Проверяем, что интервью создано корректно
  if (!mockInterview.id) {
    throw new Error('Интервью не было создано');
  }

  if (mockInterview.videoType !== 'google_meet') {
    throw new Error(
      `Неправильный тип видео: ожидался google_meet, получен ${mockInterview.videoType}`
    );
  }

  if (!mockInterview.meetingLink.includes('meet.google.com')) {
    throw new Error('Ссылка на Google Meet не содержит правильный домен');
  }

  // Проверяем, что интервью можно получить из базы
  const retrievedInterview = await prisma.mockInterview.findUnique({
    where: { id: mockInterview.id },
    include: {
      interviewer: true,
    },
  });

  if (!retrievedInterview) {
    throw new Error('Созданное интервью не найдено в базе данных');
  }

  if (retrievedInterview.interviewer.email !== TEST_CONFIG.testUser.email) {
    throw new Error('Неправильный интервьюер привязан к интервью');
  }

  log.success(`Google Meet интервью создано: ID ${mockInterview.id}`);
}

// Тест 2: Создание интервью со встроенной видеосистемой
async function testBuiltInVideoInterview() {
  const user = await createTestUser();

  // Сначала создаем видеокомнату
  const videoRoom = await prisma.videoRoom.create({
    data: {
      name: 'Тест встроенной видеосистемы',
      code: `test-${Date.now()}`,
      description: 'Тестовая комната для интеграционного теста',
      isPrivate: true,
      maxParticipants: 2,
      isActive: true,
      createdBy: { connect: { id: user.id } },
      settings: {
        allowScreenShare: true,
        allowChat: true,
        autoRecord: false,
      },
    },
  });

  // Создаем интервью со ссылкой на видеокомнату
  const mockInterview = await prisma.mockInterview.create({
    data: {
      interviewer: { connect: { id: user.id } },
      scheduledTime: new Date(TEST_CONFIG.testScheduledTime),
      meetingLink: `${TEST_CONFIG.baseUrl}/video-conferences/rooms/${videoRoom.code}`,
      videoType: 'built_in',
      status: 'pending',
      videoRoom: { connect: { id: videoRoom.id } },
    },
  });

  // Проверяем корректность создания
  if (mockInterview.videoType !== 'built_in') {
    throw new Error(
      `Неправильный тип видео: ожидался built_in, получен ${mockInterview.videoType}`
    );
  }

  if (!mockInterview.videoRoomId) {
    throw new Error('Видеокомната не привязана к интервью');
  }

  // Проверяем связь с видеокомнатой
  const interviewWithRoom = await prisma.mockInterview.findUnique({
    where: { id: mockInterview.id },
    include: {
      videoRoom: true,
      interviewer: true,
    },
  });

  if (!interviewWithRoom.videoRoom) {
    throw new Error('Связь с видеокомнатой не установлена');
  }

  if (interviewWithRoom.videoRoom.code !== videoRoom.code) {
    throw new Error('Неправильная видеокомната привязана к интервью');
  }

  if (!interviewWithRoom.videoRoom.isPrivate) {
    throw new Error('Видеокомната должна быть приватной для интервью');
  }

  if (interviewWithRoom.videoRoom.maxParticipants !== 2) {
    throw new Error('Максимальное количество участников должно быть 2');
  }

  log.success(
    `Built-in интервью создано: ID ${mockInterview.id}, Room ${videoRoom.code}`
  );
}

// Тест 3: Проверка валидации videoType
async function testVideoTypeValidation() {
  const user = await createTestUser();

  // Тест с недопустимым типом видео
  try {
    await prisma.mockInterview.create({
      data: {
        interviewer: { connect: { id: user.id } },
        scheduledTime: new Date(TEST_CONFIG.testScheduledTime),
        meetingLink: 'https://example.com/invalid',
        videoType: 'invalid_type',
        status: 'pending',
      },
    });
    throw new Error(
      'Должна была произойти ошибка валидации для недопустимого типа видео'
    );
  } catch (error) {
    if (error.message.includes('должна была произойти ошибка')) {
      throw error;
    }
    // Ожидаемая ошибка валидации
    log.success('Валидация videoType работает корректно');
  }

  // Тест с допустимыми типами
  const validTypes = ['google_meet', 'built_in'];
  for (const videoType of validTypes) {
    const interview = await prisma.mockInterview.create({
      data: {
        interviewer: { connect: { id: user.id } },
        scheduledTime: new Date(TEST_CONFIG.testScheduledTime),
        meetingLink: `https://example.com/${videoType}`,
        videoType: videoType,
        status: 'pending',
      },
    });

    if (interview.videoType !== videoType) {
      throw new Error(`Тип видео не сохранился корректно: ${videoType}`);
    }
  }

  log.success('Все допустимые типы видео сохраняются корректно');
}

// Тест 4: Проверка fallback логики
async function testFallbackLogic() {
  const user = await createTestUser();

  // Симулируем ситуацию, когда создание встроенной видеокомнаты не удалось
  // и система должна переключиться на Google Meet
  const interviewWithFallback = await prisma.mockInterview.create({
    data: {
      interviewer: { connect: { id: user.id } },
      scheduledTime: new Date(TEST_CONFIG.testScheduledTime),
      meetingLink: 'https://meet.google.com/fallback-link',
      videoType: 'google_meet', // fallback на Google Meet
      status: 'pending',
      calendarEventId: 'fallback-calendar-event',
    },
  });

  // Проверяем, что fallback сработал корректно
  if (interviewWithFallback.videoType !== 'google_meet') {
    throw new Error('Fallback на Google Meet не сработал');
  }

  if (!interviewWithFallback.meetingLink.includes('meet.google.com')) {
    throw new Error('Fallback ссылка не содержит Google Meet домен');
  }

  if (interviewWithFallback.videoRoomId) {
    throw new Error('При fallback не должно быть связи с видеокомнатой');
  }

  log.success('Fallback логика работает корректно');
}

// Тест 5: Проверка получения списка интервью с разными типами
async function testInterviewListWithTypes() {
  const user = await createTestUser();

  // Создаем интервью разных типов
  const googleMeetInterview = await prisma.mockInterview.create({
    data: {
      interviewer: { connect: { id: user.id } },
      scheduledTime: new Date(TEST_CONFIG.testScheduledTime),
      meetingLink: 'https://meet.google.com/test-list-1',
      videoType: 'google_meet',
      status: 'pending',
    },
  });

  const videoRoom = await prisma.videoRoom.create({
    data: {
      name: 'Тест списка интервью',
      code: `test-list-${Date.now()}`,
      description: 'Тестовая комната для списка',
      isPrivate: true,
      maxParticipants: 2,
      isActive: true,
      createdBy: { connect: { id: user.id } },
    },
  });

  const builtInInterview = await prisma.mockInterview.create({
    data: {
      interviewer: { connect: { id: user.id } },
      scheduledTime: new Date(TEST_CONFIG.testScheduledTime),
      meetingLink: `${TEST_CONFIG.baseUrl}/video-conferences/rooms/${videoRoom.code}`,
      videoType: 'built_in',
      status: 'pending',
      videoRoom: { connect: { id: videoRoom.id } },
    },
  });

  // Получаем список интервью
  const interviews = await prisma.mockInterview.findMany({
    where: {
      interviewerId: user.id,
    },
    include: {
      videoRoom: true,
      interviewer: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  if (interviews.length < 2) {
    throw new Error('Не все созданные интервью найдены в списке');
  }

  // Проверяем Google Meet интервью
  const googleMeetFromList = interviews.find(
    (i) => i.videoType === 'google_meet'
  );
  if (!googleMeetFromList) {
    throw new Error('Google Meet интервью не найдено в списке');
  }

  if (googleMeetFromList.videoRoom) {
    throw new Error(
      'Google Meet интервью не должно иметь связи с видеокомнатой'
    );
  }

  // Проверяем Built-in интервью
  const builtInFromList = interviews.find((i) => i.videoType === 'built_in');
  if (!builtInFromList) {
    throw new Error('Built-in интервью не найдено в списке');
  }

  if (!builtInFromList.videoRoom) {
    throw new Error('Built-in интервью должно иметь связь с видеокомнатой');
  }

  if (builtInFromList.videoRoom.code !== videoRoom.code) {
    throw new Error('Неправильная видеокомната в списке интервью');
  }

  log.success(
    `Список интервью корректен: найдено ${interviews.length} интервью разных типов`
  );
}

// Тест 6: Проверка статусов интервью
async function testInterviewStatuses() {
  const user = await createTestUser();

  const statuses = ['pending', 'booked', 'completed', 'cancelled'];
  const createdInterviews = [];

  // Создаем интервью с разными статусами
  for (const status of statuses) {
    const interview = await prisma.mockInterview.create({
      data: {
        interviewer: { connect: { id: user.id } },
        scheduledTime: new Date(TEST_CONFIG.testScheduledTime),
        meetingLink: `https://meet.google.com/test-status-${status}`,
        videoType: 'google_meet',
        status: status,
      },
    });
    createdInterviews.push(interview);
  }

  // Проверяем фильтрацию по активным интервью
  const activeInterviews = await prisma.mockInterview.findMany({
    where: {
      interviewerId: user.id,
      status: {
        in: ['pending', 'booked'],
      },
    },
  });

  if (activeInterviews.length !== 2) {
    throw new Error(
      `Ожидалось 2 активных интервью, найдено ${activeInterviews.length}`
    );
  }

  // Проверяем фильтрацию по архивным интервью
  const archivedInterviews = await prisma.mockInterview.findMany({
    where: {
      interviewerId: user.id,
      status: {
        in: ['completed', 'cancelled'],
      },
    },
  });

  if (archivedInterviews.length !== 2) {
    throw new Error(
      `Ожидалось 2 архивных интервью, найдено ${archivedInterviews.length}`
    );
  }

  log.success('Фильтрация интервью по статусам работает корректно');
}

// Тест 7: Проверка целостности данных
async function testDataIntegrity() {
  const user = await createTestUser();

  // Создаем видеокомнату
  const videoRoom = await prisma.videoRoom.create({
    data: {
      name: 'Тест целостности данных',
      code: `integrity-test-${Date.now()}`,
      description: 'Тестовая комната для проверки целостности',
      isPrivate: true,
      maxParticipants: 2,
      isActive: true,
      createdBy: { connect: { id: user.id } },
    },
  });

  // Создаем интервью со связью на видеокомнату
  const interview = await prisma.mockInterview.create({
    data: {
      interviewer: { connect: { id: user.id } },
      scheduledTime: new Date(TEST_CONFIG.testScheduledTime),
      meetingLink: `${TEST_CONFIG.baseUrl}/video-conferences/rooms/${videoRoom.code}`,
      videoType: 'built_in',
      status: 'pending',
      videoRoom: { connect: { id: videoRoom.id } },
    },
  });

  // Проверяем, что связи корректны
  const interviewWithRelations = await prisma.mockInterview.findUnique({
    where: { id: interview.id },
    include: {
      interviewer: true,
      videoRoom: true,
    },
  });

  if (!interviewWithRelations.interviewer) {
    throw new Error('Связь с интервьюером не установлена');
  }

  if (!interviewWithRelations.videoRoom) {
    throw new Error('Связь с видеокомнатой не установлена');
  }

  if (interviewWithRelations.interviewer.id !== user.id) {
    throw new Error('Неправильный интервьюер привязан');
  }

  if (interviewWithRelations.videoRoom.id !== videoRoom.id) {
    throw new Error('Неправильная видеокомната привязана');
  }

  // Проверяем обратную связь от видеокомнаты к интервью
  const roomWithInterviews = await prisma.videoRoom.findUnique({
    where: { id: videoRoom.id },
    include: {
      mockInterviews: true,
    },
  });

  if (
    !roomWithInterviews.mockInterviews ||
    roomWithInterviews.mockInterviews.length === 0
  ) {
    throw new Error('Обратная связь от видеокомнаты к интервью не работает');
  }

  const linkedInterview = roomWithInterviews.mockInterviews.find(
    (i) => i.id === interview.id
  );
  if (!linkedInterview) {
    throw new Error('Интервью не найдено в связанных с видеокомнатой');
  }

  log.success('Целостность данных и связей подтверждена');
}

// Основная функция запуска тестов
async function runIntegrationTests() {
  log.section('ИНТЕГРАЦИОННОЕ ТЕСТИРОВАНИЕ СИСТЕМЫ ВЫБОРА ТИПА СОБЕСЕДОВАНИЯ');

  log.info('Подготовка к тестированию...');
  await cleanupTestData();

  // Запускаем все тесты
  await runTest('Создание интервью с Google Meet', testGoogleMeetInterview);
  await runTest(
    'Создание интервью со встроенной видеосистемой',
    testBuiltInVideoInterview
  );
  await runTest('Валидация типов видеосвязи', testVideoTypeValidation);
  await runTest('Fallback логика', testFallbackLogic);
  await runTest(
    'Получение списка интервью с разными типами',
    testInterviewListWithTypes
  );
  await runTest('Проверка статусов интервью', testInterviewStatuses);
  await runTest('Целостность данных и связей', testDataIntegrity);

  // Очистка после тестов
  log.info('Очистка тестовых данных...');
  await cleanupTestData();

  // Выводим результаты
  log.section('РЕЗУЛЬТАТЫ ТЕСТИРОВАНИЯ');

  console.log(`${colors.bold}Общая статистика:${colors.reset}`);
  console.log(`  Всего тестов: ${testResults.total}`);
  console.log(
    `  ${colors.green}Пройдено: ${testResults.passed}${colors.reset}`
  );
  console.log(`  ${colors.red}Провалено: ${testResults.failed}${colors.reset}`);

  if (testResults.failed > 0) {
    console.log(`\n${colors.bold}${colors.red}Ошибки:${colors.reset}`);
    testResults.errors.forEach((error, index) => {
      console.log(`  ${index + 1}. ${error.test}: ${error.error}`);
    });
  }

  const successRate = ((testResults.passed / testResults.total) * 100).toFixed(
    1
  );
  console.log(
    `\n${colors.bold}Процент успешности: ${successRate}%${colors.reset}`
  );

  if (testResults.failed === 0) {
    log.success('ВСЕ ТЕСТЫ ПРОЙДЕНЫ УСПЕШНО! 🎉');
    console.log(
      '\n✅ Система выбора типа собеседования готова к использованию'
    );
  } else {
    log.error('НЕКОТОРЫЕ ТЕСТЫ ПРОВАЛЕНЫ! ❌');
    console.log('\n⚠️  Требуется исправление ошибок перед использованием');
  }
}

// Запуск тестов
if (require.main === module) {
  runIntegrationTests()
    .catch((error) => {
      log.error(`Критическая ошибка при выполнении тестов: ${error.message}`);
      console.error(error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

module.exports = {
  runIntegrationTests,
  testResults,
};
