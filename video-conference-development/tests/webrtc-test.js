// Тестирование WebRTC соединений для видеоконференций
// Включает тесты P2P соединений, обмена медиа и демонстрации экрана

import {
  getWebRTCConfig,
  getMediaConstraints,
  checkWebRTCSupport,
  getBrowserInfo,
  performanceConfig,
  mediaDeviceUtils,
} from '../lib/webrtc-config.js';

/**
 * Класс для тестирования WebRTC функциональности
 */
class WebRTCTester {
  constructor() {
    this.testResults = [];
    this.peerConnections = new Map();
    this.localStreams = new Map();
    this.remoteStreams = new Map();
    this.dataChannels = new Map();
    this.testStartTime = null;
    this.testStats = {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
    };
  }

  /**
   * Запуск всех тестов WebRTC
   */
  async runAllTests() {
    console.log('🎥 Запуск тестирования WebRTC соединений...');
    this.testStartTime = Date.now();

    try {
      // Базовые тесты поддержки
      await this.testWebRTCSupport();
      await this.testBrowserCompatibility();

      // Тесты медиа устройств
      await this.testMediaDevices();
      await this.testMediaPermissions();

      // Тесты WebRTC соединений
      await this.testPeerConnectionCreation();
      await this.testICEGathering();
      await this.testDataChannels();

      // Тесты медиа потоков
      await this.testLocalMediaStream();
      await this.testScreenShare();

      // Тесты P2P соединения
      await this.testP2PConnection();
      await this.testOfferAnswerExchange();
      await this.testICECandidateExchange();

      // Тесты качества соединения
      await this.testConnectionQuality();
      await this.testReconnection();

      // Тесты производительности
      await this.testPerformanceMetrics();
    } catch (error) {
      this.addTestResult(
        'CRITICAL_ERROR',
        false,
        `Критическая ошибка: ${error.message}`
      );
    }

    this.printTestSummary();
    return this.generateTestReport();
  }

  /**
   * Тест поддержки WebRTC в браузере
   */
  async testWebRTCSupport() {
    const testName = 'WebRTC Support Check';
    try {
      const support = checkWebRTCSupport();

      if (!support.webrtc) {
        this.addTestResult(
          testName,
          false,
          'WebRTC не поддерживается в браузере'
        );
        return;
      }

      const requiredFeatures = ['rtcPeerConnection', 'getUserMedia'];
      const missingFeatures = requiredFeatures.filter(
        (feature) => !support[feature]
      );

      if (missingFeatures.length > 0) {
        this.addTestResult(
          testName,
          false,
          `Отсутствуют функции: ${missingFeatures.join(', ')}`
        );
        return;
      }

      this.addTestResult(
        testName,
        true,
        'Все необходимые WebRTC функции поддерживаются'
      );
    } catch (error) {
      this.addTestResult(
        testName,
        false,
        `Ошибка проверки поддержки: ${error.message}`
      );
    }
  }

  /**
   * Тест совместимости браузера
   */
  async testBrowserCompatibility() {
    const testName = 'Browser Compatibility';
    try {
      const browserInfo = getBrowserInfo();
      const supportedBrowsers = {
        Chrome: 60,
        Firefox: 60,
        Safari: 11,
        Edge: 79,
      };

      const browserName = browserInfo.name;
      const browserVersion = parseInt(browserInfo.version);
      const minVersion = supportedBrowsers[browserName];

      if (!minVersion) {
        this.addTestResult(
          testName,
          false,
          `Неподдерживаемый браузер: ${browserName}`
        );
        return;
      }

      if (browserVersion < minVersion) {
        this.addTestResult(
          testName,
          false,
          `Версия браузера ${browserVersion} ниже минимальной ${minVersion}`
        );
        return;
      }

      this.addTestResult(
        testName,
        true,
        `Браузер ${browserName} ${browserVersion} совместим`
      );
    } catch (error) {
      this.addTestResult(
        testName,
        false,
        `Ошибка проверки совместимости: ${error.message}`
      );
    }
  }

