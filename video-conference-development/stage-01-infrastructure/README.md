# Этап 1: Подготовка инфраструктуры для видеоконференций

## 🎯 Цели и задачи этапа

Подготовка базовой инфраструктуры для интеграции системы видеоконференций в существующую платформу тренировочных собеседований SuperMock.

### Основные цели:

- Настройка WebRTC инфраструктуры для peer-to-peer видеосвязи
- Интеграция Socket.io для real-time коммуникации
- Расширение схемы базы данных для поддержки видеоконференций
- Настройка календарной системы для планирования видеосессий
- Подготовка системы уведомлений для видеоконференций
- Конфигурация STUN/TURN серверов для NAT traversal

## 📋 Детальный план задач

### 1. Установка и настройка зависимостей

#### 1.1 Основные зависимости для видеоконференций

```bash
npm install peerjs socket.io socket.io-client
```

#### 1.2 Календарная интеграция

```bash
npm install react-big-calendar moment
```

#### 1.3 Система уведомлений

```bash
npm install node-cron web-push
```

#### 1.4 Дополнительные утилиты

```bash
npm install uuid simple-peer
```

### 2. Обновление схемы базы данных

#### 2.1 Модель UserPreferences

Настройки пользователя для видеоконференций:

```prisma
model UserPreferences {
  id                    String   @id @default(cuid())
  userId                String   @unique
  videoEnabled          Boolean  @default(true)
  audioEnabled          Boolean  @default(true)
  screenShareEnabled    Boolean  @default(true)
  autoJoinEnabled       Boolean  @default(false)
  notificationsEnabled  Boolean  @default(true)
  preferredVideoQuality String   @default("720p") // 480p, 720p, 1080p
  preferredAudioQuality String   @default("high")  // low, medium, high
  timezone              String   @default("UTC")
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
  user                  User     @relation(fields: [userId], references: [id])
}
```

#### 2.2 Модель CustomCalendarEvent

Кастомные календарные события для видеоконференций:

```prisma
model CustomCalendarEvent {
  id                String    @id @default(cuid())
  userId            String
  title             String
  description       String?
  startTime         DateTime
  endTime           DateTime
  isVideoConference Boolean   @default(false)
  videoRoomId       String?
  meetingLink       String?
  status            String    @default("scheduled") // scheduled, active, completed, cancelled
  participants      Json?     // Массив участников
  reminderSent      Boolean   @default(false)
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
  user              User      @relation(fields: [userId], references: [id])
  videoRoom         VideoRoom? @relation(fields: [videoRoomId], references: [id])
}
```

#### 2.3 Модель VideoRoom

Комнаты для видеоконференций:

```prisma
model VideoRoom {
  id                String                @id @default(cuid())
  roomName          String                @unique
  hostId            String
  isActive          Boolean               @default(false)
  maxParticipants   Int                   @default(10)
  isRecording       Boolean               @default(false)
  recordingUrl      String?
  settings          Json?                 // Настройки комнаты
  createdAt         DateTime              @default(now())
  updatedAt         DateTime              @updatedAt
  host              User                  @relation(fields: [hostId], references: [id])
  participants      VideoRoomParticipant[]
  calendarEvents    CustomCalendarEvent[]
  chatMessages      VideoRoomChatMessage[]
}

model VideoRoomParticipant {
  id            String    @id @default(cuid())
  videoRoomId   String
  userId        String
  joinedAt      DateTime  @default(now())
  leftAt        DateTime?
  isHost        Boolean   @default(false)
  isMuted       Boolean   @default(false)
  isVideoOff    Boolean   @default(false)
  peerId        String?   // PeerJS ID
  videoRoom     VideoRoom @relation(fields: [videoRoomId], references: [id])
  user          User      @relation(fields: [userId], references: [id])

  @@unique([videoRoomId, userId])
}

model VideoRoomChatMessage {
  id          String    @id @default(cuid())
  videoRoomId String
  userId      String
  message     String
  timestamp   DateTime  @default(now())
  messageType String    @default("text") // text, system, file
  videoRoom   VideoRoom @relation(fields: [videoRoomId], references: [id])
  user        User      @relation(fields: [userId], references: [id])
}
```

### 3. Настройка переменных окружения

Добавить в `.env.development` и `.env.production`:

```env
# WebRTC Configuration
STUN_SERVER_URL=stun:stun.l.google.com:19302
TURN_SERVER_URL=turn:your-turn-server.com:3478
TURN_USERNAME=your-turn-username
TURN_CREDENTIAL=your-turn-password

# PeerJS Server Configuration
PEERJS_HOST=localhost
PEERJS_PORT=9000
PEERJS_PATH=/peerjs

# Socket.io Configuration
SOCKET_IO_PORT=3001
SOCKET_IO_CORS_ORIGIN=http://localhost:3000

# Video Conference Settings
MAX_PARTICIPANTS_PER_ROOM=10
DEFAULT_VIDEO_QUALITY=720p
RECORDING_ENABLED=false
RECORDING_STORAGE_PATH=/recordings

# Notification Settings
WEB_PUSH_VAPID_PUBLIC_KEY=your-vapid-public-key
WEB_PUSH_VAPID_PRIVATE_KEY=your-vapid-private-key
WEB_PUSH_CONTACT_EMAIL=admin@yourdomain.com

# Calendar Integration
CALENDAR_REMINDER_MINUTES=15
CALENDAR_TIMEZONE=Europe/Moscow
```

