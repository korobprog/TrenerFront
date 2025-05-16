# План реализации функционала мок-собеседований

## Описание функционала

Добавление в приложение нового вида тренировок - тренировка мок-собеседований. Пользователи смогут выступать в роли интервьюера или отвечающего, проводить собеседования через Google Meet, оставлять отзывы и получать баллы.

## Основные этапы процесса

1. Пользователь выбирает роль (интервьюер или отвечающий)
2. Выбирает время в календаре
3. Создает и добавляет ссылку на Google Meet
4. Публикует карточку собеседования на общей доске
5. Другой пользователь записывается на собеседование
6. После собеседования интервьюер оставляет отзыв и оценку
7. Отвечающий принимает отзыв, интервьюер получает балл

## 1. Обновление схемы базы данных

### Новые модели Prisma

```prisma
// Модель для хранения баллов пользователя
model UserPoints {
  id        String   @id @default(cuid())
  user      User     @relation(fields: [userId], references: [id])
  userId    String   @unique
  points    Int      @default(0)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

// Модель для мок-собеседований
model MockInterview {
  id                 String             @id @default(cuid())
  interviewer        User               @relation("InterviewerRelation", fields: [interviewerId], references: [id])
  interviewerId      String
  interviewee        User?              @relation("IntervieweeRelation", fields: [intervieweeId], references: [id])
  intervieweeId      String?
  scheduledTime      DateTime
  meetingLink        String
  status             String             @default("pending") // pending, booked, completed, cancelled
  createdAt          DateTime           @default(now())
  updatedAt          DateTime           @updatedAt
  interviewFeedback  InterviewFeedback?
}

// Модель для отзывов о собеседовании
model InterviewFeedback {
  id             String        @id @default(cuid())
  mockInterview  MockInterview @relation(fields: [mockInterviewId], references: [id])
  mockInterviewId String        @unique
  technicalScore Int           // от 1 до 5
  feedback       String
  isAccepted     Boolean       @default(false)
  createdAt      DateTime      @default(now())
  updatedAt      DateTime      @updatedAt
}
```

### Обновление модели User

```prisma
model User {
  id                   String             @id @default(cuid())
  name                 String?
  email                String?            @unique
  emailVerified        DateTime?
  image                String?
  accounts             Account[]
  sessions             Session[]
  userProgress         UserProgress[]
  userPoints           UserPoints?
  interviewerSessions  MockInterview[]    @relation("InterviewerRelation")
  intervieweeSessions  MockInterview[]    @relation("IntervieweeRelation")
}
```

## 2. Компоненты UI

### Новые компоненты

1. **InterviewButton.js** - Кнопка для перехода к мок-собеседованиям на главной странице
2. **InterviewCalendar.js** - Компонент для выбора времени собеседования
3. **InterviewCard.js** - Карточка собеседования для отображения на доске
4. **FeedbackForm.js** - Форма для оставления отзыва о собеседовании
5. **InterviewBoard.js** - Доска с карточками доступных собеседований

## 3. API Endpoints

### Новые API endpoints

1. **/api/mock-interviews**

   - GET: получение списка доступных собеседований
   - POST: создание нового собеседования

2. **/api/mock-interviews/[id]**

   - GET: получение информации о конкретном собеседовании
   - PUT: обновление информации о собеседовании
   - DELETE: отмена собеседования

3. **/api/mock-interviews/[id]/book**

   - POST: запись на собеседование

4. **/api/mock-interviews/[id]/feedback**

   - POST: оставление отзыва о собеседовании
   - PUT: принятие отзыва

5. **/api/user/points**
   - GET: получение информации о баллах пользователя

## 4. Новые страницы

1. **/mock-interviews** - Главная страница мок-собеседований
2. **/mock-interviews/new** - Страница создания нового собеседования
3. **/mock-interviews/[id]** - Страница конкретного собеседования
4. **/mock-interviews/[id]/feedback** - Страница для оставления отзыва

## 5. Обновление главной страницы

Добавление кнопки "Пройти мок-собеседование" рядом с кнопкой "Начать" на главной странице.

## 6. Реализация системы баллов

1. Новые пользователи получают роль интервьюера по умолчанию
2. Для роли отвечающего требуется 3 балла
3. Баллы начисляются за проведение собеседований в роли интервьюера
4. Баллы списываются при записи на собеседование в роли отвечающего

## Последовательность разработки

1. Обновление схемы Prisma и миграция базы данных
2. Создание API endpoints
3. Разработка компонентов UI
4. Создание новых страниц
5. Интеграция с главной страницей
6. Тестирование функционала
