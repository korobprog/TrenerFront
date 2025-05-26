# Руководство по использованию Gmail API для отправки почты

## Введение

Данное руководство описывает использование Gmail API для отправки электронной почты в проекте вместо традиционного SMTP-подхода.

### Преимущества использования Gmail API вместо SMTP

1. **Повышенная безопасность**: Gmail API использует OAuth2 для аутентификации, что безопаснее, чем хранение паролей для SMTP.
2. **Отсутствие блокировок**: SMTP-серверы часто блокируют массовую отправку писем или помечают их как спам, в то время как Gmail API имеет более высокие лимиты и лучшую доставляемость.
3. **Расширенные возможности**: Gmail API предоставляет доступ к дополнительным функциям Gmail, таким как метки, черновики, управление папками и т.д.
4. **Автоматическое обновление токенов**: Система автоматически обновляет токены доступа, что обеспечивает бесперебойную работу.
5. **Интеграция с другими сервисами Google**: Легкая интеграция с Google Calendar, Google Drive и другими сервисами Google.
6. **Отслеживание статуса**: Возможность отслеживать статус отправленных писем.

## Настройка переменных окружения

Для работы с Gmail API необходимо настроить следующие переменные окружения:

### Обязательные переменные

```
# Настройки Google OAuth
GOOGLE_CLIENT_ID=ваш_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=ваш_client_secret
GOOGLE_REDIRECT_URI=https://ваш_домен/api/auth/callback/google

# ID пользователя Gmail для отправки писем
GMAIL_USER_ID=email@gmail.com
```

### Устаревшие переменные (для обратной совместимости)

Эти переменные больше не рекомендуются к использованию, так как токены теперь хранятся в базе данных:

```
GOOGLE_ACCESS_TOKEN=ваш_access_token
GOOGLE_REFRESH_TOKEN=ваш_refresh_token
GOOGLE_TOKEN_EXPIRY=время_истечения_в_миллисекундах
```

### Переменные для SMTP (запасной вариант)

```
EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_SECURE=true
EMAIL_USER=user@example.com
EMAIL_PASSWORD=password
EMAIL_FROM="Сервис собеседований" <noreply@example.com>
```

## Описание модулей и функций

### Модуль `lib/utils/googleGmail.js`

Основной модуль для работы с Gmail API.

#### Основные функции:

1. **`sendMailViaGmailApi(mailOptions, userId, maxRetries = 3)`**

   - Отправляет электронное письмо через Gmail API
   - Параметры:
     - `mailOptions`: Объект с параметрами письма (from, to, subject, text, html)
     - `userId`: ID пользователя (если не указан, используется системный аккаунт)
     - `maxRetries`: Максимальное количество повторных попыток (по умолчанию 3)
   - Возвращает: Promise с результатом отправки

2. **`initializeGmailClient(userId)`**

   - Инициализирует Gmail API клиент
   - Параметры:
     - `userId`: ID пользователя (если не указан, используется системный аккаунт)
   - Возвращает: Promise с Gmail API клиентом

3. **`createMimeMessage(options)`** (внутренняя функция)

   - Создает MIME-сообщение для отправки через Gmail API
   - Параметры:
     - `options`: Объект с параметрами сообщения (from, to, subject, text, html)
   - Возвращает: Закодированное MIME-сообщение

4. **`getGmailOAuth2Client(userId)`** (внутренняя функция)
   - Получает OAuth2 клиент для работы с Gmail API с автоматическим обновлением токенов
   - Параметры:
     - `userId`: ID пользователя (если не указан, используется системный аккаунт)
   - Возвращает: Promise с OAuth2 клиентом

### Модуль `lib/utils/email.js`

Обновленный модуль для отправки почты, который использует Gmail API в качестве основного метода отправки и SMTP в качестве запасного варианта.

#### Основные функции:

