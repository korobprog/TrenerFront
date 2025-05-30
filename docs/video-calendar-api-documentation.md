# Документация API видео-календаря

## Обзор

Данная документация описывает API эндпоинты для системы видео-календаря, которые обеспечивают управление календарными событиями, видеокомнатами и уведомлениями.

## Базовая информация

- **Базовый URL**: `/api/custom/`
- **Аутентификация**: NextAuth.js сессии
- **Формат данных**: JSON
- **Кодировка**: UTF-8

## Структура ответов

### Успешный ответ

```json
{
  "success": true,
  "data": { ... },
  "message": "Описание операции"
}
```

### Ошибка

```json
{
  "success": false,
  "error": "Описание ошибки",
  "details": "Дополнительная информация (только в dev режиме)"
}
```

## API эндпоинты

### 1. Календарные события (`/api/custom/calendar-events.js`)

#### GET - Получение событий пользователя

**URL**: `/api/custom/calendar-events`

**Параметры запроса**:

- `startDate` (опционально) - Дата начала периода (ISO 8601)
- `endDate` (опционально) - Дата окончания периода (ISO 8601)
- `eventType` (опционально) - Тип события (`meeting`, `interview`, `personal`, `other`)

**Пример запроса**:

```
GET /api/custom/calendar-events?startDate=2025-05-01&endDate=2025-05-31&eventType=meeting
```

**Ответ**:

```json
{
  "success": true,
  "data": [
    {
      "id": "event_id",
      "title": "Название события",
      "description": "Описание",
      "startTime": "2025-05-30T10:00:00.000Z",
      "endTime": "2025-05-30T11:00:00.000Z",
      "eventType": "meeting",
      "isRecurring": false,
      "recurringPattern": null,
      "recurringEndDate": null,
      "videoRoom": {
        "id": "room_id",
        "code": "ABC12345",
        "name": "Комната для встречи",
        "isActive": true
      },
      "mockInterview": null,
      "user": {
        "id": "user_id",
        "name": "Имя пользователя",
        "email": "user@example.com"
      }
    }
  ],
  "message": "События успешно получены"
}
```

#### POST - Создание нового события

**URL**: `/api/custom/calendar-events`

**Тело запроса**:

```json
{
  "title": "Название события",
  "description": "Описание события",
  "startTime": "2025-05-30T10:00:00.000Z",
  "endTime": "2025-05-30T11:00:00.000Z",
  "eventType": "meeting",
  "videoRoomId": "room_id",
  "mockInterviewId": "interview_id",
  "isRecurring": false,
  "recurringPattern": "weekly",
  "recurringEndDate": "2025-12-31T23:59:59.000Z"
}
```

**Обязательные поля**: `title`, `startTime`, `endTime`

#### PUT - Обновление события

**URL**: `/api/custom/calendar-events`

**Тело запроса**:

```json
{
  "id": "event_id",
  "title": "Новое название",
  "description": "Новое описание",
  "startTime": "2025-05-30T10:00:00.000Z",
  "endTime": "2025-05-30T11:00:00.000Z",
  "eventType": "interview"
}
```

**Обязательные поля**: `id`

#### DELETE - Удаление события

**URL**: `/api/custom/calendar-events`

**Тело запроса**:

```json
{
  "id": "event_id"
}
```

---

### 2. Видеокомнаты - список (`/api/custom/rooms/index.js`)

#### GET - Получение списка комнат

**URL**: `/api/custom/rooms`

**Параметры запроса**:

- `status` (опционально) - Статус комнат (`active`, `scheduled`, `ended`)

**Пример запроса**:

```
GET /api/custom/rooms?status=active
```

**Ответ**:

```json
{
  "success": true,
  "data": [
    {
      "id": "room_id",
      "code": "ABC12345",
      "name": "Моя комната",
      "description": "Описание комнаты",
      "isActive": true,
      "maxParticipants": 10,
      "requiresPassword": false,
      "scheduledStart": "2025-05-30T10:00:00.000Z",
      "scheduledEnd": "2025-05-30T11:00:00.000Z",
      "actualStart": null,
      "actualEnd": null,
      "host": {
        "id": "user_id",
        "name": "Имя хоста",
        "email": "host@example.com"
      },
      "participantCount": 3,
      "participants": [
        {
          "id": "participant_id",
          "user": {
            "id": "user_id",
            "name": "Участник",
            "email": "participant@example.com"
          },
          "role": "participant",
          "joinedAt": "2025-05-30T10:05:00.000Z",
          "audioEnabled": true,
          "videoEnabled": true
        }
      ],
      "calendarEvents": [],
      "isHost": true
    }
  ],
  "message": "Список комнат успешно получен"
}
```

