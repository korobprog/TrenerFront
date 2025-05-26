# Документация по автоматизации создания ссылок на Google Meet

## Обзор

Данная документация описывает процесс автоматического создания ссылок на Google Meet для собеседований в системе. Автоматизация позволяет избежать ручного создания ссылок и обеспечивает более удобный пользовательский опыт.

## Режимы работы

### Режим разработки

В режиме разработки (`NODE_ENV=development`) система не создает реальные события в Google Calendar и не генерирует настоящие ссылки на Google Meet. Вместо этого используется тестовая ссылка:

```
https://meet.google.com/test-mock-link
```

Это позволяет тестировать функциональность без создания реальных событий в Google Calendar.

### Производственный режим

В производственном режиме (`NODE_ENV=production`) система создает реальные события в Google Calendar с автоматической генерацией ссылок на Google Meet.

## Технические детали реализации

### Процесс создания ссылки

1. Пользователь выбирает дату и время собеседования
2. Фронтенд отправляет запрос на создание собеседования в API
3. API вызывает функцию `createCalendarEvent` из модуля `lib/utils/googleCalendar.js`
4. Функция создает событие в Google Calendar с параметром `conferenceData`
5. Google Calendar API возвращает данные события, включая ссылку на Google Meet
6. API сохраняет ссылку в базе данных в поле `meetingLink` модели `MockInterview`
7. Фронтенд отображает созданное собеседование с ссылкой на Google Meet

### Ключевые компоненты

#### 1. Функция `createCalendarEvent`

Расположена в файле `lib/utils/googleCalendar.js`. Отвечает за создание события в Google Calendar с автоматическим созданием ссылки на Google Meet.

```javascript
async function createCalendarEvent(interviewer, interviewee, interview) {
  // В режиме разработки возвращает тестовую ссылку
  if (process.env.NODE_ENV === 'development') {
    const mockMeetingLink = 'https://meet.google.com/test-mock-link';
    return {
      success: true,
      message: 'Calendar event would be created in production',
      mockEventId: `mock-event-${interview.id}`,
      meetingLink: mockMeetingLink,
    };
  }

  // В производственном режиме создает реальное событие
  // с автоматической генерацией ссылки на Google Meet
  // ...
}
```

#### 2. API-эндпоинт для создания собеседований

Расположен в файле `pages/api/mock-interviews/index.js`. Обрабатывает POST-запросы на создание новых собеседований и вызывает функцию `createCalendarEvent`.

#### 3. Компонент создания собеседования

Расположен в файле `pages/mock-interviews/new.js`. Предоставляет интерфейс для выбора даты и времени собеседования.

#### 4. Компонент деталей собеседования

Расположен в файле `pages/mock-interviews/[id]/index.js`. Отображает детали собеседования, включая ссылку на Google Meet.

## Настройка и конфигурация

### Переменные окружения

Для работы с Google Calendar API необходимо настроить следующие переменные окружения:

```
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/callback/google
GOOGLE_ACCESS_TOKEN=your-access-token
GOOGLE_REFRESH_TOKEN=your-refresh-token
GOOGLE_TOKEN_EXPIRY=token-expiry-timestamp
```

### Запуск в производственном режиме

Для запуска приложения в производственном режиме выполните следующие команды:

```bash
# Сборка приложения
npm run build

# Запуск в производственном режиме
npm start
```

## Расширение функциональности

### Поддержка альтернативных платформ

В будущем планируется добавить поддержку альтернативных платформ для видеоконференций:

1. **Zoom**

   - Требует регистрации приложения в Zoom Marketplace
   - Использует JWT или OAuth для аутентификации
   - API для создания встреч: `https://api.zoom.us/v2/users/{userId}/meetings`

2. **Microsoft Teams**
   - Требует регистрации приложения в Microsoft Azure
   - Использует Microsoft Graph API
   - Требует разрешений на создание онлайн-встреч

### Изменения в схеме базы данных

Для поддержки нескольких платформ потребуется изменить модель `MockInterview`:

```prisma
model MockInterview {
  // Существующие поля...
  meetingLink        String
  meetingPlatform    String  @default("google_meet") // "google_meet", "zoom", "teams", "other"
  // Опционально - хранить ссылки для всех платформ
  zoomMeetingLink    String?
  teamsMeetingLink   String?
  // Остальные поля...
}
```

## Отладка и тестирование

### Тестирование автоматизации

Для тестирования автоматизации создания ссылок на Google Meet используйте скрипты:

- Windows: `scripts/test-meet-automation.bat`
- Linux/Mac: `scripts/test-meet-automation.sh`

Эти скрипты запустят сервер разработки и откроют страницу создания нового собеседования.

### Проверка логов

В консоли сервера должны отображаться следующие логи:

```
API: Создание события в Google Calendar
API: Данные интервьюера: { id: '...', name: '...', email: '...' }
API: Данные интервьюируемого: { id: null, name: 'TBD', email: 'tbd@example.com' }
API: Данные собеседования: { id: 'temp-...', scheduledTime: '...' }

Calendar: В режиме разработки событие не создается
Calendar: Тестовая ссылка на Google Meet: https://meet.google.com/test-mock-link

API: Результат создания события: {
  success: true,
  message: 'Calendar event would be created in production',
  mockEventId: 'mock-event-...',
  meetingLink: 'https://meet.google.com/test-mock-link'
}
API: Получена ссылка на Google Meet: https://meet.google.com/test-mock-link
```

### Отладка возможных проблем

#### Если ссылка на Google Meet не создается:

1. Проверьте логи сервера на наличие ошибок
2. Убедитесь, что в режиме разработки функция `createCalendarEvent` возвращает тестовую ссылку
3. Проверьте, что в API-эндпоинте `pages/api/mock-interviews/index.js` правильно обрабатывается результат функции `createCalendarEvent`

#### Если API возвращает ошибку:

1. Проверьте, что учетная запись Google имеет доступ к Google Calendar API
2. Проверьте, что в `.env.local` файле правильно настроены переменные окружения
3. Проверьте, что токены доступа не истекли и правильно обновляются

## Заключение

Автоматизация создания ссылок на Google Meet значительно упрощает процесс организации собеседований и улучшает пользовательский опыт. В режиме разработки используется тестовая ссылка, а в производственном режиме создаются реальные события в Google Calendar с автоматической генерацией ссылок на Google Meet.
