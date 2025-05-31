# Краткое руководство: Система выбора типа собеседования

## Быстрый старт

Система выбора типа собеседования позволяет пользователям выбирать между Google Meet и встроенной видеосистемой при создании mock-интервью.

### Основные компоненты

```javascript
// Компонент выбора типа
import InterviewTypeSelector from '../../components/interview/InterviewTypeSelector';

// Использование в странице создания интервью
<InterviewTypeSelector
  selectedType={videoType}
  onTypeSelect={setVideoType}
  onNext={handleNextStep}
/>;
```

## Примеры использования

### 1. Создание интервью с Google Meet

```javascript
const createGoogleMeetInterview = async () => {
  const response = await fetch('/api/mock-interviews', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      scheduledTime: '2025-05-30T15:00:00.000Z',
      videoType: 'google_meet',
    }),
  });

  const interview = await response.json();
  console.log('Google Meet ссылка:', interview.meetingLink);
};
```

### 2. Создание интервью со встроенной видеосистемой

```javascript
const createBuiltInInterview = async () => {
  const response = await fetch('/api/mock-interviews', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      scheduledTime: '2025-05-30T15:00:00.000Z',
      videoType: 'built_in',
    }),
  });

  const interview = await response.json();
  console.log('Видеокомната:', interview.videoRoom);
  console.log('Ссылка на комнату:', interview.meetingLink);
};
```

### 3. Получение интервью с типами

```javascript
const getInterviewsWithTypes = async () => {
  const response = await fetch('/api/mock-interviews');
  const interviews = await response.json();

  interviews.forEach((interview) => {
    console.log(`Интервью ${interview.id}:`);
    console.log(`  Тип: ${interview.videoType}`);
    console.log(`  Ссылка: ${interview.meetingLink}`);

    if (interview.videoRoom) {
      console.log(`  Видеокомната: ${interview.videoRoom.code}`);
    }
  });
};
```

## Структура данных

### MockInterview модель

```prisma
model MockInterview {
  id              String    @id @default(cuid())
  scheduledTime   DateTime
  meetingLink     String?
  videoType       String?   @default("google_meet") // google_meet, built_in
  videoRoomId     String?   // Связь с VideoRoom
  calendarEventId String?   // ID события Google Calendar
  status          String    @default("pending")

  // Связи
  interviewer     User      @relation("InterviewerMockInterviews", fields: [interviewerId], references: [id])
  interviewerId   String
  videoRoom       VideoRoom? @relation(fields: [videoRoomId], references: [id])
}
```

### VideoRoom модель

```prisma
model VideoRoom {
  id              String    @id @default(cuid())
  code            String    @unique
  name            String
  isPrivate       Boolean   @default(false)
  maxParticipants Int       @default(10)
  isActive        Boolean   @default(true)

  // Связи
  mockInterviews  MockInterview[]
  createdBy       User      @relation(fields: [createdById], references: [id])
  createdById     String
}
```

## API Endpoints

### POST /api/mock-interviews

**Создание интервью**

```bash
curl -X POST http://localhost:3000/api/mock-interviews \
  -H "Content-Type: application/json" \
  -d '{
    "scheduledTime": "2025-05-30T15:00:00.000Z",
    "videoType": "built_in"
  }'
```

**Ответ:**

```json
{
  "id": "cm123456789",
  "scheduledTime": "2025-05-30T15:00:00.000Z",
  "meetingLink": "http://localhost:3000/video-conferences/rooms/abc123",
  "videoType": "built_in",
  "videoRoomId": "room123",
  "status": "pending"
}
```

### GET /api/mock-interviews

**Получение списка интервью**

```bash
curl http://localhost:3000/api/mock-interviews?status=active
```

## Компоненты

### InterviewTypeSelector

Основной компонент для выбора типа собеседования.

**Props:**

- `selectedType`: текущий выбранный тип (`'google_meet' | 'built_in' | null`)
- `onTypeSelect`: функция обратного вызова при выборе типа
- `onNext`: функция для перехода к следующему шагу

**Пример:**

```jsx
import InterviewTypeSelector from '../components/interview/InterviewTypeSelector';

function CreateInterview() {
  const [videoType, setVideoType] = useState(null);

  return (
    <InterviewTypeSelector
      selectedType={videoType}
      onTypeSelect={setVideoType}
      onNext={() => setStep(1)}
    />
  );
}
```

### Стили

Компонент использует CSS модули:

```css
/* styles/InterviewTypeSelector.module.css */
.container {
  padding: 2rem;
}

.typeCard {
  border: 2px solid #e1e5e9;
  border-radius: 12px;
  padding: 1.5rem;
  cursor: pointer;
  transition: all 0.3s ease;
}

.typeCard.selected {
  border-color: var(--accent-color);
  background-color: rgba(var(--accent-color-rgb), 0.05);
}
```

## Обработка ошибок

### Fallback механизмы

