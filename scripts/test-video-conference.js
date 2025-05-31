const { io } = require('socket.io-client');

// Конфигурация тестов
const TEST_CONFIG = {
  SERVER_URL: 'http://localhost:3000',
  API_ENDPOINTS: {
    ROOMS: '/api/custom/rooms',
    CALENDAR: '/api/custom/calendar/events',
    AUTH_SESSION: '/api/auth/session',
  },
  SOCKET_PATH: '/api/socket-server',
  TEST_ROOM: {
    name: 'Тестовая комната',
    description: 'Комната для тестирования видеоконференций',
    maxParticipants: 5,
  },
};

// Цвета для консоли
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
  header: (msg) =>
    console.log(
      `\n${colors.bold}${colors.blue}=== ${msg} ===${colors.reset}\n`
    ),
};

// Проверка переменных окружения
function checkEnvironmentVariables() {
  log.header('Проверка переменных окружения');

  const requiredVars = ['DATABASE_URL', 'NEXTAUTH_SECRET', 'NEXTAUTH_URL'];

  const optionalVars = [
    'GITHUB_ID',
    'GITHUB_SECRET',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
  ];

  let allRequired = true;

  requiredVars.forEach((varName) => {
    if (process.env[varName]) {
      log.success(`${varName}: установлена`);
    } else {
      log.error(`${varName}: НЕ УСТАНОВЛЕНА (обязательная)`);
      allRequired = false;
    }
  });

  optionalVars.forEach((varName) => {
    if (process.env[varName]) {
      log.success(`${varName}: установлена`);
    } else {
      log.warning(`${varName}: не установлена (опциональная)`);
    }
  });

  return allRequired;
}

// Тест подключения к API
async function testApiEndpoints() {
  log.header('Тестирование API endpoints');

  const fetch = (await import('node-fetch')).default;

  // Тест сессии
  try {
    const sessionResponse = await fetch(
      `${TEST_CONFIG.SERVER_URL}${TEST_CONFIG.API_ENDPOINTS.AUTH_SESSION}`
    );
    if (sessionResponse.ok) {
      log.success('API сессии доступен');
    } else {
      log.warning(`API сессии вернул статус: ${sessionResponse.status}`);
    }
  } catch (error) {
    log.error(`Ошибка подключения к API сессии: ${error.message}`);
  }

  // Тест API комнат (требует авторизации)
  try {
    const roomsResponse = await fetch(
      `${TEST_CONFIG.SERVER_URL}${TEST_CONFIG.API_ENDPOINTS.ROOMS}`
    );
    if (roomsResponse.status === 401) {
      log.success('API комнат работает (требует авторизации)');
    } else if (roomsResponse.ok) {
      log.success('API комнат доступен');
    } else {
      log.warning(`API комнат вернул статус: ${roomsResponse.status}`);
    }
  } catch (error) {
    log.error(`Ошибка подключения к API комнат: ${error.message}`);
  }
}

// Тест WebRTC конфигурации
function testWebRTCConfiguration() {
  log.header('Тестирование WebRTC конфигурации');

  try {
    // Проверяем поддержку WebRTC
    if (typeof RTCPeerConnection !== 'undefined') {
      log.success('RTCPeerConnection поддерживается');
    } else {
      log.warning('RTCPeerConnection не поддерживается в текущем окружении');
    }

    // Тестируем STUN серверы
    const iceServers = [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ];

    log.success(`Настроено ${iceServers.length} STUN серверов`);
    iceServers.forEach((server, index) => {
      log.info(`STUN ${index + 1}: ${server.urls}`);
    });
  } catch (error) {
    log.error(`Ошибка тестирования WebRTC: ${error.message}`);
  }
}

// Тест Socket.IO подключения
function testSocketConnection() {
  return new Promise((resolve) => {
    log.header('Тестирование Socket.IO подключения');

    try {
      const socket = io(TEST_CONFIG.SERVER_URL, {
        path: TEST_CONFIG.SOCKET_PATH,
        timeout: 5000,
      });

      const timeout = setTimeout(() => {
        log.error('Таймаут подключения к Socket.IO серверу');
        socket.disconnect();
        resolve(false);
      }, 5000);

      socket.on('connect', () => {
        clearTimeout(timeout);
        log.success('Успешное подключение к Socket.IO серверу');
        log.info(`Socket ID: ${socket.id}`);

        // Тест эмиссии события
        socket.emit('test-connection', { message: 'Тестовое сообщение' });

        socket.disconnect();
        resolve(true);
      });

      socket.on('connect_error', (error) => {
        clearTimeout(timeout);
        log.error(`Ошибка подключения к Socket.IO: ${error.message}`);
        resolve(false);
      });
    } catch (error) {
      log.error(`Ошибка создания Socket.IO подключения: ${error.message}`);
      resolve(false);
    }
  });
}

