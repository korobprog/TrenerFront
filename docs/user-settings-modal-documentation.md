# Документация компонента UserSettingsModal

## Обзор

Компонент `UserSettingsModal` представляет собой модальное окно настроек пользователя с системой вкладок для управления различными аспектами профиля и настроек системы.

## Структура компонента

### Основные файлы

- `components/user/UserSettingsModal.js` - основной компонент
- `styles/user/UserSettingsModal.module.css` - стили компонента

### Зависимости

- React (useState, useEffect)
- next-auth/react (useSession)
- NotificationContext (для уведомлений)

## Функциональность

### Вкладки модального окна

#### 1. Профиль

- **Аватарка пользователя**: загрузка и предварительный просмотр
- **Имя пользователя**: редактируемое поле
- **Email**: только для чтения
- **Кнопка сохранения**: отправляет данные на `/api/user/profile`

#### 2. Пароль

- **Текущий пароль**: обязательное поле
- **Новый пароль**: минимум 6 символов
- **Подтверждение пароля**: должно совпадать с новым
- **Валидация**: проверка совпадения паролей
- **API**: отправляет данные на `/api/user/change-password`

#### 3. Авторизация (Безопасность)

- **Методы входа**:
  - Email авторизация
  - Google OAuth
  - GitHub OAuth
  - Credentials авторизация
- **Двухфакторная аутентификация**: включение/отключение
- **Время сессии**: настройка автоматического выхода (1-168 часов)
- **API**: отправляет данные на `/api/user/auth-settings`

#### 4. API настройки

- **Персональные настройки**: включение собственных API ключей
- **Типы API**:
  - Anthropic Claude
  - OpenRouter
  - Google Gemini
- **Настройки для каждого типа**:
  - API ключи
  - Модели
  - Base URL
  - Параметры (температура, токены)
- **API**: отправляет данные на `/api/user/api-settings`

#### 5. Администрирование (только для админов)

- **Информация о роли**: текущая роль пользователя
- **ID пользователя**: уникальный идентификатор
- **Быстрый доступ**: ссылка на панель администратора
- **Условный рендеринг**: показывается только для admin/superadmin

## Props

```javascript
interface UserSettingsModalProps {
  isOpen: boolean; // Открыто ли модальное окно
  onClose: () => void; // Функция закрытия модального окна
}
```

## Состояние компонента

### Основные состояния

```javascript
const [activeTab, setActiveTab] = useState('profile');
const [loading, setLoading] = useState(false);
const [saving, setSaving] = useState(false);
```

### Состояния данных

```javascript
const [profileSettings, setProfileSettings] = useState({
  name: '',
  email: '',
  avatar: null,
  avatarPreview: null,
});

const [passwordSettings, setPasswordSettings] = useState({
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
});

const [authSettings, setAuthSettings] = useState({
  enableEmailAuth: true,
  enableGoogleAuth: true,
  enableGithubAuth: true,
  enableCredentialsAuth: true,
  requireTwoFactor: false,
  sessionTimeout: 24,
});

const [apiSettings, setApiSettings] = useState({
  usePersonalSettings: false,
  apiType: 'anthropic',
  // ... другие настройки API
});
```

## Основные функции

### Загрузка данных

```javascript
const loadUserSettings = async () => {
  // Загружает настройки авторизации и API при открытии модального окна
};
```

### Обработчики сохранения

```javascript
const handleSaveProfile = async () => {
  // Сохраняет профиль пользователя
};

const handleChangePassword = async () => {
  // Изменяет пароль с валидацией
};

const handleSaveAuthSettings = async () => {
  // Сохраняет настройки авторизации
};

const handleSaveApiSettings = async () => {
  // Сохраняет настройки API
};
```

### Обработчики UI

```javascript
const handleClose = () => {
  // Закрывает модальное окно и сбрасывает состояние
};

const handleOverlayClick = (e) => {
  // Закрывает модальное окно при клике на overlay
};

const handleAvatarChange = (e) => {
  // Обрабатывает загрузку аватарки
};
```

## Стили и адаптивность

### Основные CSS классы