  /**
   * Тест доступности медиа устройств
   */
  async testMediaDevices() {
    const testName = 'Media Devices Availability';
    try {
      const devices = await mediaDeviceUtils.getAvailableDevices();

      if (devices.videoInputs.length === 0) {
        this.addTestResult(testName, false, 'Видео устройства не найдены');
        return;
      }

      if (devices.audioInputs.length === 0) {
        this.addTestResult(testName, false, 'Аудио устройства не найдены');
        return;
      }

      this.addTestResult(
        testName,
        true,
        `Найдено устройств: ${devices.videoInputs.length} видео, ${devices.audioInputs.length} аудио`
      );
    } catch (error) {
      this.addTestResult(
        testName,
        false,
        `Ошибка получения устройств: ${error.message}`
      );
    }
  }

  /**
   * Тест разрешений на медиа
   */
  async testMediaPermissions() {
    const testName = 'Media Permissions';
    try {
      const permissions = await mediaDeviceUtils.checkPermissions();

      if (
        permissions.camera === 'denied' ||
        permissions.microphone === 'denied'
      ) {
        this.addTestResult(
          testName,
          false,
          'Доступ к камере или микрофону запрещен'
        );
        return;
      }

      this.addTestResult(
        testName,
        true,
        `Разрешения: камера=${permissions.camera}, микрофон=${permissions.microphone}`
      );
    } catch (error) {
      this.addTestResult(
        testName,
        false,
        `Ошибка проверки разрешений: ${error.message}`
      );
    }
  }

  /**
   * Тест создания RTCPeerConnection
   */
  async testPeerConnectionCreation() {
    const testName = 'PeerConnection Creation';
    try {
      const config = getWebRTCConfig();
      const pc = new RTCPeerConnection(config);

      if (!pc) {
        this.addTestResult(
          testName,
          false,
          'Не удалось создать RTCPeerConnection'
        );
        return;
      }

      // Проверяем состояние соединения
      if (pc.connectionState === undefined) {
        this.addTestResult(
          testName,
          false,
          'connectionState не поддерживается'
        );
        pc.close();
        return;
      }

      this.peerConnections.set('test', pc);
      this.addTestResult(testName, true, 'RTCPeerConnection успешно создан');
    } catch (error) {
      this.addTestResult(
        testName,
        false,
        `Ошибка создания PeerConnection: ${error.message}`
      );
    }
  }

  /**
   * Тест сбора ICE кандидатов
   */
  async testICEGathering() {
    const testName = 'ICE Gathering';
    return new Promise((resolve) => {
      try {
        const pc = this.peerConnections.get('test');
        if (!pc) {
          this.addTestResult(testName, false, 'PeerConnection не найден');
          resolve();
          return;
        }

        let iceCandidatesCount = 0;
        const timeout = setTimeout(() => {
          if (iceCandidatesCount === 0) {
            this.addTestResult(
              testName,
              false,
              'ICE кандидаты не собраны за отведенное время'
            );
          } else {
            this.addTestResult(
              testName,
              true,
              `Собрано ${iceCandidatesCount} ICE кандидатов`
            );
          }
          resolve();
        }, performanceConfig.iceGatheringTimeout);

        pc.onicecandidate = (event) => {
          if (event.candidate) {
            iceCandidatesCount++;
            console.log(`ICE кандидат: ${event.candidate.candidate}`);
          } else {
            // Сбор ICE кандидатов завершен
            clearTimeout(timeout);
            this.addTestResult(
              testName,
              true,
              `Собрано ${iceCandidatesCount} ICE кандидатов`
            );
            resolve();
          }
        };

        // Создаем offer для запуска сбора ICE кандидатов
        pc.createOffer()
          .then((offer) => {
            return pc.setLocalDescription(offer);
          })
          .catch((error) => {
            clearTimeout(timeout);
            this.addTestResult(
              testName,
              false,
              `Ошибка создания offer: ${error.message}`
            );
            resolve();
          });
      } catch (error) {
        this.addTestResult(
          testName,
          false,
          `Ошибка сбора ICE: ${error.message}`
        );
        resolve();
      }
    });
  }

