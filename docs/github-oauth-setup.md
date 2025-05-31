# Настройка GitHub OAuth для SuperMock

## Инструкция по настройке GitHub OAuth

### 1. Создание GitHub OAuth App

1. Перейдите на [GitHub Developer Settings](https://github.com/settings/developers)
2. Нажмите "New OAuth App"
3. Заполните форму:
   - **Application name**: SuperMock
   - **Homepage URL**: `http://localhost:3000` (для разработки) или ваш домен для продакшена
   - **Application description**: Платформа для подготовки к собеседованиям
   - **Authorization callback URL**: `http://localhost:3000/api/auth/callback/github` (для разработки)

### 2. Получение Client ID и Client Secret

После создания приложения:

1. Скопируйте **Client ID**
2. Нажмите "Generate a new client secret" и скопируйте **Client Secret**

### 3. Настройка переменных окружения

#### Для разработки (файл `.env.local`):

```env
GITHUB_CLIENT_ID=ваш_client_id_здесь
GITHUB_CLIENT_SECRET=ваш_client_secret_здесь
```

#### Для продакшена (файл `.env.production`):

```env
GITHUB_CLIENT_ID=ваш_client_id_здесь
GITHUB_CLIENT_SECRET=ваш_client_secret_здесь
```

### 4. Настройка для продакшена

Для продакшена обновите:

- **Homepage URL**: `https://yourdomain.com`
- **Authorization callback URL**: `https://yourdomain.com/api/auth/callback/github`

### 5. Проверка настройки

После настройки переменных окружения:

1. Перезапустите сервер разработки: `npm run dev`
2. Откройте `http://localhost:3000`
3. Нажмите кнопку "Войти"
4. В модальном окне должна появиться кнопка "Продолжить с GitHub"

### 6. Возможные проблемы и решения

#### GitHub провайдер не отображается

- Убедитесь, что переменные `GITHUB_CLIENT_ID` и `GITHUB_CLIENT_SECRET` установлены
- Проверьте, что значения не равны `your_github_client_id` (значение по умолчанию)
- Перезапустите сервер после изменения переменных окружения

#### Ошибка при авторизации

- Проверьте правильность callback URL в настройках GitHub App
- Убедитесь, что домен в NEXTAUTH_URL соответствует домену в GitHub App

#### Ошибка "Application suspended"

- Проверьте статус вашего GitHub приложения в Developer Settings
- Убедитесь, что приложение не нарушает правила GitHub

### 7. Безопасность

- **Никогда не коммитьте** файлы с секретными ключами в репозиторий
- Используйте разные приложения для разработки и продакшена
- Регулярно обновляйте Client Secret

### 8. Дополнительные возможности

GitHub OAuth предоставляет доступ к:

- Базовой информации профиля пользователя
- Email адресу пользователя
- Аватару пользователя

Все эти данные автоматически интегрируются с системой аутентификации SuperMock.
