# Руководство по тестированию системы авторизации TrenerFront

## Обзор

Данное руководство описывает комплексную систему тестирования авторизации в проекте TrenerFront. Система включает в себя проверку доступа к админ-панели для разных ролей пользователей и валидацию исправлений в системе авторизации.

## Цели тестирования

### Основные цели:

1. **Обычные пользователи** (`role: 'user'`) НЕ должны видеть админ-панель
2. **Обычные админы** (`role: 'admin'`) должны видеть админ-панель
3. **Супер админы** (`role: 'superadmin'`) должны видеть админ-панель
4. **korobprog@gmail.com** должен получать доступ к админ-функциям

### Дополнительные проверки:

- Middleware авторизации работает корректно
- API endpoints защищены должным образом
- Заблокированные пользователи не имеют доступа
- HTTP запросы обрабатываются правильно

## Структура тестов

### 1. Основной тест (`test-auth-fixes.js`)

**Функциональность:**

- Создание тестовых пользователей с разными ролями
- Тестирование middleware `withAdminAuth` и `withSuperAdminAuth`
- Симуляция доступа к админ API endpoints
- Специальная проверка пользователя korobprog@gmail.com
- Анализ статистики ролей в системе

**Тестируемые компоненты:**

- `lib/middleware/adminAuth.js`
- `lib/middleware/superAdminAuth.js`
- Роли пользователей в базе данных
- Логика блокировки пользователей

### 2. HTTP тесты (`test-auth-api-requests.js`)

**Функциональность:**

- Реальные HTTP запросы к API endpoints
- Тестирование с различными типами авторизации
- Проверка неавторизованного доступа
- Тестирование заблокированных пользователей

**Тестируемые endpoints:**

- `/api/admin/statistics`
- `/api/admin/users`
- `/api/admin/logs`
- `/api/admin/interviews`

### 3. Главный скрипт (`run-auth-tests.js`)

**Функциональность:**

- Объединение всех тестов
- Генерация итогового отчета
- Поддержка различных режимов запуска
- Обработка ошибок и таймаутов

## Использование

### Быстрый старт

```bash
# Запуск всех тестов
node run-auth-tests.js

# Запуск только основных тестов
node run-auth-tests.js --basic

# Запуск только HTTP тестов
node run-auth-tests.js --http

# Справка по использованию
node run-auth-tests.js --help
```

### Индивидуальные тесты

```bash
# Только основные тесты авторизации
node test-auth-fixes.js

# Только HTTP тесты API
node test-auth-api-requests.js
```

## Предварительные требования

### Зависимости

```bash
npm install @prisma/client bcryptjs
```

### Переменные окружения

```bash
# .env.local
DATABASE_URL="postgresql://..."
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key"
```

### База данных

- Prisma должна быть настроена и подключена
- Схема базы данных должна быть актуальной
- Должны существовать таблицы User, Session, AdminActionLog

## Интерпретация результатов

### Успешное выполнение

```
✓ withAdminAuth для user: ДОСТУП ЗАПРЕЩЕН ✓
✓ withAdminAuth для admin: ДОСТУП РАЗРЕШЕН ✓
✓ withAdminAuth для superadmin: ДОСТУП РАЗРЕШЕН ✓
✓ withSuperAdminAuth для user: ДОСТУП ЗАПРЕЩЕН ✓
✓ withSuperAdminAuth для admin: ДОСТУП ЗАПРЕЩЕН ✓
✓ withSuperAdminAuth для superadmin: ДОСТУП РАЗРЕШЕН ✓
```

### Проблемы в системе

```
✗ withAdminAuth для user: НЕОЖИДАННЫЙ РЕЗУЛЬТАТ
✗ /api/admin/statistics для user: НЕОЖИДАННЫЙ РЕЗУЛЬТАТ (200)
```

### Статистика

```
ОБЩАЯ СТАТИСТИКА:
  Всего тестов: 24
  Пройдено: 22
  Провалено: 2
  Успешность: 91.7%
```

## Типичные проблемы и решения

### 1. Пользователь с ролью 'user' имеет доступ к админ API

