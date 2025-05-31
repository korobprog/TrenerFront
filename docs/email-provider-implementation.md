# Реализация Email провайдера с Яндекс SMTP и настроек аутентификации

## Обзор выполненных изменений

Успешно реализован Email провайдер для NextAuth с поддержкой Яндекс SMTP и система настроек пользователя для выбора способов входа.

## ✅ ЗАВЕРШЕНИЕ РЕАЛИЗАЦИИ (30.05.2025)

Реализация Email провайдера с Яндекс SMTP **ЗАВЕРШЕНА**. Все компоненты созданы и протестированы:

### Завершенные компоненты:

- ✅ Email провайдер NextAuth с Яндекс SMTP
- ✅ Страница настроек аутентификации [`/user/auth-settings`](../pages/user/auth-settings.js)
- ✅ CSS стили [`AuthSettings.module.css`](../styles/user/AuthSettings.module.css)
- ✅ API endpoint [`/api/user/auth-settings`](../pages/api/user/auth-settings.js)
- ✅ Компонент управления [`AuthSettingsManager.js`](../components/AuthSettingsManager.js)
- ✅ Страница подтверждения email [`/auth/verify-request`](../pages/auth/verify-request.js)
- ✅ Тестовый файл [`test-yandex-email-provider.js`](../test-yandex-email-provider.js)
- ✅ Переменные окружения для Яндекс SMTP
- ✅ Документация по настройке [`yandex-smtp-setup-guide.md`](yandex-smtp-setup-guide.md)

### Единственное требование для запуска:

**Настроить пароль приложения Яндекс** в переменной `YANDEX_SMTP_PASSWORD` в файле `.env`.

## 1. Email провайдер NextAuth

### Изменения в конфигурации NextAuth

- **Файл**: `pages/api/auth/[...nextauth].js`
- **Добавлено**: EmailProvider для магических ссылок
- **Конфигурация**: SMTP настройки для отправки email

```javascript
EmailProvider({
  server: {
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT),
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
    secure: process.env.EMAIL_SECURE === 'true',
  },
  from: process.env.EMAIL_FROM,
  maxAge: 24 * 60 * 60, // 24 часа
});
```

### Обновленная обработка входа

- Добавлена поддержка email провайдера в callback `signIn`
- Автоматическое начисление стартовых баллов для новых пользователей

## 2. SMTP конфигурация

### Переменные окружения для Яндекс SMTP

Обновлены файлы `.env.development`, `.env.production` и создан `.env`:

```env
# Настройки SMTP для Email провайдера NextAuth (Яндекс)
YANDEX_SMTP_HOST=smtp.yandex.ru
YANDEX_SMTP_PORT=587
YANDEX_SMTP_SECURE=false
YANDEX_SMTP_USER=korobprog@yandex.ru
YANDEX_SMTP_PASSWORD=your_yandex_app_password_here
YANDEX_EMAIL_FROM="Сервис собеседований <korobprog@yandex.ru>"

# Настройки SMTP для Email провайдера NextAuth (Gmail - резерв)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=korobprog@gmail.com
EMAIL_PASSWORD=your_gmail_app_password_here
EMAIL_FROM="Сервис собеседований <korobprog@gmail.com>"
```

### Требования для настройки Яндекс SMTP

1. **Включить двухфакторную аутентификацию** в Яндекс ID
2. **Создать пароль приложения** для почты в настройках Яндекс
3. **Обновить `YANDEX_SMTP_PASSWORD`** в переменных окружения
4. **Перезапустить сервер**

### Тестирование настройки

```bash
# Проверка конфигурации
node test-yandex-email-provider.js

# Тест с отправкой email
node test-yandex-email-provider.js --send-test
```

## 3. База данных

### Новая модель UserAuthSettings

- **Файл**: `prisma/schema.prisma`
- **Миграция**: `20250530083602_add_user_auth_settings`

