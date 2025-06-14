# План улучшения системы баллов в приложении

## 1. Исправление текущих несоответствий

### 1.1. Корректировка возврата баллов при отмене собеседования

- **Проблема**: В текущем коде при отмене собеседования возвращается 3 балла вместо 2
- **Решение**:
  - Изменить код в файле `pages/api/mock-interviews/[id]/index.js` (строки 158-166)
  - Заменить `increment: 3` на `increment: 2`
  - Добавить комментарий: `// Возвращаем 1 потраченный балл + 1 балл компенсации`

## 2. Добавление механизма отметки неявки

### 2.1. Создание нового статуса для собеседований

- **Решение**:
  - Добавить новый статус `no_show` в модель `MockInterview`
  - Обновить комментарий в схеме: `// pending, booked, completed, cancelled, no_show`

### 2.2. Создание API-эндпоинта для отметки неявки

- **Решение**:
  - Создать новый файл `pages/api/mock-interviews/[id]/no-show.js`
  - Реализовать POST-запрос для отметки неявки с указанием, кто не явился (интервьюер или отвечающий)
  - Добавить проверку прав доступа (только участники собеседования могут отметить неявку)
  - Добавить проверку времени (отметить неявку можно только после запланированного времени собеседования)

### 2.3. Реализация возврата баллов при неявке

- **Решение**:
  - Если не явился интервьюер:
    ```javascript
    // Возвращаем отвечающему 2 балла (1 потраченный + 1 компенсация)
    await prisma.userPoints.update({
      where: { userId: interview.intervieweeId },
      data: {
        points: {
          increment: 2,
        },
      },
    });
    ```
  - Если не явился отвечающий:
    ```javascript
    // Не возвращаем баллы, так как отвечающий сам не явился
    // Возможно, добавить штраф в будущем
    ```

### 2.4. Добавление интерфейса для отметки неявки

- **Решение**:
  - Обновить компонент `InterviewCard.js` для отображения кнопки "Отметить неявку" после запланированного времени собеседования
  - Добавить модальное окно для выбора, кто не явился
  - Реализовать вызов API-эндпоинта для отметки неявки

## 3. Внедрение системы штрафов за неявку

### 3.1. Создание модели для отслеживания нарушений

- **Решение**:
  - Добавить новую модель в `schema.prisma`:
    ```prisma
    model UserViolation {
      id          String   @id @default(cuid())
      user        User     @relation(fields: [userId], references: [id])
      userId      String
      type        String   // "no_show", "cancellation", etc.
      description String?
      createdAt   DateTime @default(now())
      expiresAt   DateTime // Когда истекает срок действия нарушения
    }
    ```

### 3.2. Реализация штрафов за неявку

- **Решение**:
  - При отметке неявки создавать запись о нарушении:
    ```javascript
    await prisma.userViolation.create({
      data: {
        userId: noShowUserId, // ID пользователя, который не явился
        type: 'no_show',
        description: 'Неявка на собеседование без предупреждения',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 дней
      },
    });
    ```
  - При попытке записи на собеседование проверять наличие активных нарушений:

    ```javascript
    const activeViolations = await prisma.userViolation.findMany({
      where: {
        userId: session.user.id,
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    if (activeViolations.length > 0) {
      return res.status(403).json({
        message:
          'Вы временно не можете записываться на собеседования из-за нарушений',
      });
    }
    ```

## 4. Добавление бонусов за регулярную активность

### 4.1. Создание системы подсчета проведенных собеседований

- **Решение**:
  - Добавить поле в модель `User` для отслеживания количества проведенных собеседований:
    ```prisma
    model User {
      // Существующие поля...
      conductedInterviewsCount Int @default(0)
    }
    ```
  - Обновлять счетчик при успешном завершении собеседования (когда отзыв принят)

### 4.2. Реализация бонусных баллов

