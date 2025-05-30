#!/usr/bin/env node

/**
 * PeerJS сервер для WebRTC видеоконференций
 * Обеспечивает сигналинг для P2P соединений между клиентами
 */

const { PeerServer } = require('peer');
const express = require('express');
const cors = require('cors');
const path = require('path');

// Загружаем переменные окружения
require('dotenv').config({ path: path.join(__dirname, '../.env.development') });

// Конфигурация сервера
const config = {
  port: process.env.PEERJS_PORT || 9000,
  host: process.env.PEERJS_HOST || '0.0.0.0',
  path: process.env.PEERJS_PATH || '/peerjs',
  key: process.env.PEERJS_KEY || 'peerjs',
  corsOrigin:
    process.env.NODE_ENV === 'production'
      ? process.env.NEXTAUTH_URL
      : ['http://localhost:3000', 'http://127.0.0.1:3000'],
  debug: process.env.NODE_ENV === 'development' ? 3 : 1,
  allow_discovery: true,
  proxied: process.env.NODE_ENV === 'production',
  cleanup_out_msgs: 1000,
  concurrent_limit: 5000,
};

// Создаем Express приложение для дополнительных маршрутов
const app = express();

// Настройка CORS
app.use(
  cors({
    origin: config.corsOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

app.use(express.json());

// Статистика подключений
const connectionStats = {
  totalConnections: 0,
  activeConnections: 0,
  peakConnections: 0,
  startTime: new Date(),
  connectionHistory: [],
};

// Хранилище активных пиров
const activePeers = new Map();

// Создаем PeerJS сервер
const peerServer = PeerServer({
  port: config.port,
  host: config.host,
  path: config.path,
  key: config.key,
  corsOptions: {
    origin: config.corsOrigin,
    credentials: true,
  },
  debug: config.debug,
  allow_discovery: config.allow_discovery,
  proxied: config.proxied,
  cleanup_out_msgs: config.cleanup_out_msgs,
  concurrent_limit: config.concurrent_limit,
});

// Обработчики событий PeerJS сервера
peerServer.on('connection', (client) => {
  const peerId = client.getId();
  const timestamp = new Date();

  // Обновляем статистику
  connectionStats.totalConnections++;
  connectionStats.activeConnections++;
  connectionStats.peakConnections = Math.max(
    connectionStats.peakConnections,
    connectionStats.activeConnections
  );

  // Сохраняем информацию о пире
  activePeers.set(peerId, {
    id: peerId,
    connectedAt: timestamp,
    lastSeen: timestamp,
    ip: client.getSocket()?.remoteAddress || 'unknown',
  });

  // Добавляем в историю подключений (храним последние 100)
  connectionStats.connectionHistory.unshift({
    peerId,
    action: 'connected',
    timestamp,
    ip: client.getSocket()?.remoteAddress || 'unknown',
  });

  if (connectionStats.connectionHistory.length > 100) {
    connectionStats.connectionHistory.pop();
  }

  console.log(
    `[${timestamp.toISOString()}] Пир подключился: ${peerId} (IP: ${
      client.getSocket()?.remoteAddress || 'unknown'
    })`
  );
  console.log(`Активных подключений: ${connectionStats.activeConnections}`);
});

peerServer.on('disconnect', (client) => {
  const peerId = client.getId();
  const timestamp = new Date();

  // Обновляем статистику
  connectionStats.activeConnections--;

  // Удаляем информацию о пире
  const peerInfo = activePeers.get(peerId);
  if (peerInfo) {
    const sessionDuration = timestamp - peerInfo.connectedAt;
    activePeers.delete(peerId);

    // Добавляем в историю отключений
    connectionStats.connectionHistory.unshift({
      peerId,
      action: 'disconnected',
      timestamp,
      sessionDuration: Math.round(sessionDuration / 1000), // в секундах
      ip: peerInfo.ip,
    });

    if (connectionStats.connectionHistory.length > 100) {
      connectionStats.connectionHistory.pop();
    }

    console.log(
      `[${timestamp.toISOString()}] Пир отключился: ${peerId} (Сессия: ${Math.round(
        sessionDuration / 1000
      )}с)`
    );
  } else {
    console.log(`[${timestamp.toISOString()}] Пир отключился: ${peerId}`);
  }

  console.log(`Активных подключений: ${connectionStats.activeConnections}`);
});

peerServer.on('error', (error) => {
  console.error(`[${new Date().toISOString()}] Ошибка PeerJS сервера:`, error);
});

// API маршруты для мониторинга
app.get('/api/stats', (req, res) => {
  const uptime = Date.now() - connectionStats.startTime.getTime();

  res.json({
    ...connectionStats,
    uptime: Math.round(uptime / 1000), // в секундах
    activePeers: Array.from(activePeers.values()),
    serverConfig: {
      port: config.port,
      host: config.host,
      path: config.path,
      environment: process.env.NODE_ENV,
    },
  });
});

app.get('/api/peers', (req, res) => {
  res.json({
    count: activePeers.size,
    peers: Array.from(activePeers.values()),
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    activeConnections: connectionStats.activeConnections,
    uptime: Math.round(
      (Date.now() - connectionStats.startTime.getTime()) / 1000
    ),
  });
});

// Запуск сервера
const server = app.listen(config.port + 1, config.host, () => {
  console.log('='.repeat(60));
  console.log('🚀 PeerJS сервер для видеоконференций запущен!');
  console.log('='.repeat(60));
  console.log(`📡 PeerJS сервер: ${config.host}:${config.port}${config.path}`);
  console.log(`📊 API мониторинга: ${config.host}:${config.port + 1}`);
  console.log(`🌍 Окружение: ${process.env.NODE_ENV || 'development'}`);
  console.log(
    `🔗 CORS разрешен для: ${
      Array.isArray(config.corsOrigin)
        ? config.corsOrigin.join(', ')
        : config.corsOrigin
    }`
  );
  console.log(`🔧 Отладка: уровень ${config.debug}`);
  console.log('='.repeat(60));
  console.log('📋 Доступные API маршруты:');
  console.log(`   GET  /api/health  - Проверка состояния сервера`);
  console.log(`   GET  /api/stats   - Статистика подключений`);
  console.log(`   GET  /api/peers   - Список активных пиров`);
  console.log('='.repeat(60));
});

// Обработка сигналов завершения
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

function gracefulShutdown(signal) {
  console.log(
    `\n[${new Date().toISOString()}] Получен сигнал ${signal}, завершаем работу...`
  );

  // Закрываем HTTP сервер
  server.close(() => {
    console.log('HTTP сервер закрыт');
  });

  // Закрываем PeerJS сервер
  if (peerServer && peerServer.close) {
    peerServer.close(() => {
      console.log('PeerJS сервер закрыт');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
}

// Обработка необработанных ошибок
process.on('uncaughtException', (error) => {
  console.error(`[${new Date().toISOString()}] Необработанная ошибка:`, error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error(
    `[${new Date().toISOString()}] Необработанное отклонение промиса:`,
    reason
  );
  console.error('Промис:', promise);
});

// Периодическое логирование статистики (каждые 5 минут)
setInterval(() => {
  const uptime = Math.round(
    (Date.now() - connectionStats.startTime.getTime()) / 1000
  );
  console.log(
    `[${new Date().toISOString()}] Статистика: ${
      connectionStats.activeConnections
    } активных, ${
      connectionStats.totalConnections
    } всего, время работы: ${uptime}с`
  );
}, 5 * 60 * 1000);

module.exports = { peerServer, app, connectionStats };