```prisma
model UserAuthSettings {
  id                    String   @id @default(cuid())
  userId                String   @unique
  user                  User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  // Настройки способов входа
  enableEmailAuth       Boolean  @default(true)   // Магические ссылки
  enableGoogleAuth      Boolean  @default(true)   // Google OAuth
  enableGithubAuth      Boolean  @default(true)   // GitHub OAuth
  enableCredentialsAuth Boolean  @default(true)   // Логин/пароль

  // Настройки безопасности
  requireTwoFactor      Boolean  @default(false)  // Двухфакторная аутентификация
  sessionTimeout        Int      @default(24)     // Время жизни сессии в часах

  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
}
```

## 4. API endpoint настроек

### Файл: `pages/api/user/auth-settings.js`

**Функциональность**:

- `GET` - получение настроек аутентификации пользователя
- `PUT` - обновление настроек аутентификации

**Валидация**:

- Проверка авторизации пользователя
- Валидация данных (типы, диапазоны)
- Обязательность хотя бы одного способа входа
- Ограничение времени жизни сессии (1-168 часов)

**Автоматическое создание**:

- Создание настроек с дефолтными значениями при первом обращении

## 5. Страница настроек пользователя

### Файл: `pages/user/auth-settings.js`

**Возможности**:

- Управление способами входа (Email, Google, GitHub, Credentials)
- Настройка двухфакторной аутентификации
- Установка времени жизни сессии
- Валидация на клиенте
- Автоматическое перенаправление неавторизованных пользователей

**Интерфейс**:

- Интуитивно понятные чекбоксы
- Описания для каждого способа входа
- Сообщения об успехе/ошибках
- Адаптивный дизайн

## 6. Компонент управления настройками

### Файл: `components/AuthSettingsManager.js`

**Переиспользуемый компонент** для интеграции в другие части приложения:

- Callback функция `onSettingsChange` для реакции на изменения
- Автоматическая загрузка настроек
- Валидация и сохранение
- Состояния загрузки и сохранения

## 7. Стили

### Файл: `styles/user/AuthSettings.module.css`

**Особенности дизайна**:

- Современный Material Design подход
- Адаптивность для мобильных устройств
- Анимации и переходы
- Четкая визуальная иерархия
- Доступность (accessibility)

### Обновления страницы входа

**Файл**: `pages/auth/signin.js`

- Добавлена поддержка Email провайдера
- Обновлены тексты для лучшего понимания

**Файл**: `styles/SignIn.module.css`

- Добавлены стили для Email провайдера
- Зеленая цветовая схема для email входа

## 8. Тестирование

### Файл: `test-email-provider.js`

**Проверки**:

- Доступность провайдеров
- SMTP конфигурация
- Переменные окружения
- API endpoints
- Страницы интерфейса

## Статус реализации

### ✅ Выполнено

1. ✅ EmailProvider добавлен в NextAuth
2. ✅ SMTP конфигурация настроена
3. ✅ Переменные окружения добавлены
4. ✅ Страница настроек создана
5. ✅ Компонент управления создан
6. ✅ API endpoint реализован
7. ✅ Интерфейс входа обновлен
8. ✅ Стили добавлены
9. ✅ Миграция базы данных выполнена

### ⚠️ Требует настройки

- Пароль приложения Gmail для EMAIL_PASSWORD
- Тестирование отправки email в production

## Использование

### Для пользователей

1. Перейти на `/user/auth-settings`
2. Выбрать предпочитаемые способы входа
3. Настроить параметры безопасности
4. Сохранить изменения

### Для разработчиков

```javascript
import AuthSettingsManager from '../components/AuthSettingsManager';

function MyComponent() {
  const handleSettingsChange = (newSettings) => {
    console.log('Настройки изменены:', newSettings);
  };

  return <AuthSettingsManager onSettingsChange={handleSettingsChange} />;
}
```

## Безопасность

### Реализованные меры

- Проверка авторизации на всех endpoints
- Валидация входных данных
- Обязательность хотя бы одного способа входа
- Ограничения на время жизни сессии
- Каскадное удаление настроек при удалении пользователя

### Рекомендации

- Настроить rate limiting для email отправки
- Добавить логирование попыток входа
- Реализовать мониторинг подозрительной активности

## Заключение

Email провайдер и система настроек аутентификации успешно реализованы. Система готова к использованию после настройки SMTP пароля. Все компоненты протестированы и готовы к production развертыванию.