- `.overlay` - затемненный фон модального окна
- `.modal` - контейнер модального окна
- `.header` - заголовок с кнопкой закрытия
- `.tabs` - контейнер вкладок
- `.tab` / `.tab.active` - стили вкладок
- `.tabContent` - содержимое вкладок
- `.section` - секция с настройками
- `.formGroup` - группа полей формы
- `.actions` - контейнер кнопок действий

### Адаптивность

- **Десктоп**: вертикальные вкладки слева, содержимое справа
- **Планшет**: горизонтальные вкладки сверху
- **Мобильный**: полноэкранное модальное окно, упрощенная навигация

### Брейкпоинты

- `768px` - переход на мобильную версию
- `480px` - дополнительные оптимизации для малых экранов

## Использование

### Базовое использование

```javascript
import { useState } from 'react';
import UserSettingsModal from './components/user/UserSettingsModal';

function MyComponent() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  return (
    <>
      <button onClick={() => setIsSettingsOpen(true)}>Настройки</button>

      <UserSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </>
  );
}
```

### Требования к окружению

```javascript
// Компонент должен быть обернут в провайдеры
import { SessionProvider } from 'next-auth/react';
import { NotificationProvider } from './contexts/NotificationContext';

function App() {
  return (
    <SessionProvider session={session}>
      <NotificationProvider>
        <MyComponent />
      </NotificationProvider>
    </SessionProvider>
  );
}
```

## API интеграция

### Необходимые эндпоинты

1. `GET/PUT /api/user/profile` - профиль пользователя
2. `PUT /api/user/change-password` - смена пароля
3. `GET/PUT /api/user/auth-settings` - настройки авторизации
4. `GET/PUT /api/user/api-settings` - настройки API

### Формат данных API

```javascript
// Профиль
{
  name: string,
  avatar?: File
}

// Смена пароля
{
  currentPassword: string,
  newPassword: string
}

// Настройки авторизации
{
  enableEmailAuth: boolean,
  enableGoogleAuth: boolean,
  enableGithubAuth: boolean,
  requireTwoFactor: boolean,
  sessionTimeout: number
}

// Настройки API
{
  useCustomApi: boolean,
  apiType: 'anthropic' | 'openrouter' | 'gemini',
  apiKey?: string,
  // ... другие параметры в зависимости от типа
}
```

## Безопасность

### Валидация

- **Пароли**: минимум 6 символов, проверка совпадения
- **Аватарка**: максимум 5MB, только изображения
- **API ключи**: маскировка в полях ввода (type="password")

### Права доступа

- **Обычные пользователи**: доступ к профилю, паролю, авторизации, API
- **Администраторы**: дополнительно доступ к вкладке администрирования

## Особенности реализации

### Управление состоянием

- Использует локальное состояние React (useState)
- Автоматическая загрузка данных при открытии модального окна
- Сброс состояния при закрытии

### Обработка ошибок

- Интеграция с системой уведомлений
- Показ ошибок валидации
- Обработка сетевых ошибок

### UX/UI особенности

- Индикаторы загрузки и сохранения
- Блокировка кнопок во время операций
- Информационные блоки с подсказками
- Предупреждения для критических действий

## Тестирование

### Тестовые файлы

- `test-user-settings-modal.js` - полные React тесты
- `test-user-settings-simple.js` - простые структурные тесты

### Покрытие тестами

- Рендеринг компонента
- Переключение вкладок
- Обработка пользовательского ввода
- Валидация форм
- Права доступа (админ/пользователь)

## Дальнейшее развитие

### Планируемые улучшения

1. **Расширенная валидация**: более строгие правила для паролей
2. **Загрузка аватарок**: интеграция с файловым хранилищем
3. **Экспорт настроек**: возможность экспорта/импорта конфигурации
4. **История изменений**: логирование изменений настроек
5. **Темы оформления**: настройка внешнего вида

### Интеграция с другими компонентами

- Связь с системой уведомлений
- Интеграция с панелью администратора
- Синхронизация с настройками приложения

## Заключение

Компонент `UserSettingsModal` предоставляет полнофункциональный интерфейс для управления настройками пользователя с современным дизайном, адаптивностью и хорошей архитектурой. Компонент готов к использованию и может быть легко расширен для дополнительной функциональности.