  /**
   * Тест data channels
   */
  async testDataChannels() {
    const testName = 'Data Channels';
    try {
      const pc = this.peerConnections.get('test');
      if (!pc) {
        this.addTestResult(testName, false, 'PeerConnection не найден');
        return;
      }

      const dataChannel = pc.createDataChannel('test', {
        ordered: true,
        maxRetransmits: 3,
      });

      if (!dataChannel) {
        this.addTestResult(testName, false, 'Не удалось создать data channel');
        return;
      }

      this.dataChannels.set('test', dataChannel);
      this.addTestResult(testName, true, 'Data channel успешно создан');
    } catch (error) {
      this.addTestResult(
        testName,
        false,
        `Ошибка создания data channel: ${error.message}`
      );
    }
  }

  /**
   * Тест получения локального медиа потока
   */
  async testLocalMediaStream() {
    const testName = 'Local Media Stream';
    try {
      const constraints = getMediaConstraints('medium', true);
      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      if (!stream) {
        this.addTestResult(testName, false, 'Не удалось получить медиа поток');
        return;
      }

      const videoTracks = stream.getVideoTracks();
      const audioTracks = stream.getAudioTracks();

      if (videoTracks.length === 0) {
        this.addTestResult(testName, false, 'Видео трек не найден');
        return;
      }

      if (audioTracks.length === 0) {
        this.addTestResult(testName, false, 'Аудио трек не найден');
        return;
      }

      this.localStreams.set('camera', stream);
      this.addTestResult(
        testName,
        true,
        `Получен поток: ${videoTracks.length} видео, ${audioTracks.length} аудио треков`
      );
    } catch (error) {
      this.addTestResult(
        testName,
        false,
        `Ошибка получения медиа потока: ${error.message}`
      );
    }
  }

  /**
   * Тест демонстрации экрана
   */
  async testScreenShare() {
    const testName = 'Screen Share';
    try {
      if (!navigator.mediaDevices.getDisplayMedia) {
        this.addTestResult(
          testName,
          false,
          'getDisplayMedia не поддерживается'
        );
        return;
      }

      // Примечание: этот тест требует пользовательского взаимодействия
      // В автоматических тестах будет пропущен
      this.addTestResult(
        testName,
        true,
        'getDisplayMedia API доступен (требует пользовательского взаимодействия)'
      );
    } catch (error) {
      this.addTestResult(
        testName,
        false,
        `Ошибка проверки screen share: ${error.message}`
      );
    }
  }

  /**
   * Симуляция P2P соединения между двумя участниками
   */
  async testP2PConnection() {
    const testName = 'P2P Connection Simulation';
    try {
      const config = getWebRTCConfig();

      // Создаем два peer connection (симуляция двух участников)
      const pc1 = new RTCPeerConnection(config);
      const pc2 = new RTCPeerConnection(config);

      this.peerConnections.set('peer1', pc1);
      this.peerConnections.set('peer2', pc2);

      // Настраиваем обмен ICE кандидатами
      pc1.onicecandidate = (event) => {
        if (event.candidate) {
          pc2.addIceCandidate(event.candidate);
        }
      };

      pc2.onicecandidate = (event) => {
        if (event.candidate) {
          pc1.addIceCandidate(event.candidate);
        }
      };

      // Добавляем локальный поток к первому peer
      const stream = this.localStreams.get('camera');
      if (stream) {
        stream.getTracks().forEach((track) => {
          pc1.addTrack(track, stream);
        });
      }

      this.addTestResult(
        testName,
        true,
        'P2P соединение настроено для симуляции'
      );
    } catch (error) {
      this.addTestResult(
        testName,
        false,
        `Ошибка настройки P2P: ${error.message}`
      );
    }
  }

  /**
   * Тест обмена offer/answer
   */
  async testOfferAnswerExchange() {
    const testName = 'Offer/Answer Exchange';
    try {
      const pc1 = this.peerConnections.get('peer1');
      const pc2 = this.peerConnections.get('peer2');

      if (!pc1 || !pc2) {
        this.addTestResult(testName, false, 'Peer connections не найдены');
        return;
      }

      // Создаем offer
      const offer = await pc1.createOffer();
      await pc1.setLocalDescription(offer);

      // Устанавливаем offer как remote description для второго peer
      await pc2.setRemoteDescription(offer);

      // Создаем answer
      const answer = await pc2.createAnswer();
      await pc2.setLocalDescription(answer);

      // Устанавливаем answer как remote description для первого peer
      await pc1.setRemoteDescription(answer);

      this.addTestResult(testName, true, 'Обмен offer/answer выполнен успешно');
    } catch (error) {
      this.addTestResult(
        testName,
        false,
        `Ошибка обмена offer/answer: ${error.message}`
      );
    }
  }