### 4. Конфигурация STUN/TURN серверов

#### 4.1 Бесплатные STUN серверы

```javascript
const iceServers = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun.stunprotocol.org:3478' },
];
```

#### 4.2 Настройка TURN сервера (для production)

```javascript
const iceServers = [
  { urls: 'stun:stun.l.google.com:19302' },
  {
    urls: 'turn:your-turn-server.com:3478',
    username: process.env.TURN_USERNAME,
    credential: process.env.TURN_CREDENTIAL,
  },
];
```

### 5. Структура файлов проекта

```
video-conference-development/
├── stage-01-infrastructure/
│   ├── api/
│   │   ├── socket-server.js          # Socket.io сервер
│   │   ├── peerjs-server.js          # PeerJS сервер
│   │   ├── video-rooms.js            # API для управления комнатами
│   │   └── calendar-events.js        # API для календарных событий
│   ├── components/
│   │   ├── VideoConference/
│   │   │   ├── VideoRoom.js          # Основной компонент видеокомнаты
│   │   │   ├── ParticipantVideo.js   # Компонент видео участника
│   │   │   ├── ControlPanel.js       # Панель управления
│   │   │   └── ChatPanel.js          # Панель чата
│   │   ├── Calendar/
│   │   │   ├── VideoCalendar.js      # Календарь с видеособытиями
│   │   │   └── EventModal.js         # Модальное окно события
│   │   └── Notifications/
│   │       └── VideoNotifications.js # Компонент уведомлений
│   ├── lib/
│   │   ├── webrtc-config.js          # Конфигурация WebRTC
│   │   ├── socket-client.js          # Socket.io клиент
│   │   └── notification-service.js   # Сервис уведомлений
│   └── styles/
│       ├── VideoConference.module.css
│       ├── Calendar.module.css
│       └── Notifications.module.css
```

### 6. Миграция базы данных

Создать файл миграции:

```bash
npx prisma migrate dev --name add_video_conference_models
```

### 7. Настройка Socket.io сервера

Создать отдельный процесс для Socket.io:

```javascript
// api/socket-server.js
const { Server } = require('socket.io');
const http = require('http');

const server = http.createServer();
const io = new Server(server, {
  cors: {
    origin: process.env.SOCKET_IO_CORS_ORIGIN,
    methods: ['GET', 'POST'],
  },
});

// Обработчики событий видеоконференций
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-room', (roomId, userId) => {
    socket.join(roomId);
    socket.to(roomId).emit('user-connected', userId);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

server.listen(process.env.SOCKET_IO_PORT || 3001);
```

## ✅ Критерии завершения этапа

### Обязательные критерии:

- [ ] Все зависимости установлены и настроены
- [ ] Схема базы данных обновлена с новыми моделями
- [ ] Миграция базы данных выполнена успешно
- [ ] Переменные окружения настроены
- [ ] STUN/TURN серверы сконфигурированы
- [ ] Socket.io сервер запускается без ошибок
- [ ] PeerJS сервер настроен и функционирует
- [ ] Базовая структура компонентов создана
- [ ] Система уведомлений инициализирована

### Дополнительные критерии:

- [ ] Документация API создана
- [ ] Тесты для новых моделей написаны
- [ ] Логирование настроено
- [ ] Мониторинг производительности подключен

## 🔧 Команды для запуска

### Установка зависимостей:

```bash
npm install peerjs socket.io socket.io-client react-big-calendar moment node-cron web-push uuid simple-peer
```

### Миграция базы данных:

```bash
npx prisma migrate dev --name add_video_conference_models
npx prisma generate
```

### Запуск серверов:

```bash
# Основное приложение
npm run dev

# Socket.io сервер (в отдельном терминале)
node video-conference-development/stage-01-infrastructure/api/socket-server.js

# PeerJS сервер (в отдельном терминале)
node video-conference-development/stage-01-infrastructure/api/peerjs-server.js
```

## 📊 Мониторинг прогресса

Прогресс этапа отслеживается в файле [`progress.md`](./progress.md).

## 🔄 Откат изменений

В случае необходимости отката, следуйте инструкциям в файле [`rollback.md`](./rollback.md).

## 📝 Примечания

- Этап является фундаментальным для всей системы видеоконференций
- Все изменения должны быть совместимы с существующей системой
- Обязательно создавайте резервные копии перед началом работы
- Тестируйте каждый компонент отдельно перед интеграцией

## 🔗 Связанные документы

- [Общая архитектура](../docs/architecture-overview.md)
- [Руководство по резервному копированию](../docs/backup-restore-guide.md)
- [Workflow разработки](../docs/development-workflow.md)

---

**Статус:** 🔄 Готов к началу  
**Приоритет:** Высокий  
**Ожидаемое время выполнения:** 3-5 дней