```javascript
// В API при ошибке создания VideoRoom
if (videoType === 'built_in') {
  try {
    // Попытка создать VideoRoom
    const videoRoom = await createVideoRoom();
  } catch (error) {
    console.log('Fallback на Google Meet');
    needCreateCalendarEvent = true;
  }
}
```

### Обработка ошибок на frontend

```javascript
const handleSubmit = async () => {
  try {
    const response = await fetch('/api/mock-interviews', {
      method: 'POST',
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (!response.ok) {
      // Проверка на необходимость ручного ввода ссылки
      if (result.needManualLink) {
        setStep(3); // Переход на шаг ручного ввода
        return;
      }
      throw new Error(result.message);
    }

    // Успешное создание
    router.push('/mock-interviews');
  } catch (error) {
    showError(error.message);
  }
};
```

## Частые проблемы и решения

### 1. Ошибка "Недопустимый тип видеосвязи"

**Проблема:** API возвращает ошибку валидации videoType.

**Решение:**

```javascript
// Убедитесь, что используете правильные значения
const validVideoTypes = ['google_meet', 'built_in'];
if (!validVideoTypes.includes(videoType)) {
  console.error('Недопустимый тип:', videoType);
}
```

### 2. Видеокомната не создается

**Проблема:** Интервью с типом `built_in` не создает VideoRoom.

**Решение:**

```javascript
// Проверьте доступность VideoRoom API
const testVideoRoom = await fetch('/api/video-conferences', {
  method: 'GET',
});

if (!testVideoRoom.ok) {
  console.error('VideoRoom API недоступен');
}
```

### 3. Google Meet ссылка не создается

**Проблема:** Автоматическое создание ссылки Google Meet не работает.

**Решение:**

```javascript
// Проверьте настройки Google OAuth
console.log('Google Client ID:', process.env.GOOGLE_CLIENT_ID);
console.log(
  'Google Client Secret:',
  process.env.GOOGLE_CLIENT_SECRET ? 'SET' : 'NOT SET'
);

// Используйте ручной ввод ссылки как fallback
if (error.needManualLink) {
  setManualLinkRequired(true);
}
```

### 4. Интервью не отображается в списке

**Проблема:** Созданное интервью не появляется в списке.

**Решение:**

```javascript
// Проверьте фильтрацию по статусу
const interviews = await prisma.mockInterview.findMany({
  where: {
    status: {
      in: ['pending', 'booked'], // для активных интервью
    },
  },
});
```

## Тестирование

### Запуск интеграционных тестов

```bash
node test-interview-integration.js
```

### Ручное тестирование

1. **Тест Google Meet:**

   - Создайте интервью с типом `google_meet`
   - Проверьте создание ссылки
   - Убедитесь, что событие добавлено в календарь

2. **Тест встроенной системы:**

   - Создайте интервью с типом `built_in`
   - Проверьте создание VideoRoom
   - Убедитесь, что ссылка ведет на правильную комнату

3. **Тест fallback:**
   - Отключите Google Calendar API
   - Попробуйте создать Google Meet интервью
   - Убедитесь, что система предлагает ручной ввод

## Мониторинг

### Ключевые метрики

```javascript
// Логирование успешности создания
console.log('Интервью создано:', {
  type: videoType,
  success: true,
  fallback: usedFallback,
});

// Мониторинг ошибок
console.error('Ошибка создания интервью:', {
  type: videoType,
  error: error.message,
  timestamp: new Date().toISOString(),
});
```

### Проверка состояния системы

```javascript
// Healthcheck для VideoRoom API
const checkVideoRoomHealth = async () => {
  try {
    const response = await fetch('/api/video-conferences');
    return response.ok;
  } catch {
    return false;
  }
};

// Healthcheck для Google Calendar API
const checkGoogleCalendarHealth = async () => {
  try {
    // Попытка создать тестовое событие
    const result = await createCalendarEvent(testData);
    return result.success;
  } catch {
    return false;
  }
};
```

## Расширение функциональности

### Добавление нового типа видеосвязи

1. **Обновите компонент выбора:**

```javascript
const interviewTypes = [
  // существующие типы...
  {
    id: 'zoom',
    title: 'Zoom',
    description: 'Использовать Zoom для видеосвязи',
    icon: '📹',
    features: ['HD качество', 'Запись встреч', 'Виртуальные фоны'],
    color: '#2D8CFF',
  },
];
```

2. **Добавьте обработку в API:**

```javascript
if (videoType === 'zoom') {
  // Логика создания Zoom встречи
  const zoomMeeting = await createZoomMeeting(scheduledTime);
  meetingLink = zoomMeeting.join_url;
}
```

3. **Обновите валидацию:**

```javascript
const validVideoTypes = ['google_meet', 'built_in', 'zoom'];
```

---

**Дата создания:** 30.05.2025  
**Версия:** 1.0.0  
**Автор:** Roo (Code Mode)  
**Статус:** Готово к использованию