1. **`sendEmailViaGmailApi(mailOptions, userId = process.env.GMAIL_USER_ID)`**

   - Отправляет электронное письмо через Gmail API
   - Параметры:
     - `mailOptions`: Объект с параметрами письма (from, to, subject, text, html)
     - `userId`: ID пользователя (по умолчанию используется GMAIL_USER_ID из переменных окружения)
   - Возвращает: Promise с результатом отправки
   - Особенности:
     - В режиме разработки (NODE_ENV=development) письма не отправляются, если не установлена переменная ENABLE_REAL_EMAILS=true
     - При ошибке отправки через Gmail API автоматически пробует отправить через SMTP

2. **`sendInterviewBookingNotification(interviewer, interviewee, interview)`**
   - Отправляет уведомление интервьюеру о том, что к нему записались на собеседование
   - Параметры:
     - `interviewer`: Объект с данными интервьюера (name, email)
     - `interviewee`: Объект с данными интервьюируемого (name, email)
     - `interview`: Объект с данными о собеседовании (id, scheduledTime, meetingLink)
   - Возвращает: Promise с результатом отправки

### Модуль `lib/utils/tokenRefresher.js`

Модуль для управления и обновления токенов Google.

#### Основные функции:

1. **`getAuthenticatedOAuth2Client(userId)`**

   - Получает настроенный OAuth2 клиент с актуальными токенами
   - Параметры:
     - `userId`: ID пользователя
   - Возвращает: Promise с OAuth2 клиентом

2. **`refreshTokenIfNeeded(options = { expiryThreshold: 300 })`**

   - Проверяет и при необходимости обновляет токен
   - Параметры:
     - `options.userId`: ID пользователя
     - `options.expiryThreshold`: Порог в секундах, при котором токен считается "скоро истекающим"
   - Возвращает: Promise с объектом токенов

3. **`getGoogleTokensFromDB(userId)`**

   - Получает токены Google из базы данных для указанного пользователя
   - Параметры:
     - `userId`: ID пользователя
   - Возвращает: Promise с объектом токенов или null

4. **`updateGoogleTokensInDB(userId, accessToken, expiresAt)`**
   - Обновляет токены Google в базе данных
   - Параметры:
     - `userId`: ID пользователя
     - `accessToken`: Новый access token
     - `expiresAt`: Время истечения токена в миллисекундах от эпохи
   - Возвращает: Promise с обновленным объектом аккаунта

## Примеры использования

### Базовый пример отправки письма

```javascript
const { sendEmailViaGmailApi } = require('../lib/utils/email');

async function sendSimpleEmail() {
  const mailOptions = {
    from:
      process.env.EMAIL_FROM || '"Сервис собеседований" <noreply@example.com>',
    to: 'recipient@example.com',
    subject: 'Тестовое письмо',
    text: 'Это простое текстовое письмо',
    html: '<p>Это <b>HTML</b> версия письма</p>',
  };

  try {
    const result = await sendEmailViaGmailApi(mailOptions);

    if (result.success) {
      console.log('Письмо успешно отправлено:', result.messageId);
    } else {
      console.error('Ошибка при отправке письма:', result.error);
    }
  } catch (error) {
    console.error('Критическая ошибка при отправке письма:', error);
  }
}
```

### Отправка уведомления о записи на собеседование

```javascript
const { sendInterviewBookingNotification } = require('../lib/utils/email');

async function notifyInterviewer() {
  const interviewer = {
    name: 'Иван Петров',
    email: 'interviewer@example.com',
  };

  const interviewee = {
    name: 'Мария Сидорова',
    email: 'interviewee@example.com',
  };

  const interview = {
    id: '12345',
    scheduledTime: new Date('2025-06-01T14:00:00'),
    meetingLink: 'https://meet.google.com/abc-defg-hij',
  };

  try {
    const result = await sendInterviewBookingNotification(
      interviewer,
      interviewee,
      interview
    );

    if (result.success) {
      console.log('Уведомление успешно отправлено:', result.messageId);
    } else {
      console.error('Ошибка при отправке уведомления:', result.error);
    }
  } catch (error) {
    console.error('Критическая ошибка при отправке уведомления:', error);
  }
}
```

### Прямое использование Gmail API

