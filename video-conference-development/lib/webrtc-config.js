// Конфигурация WebRTC для видеоконференций
// Включает STUN/TURN серверы и настройки для оптимальной работы P2P соединений

/**
 * Получение конфигурации ICE серверов
 * @param {Object} options - Дополнительные опции
 * @param {boolean} options.includeTurn - Включить TURN серверы (по умолчанию false)
 * @param {string} options.turnUsername - Имя пользователя для TURN сервера
 * @param {string} options.turnCredential - Пароль для TURN сервера
 * @returns {Object} Конфигурация ICE серверов
 */
export function getIceServersConfig(options = {}) {
  const { includeTurn = false, turnUsername, turnCredential } = options;

  // Базовые STUN серверы Google (бесплатные)
  const iceServers = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
  ];

  // Дополнительные публичные STUN серверы для надежности
  iceServers.push(
    { urls: 'stun:stun.stunprotocol.org:3478' },
    { urls: 'stun:stun.voiparound.com' },
    { urls: 'stun:stun.voipbuster.com' },
    { urls: 'stun:stun.voipstunt.com' },
    { urls: 'stun:stun.voxgratia.org' }
  );

  // Добавляем TURN серверы если указаны
  if (includeTurn && turnUsername && turnCredential) {
    iceServers.push({
      urls: [
        'turn:your-turn-server.com:3478',
        'turns:your-turn-server.com:5349',
      ],
      username: turnUsername,
      credential: turnCredential,
    });
  }

  return { iceServers };
}

/**
 * Полная конфигурация RTCPeerConnection
 * @param {Object} options - Опции конфигурации
 * @returns {Object} Конфигурация для RTCPeerConnection
 */
export function getWebRTCConfig(options = {}) {
  const iceServersConfig = getIceServersConfig(options);

  return {
    ...iceServersConfig,
    iceCandidatePoolSize: 10,
    bundlePolicy: 'max-bundle',
    rtcpMuxPolicy: 'require',
    iceTransportPolicy: 'all', // 'relay' для принудительного использования TURN
  };
}

/**
 * Конфигурация медиа потоков
 */
export const mediaConstraints = {
  // Настройки видео
  video: {
    width: { min: 320, ideal: 1280, max: 1920 },
    height: { min: 240, ideal: 720, max: 1080 },
    frameRate: { min: 15, ideal: 30, max: 60 },
    facingMode: 'user', // 'environment' для задней камеры
  },

  // Настройки аудио
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    sampleRate: 48000,
    channelCount: 2,
  },
};

/**
 * Настройки для демонстрации экрана
 */
export const screenShareConstraints = {
  video: {
    mediaSource: 'screen',
    width: { max: 1920 },
    height: { max: 1080 },
    frameRate: { max: 30 },
  },
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: false,
  },
};

/**
 * Настройки качества видео для разных сценариев
 */
export const videoQualityPresets = {
  low: {
    width: { ideal: 320 },
    height: { ideal: 240 },
    frameRate: { ideal: 15 },
  },
  medium: {
    width: { ideal: 640 },
    height: { ideal: 480 },
    frameRate: { ideal: 24 },
  },
  high: {
    width: { ideal: 1280 },
    height: { ideal: 720 },
    frameRate: { ideal: 30 },
  },
  ultra: {
    width: { ideal: 1920 },
    height: { ideal: 1080 },
    frameRate: { ideal: 30 },
  },
};

/**
 * Получение медиа ограничений с учетом качества
 * @param {string} quality - Качество видео (low, medium, high, ultra)
 * @param {boolean} includeAudio - Включить аудио
 * @returns {Object} Ограничения медиа
 */
export function getMediaConstraints(quality = 'medium', includeAudio = true) {
  const videoConstraints = {
    ...mediaConstraints.video,
    ...videoQualityPresets[quality],
  };

  return {
    video: videoConstraints,
    audio: includeAudio ? mediaConstraints.audio : false,
  };
}

/**
 * Настройки для оптимизации производительности
 */
export const performanceConfig = {
  // Максимальное количество одновременных peer соединений
  maxPeerConnections: 8,

  // Таймауты
  connectionTimeout: 30000, // 30 секунд
  iceGatheringTimeout: 10000, // 10 секунд

  // Интервалы проверки соединения
  connectionCheckInterval: 5000, // 5 секунд
  statsCollectionInterval: 10000, // 10 секунд

  // Пороги качества соединения
  qualityThresholds: {
    excellent: { rtt: 50, packetLoss: 0.01 },
    good: { rtt: 150, packetLoss: 0.03 },
    fair: { rtt: 300, packetLoss: 0.05 },
    poor: { rtt: 500, packetLoss: 0.1 },
  },
};

