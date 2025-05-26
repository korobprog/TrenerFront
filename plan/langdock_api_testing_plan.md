# План тестирования интеграции LangDock API

## Обзор

Данный документ содержит план тестирования интеграции LangDock API, включая тестирование утилиты langdockApi.js, API-эндпоинта langdock-generate.js и компонента ApiSettingsForm.js.

## Тестовые скрипты

Для тестирования интеграции LangDock API были созданы следующие тестовые скрипты:

1. **test-langdock-api-settings.js** - тестирование функции getApiSettings и логики формирования базового URL
2. **test-langdock-parse-response.js** - тестирование функции parseResponse и обработки различных форматов ответов
3. **test-langdock-integration.js** - комплексное тестирование полного цикла работы с API

### Запуск тестовых скриптов

Для запуска тестовых скриптов выполните следующие команды:

```bash
# Тестирование настроек API
node scripts/test-langdock-api-settings.js

# Тестирование парсинга ответов
node scripts/test-langdock-parse-response.js

# Комплексное тестирование интеграции
node scripts/test-langdock-integration.js
```

## Тестирование API-эндпоинта langdock-generate.js

Для тестирования API-эндпоинта langdock-generate.js необходимо запустить сервер Next.js в режиме разработки:

```bash
npm run dev
```

### Примеры запросов к API-эндпоинту

#### 1. Базовый запрос

```bash
curl -X POST http://localhost:3000/api/langdock-generate \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN" \
  -d '{
    "text": "Что такое React и какие его основные преимущества?"
  }'
```

#### 2. Запрос с указанием категории и компании

```bash
curl -X POST http://localhost:3000/api/langdock-generate \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN" \
  -d '{
    "text": "Что такое React и какие его основные преимущества?",
    "category": "react",
    "company": "Example Company"
  }'
```

#### 3. Запрос с указанием даты собеседования

```bash
curl -X POST http://localhost:3000/api/langdock-generate \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN" \
  -d '{
    "text": "Что такое React и какие его основные преимущества?",
    "category": "react",
    "company": "Example Company",
    "interviewDate": "2025-06-01T10:00:00.000Z"
  }'
```

#### 4. Запрос с принудительным обновлением кэша

```bash
curl -X POST http://localhost:3000/api/langdock-generate \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN" \
  -d '{
    "text": "Что такое React и какие его основные преимущества?",
    "forceRefresh": true
  }'
```

### Ожидаемый формат ответа

```json
{
  "answer": "React - это JavaScript-библиотека для создания пользовательских интерфейсов...",
  "fromCache": false,
  "tokensUsed": 450,
  "apiCost": 0.00675
}
```

### Возможные ошибки и их коды

- **400** - Некорректный запрос (отсутствует текст или некорректный формат даты)
- **401** - Не авторизован (отсутствует или недействительный токен сессии)
- **429** - Превышен дневной лимит запросов к API
- **502** - Ошибка при обращении к LangDock API
- **503** - Сервис временно недоступен (настройки API не найдены)

## Тестирование компонента ApiSettingsForm.js

Для тестирования компонента ApiSettingsForm.js необходимо:

1. Запустить сервер Next.js в режиме разработки:

   ```bash
   npm run dev
   ```

2. Открыть страницу настроек API в браузере:

   ```
   http://localhost:3000/user/api-settings
   ```

3. Проверить следующие сценарии:
   - Выбор типа API "LangDock API"
   - Ввод API ключа LangDock
   - Ввод ID ассистента LangDock
   - Ввод базового URL LangDock
   - Сохранение настроек и проверка их применения

### Рекомендуемые улучшения компонента ApiSettingsForm.js

В текущей реализации компонента ApiSettingsForm.js отсутствует поле для выбора региона LangDock. Рекомендуется добавить следующий код после поля langdockBaseUrl:

```jsx
<div className={styles.formGroup}>
  <label htmlFor="langdockRegion" className={styles.formLabel}>
    Регион LangDock
  </label>
  <select
    id="langdockRegion"
    name="langdockRegion"
    value={settings.langdockRegion || 'eu'}
    onChange={handleChange}
    className={styles.formInput}
  >
    <option value="eu">Европа (EU)</option>
    <option value="us">США (US)</option>
  </select>
  <p className={styles.formHelp}>Выберите регион для API запросов LangDock.</p>
</div>
```

## Отладка проблем

### 1. Проблемы с настройками региона и формированием базового URL

Для отладки проблем с настройками региона и формированием базового URL рекомендуется:

1. Запустить скрипт test-langdock-api-settings.js и проанализировать результаты
2. Проверить логику формирования базового URL в функции getApiSettings
3. Убедиться, что регион корректно учитывается при формировании URL
4. Проверить обработку случая, когда базовый URL уже указан явно

### 2. Проблемы с парсингом ответа от Anthropic API

Для отладки проблем с парсингом ответа от Anthropic API рекомендуется:

1. Запустить скрипт test-langdock-parse-response.js и проанализировать результаты
2. Проверить логику извлечения текста из ответа в функции parseResponse
3. Убедиться, что корректно обрабатываются различные форматы ответов (массив или строка)
4. Проверить расчет токенов и стоимости запроса

### 3. Проблемы с API-эндпоинтом langdock-generate.js

Для отладки проблем с API-эндпоинтом langdock-generate.js рекомендуется:

1. Добавить дополнительное логирование в функцию handler:

   ```javascript
   console.log('Запрос к API-эндпоинту langdock-generate:', {
     method: req.method,
     headers: req.headers,
     body: req.body,
   });
   ```

2. Проверить обработку ошибок и возвращаемые коды статуса
3. Убедиться, что корректно обрабатываются все параметры запроса
4. Проверить авторизацию и получение сессии пользователя

## Рекомендации по дальнейшему развитию интеграции

### 1. Улучшение обработки ошибок

Рекомендуется улучшить обработку ошибок в функции getAnswer, добавив более детальную информацию о причинах ошибок и возможных способах их устранения.

### 2. Кэширование результатов

Для оптимизации использования API и снижения затрат рекомендуется реализовать кэширование результатов запросов к API. Это позволит избежать повторных запросов для одинаковых вопросов.

### 3. Мониторинг использования API

Рекомендуется реализовать систему мониторинга использования API, которая будет отслеживать количество запросов, использование токенов и затраты на API. Это позволит контролировать расходы и оптимизировать использование API.

### 4. Поддержка потоковой передачи ответов

Для улучшения пользовательского опыта рекомендуется реализовать поддержку потоковой передачи ответов от API (streaming). Это позволит отображать ответы по мере их генерации, а не ждать полного ответа.

### 5. Расширение поддержки моделей

Рекомендуется расширить поддержку моделей Claude, добавив возможность выбора конкретной модели (claude-3-opus, claude-3-sonnet, claude-3-haiku) в настройках API.

## Заключение

Данный план тестирования позволяет проверить все компоненты интеграции LangDock API и выявить потенциальные проблемы. Рекомендуется регулярно проводить тестирование при внесении изменений в код интеграции.
