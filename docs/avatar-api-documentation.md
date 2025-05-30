# API Endpoint для управления аватаркой пользователя

## Обзор

API endpoint `/api/user/avatar` предоставляет полный функционал для управления аватаркой пользователя, включая получение, обновление и удаление аватарки.

## Расположение файла

```
pages/api/user/avatar.js
```

## Поддерживаемые методы

### GET /api/user/avatar

Получение текущей аватарки пользователя.

**Авторизация:** Требуется

**Ответ при успехе (200):**

```json
{
  "success": true,
  "avatar": "https://api.dicebear.com/7.x/initials/svg?seed=ИП&backgroundColor=3b82f6&textColor=ffffff",
  "hasCustomAvatar": false,
  "user": {
    "id": "user_id",
    "name": "Иван Петров",
    "email": "ivan@example.com"
  }
}
```

**Поля ответа:**

- `avatar` - URL аватарки (дефолтная или пользовательская)
- `hasCustomAvatar` - true если установлена пользовательская аватарка
- `user` - информация о пользователе

### PUT /api/user/avatar

Обновление аватарки пользователя.

**Авторизация:** Требуется

**Тело запроса:**

```json
{
  "avatar": "https://example.com/my-avatar.jpg"
}
```

**Поддерживаемые форматы:**

- HTTP/HTTPS URL: `https://example.com/avatar.jpg`
- Data URL: `data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ...`

**Ответ при успехе (200):**

```json
{
  "success": true,
  "message": "Аватарка успешно обновлена",
  "avatar": "https://example.com/my-avatar.jpg",
  "user": {
    "id": "user_id",
    "name": "Иван Петров",
    "email": "ivan@example.com"
  }
}
```

### DELETE /api/user/avatar

Удаление пользовательской аватарки (возврат к дефолтной).

**Авторизация:** Требуется

**Ответ при успехе (200):**

```json
{
  "success": true,
  "message": "Аватарка удалена, установлена дефолтная",
  "avatar": "https://api.dicebear.com/7.x/initials/svg?seed=ИП&backgroundColor=3b82f6&textColor=ffffff",
  "hasCustomAvatar": false,
  "user": {
    "id": "user_id",
    "name": "Иван Петров",
    "email": "ivan@example.com"
  }
}
```

## Обработка ошибок

### Ошибки авторизации (401)

```json
{
  "success": false,
  "error": "Необходима авторизация"
}
```

### Ошибки валидации (400)

```json
{
  "success": false,
  "error": "Необходимо указать URL аватарки"
}
```

```json
{
  "success": false,
  "error": "Неверный формат URL аватарки"
}
```

```json
{
  "success": false,
  "error": "URL аватарки слишком длинный (максимум 2000 символов)"
}
```

### Ошибки сервера (500)

```json
{
  "success": false,
  "error": "Внутренняя ошибка сервера"
}
```

### Неподдерживаемый метод (405)

```json
{
  "success": false,
  "error": "Метод не поддерживается"
}
```

## Безопасность

### Проверка авторизации

- Использует NextAuth.js сессии
- Проверяет наличие `session.user.id`
- Все операции выполняются только для авторизованного пользователя

### Валидация входных данных

- Проверка типа данных (строка)
- Валидация URL формата
- Ограничение длины URL (2000 символов)
- Поддержка только безопасных протоколов (http, https, data)
- Блокировка опасных схем (javascript, ftp и др.)

### Санитизация данных

- Проверка data: URL на соответствие изображениям
- Валидация структуры URL
- Защита от XSS атак

## Генерация дефолтных аватарок

### Алгоритм генерации инициалов

1. Если передан email - берется часть до символа `@`
2. Разбивается на слова по пробелам
3. Для одного слова - первые 2 символа
4. Для нескольких слов - первые буквы первых двух слов
5. Приводится к верхнему регистру

### Примеры генерации

- `"Иван Петров"` → `"ИП"`
- `"john.doe@example.com"` → `"JO"`
- `"Анна"` → `"АН"`
- `"test@gmail.com"` → `"TE"`
- `""` или `null` → `"U"`

### Сервис аватарок

Используется DiceBear API для генерации SVG аватарок:

```
https://api.dicebear.com/7.x/initials/svg?seed={initials}&backgroundColor=3b82f6&textColor=ffffff
```

## База данных

### Используемое поле

- Таблица: `User`
- Поле: `image` (text, nullable)
- Связь: Прямое обновление поля в таблице пользователя

### Операции с БД

- `findUnique` - получение пользователя
- `update` - обновление аватарки
- Автоматическое закрытие соединения в `finally` блоке

## Интеграция с проектом

### Следование паттернам

- Использует существующую структуру API
- Импортирует `authOptions` из NextAuth
- Использует общий `prisma` клиент
- Следует стилю обработки ошибок проекта

### Совместимость

- Работает с существующим полем `image` в таблице User
- Не требует миграций базы данных
- Совместимо с NextAuth.js аватарками
- Поддерживает OAuth провайдеры (Google, GitHub)

## Примеры использования

### JavaScript/TypeScript

```javascript
// Получение аватарки
const response = await fetch('/api/user/avatar');
const data = await response.json();

// Обновление аватарки
const updateResponse = await fetch('/api/user/avatar', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    avatar: 'https://example.com/new-avatar.jpg',
  }),
});

// Удаление аватарки
const deleteResponse = await fetch('/api/user/avatar', {
  method: 'DELETE',
});
```

### React Hook пример

```javascript
const useAvatar = () => {
  const [avatar, setAvatar] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchAvatar = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/user/avatar');
      const data = await response.json();
      if (data.success) {
        setAvatar(data.avatar);
      }
    } catch (error) {
      console.error('Ошибка получения аватарки:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateAvatar = async (newAvatarUrl) => {
    setLoading(true);
    try {
      const response = await fetch('/api/user/avatar', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatar: newAvatarUrl }),
      });
      const data = await response.json();
      if (data.success) {
        setAvatar(data.avatar);
        return { success: true };
      } else {
        return { success: false, error: data.error };
      }
    } catch (error) {
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  return { avatar, loading, fetchAvatar, updateAvatar };
};
```

## Тестирование

### Тестовый файл

```
test-avatar-api.js
```

### Запуск тестов

```bash
node test-avatar-api.js
```

### Покрытие тестами

- ✅ Проверка структуры базы данных
- ✅ Валидация URL
- ✅ Генерация инициалов
- ✅ Проверка всех методов API
- ✅ Обработка ошибок

## Ограничения

### Технические ограничения

- Максимальная длина URL: 2000 символов
- Поддерживаемые протоколы: http, https, data
- Только изображения для data: URL

### Функциональные ограничения

- Нет загрузки файлов (только URL)
- Нет валидации размера изображения
- Нет конвертации форматов
- Нет кэширования аватарок

## Планы развития

### Возможные улучшения

1. Добавление загрузки файлов
2. Валидация размера и формата изображений
3. Автоматическое изменение размера
4. Кэширование аватарок
5. Поддержка множественных размеров
6. Интеграция с CDN

### Интеграция с UI

1. Компонент выбора аватарки
2. Предпросмотр изображения
3. Кроппинг изображений
4. Галерея предустановленных аватарок