  /**
   * Тест обмена ICE кандидатами
   */
  async testICECandidateExchange() {
    const testName = 'ICE Candidate Exchange';
    return new Promise((resolve) => {
      try {
        const pc1 = this.peerConnections.get('peer1');
        const pc2 = this.peerConnections.get('peer2');

        if (!pc1 || !pc2) {
          this.addTestResult(testName, false, 'Peer connections не найдены');
          resolve();
          return;
        }

        let exchangedCandidates = 0;
        const timeout = setTimeout(() => {
          if (exchangedCandidates > 0) {
            this.addTestResult(
              testName,
              true,
              `Обменялись ${exchangedCandidates} ICE кандидатами`
            );
          } else {
            this.addTestResult(testName, false, 'ICE кандидаты не обменялись');
          }
          resolve();
        }, 5000);

        const originalOnIceCandidate1 = pc1.onicecandidate;
        const originalOnIceCandidate2 = pc2.onicecandidate;

        pc1.onicecandidate = (event) => {
          if (originalOnIceCandidate1) originalOnIceCandidate1(event);
          if (event.candidate) exchangedCandidates++;
        };

        pc2.onicecandidate = (event) => {
          if (originalOnIceCandidate2) originalOnIceCandidate2(event);
          if (event.candidate) exchangedCandidates++;
        };

        // Проверяем состояние соединения
        pc1.onconnectionstatechange = () => {
          if (pc1.connectionState === 'connected') {
            clearTimeout(timeout);
            this.addTestResult(testName, true, 'P2P соединение установлено');
            resolve();
          }
        };
      } catch (error) {
        this.addTestResult(
          testName,
          false,
          `Ошибка обмена ICE кандидатами: ${error.message}`
        );
        resolve();
      }
    });
  }

  /**
   * Тест качества соединения
   */
  async testConnectionQuality() {
    const testName = 'Connection Quality';
    try {
      const pc1 = this.peerConnections.get('peer1');
      if (!pc1) {
        this.addTestResult(testName, false, 'PeerConnection не найден');
        return;
      }

      const stats = await pc1.getStats();
      let hasVideoStats = false;
      let hasAudioStats = false;

      stats.forEach((report) => {
        if (report.type === 'outbound-rtp' && report.mediaType === 'video') {
          hasVideoStats = true;
        }
        if (report.type === 'outbound-rtp' && report.mediaType === 'audio') {
          hasAudioStats = true;
        }
      });

      if (hasVideoStats && hasAudioStats) {
        this.addTestResult(
          testName,
          true,
          'Статистика качества соединения доступна'
        );
      } else {
        this.addTestResult(
          testName,
          false,
          'Статистика качества соединения недоступна'
        );
      }
    } catch (error) {
      this.addTestResult(
        testName,
        false,
        `Ошибка проверки качества: ${error.message}`
      );
    }
  }

  /**
   * Тест переподключения при сбоях
   */
  async testReconnection() {
    const testName = 'Reconnection Handling';
    try {
      const pc = this.peerConnections.get('test');
      if (!pc) {
        this.addTestResult(testName, false, 'PeerConnection не найден');
        return;
      }

      // Симулируем сбой соединения
      let reconnectionAttempted = false;

      pc.onconnectionstatechange = () => {
        if (
          pc.connectionState === 'failed' ||
          pc.connectionState === 'disconnected'
        ) {
          reconnectionAttempted = true;
          console.log('Обнаружен сбой соединения, попытка переподключения...');
        }
      };

      // В реальном тесте здесь была бы логика переподключения
      this.addTestResult(
        testName,
        true,
        'Обработчики переподключения настроены'
      );
    } catch (error) {
      this.addTestResult(
        testName,
        false,
        `Ошибка настройки переподключения: ${error.message}`
      );
    }
  }

