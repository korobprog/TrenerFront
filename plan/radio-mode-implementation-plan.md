# План реализации функционала рации с активацией по клавише пробел

## 1. Обзор текущей реализации

На основе анализа компонента TextInput.js, выделены следующие ключевые элементы:

- Компонент использует состояние isListening для отслеживания активности записи голоса
- Активация записи происходит через функцию handleMicClick (строки 241-279)
- Распознавание речи реализовано с использованием Web Speech API
- Обработка распознанного текста происходит в обработчике события onresult (строки 263-267)
- Функция handleSubmit (строки 128-140) обрабатывает отправку вопроса
- Обработчик нажатия клавиш handleKeyDown (строки 147-199) уже реализован для навигации по подсказкам

## 2. Необходимые изменения

### 2.1. Добавление новых состояний

```javascript
// Новые состояния
const [radioMode, setRadioMode] = useState(false); // Режим рации (ON/OFF)
const [spacePressed, setSpacePressed] = useState(false); // Состояние клавиши пробел
const [recognition, setRecognition] = useState(null); // Экземпляр SpeechRecognition
```

### 2.2. Инициализация объекта распознавания речи

```javascript
// Инициализация объекта распознавания речи
useEffect(() => {
  if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognitionInstance = new SpeechRecognition();

    recognitionInstance.lang = 'ru-RU';
    recognitionInstance.interimResults = false;

    recognitionInstance.onstart = () => {
      setIsListening(true);
    };

    recognitionInstance.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInputValue(transcript);

      // Если активен режим рации и была отпущена клавиша пробел,
      // автоматически отправляем сообщение
      if (radioMode && !spacePressed) {
        // Небольшая задержка перед отправкой, чтобы пользователь успел увидеть текст
        setTimeout(() => {
          handleSubmit();
        }, 300);
      } else {
        debounceFetchSuggestions(transcript);
      }
    };

    recognitionInstance.onerror = (event) => {
      console.error('Ошибка распознавания речи:', event.error);
      setIsListening(false);
    };

    recognitionInstance.onend = () => {
      setIsListening(false);
    };

    setRecognition(recognitionInstance);
  }

  return () => {
    // Очистка при размонтировании компонента
    if (recognition) {
      recognition.abort();
    }
  };
}, []);
```

### 2.3. Модификация обработчика нажатия клавиш

```javascript
const handleKeyDown = (e) => {
  // Если активен режим рации и нажата клавиша пробел
  if (radioMode && e.code === 'Space' && !isListening && !spacePressed) {
    e.preventDefault(); // Предотвращаем стандартное поведение (ввод пробела)
    setSpacePressed(true);

    // Запускаем распознавание речи
    if (recognition) {
      recognition.start();
    }
    return;
  }

  // Существующая логика обработки клавиш для навигации по подсказкам
  // ...
};
```

### 2.4. Обработчик отпускания клавиш

```javascript
const handleKeyUp = (e) => {
  // Если активен режим рации и отпущена клавиша пробел
  if (radioMode && e.code === 'Space' && isListening) {
    e.preventDefault();
    setSpacePressed(false);

    // Останавливаем распознавание речи
    if (recognition) {
      recognition.stop();
    }
  }
};
```

### 2.5. Добавление переключателя режима рации

```jsx
{
  /* Переключатель режима рации */
}
<button
  type="button"
  className={`${styles.radioButton} ${
    radioMode ? styles.radioButtonActive : ''
  }`}
  onClick={() => setRadioMode(!radioMode)}
  aria-label={radioMode ? 'Выключить режим рации' : 'Включить режим рации'}
  title={radioMode ? 'Выключить режим рации' : 'Включить режим рации'}
>
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="2" />
    <path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14" />
  </svg>
</button>;
```

### 2.6. Добавление визуальной индикации активного режима рации

```css
/* Добавить в TextInput.module.css */
.radioButton {
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  cursor: pointer;
  padding: 8px;
  border-radius: 50%;
  color: #666;
  transition: all 0.2s ease;
}

.radioButtonActive {
  color: #4a90e2;
  background-color: rgba(74, 144, 226, 0.1);
}

.inputWrapperRadioMode {
  border: 1px solid #4a90e2;
  box-shadow: 0 0 0 2px rgba(74, 144, 226, 0.2);
}

.spaceHint {
  position: absolute;
  bottom: -24px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 12px;
  color: #4a90e2;
  background-color: rgba(255, 255, 255, 0.9);
  padding: 2px 8px;
  border-radius: 4px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.spaceHintVisible {
  opacity: 1;
}
```

