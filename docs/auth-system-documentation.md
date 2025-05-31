# Документация системы аутентификации NextAuth.js

## Обзор

Система аутентификации была расширена для поддержки многоуровневой аутентификации с тремя методами входа:

1. **Google OAuth** - существующий провайдер
2. **GitHub OAuth** - новый провайдер
3. **Credentials** - улучшенный провайдер для username/password

## Провайдеры аутентификации

### 1. Google OAuth

**Конфигурация:**

- Поддерживает расширенные scopes для Calendar и Gmail
- Автоматическое обновление токенов
- Связывание аккаунтов по email

**Переменные окружения:**

```env
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

### 2. GitHub OAuth (НОВЫЙ)

**Конфигурация:**

- Scopes: `read:user user:email`
- Связывание аккаунтов по email
- Поддержка GitHub токенов

**Переменные окружения:**

```env
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
```

**Настройка GitHub OAuth App:**

1. Перейдите в GitHub Settings > Developer settings > OAuth Apps
2. Создайте новое приложение
3. Установите Authorization callback URL: `https://yourdomain.com/api/auth/callback/github`
4. Скопируйте Client ID и Client Secret в переменные окружения

### 3. Credentials (УЛУЧШЕННЫЙ)

**Новые возможности:**

- Поддержка обычных пользователей (не только суперадмин)
- Безопасное хеширование паролей с bcrypt
- Валидация email и username
- Проверка блокировки пользователей
- Обновление времени последнего входа

**Поддерживаемые форматы логина:**

- Email адрес
- Username 'admin' или 'superadmin' (для обратной совместимости)

## Безопасность

### Хеширование паролей

Используется библиотека `bcrypt` с 12 раундами хеширования:

```javascript
import { hashPassword, verifyPassword } from '../lib/utils/passwordUtils';

// Хеширование пароля
const hashedPassword = await hashPassword('userPassword');

// Проверка пароля
const isValid = await verifyPassword('userPassword', hashedPassword);
```

### Требования к паролям

- Минимум 8 символов
- Максимум 128 символов
- Хотя бы одна цифра
- Хотя бы одна буква
- Хотя бы один специальный символ

### Валидация данных

```javascript
import {
  validatePassword,
  validateEmail,
  validateUsername,
} from '../lib/utils/passwordUtils';

// Валидация пароля
const passwordValidation = validatePassword(password);
if (!passwordValidation.isValid) {
  console.log(passwordValidation.errors);
}

// Валидация email
const isValidEmail = validateEmail(email);

// Валидация username
const usernameValidation = validateUsername(username);
```

## Callbacks

### JWT Callback

Добавляет в токен:

- `role` - роль пользователя
- `userId` - ID пользователя
- `provider` - провайдер аутентификации
- `providerAccountId` - ID аккаунта провайдера

### Session Callback

Добавляет в сессию:

- Все данные из JWT токена
- `timestamp` - метка времени для предотвращения кэширования

### SignIn Callback

Обрабатывает логику входа для разных провайдеров:

- **Google/GitHub**: всегда разрешает вход
- **Credentials**: проверяет валидность учетных данных

## Управление пользователями

### Утилиты для работы с пользователями

```javascript
import {
  createUserWithPassword,
  createSuperAdmin,
  createAdmin,
  updateUserPassword,
  updateUserBlockStatus,
  getUserByEmail,
} from '../lib/utils/userManagement';
```

### Создание пользователей

```javascript
// Обычный пользователь
const user = await createUserWithPassword({
  email: 'user@example.com',
  password: 'securePassword123!',
  name: 'John Doe',
  role: 'user',
});

// Администратор
const admin = await createAdmin({
  email: 'admin@example.com',
  password: 'adminPassword123!',
  name: 'Admin User',
});

// Суперадминистратор
const superAdmin = await createSuperAdmin({
  email: 'superadmin@example.com',
  password: 'superPassword123!',
  name: 'Super Admin',
});
```

## Скрипты управления

### 1. Миграция пароля суперадминистратора

```bash
node scripts/migrate-superadmin-password.js
```

Обновляет пароль существующего суперадминистратора на новую систему хеширования.

### 2. Создание пользователей

```bash
# Создать нового пользователя
node scripts/create-user-with-password.js

# Показать список пользователей
node scripts/create-user-with-password.js --list

# Показать справку
node scripts/create-user-with-password.js --help
```

## Схема базы данных

Текущая схема Prisma совместима с новой системой аутентификации:

- `User.password` - хешированный пароль (nullable)
- `User.role` - роль пользователя
- `User.isBlocked` - статус блокировки
- `User.lastLoginAt` - время последнего входа
- `Account` - таблица для OAuth аккаунтов
- `Session` - таблица для сессий

## Переменные окружения

### Обязательные

```env
# NextAuth.js
NEXTAUTH_URL=https://yourdomain.com
NEXTAUTH_SECRET=your_secret_key

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/database

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# GitHub OAuth
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
```

### Дополнительные (для Gmail API)

```env
GMAIL_USER_ID=your_gmail@gmail.com
GOOGLE_REDIRECT_URI=https://yourdomain.com/api/auth/callback/google
GOOGLE_ACCESS_TOKEN=your_access_token
GOOGLE_REFRESH_TOKEN=your_refresh_token
GOOGLE_TOKEN_EXPIRY=token_expiry_timestamp
```

## Миграция с старой системы

### Шаги миграции

1. **Обновите переменные окружения** - добавьте GitHub OAuth credentials
2. **Мигрируйте пароль суперадминистратора**:
   ```bash
   node scripts/migrate-superadmin-password.js
   ```
3. **Создайте дополнительных пользователей** (при необходимости):
   ```bash
   node scripts/create-user-with-password.js
   ```
4. **Протестируйте все методы входа**

### Обратная совместимость

- Существующие Google OAuth сессии продолжат работать
- Суперадминистратор может войти с логинами 'admin' или 'superadmin'
- Все существующие функции сохранены

## Тестирование

### Проверка входа через разные провайдеры

1. **Google OAuth**: используйте существующий Google аккаунт
2. **GitHub OAuth**: используйте GitHub аккаунт (после настройки OAuth App)
3. **Credentials**: используйте email/пароль созданного пользователя

### Проверка ролей и разрешений

- Суперадминистратор: полный доступ ко всем функциям
- Администратор: доступ к админ-панели
- Пользователь: базовый доступ к приложению

## Безопасность и рекомендации

### Рекомендации по безопасности

1. **Используйте сильные пароли** для всех аккаунтов
2. **Регулярно обновляйте** OAuth credentials
3. **Мониторьте** попытки входа и подозрительную активность
4. **Используйте HTTPS** в продакшене
5. **Регулярно обновляйте** зависимости

### Rate Limiting

Рекомендуется добавить rate limiting для:

- Попыток входа через Credentials
- API endpoints аутентификации
- Создания новых аккаунтов

### Логирование

Система логирует:

- Попытки входа (успешные и неуспешные)
- Получение OAuth токенов
- Ошибки аутентификации

## Поддержка и устранение неполадок

### Частые проблемы

1. **GitHub OAuth не работает**:

   - Проверьте правильность Client ID и Secret
   - Убедитесь, что callback URL настроен правильно

2. **Credentials вход не работает**:

   - Проверьте, что пароль хеширован правильно
   - Убедитесь, что пользователь не заблокирован

3. **Токены Google истекли**:
   - Используйте скрипт обновления токенов
   - Проверьте refresh_token

### Логи для отладки

Система выводит подробные логи в консоль для отладки процесса аутентификации.