#### POST - Создание новой видеокомнаты

**URL**: `/api/custom/rooms`

**Тело запроса**:

```json
{
  "name": "Название комнаты",
  "description": "Описание комнаты",
  "maxParticipants": 10,
  "requiresPassword": true,
  "password": "1234",
  "scheduledStart": "2025-05-30T10:00:00.000Z",
  "scheduledEnd": "2025-05-30T11:00:00.000Z"
}
```

**Обязательные поля**: `name`

**Ответ**:

```json
{
  "success": true,
  "data": {
    "id": "room_id",
    "code": "ABC12345",
    "name": "Название комнаты",
    "description": "Описание комнаты",
    "isActive": true,
    "maxParticipants": 10,
    "requiresPassword": true,
    "scheduledStart": "2025-05-30T10:00:00.000Z",
    "scheduledEnd": "2025-05-30T11:00:00.000Z",
    "host": {
      "id": "user_id",
      "name": "Имя пользователя",
      "email": "user@example.com"
    },
    "isHost": true,
    "joinUrl": "http://localhost:3000/video-room/ABC12345"
  },
  "message": "Видеокомната успешно создана"
}
```

---

### 3. Конкретная видеокомната (`/api/custom/rooms/[code].js`)

#### GET - Получение информации о комнате

**URL**: `/api/custom/rooms/{code}`

**Параметры запроса**:

- `password` (опционально) - Пароль для входа в комнату

**Пример запроса**:

```
GET /api/custom/rooms/ABC12345?password=1234
```

**Ответ**:

```json
{
  "success": true,
  "data": {
    "id": "room_id",
    "code": "ABC12345",
    "name": "Название комнаты",
    "description": "Описание",
    "isActive": true,
    "maxParticipants": 10,
    "requiresPassword": true,
    "scheduledStart": "2025-05-30T10:00:00.000Z",
    "scheduledEnd": "2025-05-30T11:00:00.000Z",
    "actualStart": "2025-05-30T10:02:00.000Z",
    "actualEnd": null,
    "host": {
      "id": "host_id",
      "name": "Хост",
      "email": "host@example.com"
    },
    "participantCount": 3,
    "participants": [
      {
        "id": "participant_id",
        "user": {
          "id": "user_id",
          "name": "Участник",
          "email": "participant@example.com"
        },
        "role": "participant",
        "joinedAt": "2025-05-30T10:05:00.000Z",
        "audioEnabled": true,
        "videoEnabled": true,
        "screenSharing": false
      }
    ],
    "chatMessages": [
      {
        "id": "message_id",
        "message": "Привет всем!",
        "messageType": "text",
        "user": {
          "id": "user_id",
          "name": "Участник"
        },
        "createdAt": "2025-05-30T10:06:00.000Z"
      }
    ],
    "calendarEvents": [],
    "isHost": false,
    "isParticipant": true,
    "canJoin": true
  },
  "message": "Информация о комнате получена"
}
```

#### PUT - Обновление настроек комнаты

**URL**: `/api/custom/rooms/{code}`

**Тело запроса**:

```json
{
  "name": "Новое название",
  "description": "Новое описание",
  "maxParticipants": 15,
  "requiresPassword": false,
  "scheduledEnd": "2025-05-30T12:00:00.000Z"
}
```

**Примечание**: Только хост может изменять настройки комнаты.

#### DELETE - Закрытие комнаты

**URL**: `/api/custom/rooms/{code}`

**Примечание**: Только хост может закрыть комнату. Комната деактивируется, все участники помечаются как покинувшие.

---

### 4. Уведомления (`/api/custom/notifications.js`)

#### GET - Получение настроек уведомлений

**URL**: `/api/custom/notifications`

**Ответ**:

