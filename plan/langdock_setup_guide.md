# Руководство по настройке и использованию LangDock API

## Содержание

1. [Введение](#введение)
2. [Регистрация в LangDock](#регистрация-в-langdock)
3. [Создание ассистента](#создание-ассистента)
4. [Получение ID ассистента](#получение-id-ассистента)
5. [Настройка переменных окружения](#настройка-переменных-окружения)
6. [Проверка работоспособности](#проверка-работоспособности)
7. [Устранение неполадок](#устранение-неполадок)

## Введение

LangDock — это платформа, предоставляющая унифицированный доступ к различным моделям искусственного интеллекта через единый API. В нашем проекте LangDock используется для обеспечения работы чата с ИИ, который помогает пользователям готовиться к техническим собеседованиям.

Основные преимущества использования LangDock в нашем проекте:

- Предварительно настроенные ассистенты с возможностью тонкой настройки через веб-интерфейс
- Доступ к различным моделям (OpenAI, Anthropic и др.) через единый API
- Дополнительные возможности (поиск в интернете, анализ данных, генерация изображений)
- Структурированные ответы и возможность получения ответов в заданном формате
- Единый интерфейс для работы с различными моделями

**Важно:** Для корректной работы чата с ИИ необходимо настроить LangDock API и указать правильный ID ассистента в файле `.env`. Текущая проблема заключается в том, что переменная `DEFAULT_LANGDOCK_ASSISTANT_ID` содержит заглушку "default-assistant-id" вместо реального ID ассистента.

## Регистрация в LangDock

Для начала работы с LangDock необходимо зарегистрироваться на платформе:

1. Перейдите на сайт [LangDock](https://langdock.com)
2. Нажмите кнопку "Sign Up" или "Get Started"
3. Заполните форму регистрации, указав:
   - Email
   - Пароль
   - Имя (опционально)
4. Подтвердите регистрацию, перейдя по ссылке, отправленной на указанный email
5. Войдите в личный кабинет LangDock, используя свои учетные данные

После успешной регистрации вы получите доступ к панели управления LangDock, где сможете создавать ассистентов и управлять API-ключами.

## Создание ассистента

Для создания нового ассистента в LangDock выполните следующие шаги:

1. В личном кабинете LangDock перейдите в раздел "Assistants"
2. Нажмите кнопку "Create New Assistant"
3. Заполните форму создания ассистента:

### Основные настройки

- **Name**: "Interview Assistant" (или другое подходящее название)
- **Description**: "Помощник для подготовки к техническим собеседованиям"

### Настройки модели

**Важно:** Обратите внимание на несоответствие между Anthropic и gpt-4o. В текущей реализации проект использует API Anthropic Claude, но при создании ассистента в LangDock рекомендуется выбрать модель, совместимую с Anthropic Claude.

- **Model**: Выберите "Claude 3 Sonnet" или "Claude 3 Opus" (рекомендуется для лучшего качества ответов)
- **Context Size**: Установите значение не менее 100K токенов
- **SDK**: Выберите "Anthropic"

### Дополнительные настройки

Включите следующие опции для расширения возможностей ассистента:

- **Image analysis**: Включите для возможности анализа изображений
- **Canvas**: Включите для возможности работы с графическими элементами
- **Supports tools**: Включите для поддержки инструментов

❌ Maintenance mode: Включен - Это режим обслуживания, который позволяет пользователям видеть модель, но не использовать ее. Только администраторы могут использовать модель в этом режиме.

### Настройки в разделе Settings

В разделе "Settings" настройте системный промпт для ассистента:

```
Ты - опытный Frontend разработчик, отвечающий на вопросы по собеседованию.
Дай подробный, но лаконичный ответ, включающий примеры кода, где это уместно.
Структурируй ответ с использованием маркдауна для лучшей читаемости.
Если вопрос связан с конкретной компанией, учитывай специфику технологий и подходов этой компании.
```

4. Нажмите кнопку "Create Assistant" для создания ассистента

## Получение ID ассистента

После создания ассистента необходимо получить его ID для использования в проекте:

1. В личном кабинете LangDock перейдите в раздел "Assistants"
2. Найдите созданного ассистента в списке и нажмите на его название
3. ID ассистента будет отображаться в URL страницы в формате:

   ```
   https://app.langdock.com/assistants/asst_123456789
   ```

   где `asst_123456789` - это ID вашего ассистента

4. Скопируйте ID ассистента (включая префикс `asst_`)

**Альтернативный способ:**

1. На странице деталей ассистента найдите раздел "API Integration"
2. ID ассистента будет указан в примере кода для API-запроса

## Настройка переменных окружения

Для использования созданного ассистента в проекте необходимо обновить переменные окружения:

1. Откройте файл `.env` в корневой директории проекта
2. Найдите строку с переменной `DEFAULT_LANGDOCK_ASSISTANT_ID`:
   ```
   DEFAULT_LANGDOCK_ASSISTANT_ID=default-assistant-id
   ```
3. Замените значение `default-assistant-id` на ID вашего ассистента, полученный на предыдущем шаге:
   ```
   DEFAULT_LANGDOCK_ASSISTANT_ID=asst_123456789
   ```
4. Сохраните изменения в файле `.env`

**Дополнительно:** Если в файле `.env` отсутствуют другие переменные, связанные с LangDock API, добавьте их:

```
LANGDOCK_API_KEY=your_api_key_here
LANGDOCK_BASE_URL=https://api.langdock.com/assistant/v1/chat/completions
LANGDOCK_REGION=eu  # или us, в зависимости от вашего региона
```

Для получения API-ключа LangDock:

1. В личном кабинете LangDock перейдите в раздел "API Keys"
2. Нажмите кнопку "Create New API Key"
3. Введите название для ключа (например, "Interview Assistant API Key")
4. Выберите необходимые разрешения (минимум - доступ к ассистентам)
5. Нажмите "Create API Key"
6. Скопируйте и сохраните сгенерированный API-ключ (он будет показан только один раз)

## Проверка работоспособности

После настройки LangDock API и обновления переменных окружения необходимо проверить работоспособность чата с ИИ:

### Проверка на локальном сервере

1. Запустите локальный сервер разработки:
   ```
   npm run dev
   ```
2. Откройте браузер и перейдите по адресу: `http://localhost:3000/interview-assistant`
3. Введите тестовый вопрос в поле ввода (например, "Что такое замыкания в JavaScript?")
4. Нажмите кнопку "Получить ответ"
5. Убедитесь, что ответ получен и отображается корректно

### Проверка на продакшн-сервере

1. Разверните обновленную версию проекта на продакшн-сервере
2. Откройте браузер и перейдите по адресу: `https://supermock.ru/interview-assistant`
3. Введите тестовый вопрос и проверьте работу чата с ИИ

### Проверка логов

Для более детальной проверки можно просмотреть логи запросов к API:

1. Откройте консоль разработчика в браузере (F12)
2. Перейдите на вкладку "Network"
3. Отправьте запрос через интерфейс чата
4. Найдите запрос к LangDock API и проверьте его содержимое и ответ

## Устранение неполадок

### Проблема: Чат с ИИ не работает, возвращает ошибку

**Возможные причины и решения:**

1. **Неверный ID ассистента**

   - Проверьте, что в файле `.env` указан правильный ID ассистента
   - Убедитесь, что ID включает префикс `asst_`
   - Проверьте, что ассистент активен в панели управления LangDock

2. **Проблемы с API-ключом**

   - Убедитесь, что API-ключ LangDock действителен и имеет необходимые разрешения
   - Проверьте, что API-ключ правильно указан в настройках
   - При необходимости создайте новый API-ключ

3. **Несоответствие модели**

   - Убедитесь, что выбранная модель в LangDock совместима с кодом проекта
   - Проверьте настройки SDK в LangDock (должен быть выбран Anthropic)

4. **Проблемы с подключением к API**
   - Проверьте, что указан правильный базовый URL для API
   - Убедитесь, что выбран правильный регион API (EU или US)
   - Проверьте доступность API LangDock с вашего сервера

### Проблема: Низкое качество ответов

**Возможные причины и решения:**

1. **Недостаточно детальный системный промпт**

   - Улучшите системный промпт в настройках ассистента
   - Добавьте более конкретные инструкции и примеры

2. **Неподходящая модель**

   - Попробуйте использовать более мощную модель (например, Claude 3 Opus вместо Sonnet)
   - Увеличьте Context Size для обработки более сложных запросов

3. **Недостаточный контекст**
   - Убедитесь, что в запросах передается достаточно контекста
   - Проверьте, что контекст компании и даты собеседования учитывается при формировании ответов

### Проблема: Превышение лимитов API

**Возможные причины и решения:**

1. **Исчерпан лимит запросов**

   - Проверьте текущее использование API в панели управления LangDock
   - При необходимости увеличьте лимиты или перейдите на более высокий тарифный план

2. **Слишком большие запросы**
   - Оптимизируйте размер запросов, уменьшив количество передаваемого контекста
   - Используйте кэширование ответов для часто задаваемых вопросов

### Общие рекомендации по устранению неполадок

1. **Проверьте логи сервера** для выявления ошибок при обработке запросов
2. **Используйте режим отладки** в браузере для анализа запросов и ответов
3. **Проверьте документацию LangDock** для получения актуальной информации об API
4. **Обратитесь в поддержку LangDock** при возникновении сложных проблем

## Дополнительные ресурсы

- [Официальная документация LangDock](https://docs.langdock.com)
- [API Reference LangDock](https://docs.langdock.com/api-reference)
- [Примеры использования LangDock API](https://docs.langdock.com/examples)
- [Форум поддержки LangDock](https://community.langdock.com)