- **Решение**:
  - При достижении определенного количества проведенных собеседований начислять бонусные баллы:
    ```javascript
    // В обработчике принятия отзыва
    if (user.conductedInterviewsCount % 5 === 0) {
      // За каждые 5 проведенных собеседований начисляем 2 бонусных балла
      await prisma.userPoints.update({
        where: { userId: user.id },
        data: {
          points: {
            increment: 2,
          },
        },
      });

      // Создаем запись в истории транзакций
      await prisma.pointsTransaction.create({
        data: {
          userId: user.id,
          amount: 2,
          type: 'bonus',
          description: 'Бонус за проведение 5 собеседований',
        },
      });
    }
    ```

## 5. Внедрение дифференцированной оценки собеседований

### 5.1. Обновление модели отзыва о собеседовании

- **Решение**:
  - Добавить поле для оценки интервьюера в модель `InterviewFeedback`:
    ```prisma
    model InterviewFeedback {
      // Существующие поля...
      interviewerRating Int? // от 1 до 5, оценка интервьюера отвечающим
    }
    ```

### 5.2. Реализация начисления баллов в зависимости от оценки

- **Решение**:
  - Обновить логику начисления баллов при принятии отзыва:

    ```javascript
    // Определяем количество баллов в зависимости от оценки
    let pointsToAward = 1; // По умолчанию 1 балл

    if (feedback.interviewerRating) {
      if (feedback.interviewerRating >= 4) {
        pointsToAward = 2; // За высокую оценку 2 балла
      } else if (feedback.interviewerRating <= 2) {
        pointsToAward = 0; // За низкую оценку 0 баллов
      }
    }

    // Начисляем баллы интервьюеру
    await prisma.userPoints.update({
      where: { userId: interview.interviewerId },
      data: {
        points: {
          increment: pointsToAward,
        },
      },
    });
    ```

## 6. Создание истории транзакций с баллами

### 6.1. Создание модели для истории транзакций

- **Решение**:
  - Добавить новую модель в `schema.prisma`:
    ```prisma
    model PointsTransaction {
      id          String   @id @default(cuid())
      user        User     @relation(fields: [userId], references: [id])
      userId      String
      amount      Int      // Может быть положительным (начисление) или отрицательным (списание)
      type        String   // "booking", "feedback", "cancellation", "no_show", "bonus", etc.
      description String?
      createdAt   DateTime @default(now())
    }
    ```

### 6.2. Обновление всех операций с баллами для создания записей в истории

- **Решение**:
  - При списании балла за запись на собеседование:
    ```javascript
    await prisma.pointsTransaction.create({
      data: {
        userId: session.user.id,
        amount: -1,
        type: 'booking',
        description: 'Запись на собеседование',
      },
    });
    ```
  - При начислении балла за проведение собеседования:
    ```javascript
    await prisma.pointsTransaction.create({
      data: {
        userId: interview.interviewerId,
        amount: 1,
        type: 'feedback',
        description: 'Проведение собеседования',
      },
    });
    ```
  - При возврате баллов за отмену собеседования:
    ```javascript
    await prisma.pointsTransaction.create({
      data: {
        userId: interview.intervieweeId,
        amount: 2,
        type: 'cancellation',
        description: 'Компенсация за отмену собеседования',
      },
    });
    ```

### 6.3. Создание интерфейса для просмотра истории транзакций

- **Решение**:
  - Создать новую страницу `/user/points-history`
  - Реализовать API-эндпоинт для получения истории транзакций
  - Создать компонент для отображения истории с возможностью фильтрации по типу транзакции

## 7. Улучшение пользовательского интерфейса

### 7.1. Обновление информации о баллах

- **Решение**:
  - Обновить текст в компоненте `InterviewBoard.js`:
    ```jsx
    <p className={styles.pointsHint}>
      Для записи на собеседование в роли отвечающего необходимо минимум 1 балл.
      За регистрацию дается 1 балл. Баллы начисляются за проведение
      собеседований в роли интервьюера (1-2 балла в зависимости от оценки). При
      отмене собеседования или неявке интервьюера отвечающему возвращается 2
      балла (1 потраченный + 1 компенсация).
    </p>
    ```

### 7.2. Добавление уведомлений о транзакциях с баллами

- **Решение**:
  - Реализовать всплывающие уведомления при начислении или списании баллов
  - Добавить счетчик баллов в шапку сайта для быстрого доступа к информации