**Причина:** Middleware не проверяет роль корректно

**Решение:**

```javascript
// В lib/middleware/adminAuth.js
if (user.role !== 'admin' && user.role !== 'superadmin') {
  return res.status(403).json({ message: 'Требуются права администратора' });
}
```

### 2. korobprog@gmail.com не имеет доступа

**Причина:** Неправильная роль в базе данных

**Решение:**

```sql
UPDATE "User" SET role = 'superadmin' WHERE email = 'korobprog@gmail.com';
```

### 3. HTTP тесты не проходят

**Причина:** Сервер не запущен или недоступен

**Решение:**

```bash
# Запустить сервер разработки
npm run dev

# Или проверить переменную NEXTAUTH_URL
echo $NEXTAUTH_URL
```

### 4. Ошибки подключения к базе данных

**Причина:** Неправильная строка подключения

**Решение:**

```bash
# Проверить DATABASE_URL
echo $DATABASE_URL

# Выполнить миграции
npx prisma migrate deploy
```

## Расширение тестов

### Добавление нового API endpoint

1. Добавить endpoint в массив `adminEndpoints` в `test-auth-fixes.js`:

```javascript
const adminEndpoints = [
  '/api/admin/statistics',
  '/api/admin/users',
  '/api/admin/logs',
  '/api/admin/interviews',
  '/api/admin/your-new-endpoint', // Добавить здесь
];
```

2. Добавить в HTTP тесты в `test-auth-api-requests.js`:

```javascript
const endpoints = [
  { path: '/api/admin/statistics', method: 'GET' },
  { path: '/api/admin/users', method: 'GET' },
  { path: '/api/admin/logs', method: 'GET' },
  { path: '/api/admin/interviews', method: 'GET' },
  { path: '/api/admin/your-new-endpoint', method: 'GET' }, // Добавить здесь
];
```

### Добавление новой роли

1. Обновить массив `validRoles` в тестах:

```javascript
const validRoles = ['user', 'admin', 'superadmin', 'moderator'];
```

2. Добавить тестового пользователя:

```javascript
const testUsers = [
  // ... существующие пользователи
  {
    email: 'test.moderator@example.com',
    name: 'Тестовый Модератор',
    role: 'moderator',
    password: 'moderatorpassword123',
  },
];
```

3. Обновить логику проверки доступа в middleware.

## Автоматизация

### CI/CD интеграция

```yaml
# .github/workflows/auth-tests.yml
name: Auth Tests
on: [push, pull_request]
jobs:
  test-auth:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: npx prisma migrate deploy
      - run: node run-auth-tests.js
```

### Регулярное тестирование

```bash
# Добавить в crontab для ежедневной проверки
0 2 * * * cd /path/to/project && node run-auth-tests.js >> /var/log/auth-tests.log 2>&1
```

## Мониторинг и логирование

### Логи тестирования

Все тесты создают подробные логи с цветовой кодировкой:

- 🟢 Зеленый: Успешные тесты
- 🔴 Красный: Провалившиеся тесты
- 🟡 Желтый: Предупреждения
- 🔵 Синий: Информационные сообщения

### Сохранение результатов

```bash
# Сохранить результаты в файл
node run-auth-tests.js > auth-test-results-$(date +%Y%m%d).log 2>&1
```

## Безопасность

### Тестовые данные

- Тестовые пользователи создаются с временными паролями
- После тестирования предлагается очистка тестовых данных
- Реальные пользователи не затрагиваются

### Конфиденциальность

- Пароли хешируются с помощью bcrypt
- Сессии создаются только для тестирования
- Логи не содержат чувствительной информации

## Поддержка

При возникновении проблем:

1. Проверьте логи выполнения тестов
2. Убедитесь в корректности настроек окружения
3. Проверьте состояние базы данных
4. Обратитесь к документации по компонентам системы

## Версионность

- **v1.0** - Базовая функциональность тестирования
- **v1.1** - Добавлены HTTP тесты
- **v1.2** - Интеграция всех тестов в единую систему

---

_Документация обновлена: 31.05.2025_