/**
 * Настройки кодеков для оптимизации
 */
export const codecPreferences = {
  video: ['video/VP9', 'video/VP8', 'video/H264'],
  audio: ['audio/opus', 'audio/PCMU', 'audio/PCMA'],
};

/**
 * Проверка поддержки WebRTC в браузере
 * @returns {Object} Информация о поддержке WebRTC
 */
export function checkWebRTCSupport() {
  const support = {
    webrtc: false,
    getUserMedia: false,
    getDisplayMedia: false,
    rtcPeerConnection: false,
    dataChannels: false,
  };

  // Проверка основной поддержки WebRTC
  if (typeof RTCPeerConnection !== 'undefined') {
    support.rtcPeerConnection = true;
    support.webrtc = true;
  }

  // Проверка getUserMedia
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    support.getUserMedia = true;
  }

  // Проверка getDisplayMedia (демонстрация экрана)
  if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
    support.getDisplayMedia = true;
  }

  // Проверка поддержки data channels
  try {
    const pc = new RTCPeerConnection();
    const dc = pc.createDataChannel('test');
    if (dc) {
      support.dataChannels = true;
    }
    pc.close();
  } catch (e) {
    console.warn('Data channels не поддерживаются:', e);
  }

  return support;
}

/**
 * Получение информации о браузере для отладки
 * @returns {Object} Информация о браузере
 */
export function getBrowserInfo() {
  const userAgent = navigator.userAgent;
  let browserName = 'Unknown';
  let browserVersion = 'Unknown';

  if (userAgent.indexOf('Chrome') > -1) {
    browserName = 'Chrome';
    browserVersion = userAgent.match(/Chrome\/(\d+)/)?.[1] || 'Unknown';
  } else if (userAgent.indexOf('Firefox') > -1) {
    browserName = 'Firefox';
    browserVersion = userAgent.match(/Firefox\/(\d+)/)?.[1] || 'Unknown';
  } else if (userAgent.indexOf('Safari') > -1) {
    browserName = 'Safari';
    browserVersion = userAgent.match(/Version\/(\d+)/)?.[1] || 'Unknown';
  } else if (userAgent.indexOf('Edge') > -1) {
    browserName = 'Edge';
    browserVersion = userAgent.match(/Edge\/(\d+)/)?.[1] || 'Unknown';
  }

  return {
    name: browserName,
    version: browserVersion,
    userAgent,
    webrtcSupport: checkWebRTCSupport(),
  };
}

/**
 * Логирование конфигурации для отладки
 */
export function logWebRTCConfig() {
  const config = getWebRTCConfig();
  const browserInfo = getBrowserInfo();
  const support = checkWebRTCSupport();

  console.group('🎥 WebRTC Configuration');
  console.log('ICE Servers:', config.iceServers);
  console.log('Browser Info:', browserInfo);
  console.log('WebRTC Support:', support);
  console.log('Media Constraints:', mediaConstraints);
  console.log('Performance Config:', performanceConfig);
  console.groupEnd();
}

/**
 * Утилиты для работы с медиа устройствами
 */
export const mediaDeviceUtils = {
  /**
   * Получение списка доступных устройств
   * @returns {Promise<Object>} Список устройств по типам
   */
  async getAvailableDevices() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();

      return {
        videoInputs: devices.filter((device) => device.kind === 'videoinput'),
        audioInputs: devices.filter((device) => device.kind === 'audioinput'),
        audioOutputs: devices.filter((device) => device.kind === 'audiooutput'),
      };
    } catch (error) {
      console.error('Ошибка получения списка устройств:', error);
      return { videoInputs: [], audioInputs: [], audioOutputs: [] };
    }
  },

  /**
   * Проверка разрешений на доступ к медиа
   * @returns {Promise<Object>} Статус разрешений
   */
  async checkPermissions() {
    const permissions = {
      camera: 'unknown',
      microphone: 'unknown',
    };

    try {
      if (navigator.permissions) {
        const cameraPermission = await navigator.permissions.query({
          name: 'camera',
        });
        const microphonePermission = await navigator.permissions.query({
          name: 'microphone',
        });

        permissions.camera = cameraPermission.state;
        permissions.microphone = microphonePermission.state;
      }
    } catch (error) {
      console.warn('Не удалось проверить разрешения:', error);
    }

    return permissions;
  },
};

// Экспорт по умолчанию
export default {
  getIceServersConfig,
  getWebRTCConfig,
  getMediaConstraints,
  mediaConstraints,
  screenShareConstraints,
  videoQualityPresets,
  performanceConfig,
  codecPreferences,
  checkWebRTCSupport,
  getBrowserInfo,
  logWebRTCConfig,
  mediaDeviceUtils,
};