### 2.7. Добавление подсказки для пользователя

```jsx
{
  /* Подсказка по использованию пробела */
}
{
  radioMode && (
    <div className={`${styles.spaceHint} ${styles.spaceHintVisible}`}>
      Удерживайте пробел для записи
    </div>
  );
}
```

### 2.8. Обновление обработчиков событий в компоненте input

```jsx
<input
  type="text"
  className={styles.input}
  placeholder="Введите вопрос по Frontend разработке..."
  value={inputValue}
  onChange={handleInputChange}
  onKeyDown={handleKeyDown}
  onKeyUp={handleKeyUp} // Добавляем обработчик отпускания клавиш
  onFocus={() =>
    inputValue.trim() && setSuggestions.length > 0 && setShowSuggestions(true)
  }
  ref={inputRef}
  aria-label="Поле ввода вопроса"
  aria-autocomplete="list"
  aria-controls={showSuggestions ? 'suggestions-list' : undefined}
  aria-activedescendant={
    selectedSuggestionIndex >= 0
      ? `suggestion-${selectedSuggestionIndex}`
      : undefined
  }
  autoComplete="off"
  disabled={isLoading}
/>
```

### 2.9. Обновление формы для отображения режима рации

```jsx
<form
  onSubmit={handleSubmit}
  className={`${styles.inputWrapper} ${
    radioMode ? styles.inputWrapperRadioMode : ''
  }`}
>
  {/* ... */}
</form>
```

## 3. Диаграмма потока данных и взаимодействия

```
Пользователь -> Переключатель режима рации -> Включает режим рации
                                           -> Визуальная индикация активного режима
Пользователь -> Клавиша пробел -> Нажимает и удерживает пробел
                               -> Запускает распознавание речи
                               -> Визуальная индикация записи
Пользователь -> SpeechRecognition API -> Говорит сообщение
                                      -> Преобразует речь в текст
Пользователь -> Клавиша пробел -> Отпускает пробел
                               -> Останавливает распознавание
                               -> Финализирует текст
                               -> Автоматически отправляет сообщение
```

## 4. Диаграмма состояний компонента

```
НормальныйРежим -> Нажатие на переключатель -> РежимРации
НормальныйРежим -> Нажатие на микрофон -> ГолосовойВвод
НормальныйРежим -> ВводТекста -> Нажатие Enter или кнопки отправки -> ОтправкаВручную
ГолосовойВвод -> Завершение распознавания -> НормальныйРежим
ОтправкаВручную -> Сообщение отправлено -> НормальныйРежим
РежимРации -> Нажатие пробела -> Запись
Запись -> Отпускание пробела -> Отправка
Отправка -> Сообщение отправлено -> РежимРации (Ожидание)
```

## 5. Список изменений в компоненте TextInput.js

- Добавление новых состояний:
  - radioMode - для отслеживания режима рации (ON/OFF)
  - spacePressed - для отслеживания состояния клавиши пробел
  - recognition - для хранения экземпляра SpeechRecognition
- Добавление новых функций:
  - Инициализация объекта распознавания речи при монтировании компонента
  - Обработчик отпускания клавиш handleKeyUp
  - Модификация обработчика нажатия клавиш handleKeyDown
- Добавление новых элементов интерфейса:
  - Переключатель режима рации
  - Визуальная индикация активного режима рации
  - Подсказка по использованию пробела
- Модификация существующих элементов:
  - Обновление обработчиков событий для поля ввода
  - Обновление класса формы для визуальной индикации
- Добавление новых стилей:
  - Стили для переключателя режима рации
  - Стили для визуальной индикации активного режима
  - Стили для подсказки по использованию пробела

## 6. Рекомендации по интеграции

- Рефакторинг функции handleMicClick:
  - Выделить логику создания и настройки объекта распознавания речи в отдельную функцию
  - Использовать сохраненный экземпляр recognition вместо создания нового при каждом нажатии
- Обработка ошибок:
  - Добавить обработку случаев, когда браузер не поддерживает SpeechRecognition API
  - Предусмотреть корректное поведение при ошибках распознавания
- Тестирование:
  - Протестировать функционал в различных браузерах
  - Проверить корректность работы при быстром переключении между режимами
  - Убедиться, что автоматическая отправка работает корректно
- Улучшения UX:
  - Добавить звуковую индикацию начала и окончания записи
  - Реализовать анимацию при записи для лучшей обратной связи
  - Добавить возможность отмены отправки после распознавания (короткий таймаут)
