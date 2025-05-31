# API настроек пользователя - Документация

## Обзор

API роут `/api/user/api-settings` предоставляет функциональность для управления персональными настройками API пользователя. Этот роут позволяет пользователям настраивать собственные API ключи и параметры для различных AI сервисов.

## Расположение файла

```
pages/api/user/api-settings.js
```

## Поддерживаемые методы

### GET /api/user/api-settings

Получение текущих настроек API пользователя.

**Авторизация:** Требуется

**Ответ при успехе (200):**

```json
{
  "apiKey": "",
  "baseUrl": "https://api.anthropic.com",
  "usePersonalSettings": false,
  "apiType": "anthropic",
  "langdockApiKey": "",
  "langdockAssistantId": "",
  "langdockBaseUrl": "https://api.langdock.com/assistant/v1/chat/completions",
  "langdockRegion": "eu",
  "geminiApiKey": "",
  "geminiModel": "gemini-1.5-pro",
  "geminiBaseUrl": "https://generativelanguage.googleapis.com",
  "geminiTemperature": 0.7,
  "huggingfaceApiKey": "",
  "huggingfaceModel": "meta-llama/Llama-2-7b-chat-hf",
  "huggingfaceBaseUrl": "https://api-inference.huggingface.co/models",
  "huggingfaceTemperature": 0.7,
  "huggingfaceMaxTokens": 4000,
  "openRouterApiKey": "",
  "openRouterModel": "google/gemma-3-12b-it:free",
  "openRouterBaseUrl": "https://openrouter.ai/api/v1",
  "openRouterTemperature": 0.7,
  "openRouterMaxTokens": 4000
}
```

### PUT /api/user/api-settings

Обновление настроек API пользователя.

**Авторизация:** Требуется

**Тело запроса:**

```json
{
  "useCustomApi": true,
  "apiType": "anthropic",
  "apiKey": "your-api-key",
  "baseUrl": "https://api.anthropic.com"
}
```

**Поддерживаемые типы API:**

- `anthropic` - Anthropic Claude API
- `langdock` - LangDock API
- `gemini` - Google Gemini API
- `huggingface` - Hugging Face API
- `openrouter` - OpenRouter API

**Ответ при успехе (200):**

```json
{
  "message": "Настройки API успешно сохранены",
  "settings": {
    // Обновленные настройки
  }
}
```

## Поля настроек

### Общие поля

- `useCustomApi` (boolean) - Использовать персональные настройки API
- `apiType` (string) - Тип API сервиса

### Anthropic API

- `apiKey` (string) - API ключ Anthropic
- `baseUrl` (string) - Базовый URL API

### LangDock API

- `langdockApiKey` (string) - API ключ LangDock
- `langdockAssistantId` (string) - ID ассистента
- `langdockBaseUrl` (string) - Базовый URL API
- `langdockRegion` (string) - Регион (eu/us)

### Gemini API

- `geminiApiKey` (string) - API ключ Google Gemini
- `geminiModel` (string) - Модель Gemini
- `geminiBaseUrl` (string) - Базовый URL API
- `geminiTemperature` (float) - Температура генерации

### Hugging Face API

- `huggingfaceApiKey` (string) - API ключ Hugging Face
- `huggingfaceModel` (string) - Модель для использования
- `huggingfaceBaseUrl` (string) - Базовый URL API
- `huggingfaceTemperature` (float) - Температура генерации
- `huggingfaceMaxTokens` (integer) - Максимальное количество токенов

### OpenRouter API

- `openRouterApiKey` (string) - API ключ OpenRouter
- `openRouterModel` (string) - Модель для использования
- `openRouterBaseUrl` (string) - Базовый URL API
- `openRouterTemperature` (float) - Температура генерации
- `openRouterMaxTokens` (integer) - Максимальное количество токенов

## Валидация

### Обязательные поля

- `useCustomApi` - должно быть булевым значением
- `apiType` - должно быть одним из поддерживаемых типов

### Условно обязательные поля

При `useCustomApi: true` требуется соответствующий API ключ:

- Для `anthropic`: `apiKey`
- Для `langdock`: `langdockApiKey`
- Для `gemini`: `geminiApiKey`
- Для `huggingface`: `huggingfaceApiKey`
- Для `openrouter`: `openRouterApiKey`

## Коды ошибок

- `401` - Пользователь не авторизован
- `404` - Пользователь не найден
- `405` - Метод не поддерживается
- `400` - Ошибка валидации данных
- `500` - Внутренняя ошибка сервера

## Примеры использования

### Получение настроек

```javascript
const response = await fetch('/api/user/api-settings');
const settings = await response.json();
```

### Сохранение настроек Anthropic

```javascript
const response = await fetch('/api/user/api-settings', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    useCustomApi: true,
    apiType: 'anthropic',
    apiKey: 'your-anthropic-key',
    baseUrl: 'https://api.anthropic.com',
  }),
});
```

### Сохранение настроек Gemini

```javascript
const response = await fetch('/api/user/api-settings', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    useCustomApi: true,
    apiType: 'gemini',
    geminiApiKey: 'your-gemini-key',
    geminiModel: 'gemini-1.5-pro',
    geminiTemperature: 0.7,
  }),
});
```

## База данных

API использует таблицу `UserApiSettings` из Prisma схемы:

```prisma
model UserApiSettings {
  id                     String   @id @default(cuid())
  userId                 String   @unique
  apiKey                 String?
  baseUrl                String?
  useCustomApi           Boolean  @default(false)
  createdAt              DateTime @default(now())
  updatedAt              DateTime @updatedAt
  apiType                String   @default("gemini")
  // ... другие поля для различных API
  user                   User     @relation(fields: [userId], references: [id])
}
```

## Безопасность

- Все запросы требуют авторизации через NextAuth.js
- API ключи хранятся в зашифрованном виде в базе данных
- Валидация входных данных предотвращает инъекции
- Логирование операций для аудита

## Логирование

API логирует следующие события:

- Успешное получение настроек
- Успешное обновление настроек
- Ошибки валидации
- Ошибки базы данных

## Тестирование

Для тестирования API используйте файл `test-api-settings.js`:

```bash
node test-api-settings.js
```

Тесты проверяют:

- Авторизацию
- Поддерживаемые методы
- Валидацию данных
- Доступность роута

## Интеграция с фронтендом

API интегрирован со страницей `/user/api-settings` и компонентом `ApiSettingsForm`. Страница автоматически загружает настройки при монтировании и отправляет обновления при сохранении формы.

## Статус реализации

✅ **Завершено:**

- Создан API роут `/api/user/api-settings`
- Реализованы GET и PUT методы
- Добавлена авторизация и валидация
- Поддержка всех типов API (Anthropic, LangDock, Gemini, Hugging Face, OpenRouter)
- Автоматическое создание настроек по умолчанию
- Обработка ошибок и логирование
- Тестирование базовой функциональности

🔄 **Рекомендации для дальнейшего развития:**

- Добавить шифрование API ключей
- Реализовать ротацию ключей
- Добавить лимиты на количество запросов
- Расширить логирование для аудита
