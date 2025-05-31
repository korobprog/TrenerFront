# API Документация: История транзакций баллов

## Обзор

API роут `/api/user/points-history` предназначен для получения истории транзакций баллов пользователя с поддержкой пагинации и фильтрации.

## Эндпоинт

```
GET /api/user/points-history
```

## Авторизация

Требуется авторизация через NextAuth. Пользователь должен быть аутентифицирован.

## Параметры запроса

| Параметр | Тип    | Обязательный | По умолчанию | Описание                               |
| -------- | ------ | ------------ | ------------ | -------------------------------------- |
| `limit`  | number | Нет          | 10           | Количество записей на страницу (1-100) |
| `offset` | number | Нет          | 0            | Смещение для пагинации (≥0)            |
| `type`   | string | Нет          | -            | Фильтр по типу транзакции              |

## Примеры запросов

### Базовый запрос

```bash
GET /api/user/points-history
```

### С пагинацией

```bash
GET /api/user/points-history?limit=5&offset=10
```

### С фильтром по типу

```bash
GET /api/user/points-history?type=earned&limit=20
```

### Полный запрос

```bash
GET /api/user/points-history?limit=15&offset=30&type=spent
```

## Ответы

### Успешный ответ (200)

```json
{
  "success": true,
  "data": {
    "transactions": [
      {
        "id": "clx1234567890",
        "amount": 50,
        "type": "earned",
        "description": "Завершение интервью",
        "createdAt": "2025-05-29T16:00:00.000Z"
      },
      {
        "id": "clx0987654321",
        "amount": -20,
        "type": "spent",
        "description": "Бронирование интервью",
        "createdAt": "2025-05-29T15:30:00.000Z"
      }
    ],
    "pagination": {
      "totalCount": 45,
      "limit": 10,
      "offset": 0,
      "hasMore": true
    },
    "currentPoints": 150,
    "userId": "clx_user_id"
  }
}
```

### Ошибка авторизации (401)

```json
{
  "error": "Не авторизован"
}
```

### Ошибка валидации (400)

```json
{
  "error": "Параметр limit должен быть числом от 1 до 100"
}
```

### Пользователь не найден (404)

```json
{
  "error": "Пользователь не найден"
}
```

### Неподдерживаемый метод (405)

```json
{
  "error": "Метод не поддерживается"
}
```

### Внутренняя ошибка сервера (500)

```json
{
  "error": "Внутренняя ошибка сервера",
  "message": "Не удалось загрузить историю транзакций"
}
```

## Структура данных транзакции

| Поле          | Тип    | Описание                                                                     |
| ------------- | ------ | ---------------------------------------------------------------------------- |
| `id`          | string | Уникальный идентификатор транзакции                                          |
| `amount`      | number | Количество баллов (положительное для начисления, отрицательное для списания) |
| `type`        | string | Тип транзакции (например: "earned", "spent", "bonus")                        |
| `description` | string | Описание транзакции                                                          |
| `createdAt`   | string | Дата и время создания транзакции (ISO 8601)                                  |

## Пагинация

API поддерживает пагинацию через параметры `limit` и `offset`:

- **limit**: Максимальное количество записей в ответе (1-100)
- **offset**: Количество записей для пропуска с начала
- **hasMore**: Булево значение, указывающее есть ли еще записи
- **totalCount**: Общее количество транзакций пользователя

### Пример пагинации

```javascript
// Первая страница (записи 1-10)
GET /api/user/points-history?limit=10&offset=0

// Вторая страница (записи 11-20)
GET /api/user/points-history?limit=10&offset=10

// Третья страница (записи 21-30)
GET /api/user/points-history?limit=10&offset=20
```

## Фильтрация

API поддерживает фильтрацию по типу транзакции через параметр `type`. Возможные значения зависят от типов транзакций в системе.

## Сортировка

Транзакции возвращаются отсортированными по дате создания в убывающем порядке (новые сначала).

## Безопасность

- Пользователь может получить только свои транзакции
- Все параметры валидируются на сервере
- Используется безопасное подключение к базе данных через Prisma
- Автоматическое отключение от базы данных после запроса

## Примеры использования

### JavaScript/Fetch

```javascript
async function getPointsHistory(limit = 10, offset = 0, type = null) {
  const params = new URLSearchParams({
    limit: limit.toString(),
    offset: offset.toString(),
  });

  if (type) {
    params.append('type', type);
  }

  const response = await fetch(`/api/user/points-history?${params}`);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Ошибка загрузки истории');
  }

  return data;
}

// Использование
try {
  const history = await getPointsHistory(20, 0, 'earned');
  console.log('История транзакций:', history.data.transactions);
  console.log('Текущие баллы:', history.data.currentPoints);
} catch (error) {
  console.error('Ошибка:', error.message);
}
```

### cURL

```bash
# Получить первые 10 транзакций
curl -X GET "http://localhost:3000/api/user/points-history" \
  -H "Content-Type: application/json" \
  -b "next-auth.session-token=your_session_token"

# Получить транзакции с пагинацией
curl -X GET "http://localhost:3000/api/user/points-history?limit=5&offset=10" \
  -H "Content-Type: application/json" \
  -b "next-auth.session-token=your_session_token"
```

## Коды ошибок

| Код | Описание                    |
| --- | --------------------------- |
| 200 | Успешный запрос             |
| 400 | Ошибка валидации параметров |
| 401 | Не авторизован              |
| 404 | Пользователь не найден      |
| 405 | Метод не поддерживается     |
| 500 | Внутренняя ошибка сервера   |

## Связанные API

- `GET /api/user/points` - Получение текущего баланса баллов
- `POST /api/user/points` - Изменение баллов (только для администраторов)

## Версия API

Версия: 1.0  
Дата создания: 29.05.2025  
Последнее обновление: 29.05.2025