// Тест создания видеокомнаты (симуляция)
function testVideoRoomCreation() {
  log.header('Тестирование создания видеокомнаты');

  try {
    // Симуляция валидации данных комнаты
    const roomData = TEST_CONFIG.TEST_ROOM;

    if (!roomData.name || roomData.name.trim().length === 0) {
      log.error('Название комнаты не может быть пустым');
      return false;
    }

    if (roomData.maxParticipants < 2 || roomData.maxParticipants > 50) {
      log.error('Количество участников должно быть от 2 до 50');
      return false;
    }

    log.success('Валидация данных комнаты прошла успешно');
    log.info(`Название: ${roomData.name}`);
    log.info(`Описание: ${roomData.description}`);
    log.info(`Максимум участников: ${roomData.maxParticipants}`);

    // Симуляция генерации кода комнаты
    const roomCode = Math.random().toString(36).substring(2, 10).toUpperCase();
    log.success(`Сгенерирован код комнаты: ${roomCode}`);

    return true;
  } catch (error) {
    log.error(`Ошибка тестирования создания комнаты: ${error.message}`);
    return false;
  }
}

// Проверка зависимостей
function checkDependencies() {
  log.header('Проверка зависимостей');

  const dependencies = [
    'socket.io-client',
    'simple-peer',
    'next',
    'react',
    '@prisma/client',
  ];

  dependencies.forEach((dep) => {
    try {
      require.resolve(dep);
      log.success(`${dep}: установлен`);
    } catch (error) {
      log.error(`${dep}: НЕ УСТАНОВЛЕН`);
    }
  });
}

// Основная функция тестирования
async function runTests() {
  console.log(`${colors.bold}${colors.blue}`);
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║              ТЕСТИРОВАНИЕ ВИДЕОКОНФЕРЕНЦИЙ               ║');
  console.log('║                     SuperMock Platform                  ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log(colors.reset);

  const results = {
    environment: false,
    dependencies: false,
    api: false,
    webrtc: false,
    socket: false,
    roomCreation: false,
  };

  // Запуск тестов
  results.environment = checkEnvironmentVariables();
  checkDependencies();
  await testApiEndpoints();
  testWebRTCConfiguration();
  results.socket = await testSocketConnection();
  results.roomCreation = testVideoRoomCreation();

  // Итоговый отчет
  log.header('ИТОГОВЫЙ ОТЧЕТ');

  const totalTests = Object.keys(results).length;
  const passedTests = Object.values(results).filter(Boolean).length;

  if (results.environment) log.success('Переменные окружения: ОК');
  else log.error('Переменные окружения: ОШИБКА');

  log.info('Зависимости: проверены (см. выше)');
  log.info('API endpoints: проверены (см. выше)');
  log.info('WebRTC конфигурация: проверена (см. выше)');

  if (results.socket) log.success('Socket.IO подключение: ОК');
  else log.error('Socket.IO подключение: ОШИБКА');

  if (results.roomCreation) log.success('Создание комнаты: ОК');
  else log.error('Создание комнаты: ОШИБКА');

  console.log(
    `\n${colors.bold}Результат: ${passedTests}/${totalTests} тестов пройдено${colors.reset}`
  );

  if (passedTests === totalTests) {
    log.success('Все тесты пройдены! Система готова к работе.');
  } else {
    log.warning('Некоторые тесты не пройдены. Проверьте конфигурацию.');
  }

  // Рекомендации
  console.log(`\n${colors.bold}Рекомендации:${colors.reset}`);
  console.log('1. Запустите сервер разработки: npm run dev');
  console.log(
    '2. Откройте демо-страницу: http://localhost:3000/video-conference/demo'
  );
  console.log('3. Проверьте логи сервера на наличие ошибок');
  console.log('4. Убедитесь, что база данных доступна');
}

// Запуск тестов
if (require.main === module) {
  runTests().catch((error) => {
    log.error(`Критическая ошибка: ${error.message}`);
    process.exit(1);
  });
}

module.exports = {
  runTests,
  TEST_CONFIG,
  checkEnvironmentVariables,
  testApiEndpoints,
  testWebRTCConfiguration,
  testSocketConnection,
  testVideoRoomCreation,
};
