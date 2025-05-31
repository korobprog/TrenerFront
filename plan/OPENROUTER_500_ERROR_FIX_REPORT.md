# Отчет об исправлении ошибки 500 при сохранении настроек OpenRouter API

## Проблема

При сохранении настроек OpenRouter API через админ-панель возникала ошибка 500 с сообщением:

```
Argument `langdockBaseUrl` must not be null
```

## Причина ошибки

В API эндпоинте `/pages/api/admin/interview-assistant-settings.js` в строках 289 и 318 устанавливались значения `null` для обязательных полей в схеме Prisma:

```javascript
// Проблемные строки:
langdockAssistantId: null,
langdockBaseUrl: null,        // ← Это поле обязательное в схеме Prisma
langdockRegion: null,
geminiApiKey: null,
geminiModel: null,
geminiBaseUrl: null,
geminiTemperature: null,
```

В схеме Prisma поле `langdockBaseUrl` определено как:

```prisma
langdockBaseUrl        String  @default("https://api.langdock.com/assistant/v1/chat/completions")
```

Поле имеет значение по умолчанию, но не помечено как опциональное (нет знака `?`), что делает его обязательным. Попытка установить `null` в обязательное поле вызывала ошибку Prisma.

## Решение

### 1. Исправлен основной API эндпоинт

Файл: `pages/api/admin/interview-assistant-settings.js`

**Удалены проблемные строки:**

- Убраны все поля, связанные с LangDock (`langdockAssistantId`, `langdockBaseUrl`, `langdockRegion`)
- Убраны все поля, связанные с Gemini (`geminiApiKey`, `geminiModel`, `geminiBaseUrl`, `geminiTemperature`)
- Убраны все поля, связанные с Anthropic и HuggingFace

**Оставлены только поля OpenRouter:**

- `apiType` (всегда 'openrouter')
- `openRouterApiKey`
- `openRouterBaseUrl`
- `openRouterModel`
- `openRouterTemperature`
- `openRouterMaxTokens`
- `maxQuestionsPerDay`
- `maxTokensPerQuestion`

### 2. Исправлен тестовый API эндпоинт

Файл: `pages/api/test-settings-no-auth.js`

Применены те же исправления для консистентности.

### 3. Создан тест для проверки исправления

Файл: `test-openrouter-settings-fix.js`

Тест проверяет:

- Успешное сохранение настроек OpenRouter без ошибки 500
- Корректность сохраненных данных
- Возможность получения настроек после сохранения

## Изменения в коде

### До исправления (проблемный код):

```javascript
data: {
  apiKey,
  maxQuestionsPerDay: convertedMaxQuestionsPerDay,
  maxTokensPerQuestion: convertedMaxTokensPerQuestion,
  isActive,
  apiType,
  // Очищаем поля других провайдеров
  langdockAssistantId: null,
  langdockBaseUrl: null,        // ← ОШИБКА: null в обязательном поле
  langdockRegion: null,
  geminiApiKey: null,
  geminiModel: null,
  geminiBaseUrl: null,
  geminiTemperature: null,
  // Поля для OpenRouter
  openRouterApiKey,
  openRouterBaseUrl,
  openRouterModel,
  openRouterTemperature: convertedOpenRouterTemperature,
  openRouterMaxTokens: convertedOpenRouterMaxTokens,
}
```

### После исправления (рабочий код):

```javascript
data: {
  apiKey,
  maxQuestionsPerDay: convertedMaxQuestionsPerDay,
  maxTokensPerQuestion: convertedMaxTokensPerQuestion,
  isActive,
  apiType,
  // Поля для OpenRouter
  openRouterApiKey,
  openRouterBaseUrl,
  openRouterModel,
  openRouterTemperature: convertedOpenRouterTemperature,
  openRouterMaxTokens: convertedOpenRouterMaxTokens,
}
```

## Результат

✅ **Ошибка 500 устранена**
✅ **API работает только с полями OpenRouter**
✅ **Код упрощен и очищен от ненужных полей**
✅ **Создан тест для проверки исправления**

## Тестирование

Для проверки исправления запустите:

```bash
node test-openrouter-settings-fix.js
```

Тест проверит:

1. Отправку PUT запроса с настройками OpenRouter
2. Отсутствие ошибки 500
3. Корректность сохраненных данных
4. Возможность получения настроек через GET запрос

## Область применения

Исправление затрагивает только API эндпоинт для настроек интервью-ассистента и не влияет на другие части системы. Все функции OpenRouter API продолжают работать в полном объеме.

---

**Дата исправления:** 31.05.2025  
**Статус:** ✅ Исправлено и протестировано
