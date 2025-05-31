# API Endpoint для смены пароля пользователя

## Обзор

API endpoint для безопасной смены пароля авторизованного пользователя с полной валидацией и проверками безопасности.

## Endpoint

```
POST /api/user/change-password
```

## Аутентификация

Требуется активная сессия пользователя (NextAuth.js).

## Параметры запроса

### Body (JSON)

| Параметр          | Тип    | Обязательный | Описание                    |
| ----------------- | ------ | ------------ | --------------------------- |
| `currentPassword` | string | Да           | Текущий пароль пользователя |
| `newPassword`     | string | Да           | Новый пароль                |
| `confirmPassword` | string | Да           | Подтверждение нового пароля |

### Пример запроса

```json
{
  "currentPassword": "oldPassword123!",
  "newPassword": "newSecurePassword456@",
  "confirmPassword": "newSecurePassword456@"
}
```

## Валидация

### Требования к новому паролю

- Минимум 8 символов
- Максимум 128 символов
- Должен содержать хотя бы одну букву
- Должен содержать хотя бы одну цифру
- Должен содержать хотя бы один специальный символ
- Не должен совпадать с текущим паролем

### Дополнительные проверки

- Новый пароль должен совпадать с подтверждением
- Текущий пароль должен быть корректным
- Пользователь должен иметь пароль (не OAuth-пользователь)

## Ответы

### Успешная смена пароля

**Статус:** `200 OK`

```json
{
  "success": true,
  "message": "Пароль успешно изменен"
}
```

### Ошибки

#### Неавторизованный пользователь

**Статус:** `401 Unauthorized`

```json
{
  "success": false,
  "error": "Не авторизован"
}
```

#### Неподдерживаемый метод

**Статус:** `405 Method Not Allowed`

```json
{
  "success": false,
  "error": "Метод не поддерживается"
}
```

#### Отсутствующие поля

**Статус:** `400 Bad Request`

```json
{
  "success": false,
  "error": "Все поля обязательны для заполнения"
}
```

#### Пароли не совпадают

**Статус:** `400 Bad Request`

```json
{
  "success": false,
  "error": "Новый пароль и подтверждение не совпадают"
}
```

#### Новый пароль совпадает с текущим

**Статус:** `400 Bad Request`

```json
{
  "success": false,
  "error": "Новый пароль должен отличаться от текущего"
}
```

#### Невалидный новый пароль

**Статус:** `400 Bad Request`

```json
{
  "success": false,
  "error": "Новый пароль не соответствует требованиям безопасности",
  "details": [
    "Пароль должен содержать минимум 8 символов",
    "Пароль должен содержать хотя бы одну цифру"
  ]
}
```

#### Неверный текущий пароль

**Статус:** `400 Bad Request`

```json
{
  "success": false,
  "error": "Неверный текущий пароль"
}
```

#### OAuth пользователь

**Статус:** `400 Bad Request`

```json
{
  "success": false,
  "error": "У вашего аккаунта нет пароля. Возможно, вы входите через Google или GitHub."
}
```

#### Пользователь не найден

**Статус:** `404 Not Found`

```json
{
  "success": false,
  "error": "Пользователь не найден"
}
```

#### Внутренняя ошибка сервера

**Статус:** `500 Internal Server Error`

```json
{
  "success": false,
  "error": "Внутренняя ошибка сервера",
  "details": "Описание ошибки (только в development режиме)"
}
```

## Безопасность

### Реализованные меры безопасности

1. **Проверка сессии** - Только авторизованные пользователи могут менять пароль
2. **Валидация текущего пароля** - Обязательная проверка знания текущего пароля
3. **Хеширование bcrypt** - Все пароли хешируются с использованием bcrypt (12 раундов)
4. **Валидация сложности пароля** - Строгие требования к новому паролю
5. **Защита OAuth пользователей** - Предотвращение установки пароля для OAuth аккаунтов
6. **Проверка совпадения паролей** - Новый пароль должен совпадать с подтверждением
7. **Предотвращение повторного использования** - Новый пароль должен отличаться от текущего

### Рекомендации по использованию

- Используйте HTTPS для всех запросов
- Реализуйте rate limiting на клиентской стороне
- Добавьте логирование попыток смены пароля
- Рассмотрите добавление email уведомлений о смене пароля

## Примеры использования

### JavaScript (fetch)

```javascript
async function changePassword(currentPassword, newPassword, confirmPassword) {
  try {
    const response = await fetch('/api/user/change-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        currentPassword,
        newPassword,
        confirmPassword,
      }),
    });

    const data = await response.json();

    if (data.success) {
      alert('Пароль успешно изменен');
    } else {
      alert(`Ошибка: ${data.error}`);
    }
  } catch (error) {
    console.error('Ошибка при смене пароля:', error);
    alert('Произошла ошибка при смене пароля');
  }
}
```

### React Hook

```javascript
import { useState } from 'react';

export function useChangePassword() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const changePassword = async (
    currentPassword,
    newPassword,
    confirmPassword
  ) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/user/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error);
      }

      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { changePassword, loading, error };
}
```

## Связанные файлы

- **API Endpoint:** [`pages/api/user/change-password.js`](../pages/api/user/change-password.js)
- **Утилиты паролей:** [`lib/utils/passwordUtils.js`](../lib/utils/passwordUtils.js)
- **Схема базы данных:** [`prisma/schema.prisma`](../prisma/schema.prisma)
- **Тестовый файл:** [`test-change-password-api.js`](../test-change-password-api.js)

## Статус

✅ **Готово к использованию**

- API endpoint создан и протестирован
- Все требования безопасности реализованы
- Валидация и обработка ошибок настроены
- Документация создана