```javascript
const { sendMailViaGmailApi } = require('../lib/utils/googleGmail');

async function sendDirectViaGmailApi() {
  const mailOptions = {
    from: 'sender@example.com',
    to: 'recipient@example.com',
    subject: 'Прямая отправка через Gmail API',
    text: 'Текстовая версия письма',
    html: '<p>HTML версия письма</p>',
  };

  try {
    // Используем ID конкретного пользователя
    const userId = 'user@example.com';
    const result = await sendMailViaGmailApi(mailOptions, userId);

    console.log('Результат отправки:', result);
  } catch (error) {
    console.error('Ошибка при отправке:', error);
  }
}
```

## Тестирование с использованием скрипта `scripts/test-gmail-api.js`

Для проверки корректности настройки и работы Gmail API можно использовать тестовый скрипт:

### Запуск скрипта

```bash
# Базовый запуск
node scripts/test-gmail-api.js

# Запуск с указанием пути к .env файлу
NODE_ENV=production node scripts/test-gmail-api.js
```

### Модификация скрипта для тестирования

Перед запуском скрипта можно изменить адрес получателя тестового письма:

```javascript
// Изменить в файле scripts/test-gmail-api.js
const TEST_EMAIL = 'ваш_email@example.com';
```

### Интерпретация результатов

После запуска скрипт выведет подробную информацию о процессе отправки:

- **Успешная отправка**: `✅ Письмо успешно отправлено!` с ID сообщения
- **Отправка через SMTP**: `⚠️ Письмо отправлено через SMTP (запасной вариант), а не через Gmail API`
- **Ошибка отправки**: `❌ Ошибка при отправке письма:` с описанием ошибки

В случае ошибки скрипт также выведет дополнительную отладочную информацию:

- Значение NODE_ENV
- Наличие GMAIL_USER_ID
- Наличие GOOGLE_ACCESS_TOKEN
- Наличие GOOGLE_REFRESH_TOKEN

## Устранение возможных проблем

### Ошибка "Токены Google не найдены для пользователя"

**Причина**: Система не может найти токены Google для указанного пользователя в базе данных.

**Решение**:

1. Убедитесь, что пользователь существует в базе данных
2. Проверьте, что для пользователя создан аккаунт Google в таблице `Account`
3. Запустите скрипт миграции токенов: `node scripts/migrate-google-tokens.js USER_ID`

### Ошибка "invalid_grant" или "unauthorized"

**Причина**: Refresh token недействителен, отозван или устарел.

**Решение**:

1. Пользователю необходимо заново авторизоваться через Google OAuth
2. Обновите токены в базе данных после новой авторизации

### Ошибка "Требуется повторная авторизация в Google"

**Причина**: Токены доступа устарели или были отозваны.

**Решение**:

1. Перенаправьте пользователя на страницу авторизации Google
2. После успешной авторизации обновите токены в базе данных

### Письма не отправляются в режиме разработки

**Причина**: В режиме разработки (NODE_ENV=development) отправка писем отключена по умолчанию.

**Решение**:

1. Установите переменную окружения `ENABLE_REAL_EMAILS=true`
2. Или измените режим на production: `NODE_ENV=production`

### Ошибка "Токены в переменных окружения отсутствуют или истекли"

**Причина**: Система пытается использовать устаревший метод с токенами из переменных окружения.

**Решение**:

1. Укажите `userId` при вызове функций отправки почты
2. Выполните миграцию токенов в базу данных

### Ошибка при отправке через Gmail API с автоматическим переходом на SMTP

**Причина**: Проблема с Gmail API, но SMTP настроен корректно.

**Решение**:

1. Проверьте логи для выявления причины ошибки Gmail API
2. Временно можно продолжать использовать SMTP
3. Исправьте проблему с Gmail API (обновите токены, проверьте права доступа и т.д.)

## Заключение

Использование Gmail API для отправки почты предоставляет множество преимуществ по сравнению с традиционным SMTP-подходом. Система автоматического обновления токенов обеспечивает бесперебойную работу без необходимости ручного вмешательства.

Для получения дополнительной информации о миграции токенов из переменных окружения в базу данных см. документ `docs/google-tokens-migration-guide.md`.
