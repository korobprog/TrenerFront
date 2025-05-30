/**
 * Интеграционные тесты для WebRTC видеоконференций
 * Тестирует Socket.io соединение, WebRTC signaling и управление комнатами
 */

const { io } = require('socket.io-client');
const Peer = require('simple-peer');

// Конфигурация для тестов
const TEST_CONFIG = {
  serverUrl: 'http://localhost:3000',
  socketPath: '/api/socket-server',
  timeout: 10000,
  testRoomId: 'test-room-' + Date.now(),
};

// Моки для браузерных API
global.navigator = {
  mediaDevices: {
    getUserMedia: jest.fn(),
    getDisplayMedia: jest.fn(),
    enumerateDevices: jest.fn(),
  },
};

global.RTCPeerConnection = jest.fn().mockImplementation(() => ({
  createOffer: jest.fn(),
  createAnswer: jest.fn(),
  setLocalDescription: jest.fn(),
  setRemoteDescription: jest.fn(),
  addIceCandidate: jest.fn(),
  close: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
}));

describe('WebRTC Video Conference Integration Tests', () => {
  let clientSocket1, clientSocket2;
  let mockStream;

  beforeAll(() => {
    // Создаем мок медиа потока
    mockStream = {
      getTracks: jest.fn(() => [
        { kind: 'video', enabled: true, stop: jest.fn() },
        { kind: 'audio', enabled: true, stop: jest.fn() },
      ]),
      getVideoTracks: jest.fn(() => [{ enabled: true, stop: jest.fn() }]),
      getAudioTracks: jest.fn(() => [{ enabled: true, stop: jest.fn() }]),
    };

    global.navigator.mediaDevices.getUserMedia.mockResolvedValue(mockStream);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(async () => {
    if (clientSocket1?.connected) {
      clientSocket1.disconnect();
    }
    if (clientSocket2?.connected) {
      clientSocket2.disconnect();
    }
  });

  describe('Socket.io Connection Tests', () => {
    test('должен успешно подключиться к Socket.io серверу', (done) => {
      clientSocket1 = io(TEST_CONFIG.serverUrl, {
        path: TEST_CONFIG.socketPath,
        transports: ['websocket'],
        timeout: TEST_CONFIG.timeout,
      });

      clientSocket1.on('connect', () => {
        expect(clientSocket1.connected).toBe(true);
        expect(clientSocket1.id).toBeDefined();
        done();
      });

      clientSocket1.on('connect_error', (error) => {
        done(new Error(`Connection failed: ${error.message}`));
      });
    });

    test('должен получить подтверждение установки соединения', (done) => {
      clientSocket1 = io(TEST_CONFIG.serverUrl, {
        path: TEST_CONFIG.socketPath,
        transports: ['websocket'],
      });

      clientSocket1.on('connection-established', (data) => {
        expect(data).toHaveProperty('socketId');
        expect(data).toHaveProperty('userId');
        expect(data).toHaveProperty('userName');
        expect(data).toHaveProperty('serverTime');
        expect(data.socketId).toBe(clientSocket1.id);
        done();
      });

      clientSocket1.on('connect_error', (error) => {
        done(new Error(`Connection failed: ${error.message}`));
      });
    });

    test('должен обработать ошибку аутентификации', (done) => {
      // Создаем соединение без аутентификации
      const unauthenticatedSocket = io(TEST_CONFIG.serverUrl, {
        path: TEST_CONFIG.socketPath,
        transports: ['websocket'],
        auth: null,
      });

      unauthenticatedSocket.on('auth-error', (data) => {
        expect(data).toHaveProperty('message');
        expect(data.message).toContain('авторизация');
        unauthenticatedSocket.disconnect();
        done();
      });

      unauthenticatedSocket.on('connect_error', () => {
        // Ожидаемое поведение для неавторизованного пользователя
        unauthenticatedSocket.disconnect();
        done();
      });
    });
  });

  describe('Room Management Tests', () => {
    test('должен успешно присоединиться к комнате', (done) => {
      clientSocket1 = io(TEST_CONFIG.serverUrl, {
        path: TEST_CONFIG.socketPath,
        transports: ['websocket'],
      });

      clientSocket1.on('connect', () => {
        clientSocket1.emit('join-room', {
          roomId: TEST_CONFIG.testRoomId,
          userId: 'test-user-1',
          userName: 'Test User 1',
        });
      });

      clientSocket1.on('room-joined', (data) => {
        expect(data).toHaveProperty('roomId');
        expect(data).toHaveProperty('participants');
        expect(data.roomId).toBe(TEST_CONFIG.testRoomId);
        expect(Array.isArray(data.participants)).toBe(true);
        done();
      });

      clientSocket1.on('connect_error', (error) => {
        done(new Error(`Connection failed: ${error.message}`));
      });
    });

    test('должен уведомить других участников о присоединении нового пользователя', (done) => {
      let socket1Connected = false;
      let socket2Connected = false;

      // Первый пользователь присоединяется к комнате
      clientSocket1 = io(TEST_CONFIG.serverUrl, {
        path: TEST_CONFIG.socketPath,
        transports: ['websocket'],
      });

      clientSocket1.on('connect', () => {
        socket1Connected = true;
        clientSocket1.emit('join-room', {
          roomId: TEST_CONFIG.testRoomId,
          userId: 'test-user-1',
          userName: 'Test User 1',
        });
      });

      clientSocket1.on('room-joined', () => {
        if (socket2Connected) return;

        // Второй пользователь присоединяется к той же комнате
        clientSocket2 = io(TEST_CONFIG.serverUrl, {
          path: TEST_CONFIG.socketPath,
          transports: ['websocket'],
        });

        clientSocket2.on('connect', () => {
          socket2Connected = true;
          clientSocket2.emit('join-room', {
            roomId: TEST_CONFIG.testRoomId,
            userId: 'test-user-2',
            userName: 'Test User 2',
          });
        });
      });

      // Первый пользователь должен получить уведомление о присоединении второго
      clientSocket1.on('user-joined', (userData) => {
        expect(userData).toHaveProperty('userId');
        expect(userData).toHaveProperty('userName');
        expect(userData).toHaveProperty('socketId');
        expect(userData.userId).toBe('test-user-2');
        expect(userData.userName).toBe('Test User 2');
        done();
      });
    });

    test('должен уведомить о покидании пользователем комнаты', (done) => {
      let usersJoined = 0;

      // Создаем двух пользователей
      clientSocket1 = io(TEST_CONFIG.serverUrl, {
        path: TEST_CONFIG.socketPath,
        transports: ['websocket'],
      });

      clientSocket2 = io(TEST_CONFIG.serverUrl, {
        path: TEST_CONFIG.socketPath,
        transports: ['websocket'],
      });

      const joinRoom = (socket, userId, userName) => {
        socket.emit('join-room', {
          roomId: TEST_CONFIG.testRoomId,
          userId,
          userName,
        });
      };

      clientSocket1.on('connect', () => {
        joinRoom(clientSocket1, 'test-user-1', 'Test User 1');
      });

      clientSocket2.on('connect', () => {
        joinRoom(clientSocket2, 'test-user-2', 'Test User 2');
      });

      clientSocket1.on('room-joined', () => {
        usersJoined++;
        if (usersJoined === 2) {
          // Второй пользователь покидает комнату
          clientSocket2.disconnect();
        }
      });

      clientSocket2.on('room-joined', () => {
        usersJoined++;
        if (usersJoined === 2) {
          // Второй пользователь покидает комнату
          clientSocket2.disconnect();
        }
      });

      // Первый пользователь должен получить уведомление о покидании
      clientSocket1.on('user-left', (userData) => {
        expect(userData).toHaveProperty('userId');
        expect(userData).toHaveProperty('userName');
        expect(userData.userId).toBe('test-user-2');
        done();
      });
    });
  });

  describe('WebRTC Signaling Tests', () => {
    test('должен передать offer между участниками', (done) => {
      const mockOffer = {
        type: 'offer',
        sdp: 'mock-sdp-offer-data',
      };

      clientSocket1 = io(TEST_CONFIG.serverUrl, {
        path: TEST_CONFIG.socketPath,
        transports: ['websocket'],
      });

      clientSocket2 = io(TEST_CONFIG.serverUrl, {
        path: TEST_CONFIG.socketPath,
        transports: ['websocket'],
      });

      let socket1Ready = false;
      let socket2Ready = false;

      const checkBothReady = () => {
        if (socket1Ready && socket2Ready) {
          // Отправляем offer от первого пользователя ко второму
          clientSocket1.emit('offer', {
            targetSocketId: clientSocket2.id,
            offer: mockOffer,
          });
        }
      };

      clientSocket1.on('connect', () => {
        clientSocket1.emit('join-room', {
          roomId: TEST_CONFIG.testRoomId,
          userId: 'test-user-1',
          userName: 'Test User 1',
        });
      });

      clientSocket2.on('connect', () => {
        clientSocket2.emit('join-room', {
          roomId: TEST_CONFIG.testRoomId,
          userId: 'test-user-2',
          userName: 'Test User 2',
        });
      });

      clientSocket1.on('room-joined', () => {
        socket1Ready = true;
        checkBothReady();
      });

      clientSocket2.on('room-joined', () => {
        socket2Ready = true;
        checkBothReady();
      });

      // Второй пользователь должен получить offer
      clientSocket2.on('offer', (data) => {
        expect(data).toHaveProperty('fromUserId');
        expect(data).toHaveProperty('fromSocketId');
        expect(data).toHaveProperty('offer');
        expect(data).toHaveProperty('timestamp');
        expect(data.offer).toEqual(mockOffer);
        expect(data.fromSocketId).toBe(clientSocket1.id);
        done();
      });
    });

    test('должен передать answer между участниками', (done) => {
      const mockAnswer = {
        type: 'answer',
        sdp: 'mock-sdp-answer-data',
      };

      clientSocket1 = io(TEST_CONFIG.serverUrl, {
        path: TEST_CONFIG.socketPath,
        transports: ['websocket'],
      });

      clientSocket2 = io(TEST_CONFIG.serverUrl, {
        path: TEST_CONFIG.socketPath,
        transports: ['websocket'],
      });

      let bothConnected = false;

      const setupSockets = () => {
        if (bothConnected) return;
        bothConnected = true;

        // Отправляем answer от второго пользователя к первому
        setTimeout(() => {
          clientSocket2.emit('answer', {
            targetSocketId: clientSocket1.id,
            answer: mockAnswer,
          });
        }, 100);
      };

      clientSocket1.on('connect', () => {
        clientSocket1.emit('join-room', {
          roomId: TEST_CONFIG.testRoomId,
          userId: 'test-user-1',
          userName: 'Test User 1',
        });
      });

      clientSocket2.on('connect', () => {
        clientSocket2.emit('join-room', {
          roomId: TEST_CONFIG.testRoomId,
          userId: 'test-user-2',
          userName: 'Test User 2',
        });
      });

      clientSocket1.on('room-joined', setupSockets);
      clientSocket2.on('room-joined', setupSockets);

      // Первый пользователь должен получить answer
      clientSocket1.on('answer', (data) => {
        expect(data).toHaveProperty('fromUserId');
        expect(data).toHaveProperty('fromSocketId');
        expect(data).toHaveProperty('answer');
        expect(data).toHaveProperty('timestamp');
        expect(data.answer).toEqual(mockAnswer);
        expect(data.fromSocketId).toBe(clientSocket2.id);
        done();
      });
    });

    test('должен передать ICE candidates между участниками', (done) => {
      const mockCandidate = {
        candidate: 'candidate:mock-ice-candidate-data',
        sdpMLineIndex: 0,
        sdpMid: 'video',
      };

      clientSocket1 = io(TEST_CONFIG.serverUrl, {
        path: TEST_CONFIG.socketPath,
        transports: ['websocket'],
      });

      clientSocket2 = io(TEST_CONFIG.serverUrl, {
        path: TEST_CONFIG.socketPath,
        transports: ['websocket'],
      });

      let bothReady = false;

      const setupTest = () => {
        if (bothReady) return;
        bothReady = true;

        setTimeout(() => {
          clientSocket1.emit('ice-candidate', {
            targetSocketId: clientSocket2.id,
            candidate: mockCandidate,
          });
        }, 100);
      };

      clientSocket1.on('connect', () => {
        clientSocket1.emit('join-room', {
          roomId: TEST_CONFIG.testRoomId,
          userId: 'test-user-1',
          userName: 'Test User 1',
        });
      });

      clientSocket2.on('connect', () => {
        clientSocket2.emit('join-room', {
          roomId: TEST_CONFIG.testRoomId,
          userId: 'test-user-2',
          userName: 'Test User 2',
        });
      });

      clientSocket1.on('room-joined', setupTest);
      clientSocket2.on('room-joined', setupTest);

      // Второй пользователь должен получить ICE candidate
      clientSocket2.on('ice-candidate', (data) => {
        expect(data).toHaveProperty('fromUserId');
        expect(data).toHaveProperty('fromSocketId');
        expect(data).toHaveProperty('candidate');
        expect(data).toHaveProperty('timestamp');
        expect(data.candidate).toEqual(mockCandidate);
        expect(data.fromSocketId).toBe(clientSocket1.id);
        done();
      });
    });
  });

  describe('Media Control Tests', () => {
    test('должен уведомить о переключении видео', (done) => {
      clientSocket1 = io(TEST_CONFIG.serverUrl, {
        path: TEST_CONFIG.socketPath,
        transports: ['websocket'],
      });

      clientSocket2 = io(TEST_CONFIG.serverUrl, {
        path: TEST_CONFIG.socketPath,
        transports: ['websocket'],
      });

      let bothInRoom = false;

      const setupTest = () => {
        if (bothInRoom) return;
        bothInRoom = true;

        setTimeout(() => {
          clientSocket1.emit('toggle-video', {
            videoEnabled: false,
          });
        }, 100);
      };

      clientSocket1.on('connect', () => {
        clientSocket1.emit('join-room', {
          roomId: TEST_CONFIG.testRoomId,
          userId: 'test-user-1',
          userName: 'Test User 1',
        });
      });

      clientSocket2.on('connect', () => {
        clientSocket2.emit('join-room', {
          roomId: TEST_CONFIG.testRoomId,
          userId: 'test-user-2',
          userName: 'Test User 2',
        });
      });

      clientSocket1.on('room-joined', setupTest);
      clientSocket2.on('room-joined', setupTest);

      clientSocket2.on('user-video-toggled', (data) => {
        expect(data).toHaveProperty('userId');
        expect(data).toHaveProperty('videoEnabled');
        expect(data.videoEnabled).toBe(false);
        done();
      });
    });

    test('должен уведомить о переключении аудио', (done) => {
      clientSocket1 = io(TEST_CONFIG.serverUrl, {
        path: TEST_CONFIG.socketPath,
        transports: ['websocket'],
      });

      clientSocket2 = io(TEST_CONFIG.serverUrl, {
        path: TEST_CONFIG.socketPath,
        transports: ['websocket'],
      });

      let bothInRoom = false;

      const setupTest = () => {
        if (bothInRoom) return;
        bothInRoom = true;

        setTimeout(() => {
          clientSocket1.emit('toggle-audio', {
            audioEnabled: false,
          });
        }, 100);
      };

      clientSocket1.on('connect', () => {
        clientSocket1.emit('join-room', {
          roomId: TEST_CONFIG.testRoomId,
          userId: 'test-user-1',
          userName: 'Test User 1',
        });
      });

      clientSocket2.on('connect', () => {
        clientSocket2.emit('join-room', {
          roomId: TEST_CONFIG.testRoomId,
          userId: 'test-user-2',
          userName: 'Test User 2',
        });
      });

      clientSocket1.on('room-joined', setupTest);
      clientSocket2.on('room-joined', setupTest);

      clientSocket2.on('user-audio-toggled', (data) => {
        expect(data).toHaveProperty('userId');
        expect(data).toHaveProperty('audioEnabled');
        expect(data.audioEnabled).toBe(false);
        done();
      });
    });
  });

  describe('Error Handling Tests', () => {
    test('должен обработать ошибку signaling при отсутствии целевого сокета', (done) => {
      clientSocket1 = io(TEST_CONFIG.serverUrl, {
        path: TEST_CONFIG.socketPath,
        transports: ['websocket'],
      });

      clientSocket1.on('connect', () => {
        clientSocket1.emit('join-room', {
          roomId: TEST_CONFIG.testRoomId,
          userId: 'test-user-1',
          userName: 'Test User 1',
        });
      });

      clientSocket1.on('room-joined', () => {
        // Отправляем offer к несуществующему сокету
        clientSocket1.emit('offer', {
          targetSocketId: 'non-existent-socket-id',
          offer: { type: 'offer', sdp: 'mock-sdp' },
        });
      });

      clientSocket1.on('signaling-error', (error) => {
        expect(error).toHaveProperty('type');
        expect(error).toHaveProperty('message');
        expect(error.type).toBe('offer');
        expect(error.message).toContain('не найден');
        done();
      });
    });

    test('должен обработать ошибку при отсутствии обязательных параметров', (done) => {
      clientSocket1 = io(TEST_CONFIG.serverUrl, {
        path: TEST_CONFIG.socketPath,
        transports: ['websocket'],
      });

      clientSocket1.on('connect', () => {
        clientSocket1.emit('join-room', {
          roomId: TEST_CONFIG.testRoomId,
          userId: 'test-user-1',
          userName: 'Test User 1',
        });
      });

      clientSocket1.on('room-joined', () => {
        // Отправляем offer без обязательных параметров
        clientSocket1.emit('offer', {
          targetSocketId: null,
          offer: null,
        });
      });

      clientSocket1.on('signaling-error', (error) => {
        expect(error).toHaveProperty('type');
        expect(error).toHaveProperty('message');
        expect(error.type).toBe('offer');
        expect(error.message).toContain('параметры');
        done();
      });
    });
  });

  describe('Connection Quality Tests', () => {
    test('должен передать информацию о качестве соединения', (done) => {
      const qualityData = {
        rtt: 50,
        packetLoss: 0.01,
        bandwidth: 1000000,
      };

      clientSocket1 = io(TEST_CONFIG.serverUrl, {
        path: TEST_CONFIG.socketPath,
        transports: ['websocket'],
      });

      clientSocket2 = io(TEST_CONFIG.serverUrl, {
        path: TEST_CONFIG.socketPath,
        transports: ['websocket'],
      });

      let bothReady = false;

      const setupTest = () => {
        if (bothReady) return;
        bothReady = true;

        setTimeout(() => {
          clientSocket1.emit('connection-quality', {
            targetSocketId: clientSocket2.id,
            quality: qualityData,
          });
        }, 100);
      };

      clientSocket1.on('connect', () => {
        clientSocket1.emit('join-room', {
          roomId: TEST_CONFIG.testRoomId,
          userId: 'test-user-1',
          userName: 'Test User 1',
        });
      });

      clientSocket2.on('connect', () => {
        clientSocket2.emit('join-room', {
          roomId: TEST_CONFIG.testRoomId,
          userId: 'test-user-2',
          userName: 'Test User 2',
        });
      });

      clientSocket1.on('room-joined', setupTest);
      clientSocket2.on('room-joined', setupTest);

      clientSocket2.on('peer-connection-quality', (data) => {
        expect(data).toHaveProperty('fromUserId');
        expect(data).toHaveProperty('quality');
        expect(data).toHaveProperty('timestamp');
        expect(data.quality).toEqual(qualityData);
        done();
      });
    });

    test('должен обработать ping-pong для проверки соединения', (done) => {
      clientSocket1 = io(TEST_CONFIG.serverUrl, {
        path: TEST_CONFIG.socketPath,
        transports: ['websocket'],
      });

      clientSocket1.on('connect', () => {
        clientSocket1.emit('ping');
      });

      clientSocket1.on('pong', (data) => {
        expect(data).toHaveProperty('timestamp');
        expect(new Date(data.timestamp)).toBeInstanceOf(Date);
        done();
      });
    });
  });

  describe('Room Statistics Tests', () => {
    test('должен предоставить статистику комнаты', (done) => {
      clientSocket1 = io(TEST_CONFIG.serverUrl, {
        path: TEST_CONFIG.socketPath,
        transports: ['websocket'],
      });

      clientSocket1.on('connect', () => {
        clientSocket1.emit('join-room', {
          roomId: TEST_CONFIG.testRoomId,
          userId: 'test-user-1',
          userName: 'Test User 1',
        });
      });

      clientSocket1.on('room-joined', () => {
        clientSocket1.emit('get-room-stats');
      });

      clientSocket1.on('room-stats', (stats) => {
        expect(stats).toHaveProperty('roomId');
        expect(stats).toHaveProperty('participantCount');
        expect(stats).toHaveProperty('createdAt');
        expect(stats).toHaveProperty('participants');
        expect(stats.roomId).toBe(TEST_CONFIG.testRoomId);
        expect(stats.participantCount).toBeGreaterThan(0);
        expect(Array.isArray(stats.participants)).toBe(true);
        done();
      });
    });
  });
});

// Утилиты для тестирования
const TestUtils = {
  /**
   * Создает мок WebRTC peer соединения
   */
  createMockPeer() {
    return {
      signal: jest.fn(),
      destroy: jest.fn(),
      on: jest.fn(),
      _pc: {
        getSenders: jest.fn(() => [
          {
            track: { kind: 'video' },
            replaceTrack: jest.fn(),
          },
        ]),
      },
    };
  },

  /**
   * Создает мок медиа потока
   */
  createMockStream() {
    return {
      getTracks: jest.fn(() => [
        { kind: 'video', enabled: true, stop: jest.fn() },
        { kind: 'audio', enabled: true, stop: jest.fn() },
      ]),
      getVideoTracks: jest.fn(() => [{ enabled: true, stop: jest.fn() }]),
      getAudioTracks: jest.fn(() => [{ enabled: true, stop: jest.fn() }]),
    };
  },

  /**
   * Ожидает события от сокета с таймаутом
   */
  waitForEvent(socket, eventName, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Timeout waiting for event: ${eventName}`));
      }, timeout);

      socket.once(eventName, (data) => {
        clearTimeout(timer);
        resolve(data);
      });
    });
  },

  /**
   * Создает тестовую комнату с несколькими участниками
   */
  async createTestRoom(participantCount = 2) {
    const sockets = [];
    const roomId = 'test-room-' + Date.now();

    for (let i = 0; i < participantCount; i++) {
      const socket = io(TEST_CONFIG.serverUrl, {
        path: TEST_CONFIG.socketPath,
        transports: ['websocket'],
      });

      await this.waitForEvent(socket, 'connect');

      socket.emit('join-room', {
        roomId,
        userId: `test-user-${i + 1}`,
        userName: `Test User ${i + 1}`,
      });

      await this.waitForEvent(socket, 'room-joined');
      sockets.push(socket);
    }

    return { sockets, roomId };
  },
};

module.exports = { TestUtils };
