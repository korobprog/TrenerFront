# Реализация API логики для выбора типа собеседования

## Обзор изменений

Реализована недостающая API логика для обработки выбора типа собеседования в файле `pages/api/mock-interviews/index.js`. Теперь API поддерживает создание как встроенных видеокомнат, так и интеграцию с Google Meet.

## Внесенные изменения

### 1. Обновление POST handler в `pages/api/mock-interviews/index.js`

#### Добавлена валидация videoType:

- Принимает параметр `videoType` из тела запроса (по умолчанию 'google_meet')
- Валидирует, что videoType может быть только 'google_meet' или 'built_in'
- Возвращает ошибку 400 при недопустимом значении

#### Реализована условная логика:

**Для videoType === 'built_in':**

- Создает VideoRoom через внутренний API `/api/video-conferences`
- Устанавливает параметры:
  - `maxParticipants: 2`
  - `isPrivate: true`
  - `name: "Собеседование {дата}"`
  - `scheduledStart: время интервью`
  - `recordingEnabled: false`
  - `settings: { allowScreenShare: true, allowChat: true, autoRecord: false }`
- Генерирует meetingLink в формате: `/video-conferences/rooms/{roomCode}`

**Для videoType === 'google_meet':**

- Использует существующую логику Google Calendar
- Поддерживает ручные ссылки и автоматическое создание

#### Обновлено создание MockInterview:

- Добавлено поле `videoType`
- Добавлено поле `videoRoomId` (если создана встроенная комната)
- Добавлена связь с VideoRoom через Prisma relation
- Включена информация о видеокомнате в ответ API

#### Добавлена обработка ошибок:

- Fallback на Google Meet при проблемах с созданием VideoRoom
- Детальное логирование ошибок
- Информативные сообщения об ошибках для фронтенда

### 2. Исправления в `pages/api/video-conferences.js`

- Исправлено несоответствие полей: `roomCode` → `code`
- Исправлены поля времени: `scheduledStartTime` → `scheduledStart`, `scheduledEndTime` → `scheduledEnd`
- Обновлено логирование для соответствия схеме базы данных

### 3. Обновление схемы базы данных `prisma/schema.prisma`

Добавлены недостающие поля в модель VideoRoom:

- `isPrivate: Boolean @default(false)`
- `recordingEnabled: Boolean @default(false)`
- `settings: Json?`

## Инструкции по тестированию

### 1. Подготовка к тестированию

```bash
# Применить изменения схемы базы данных
npx prisma db push

# Или создать и применить миграцию
npx prisma migrate dev --name add-video-room-fields

# Перезапустить сервер разработки
npm run dev
```

### 2. Тестирование создания собеседования с встроенной видеосистемой

**Запрос:**

```javascript
POST /api/mock-interviews
Content-Type: application/json

{
  "scheduledTime": "2025-05-31T15:00:00.000Z",
  "videoType": "built_in"
}
```

**Ожидаемый ответ:**

```javascript
{
  "id": "interview_id",
  "interviewerId": "user_id",
  "scheduledTime": "2025-05-31T15:00:00.000Z",
  "meetingLink": "http://localhost:3000/video-conferences/rooms/ABCD1234",
  "status": "pending",
  "videoType": "built_in",
  "videoRoomId": "room_id",
  "videoRoom": {
    "id": "room_id",
    "code": "ABCD1234",
    "name": "Собеседование 31.05.2025",
    "isActive": true
  },
  "isManualLink": false,
  // ... другие поля
}
```

### 3. Тестирование создания собеседования с Google Meet

**Запрос:**

```javascript
POST /api/mock-interviews
Content-Type: application/json

{
  "scheduledTime": "2025-05-31T15:00:00.000Z",
  "videoType": "google_meet"
}
```

**Ожидаемый ответ:**

```javascript
{
  "id": "interview_id",
  "interviewerId": "user_id",
  "scheduledTime": "2025-05-31T15:00:00.000Z",
  "meetingLink": "https://meet.google.com/xxx-xxxx-xxx",
  "status": "pending",
  "videoType": "google_meet",
  "videoRoomId": null,
  "calendarEventId": "calendar_event_id",
  "isManualLink": false,
  // ... другие поля
}
```

### 4. Тестирование fallback механизма

Для тестирования fallback на Google Meet при ошибке создания VideoRoom:

1. Временно отключите API video-conferences
2. Создайте собеседование с `videoType: "built_in"`
3. Убедитесь, что система переключается на Google Meet
4. Проверьте логи на предупреждения о fallback

### 5. Тестирование валидации

**Тест недопустимого videoType:**

```javascript
POST /api/mock-interviews
Content-Type: application/json

{
  "scheduledTime": "2025-05-31T15:00:00.000Z",
  "videoType": "invalid_type"
}
```

**Ожидаемый ответ:**

```javascript
{
  "message": "Недопустимый тип видеосвязи. Допустимые значения: google_meet, built_in"
}
```

### 6. Проверка интеграции с фронтендом

1. Убедитесь, что компонент `InterviewTypeSelector` передает правильный `videoType`
2. Проверьте, что форма создания собеседования отправляет новый параметр
3. Убедитесь, что созданные собеседования отображаются с правильными ссылками

## Логирование и отладка

Все ключевые операции логируются с префиксом "API:":

- Обработка типа видеосвязи
- Создание видеокомнат
- Fallback операции
- Ошибки и предупреждения

Для отладки проверьте консоль сервера на наличие сообщений:

- `API: Обработка типа видеосвязи: built_in`
- `API: Создание встроенной видеокомнаты`
- `API: Видеокомната создана успешно`
- `API: Переключение на Google Meet как fallback`

## Совместимость

- ✅ Сохранена вся существующая функциональность Google Meet
- ✅ Обратная совместимость с существующими собеседованиями
- ✅ Поддержка ручных ссылок Google Meet
- ✅ Fallback механизм при ошибках

## Следующие шаги

1. Протестировать интеграцию с фронтендом
2. Добавить unit тесты для новой логики
3. Обновить документацию API
4. Рассмотреть добавление метрик для отслеживания использования типов видеосвязи
