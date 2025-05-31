const fetch = require('node-fetch');

// Тестовый скрипт для диагностики ошибки 400 при создании интервью
async function debugInterviewCreation() {
  console.log('=== ДИАГНОСТИКА СОЗДАНИЯ ИНТЕРВЬЮ ===\n');

  // Тестовые данные для создания интервью
  const testData = {
    scheduledTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // +2 часа
    videoType: 'built_in',
  };

  console.log('1. Тестовые данные для создания интервью:');
  console.log(JSON.stringify(testData, null, 2));
  console.log();

  // Проверяем валидацию времени
  console.log('2. Валидация времени:');
  const scheduledDate = new Date(testData.scheduledTime);
  const now = new Date();
  const bufferMinutes = 1;
  const minValidTime = new Date(now.getTime() + bufferMinutes * 60 * 1000);

  console.log({
    originalInput: testData.scheduledTime,
    parsedScheduledTime: scheduledDate.toISOString(),
    currentServerTime: now.toISOString(),
    minValidTime: minValidTime.toISOString(),
    scheduledTimeLocal: scheduledDate.toLocaleString('ru-RU', {
      timeZone: 'Europe/Moscow',
    }),
    currentTimeLocal: now.toLocaleString('ru-RU', {
      timeZone: 'Europe/Moscow',
    }),
    differenceMinutes: (
      (scheduledDate.getTime() - now.getTime()) /
      (1000 * 60)
    ).toFixed(2),
    isValid: scheduledDate >= minValidTime,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });
  console.log();

  // Проверяем валидацию videoType
  console.log('3. Валидация videoType:');
  const validVideoTypes = ['google_meet', 'built_in'];
  const isValidVideoType = validVideoTypes.includes(testData.videoType);
  console.log({
    videoType: testData.videoType,
    validTypes: validVideoTypes,
    isValid: isValidVideoType,
  });
  console.log();

  // Проверяем структуру данных для VideoRoom
  console.log('4. Данные для создания VideoRoom:');
  const videoRoomData = {
    name: `Собеседование ${scheduledDate.toLocaleDateString('ru-RU')}`,
    description: `Собеседование запланировано на ${scheduledDate.toLocaleString(
      'ru-RU'
    )}`,
    isPrivate: true,
    maxParticipants: 2,
    scheduledStartTime: testData.scheduledTime,
    recordingEnabled: false,
    settings: {
      allowScreenShare: true,
      allowChat: true,
      autoRecord: false,
    },
  };

  console.log('Данные VideoRoom:');
  console.log(JSON.stringify(videoRoomData, null, 2));
  console.log();

  // Проверяем обязательные поля для VideoRoom
  console.log('5. Проверка обязательных полей VideoRoom:');
  const requiredFields = ['name', 'isPrivate', 'maxParticipants'];
  const missingFields = requiredFields.filter(
    (field) =>
      videoRoomData[field] === undefined || videoRoomData[field] === null
  );

  console.log({
    requiredFields,
    providedFields: Object.keys(videoRoomData),
    missingFields,
    isValid: missingFields.length === 0,
  });
  console.log();

  // Проверяем валидацию полей VideoRoom
  console.log('6. Валидация полей VideoRoom:');
  const validationErrors = [];

  if (!videoRoomData.name || videoRoomData.name.trim().length === 0) {
    validationErrors.push('Название комнаты обязательно');
  }
  if (videoRoomData.name && videoRoomData.name.length > 100) {
    validationErrors.push('Название комнаты не должно превышать 100 символов');
  }
  if (videoRoomData.description && videoRoomData.description.length > 500) {
    validationErrors.push('Описание не должно превышать 500 символов');
  }
  if (
    videoRoomData.maxParticipants < 2 ||
    videoRoomData.maxParticipants > 100
  ) {
    validationErrors.push('Количество участников должно быть от 2 до 100');
  }

  console.log({
    validationErrors,
    isValid: validationErrors.length === 0,
  });
  console.log();

  // Проверяем валидацию времени для VideoRoom
  console.log('7. Валидация времени для VideoRoom:');
  if (videoRoomData.scheduledStartTime) {
    const startTime = new Date(videoRoomData.scheduledStartTime);
    const roomMinValidTime = new Date(
      now.getTime() + bufferMinutes * 60 * 1000
    );

    console.log({
      originalInput: videoRoomData.scheduledStartTime,
      parsedStartTime: startTime.toISOString(),
      currentServerTime: now.toISOString(),
      minValidTime: roomMinValidTime.toISOString(),
      startTimeLocal: startTime.toLocaleString('ru-RU', {
        timeZone: 'Europe/Moscow',
      }),
      currentTimeLocal: now.toLocaleString('ru-RU', {
        timeZone: 'Europe/Moscow',
      }),
      differenceMinutes: (
        (startTime.getTime() - now.getTime()) /
        (1000 * 60)
      ).toFixed(2),
      isValid: startTime >= roomMinValidTime,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });
  }
  console.log();

  // Проверяем структуру данных для MockInterview
  console.log('8. Данные для создания MockInterview:');
  const mockInterviewData = {
    scheduledTime: scheduledDate,
    meetingLink: 'http://localhost:3000/video-conferences/rooms/TESTCODE',
    status: 'pending',
    videoType: testData.videoType,
    videoRoomId: 'test-room-id',
    calendarEventId: null,
  };

  console.log('Данные MockInterview:');
  console.log(JSON.stringify(mockInterviewData, null, 2));
  console.log();

  // Проверяем обязательные поля для MockInterview
  console.log('9. Проверка обязательных полей MockInterview:');
  const interviewRequiredFields = [
    'scheduledTime',
    'meetingLink',
    'status',
    'videoType',
  ];
  const interviewMissingFields = interviewRequiredFields.filter(
    (field) =>
      mockInterviewData[field] === undefined ||
      mockInterviewData[field] === null ||
      mockInterviewData[field] === ''
  );

  console.log({
    requiredFields: interviewRequiredFields,
    providedFields: Object.keys(mockInterviewData),
    missingFields: interviewMissingFields,
    isValid: interviewMissingFields.length === 0,
  });
  console.log();

  console.log('=== ВОЗМОЖНЫЕ ПРИЧИНЫ ОШИБКИ 400 ===\n');

  console.log('1. НАИБОЛЕЕ ВЕРОЯТНЫЕ ПРИЧИНЫ:');
  console.log('   a) Проблема с валидацией времени в API video-conferences');
  console.log('   b) Отсутствие обязательных полей при создании VideoRoom');
  console.log();

  console.log('2. ДРУГИЕ ВОЗМОЖНЫЕ ПРИЧИНЫ:');
  console.log('   c) Проблемы с авторизацией при внутреннем запросе');
  console.log('   d) Ошибки в структуре JSON данных');
  console.log('   e) Проблемы с базой данных или Prisma');
  console.log('   f) Неправильный формат scheduledStartTime');
  console.log('   g) Конфликт в схеме базы данных');
  console.log();

  console.log('=== РЕКОМЕНДАЦИИ ПО ДИАГНОСТИКЕ ===\n');
  console.log('1. Добавить детальное логирование в API video-conferences');
  console.log('2. Проверить точную ошибку валидации времени');
  console.log('3. Убедиться, что все обязательные поля передаются');
  console.log('4. Проверить авторизацию при внутреннем запросе');
  console.log('5. Добавить try-catch блоки для лучшей диагностики');
}

// Запускаем диагностику
debugInterviewCreation().catch(console.error);