```json
{
  "success": true,
  "data": {
    "preferences": {
      "emailNotifications": true,
      "pushNotifications": true,
      "reminderMinutes": 15,
      "timezone": "Europe/Moscow",
      "defaultCalendarView": "month",
      "workingHoursStart": 9,
      "workingHoursEnd": 18
    },
    "pushSubscriptions": [
      {
        "id": "subscription_id",
        "endpoint": "https://fcm.googleapis.com/fcm/send/...",
        "userAgent": "Mozilla/5.0...",
        "createdAt": "2025-05-30T10:00:00.000Z"
      }
    ],
    "subscriptionCount": 1
  },
  "message": "Настройки уведомлений получены"
}
```

#### POST - Подписка на push уведомления

**URL**: `/api/custom/notifications`

**Тело запроса**:

```json
{
  "endpoint": "https://fcm.googleapis.com/fcm/send/...",
  "p256dh": "p256dh_key",
  "auth": "auth_key",
  "userAgent": "Mozilla/5.0..."
}
```

**Обязательные поля**: `endpoint`, `p256dh`, `auth`

#### PUT - Обновление настроек уведомлений

**URL**: `/api/custom/notifications`

**Тело запроса**:

```json
{
  "emailNotifications": true,
  "pushNotifications": false,
  "reminderMinutes": 30,
  "timezone": "Europe/Moscow",
  "defaultCalendarView": "week",
  "workingHoursStart": 8,
  "workingHoursEnd": 19
}
```

#### DELETE - Отписка от уведомлений

**URL**: `/api/custom/notifications`

**Тело запроса**:

```json
{
  "endpoint": "https://fcm.googleapis.com/fcm/send/..."
}
```

**Обязательные поля**: `endpoint`

---

## Коды ошибок

- **400** - Неверные параметры запроса
- **401** - Не авторизован
- **403** - Нет прав доступа
- **404** - Ресурс не найден
- **405** - Метод не поддерживается
- **409** - Конфликт (например, дублирование)
- **410** - Ресурс больше не доступен
- **423** - Ресурс заблокирован (комната заполнена)
- **425** - Слишком рано (комната еще не открыта)
- **500** - Внутренняя ошибка сервера

## Валидация данных

### Календарные события

- `title`: обязательно, не пустое
- `startTime`, `endTime`: обязательно, корректный ISO 8601 формат
- `endTime` должно быть позже `startTime`
- `eventType`: один из `meeting`, `interview`, `personal`, `other`

### Видеокомнаты

- `name`: обязательно, не пустое
- `maxParticipants`: от 2 до 50
- `password`: минимум 4 символа (если `requiresPassword = true`)
- `scheduledStart`: должно быть в будущем
- `scheduledEnd`: должно быть позже `scheduledStart`

### Уведомления

- `reminderMinutes`: от 0 до 1440 (24 часа)
- `workingHoursStart`: от 0 до 23
- `workingHoursEnd`: от 1 до 24, больше `workingHoursStart`
- `defaultCalendarView`: один из `month`, `week`, `day`

## Безопасность

- Все эндпоинты требуют аутентификации через NextAuth.js
- Пользователи могут управлять только своими данными
- Хосты видеокомнат имеют полные права, участники - ограниченные
- Пароли комнат не возвращаются в ответах API
- Подписки на уведомления привязаны к конкретному пользователю

## Логирование

Все ошибки логируются в консоль сервера с подробной информацией для отладки. В production режиме детали ошибок не передаются клиенту.

## Интеграция с базой данных

API использует Prisma ORM для работы с PostgreSQL базой данных. Все операции выполняются в транзакциях для обеспечения целостности данных.

## Примеры использования

### Создание события с видеокомнатой

1. Создать видеокомнату через `POST /api/custom/rooms`
2. Получить `id` созданной комнаты из ответа
3. Создать календарное событие через `POST /api/custom/calendar-events` с указанием `videoRoomId`

### Подключение к существующей комнате

1. Получить информацию о комнате через `GET /api/custom/rooms/{code}`
2. При необходимости указать пароль в параметрах запроса
3. Пользователь автоматически добавляется как участник при успешном запросе

### Настройка уведомлений

1. Получить текущие настройки через `GET /api/custom/notifications`
2. Обновить настройки через `PUT /api/custom/notifications`
3. Подписаться на push уведомления через `POST /api/custom/notifications`