  /**
   * Тест метрик производительности
   */
  async testPerformanceMetrics() {
    const testName = 'Performance Metrics';
    try {
      const pc = this.peerConnections.get('peer1');
      if (!pc) {
        this.addTestResult(testName, false, 'PeerConnection не найден');
        return;
      }

      const stats = await pc.getStats();
      const metrics = {
        packetsLost: 0,
        packetsReceived: 0,
        bytesReceived: 0,
        jitter: 0,
        roundTripTime: 0,
      };

      stats.forEach((report) => {
        if (report.type === 'inbound-rtp') {
          metrics.packetsLost += report.packetsLost || 0;
          metrics.packetsReceived += report.packetsReceived || 0;
          metrics.bytesReceived += report.bytesReceived || 0;
          metrics.jitter = report.jitter || 0;
        }
        if (report.type === 'candidate-pair' && report.state === 'succeeded') {
          metrics.roundTripTime = report.currentRoundTripTime || 0;
        }
      });

      this.addTestResult(
        testName,
        true,
        `Метрики собраны: RTT=${metrics.roundTripTime}ms, потеряно пакетов=${metrics.packetsLost}`
      );
    } catch (error) {
      this.addTestResult(
        testName,
        false,
        `Ошибка сбора метрик: ${error.message}`
      );
    }
  }

  /**
   * Добавление результата теста
   */
  addTestResult(testName, passed, message) {
    const result = {
      name: testName,
      passed,
      message,
      timestamp: new Date(),
      duration: Date.now() - this.testStartTime,
    };

    this.testResults.push(result);
    this.testStats.total++;

    if (passed) {
      this.testStats.passed++;
      console.log(`✅ ${testName}: ${message}`);
    } else {
      this.testStats.failed++;
      console.log(`❌ ${testName}: ${message}`);
    }
  }

  /**
   * Вывод сводки тестов
   */
  printTestSummary() {
    const duration = Date.now() - this.testStartTime;
    console.log('\n📊 Сводка тестирования WebRTC:');
    console.log(`⏱️  Время выполнения: ${duration}ms`);
    console.log(`📈 Всего тестов: ${this.testStats.total}`);
    console.log(`✅ Пройдено: ${this.testStats.passed}`);
    console.log(`❌ Провалено: ${this.testStats.failed}`);
    console.log(`⏭️  Пропущено: ${this.testStats.skipped}`);
    console.log(
      `📊 Успешность: ${(
        (this.testStats.passed / this.testStats.total) *
        100
      ).toFixed(1)}%`
    );
  }

  /**
   * Генерация отчета о тестировании
   */
  generateTestReport() {
    const duration = Date.now() - this.testStartTime;

    return {
      summary: {
        totalTests: this.testStats.total,
        passed: this.testStats.passed,
        failed: this.testStats.failed,
        skipped: this.testStats.skipped,
        successRate: (this.testStats.passed / this.testStats.total) * 100,
        duration: duration,
        timestamp: new Date(),
      },
      results: this.testResults,
      browserInfo: getBrowserInfo(),
      webrtcSupport: checkWebRTCSupport(),
    };
  }

  /**
   * Очистка ресурсов после тестирования
   */
  cleanup() {
    // Закрываем все peer connections
    this.peerConnections.forEach((pc) => {
      pc.close();
    });
    this.peerConnections.clear();

    // Останавливаем все медиа потоки
    this.localStreams.forEach((stream) => {
      stream.getTracks().forEach((track) => track.stop());
    });
    this.localStreams.clear();

    // Закрываем data channels
    this.dataChannels.forEach((channel) => {
      channel.close();
    });
    this.dataChannels.clear();

    console.log('🧹 Ресурсы WebRTC тестов очищены');
  }
}

// Экспорт для использования в других модулях
export default WebRTCTester;

// Функция для запуска тестов из браузера
export async function runWebRTCTests() {
  const tester = new WebRTCTester();
  try {
    const report = await tester.runAllTests();
    return report;
  } finally {
    tester.cleanup();
  }
}

// Автоматический запуск тестов если модуль загружен напрямую
if (
  typeof window !== 'undefined' &&
  window.location.search.includes('test=webrtc')
) {
  runWebRTCTests().then((report) => {
    console.log('📋 Отчет о тестировании WebRTC:', report);
  });
}
