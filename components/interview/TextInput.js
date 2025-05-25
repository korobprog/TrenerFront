import { useState, useEffect, useRef, useCallback } from 'react';
import styles from '../../styles/interview/TextInput.module.css';
import { useSession } from 'next-auth/react';

/**
 * Компонент TextInput для ввода текста с автоподсказками
 *
 * @param {Object} props - Свойства компонента
 * @param {Function} props.onSubmit - Функция, вызываемая при отправке вопроса
 * @param {boolean} props.isLoading - Флаг загрузки (для отображения индикатора)
 * @returns {JSX.Element} - React компонент
 */
const TextInput = ({ onSubmit, isLoading = false }) => {
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [isListening, setIsListening] = useState(false);
  // Новые состояния для режима рации
  const [radioMode, setRadioMode] = useState(false); // Режим рации (ON/OFF)
  const [spacePressed, setSpacePressed] = useState(false); // Состояние клавиши пробел

  // Состояния для отмены отправки
  const [showCancel, setShowCancel] = useState(false);
  const cancelTimeoutRef = useRef(null);
  const pendingSendRef = useRef(null);

  // Используем useRef вместо useState для хранения объекта распознавания речи
  const recognitionRef = useRef(null);

  const inputRef = useRef(null);
  const suggestionsRef = useRef(null);
  const debounceTimerRef = useRef(null);

  const { data: session } = useSession();

  /**
   * Функция для получения подсказок с сервера
   *
   * @param {string} query - Текст запроса
   */
  const fetchSuggestions = useCallback(
    async (query) => {
      if (!query || query.trim() === '' || !session) {
        setSuggestions([]);
        setShowSuggestions(false);
        return;
      }

      try {
        setIsLoadingSuggestions(true);
        const response = await fetch(
          `/api/interview-assistant/suggestions?query=${encodeURIComponent(
            query
          )}`
        );

        if (!response.ok) {
          throw new Error('Ошибка при получении подсказок');
        }

        const data = await response.json();

        if (data.suggestions && Array.isArray(data.suggestions)) {
          setSuggestions(data.suggestions);
          setShowSuggestions(data.suggestions.length > 0);
          setSelectedSuggestionIndex(-1);
        }
      } catch (error) {
        console.error('Ошибка при получении подсказок:', error);
        setSuggestions([]);
        setShowSuggestions(false);
      } finally {
        setIsLoadingSuggestions(false);
      }
    },
    [session]
  );

  /**
   * Дебаунсинг запросов к API для улучшения производительности
   *
   * @param {string} query - Текст запроса
   * @param {number} delay - Задержка в миллисекундах
   */
  const debounceFetchSuggestions = useCallback(
    (query, delay = 300) => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        fetchSuggestions(query);
      }, delay);
    },
    [fetchSuggestions]
  );

  /**
   * Обработчик изменения текста в поле ввода
   *
   * @param {Object} e - Событие изменения
   */
  const handleInputChange = (e) => {
    const value = e.target.value;
    setInputValue(value);

    if (value.trim()) {
      debounceFetchSuggestions(value);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  /**
   * Обработчик выбора подсказки
   *
   * @param {string} suggestion - Выбранная подсказка
   */
  const handleSelectSuggestion = (suggestion) => {
    setInputValue(suggestion);
    setSuggestions([]);
    setShowSuggestions(false);
    setSelectedSuggestionIndex(-1);

    // Фокус на поле ввода после выбора подсказки
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  /**
   * Обработчик отправки вопроса
   *
   * @param {Object} e - Событие отправки
   */
  const handleSubmit = (e, overrideText = null) => {
    if (e) {
      e.preventDefault();
    }

    const question = overrideText ? overrideText.trim() : inputValue.trim();
    if (question && onSubmit && !isLoading) {
      onSubmit(question);
      setInputValue('');
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  /**
   * Обработчик нажатия клавиш для навигации по подсказкам
   *
   * @param {Object} e - Событие нажатия клавиши
   */
  const handleKeyDown = (e) => {
    // Проверяем, является ли нажатая клавиша пробелом и активен ли режим рации
    if (
      (e.key === ' ' || e.keyCode === 32) &&
      radioMode &&
      document.activeElement === inputRef.current
    ) {
      e.preventDefault(); // Предотвращаем стандартное поведение пробела
      setSpacePressed(true);

      // Запускаем распознавание только если оно еще не запущено
      if (!isListening && recognitionRef.current) {
        try {
          // Сначала инициализируем объект распознавания, если его нет
          if (!recognitionRef.current) {
            initializeSpeechRecognition();
          }

          // Запускаем распознавание
          setIsListening(true);
          recognitionRef.current.start();
        } catch (error) {
          console.error('Ошибка при запуске распознавания:', error);

          // Сбрасываем состояние и пробуем заново инициализировать
          setIsListening(false);
          initializeSpeechRecognition();

          // Пробуем запустить снова после небольшой задержки
          setTimeout(() => {
            try {
              setIsListening(true);
              if (recognitionRef.current) {
                recognitionRef.current.start();
              } else {
                console.error(
                  'Объект распознавания не инициализирован после повторной попытки'
                );
              }
            } catch (innerError) {
              console.error(
                'Повторная ошибка при запуске распознавания:',
                innerError
              );
              setIsListening(false);
            }
          }, 100);
        }
      }
      return;
    }

    // Если подсказки не отображаются, не обрабатываем клавиши навигации
    if (!showSuggestions || suggestions.length === 0) {
      if (e.key === 'Enter' && inputValue.trim()) {
        handleSubmit(e);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedSuggestionIndex((prevIndex) => {
          const newIndex =
            prevIndex < suggestions.length - 1 ? prevIndex + 1 : 0;
          scrollToSuggestion(newIndex);
          return newIndex;
        });
        break;

      case 'ArrowUp':
        e.preventDefault();
        setSelectedSuggestionIndex((prevIndex) => {
          const newIndex =
            prevIndex > 0 ? prevIndex - 1 : suggestions.length - 1;
          scrollToSuggestion(newIndex);
          return newIndex;
        });
        break;

      case 'Enter':
        e.preventDefault();
        if (
          selectedSuggestionIndex >= 0 &&
          selectedSuggestionIndex < suggestions.length
        ) {
          handleSelectSuggestion(suggestions[selectedSuggestionIndex]);
        } else if (inputValue.trim()) {
          handleSubmit(e);
        }
        break;

      case 'Escape':
        e.preventDefault();
        setSuggestions([]);
        setShowSuggestions(false);
        setSelectedSuggestionIndex(-1);
        break;

      default:
        break;
    }
  };

  /**
   * Прокручивает список подсказок к выбранной подсказке
   *
   * @param {number} index - Индекс выбранной подсказки
   */
  const scrollToSuggestion = (index) => {
    if (suggestionsRef.current && suggestionsRef.current.children[index]) {
      const container = suggestionsRef.current;
      const item = suggestionsRef.current.children[index];

      const containerRect = container.getBoundingClientRect();
      const itemRect = item.getBoundingClientRect();

      if (itemRect.bottom > containerRect.bottom) {
        container.scrollTop += itemRect.bottom - containerRect.bottom;
      } else if (itemRect.top < containerRect.top) {
        container.scrollTop -= containerRect.top - itemRect.top;
      }
    }
  };

  /**
   * Обработчик клика вне компонента для скрытия подсказок
   *
   * @param {Object} e - Событие клика
   */
  const handleClickOutside = useCallback((e) => {
    if (
      inputRef.current &&
      !inputRef.current.contains(e.target) &&
      suggestionsRef.current &&
      !suggestionsRef.current.contains(e.target)
    ) {
      setShowSuggestions(false);
    }
  }, []);

  /**
   * Обработчик нажатия на кнопку микрофона
   */
  const handleMicClick = () => {
    if (
      !('webkitSpeechRecognition' in window) &&
      !('SpeechRecognition' in window)
    ) {
      alert(
        'Ваш браузер не поддерживает распознавание речи. Пожалуйста, используйте Chrome, Edge или Safari.'
      );
      return;
    }

    console.log('Состояние перед запуском распознавания:', {
      recognitionExists: !!recognitionRef.current,
      isListening,
    });

    // Если объект распознавания не был создан успешно, пробуем инициализировать его снова
    if (!recognitionRef.current) {
      console.log('Попытка повторной инициализации SpeechRecognition');
      initializeSpeechRecognition();
    }

    // Используем существующий экземпляр из useRef
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
        console.log('Распознавание речи запущено через кнопку микрофона');
      } catch (error) {
        console.error('Ошибка при запуске распознавания речи:', error);
        setIsListening(false);
      }
    }
  };

  /**
   * Обработчик отпускания клавиш
   *
   * @param {Object} e - Событие отпускания клавиши
   */
  const handleKeyUp = (e) => {
    if ((e.key === ' ' || e.keyCode === 32) && radioMode) {
      e.preventDefault(); // Предотвращаем стандартное поведение
      setSpacePressed(false);

      // Останавливаем распознавание только если оно запущено
      if (isListening && recognitionRef.current) {
        try {
          recognitionRef.current.stop();
          // НЕ меняем isListening здесь, это произойдет в обработчике onend

          // Получаем текущий транскрибированный текст
          const currentText = inputValue.trim();

          // Если есть текст, отправляем его
          if (currentText) {
            // Небольшая задержка для завершения распознавания
            setTimeout(() => {
              handleSubmit({ preventDefault: () => {} }, currentText);
            }, 300);
          }
        } catch (error) {
          console.error('Ошибка при остановке распознавания:', error);
          setIsListening(false);
        }
      }
    }
  };

  /**
   * Инициализирует объект распознавания речи
   * @returns {boolean} - Успешность инициализации
   */
  const initializeSpeechRecognition = useCallback(() => {
    if (!window.SpeechRecognition && !window.webkitSpeechRecognition) {
      console.error('API распознавания речи не поддерживается в этом браузере');
      return false;
    }

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    // Сначала проверяем и очищаем существующий объект
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {
        console.error(
          'Ошибка при очистке предыдущего объекта распознавания:',
          e
        );
      }
    }

    // Создаем новый объект распознавания
    const recognition = new SpeechRecognition();
    recognition.lang = 'ru-RU';
    recognition.interimResults = true; // Включаем промежуточные результаты для транскрипции в реальном времени
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      // Звуковой сигнал старта записи
      playBeep('start');
    };

    recognition.onresult = (event) => {
      if (
        event.results &&
        event.results.length > 0 &&
        event.results[0].length > 0
      ) {
        const transcript = event.results[0][0].transcript;

        // Устанавливаем новое значение напрямую в DOM-элемент для немедленного обновления
        if (inputRef.current) {
          inputRef.current.value = transcript;
        }

        // Также обновляем состояние React для согласованности
        setInputValue(transcript);

        // Если активен режим рации и была отпущена клавиша пробел,
        // автоматически отправляем сообщение с возможностью отмены
        if (radioMode && !spacePressed) {
          // Сохраняем текст для отложенной отправки
          pendingSendRef.current = transcript;
          setShowCancel(true);
          // Ставим таймер на 2 секунды
          if (cancelTimeoutRef.current) clearTimeout(cancelTimeoutRef.current);
          cancelTimeoutRef.current = setTimeout(() => {
            if (pendingSendRef.current) {
              handleSubmit(
                { preventDefault: () => {} },
                pendingSendRef.current
              );
              pendingSendRef.current = null;
            }
            setShowCancel(false);
          }, 2000);
        } else {
          debounceFetchSuggestions(transcript);
        }
      }
    };

    recognition.onerror = (event) => {
      // Специфическая обработка ошибки доступа к микрофону
      if (
        event.error === 'not-allowed' ||
        event.error === 'permission-denied'
      ) {
        console.error('Доступ к микрофону запрещен пользователем');
        alert(
          'Для работы голосового ввода необходимо разрешить доступ к микрофону'
        );
        setIsListening(false);
      }
      // Если ошибка "aborted" и пробел всё ещё нажат, не меняем состояние isListening
      else if (event.error === 'aborted' && radioMode && spacePressed) {
        // Не меняем isListening, так как onend попробует перезапустить распознавание
      } else {
        setIsListening(false);
      }
    };

    recognition.onend = (event) => {
      // Звуковой сигнал окончания записи
      playBeep('end');
      // Если режим рации включен и пробел всё ещё нажат, пробуем перезапустить распознавание
      if (radioMode && spacePressed) {
        // Небольшая задержка перед перезапуском
        setTimeout(() => {
          try {
            recognition.start();
            setIsListening(true);
          } catch (error) {
            console.error('Ошибка при перезапуске распознавания:', error);
            setIsListening(false);
          }
        }, 100);
      } else {
        setIsListening(false);
      }
    };

    recognitionRef.current = recognition;
    return true;
  }, [
    radioMode,
    spacePressed,
    isListening,
    handleSubmit,
    debounceFetchSuggestions,
  ]);

  // Инициализация объекта распознавания речи с использованием useRef
  useEffect(() => {
    // Инициализируем распознавание речи при монтировании компонента
    initializeSpeechRecognition();

    return () => {
      // Очистка при размонтировании компонента
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (error) {
          console.error(
            'Ошибка при очистке объекта распознавания речи:',
            error
          );
        }
      }
    };
  }, []);

  // Эффект для добавления обработчика клика вне компонента
  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [handleClickOutside]);

  // Добавляем обработчики событий клавиатуры
  useEffect(() => {
    // Добавляем обработчики событий клавиатуры
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Удаляем обработчики при размонтировании компонента
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);

      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [radioMode, isListening, spacePressed]); // Добавляем spacePressed в зависимости

  // Эффект для переинициализации объекта распознавания при изменении режима рации
  useEffect(() => {
    if (radioMode) {
      // Небольшая задержка для гарантии, что предыдущий экземпляр был корректно очищен
      setTimeout(() => {
        const success = initializeSpeechRecognition();

        // Фокусируем поле ввода
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 100);
    } else {
      // Если распознавание активно, останавливаем его
      if (isListening && recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          console.error(
            'Ошибка при остановке распознавания при выключении режима рации:',
            e
          );
        }
        setIsListening(false);
      }
    }
  }, [radioMode, isListening, initializeSpeechRecognition]);

  // Эффект для очистки таймера дебаунсинга при размонтировании компонента
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Функция для воспроизведения короткого звукового сигнала
  const playBeep = (type = 'start') => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = type === 'start' ? 1200 : 800;
      gain.gain.value = 0.15;
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start();
      oscillator.stop(ctx.currentTime + 0.12);
      oscillator.onended = () => ctx.close();
    } catch (e) {
      // В случае ошибки ничего не делаем
    }
  };

  // Обработчик отмены отправки
  const handleCancelSend = () => {
    setShowCancel(false);
    pendingSendRef.current = null;
    if (cancelTimeoutRef.current) clearTimeout(cancelTimeoutRef.current);
  };

  // Очищаем таймер при размонтировании
  useEffect(() => {
    return () => {
      if (cancelTimeoutRef.current) clearTimeout(cancelTimeoutRef.current);
    };
  }, []);

  return (
    <div className={styles.container}>
      {/* Индикатор записи "REC" */}
      {radioMode && (spacePressed || isListening) && (
        <div className={styles.recIndicator}>REC</div>
      )}
      {/* Контейнер с подсказками */}
      {showSuggestions && (
        <div
          className={`${styles.suggestionsContainer} ${
            showSuggestions ? styles.suggestionsVisible : ''
          }`}
          role="listbox"
          aria-label="Подсказки"
        >
          <ul className={styles.suggestionsList} ref={suggestionsRef}>
            {suggestions.map((suggestion, index) => (
              <li
                key={index}
                className={`${styles.suggestionItem} ${
                  index === selectedSuggestionIndex
                    ? styles.suggestionItemSelected
                    : ''
                }`}
                onClick={() => handleSelectSuggestion(suggestion)}
                onMouseEnter={() => setSelectedSuggestionIndex(index)}
                role="option"
                aria-selected={index === selectedSuggestionIndex}
                tabIndex="-1"
              >
                {suggestion}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Форма ввода */}
      <form
        onSubmit={handleSubmit}
        className={`${styles.inputWrapper} ${
          radioMode ? styles.inputWrapperRadioMode : ''
        }`}
      >
        <input
          type="text"
          className={styles.input}
          placeholder="Введите вопрос по Frontend разработке..."
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onKeyUp={handleKeyUp} // Добавляем обработчик отпускания клавиш
          onFocus={() =>
            inputValue.trim() &&
            setSuggestions.length > 0 &&
            setShowSuggestions(true)
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

        {/* Кнопка микрофона */}
        <button
          type="button"
          className={styles.micButton}
          onClick={handleMicClick}
          aria-label="Голосовой ввод"
          disabled={isLoading || isListening}
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
            {isListening ? (
              // Анимированный микрофон при записи
              <path
                d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"
                fill="rgba(74, 144, 226, 0.3)"
              />
            ) : (
              // Обычный микрофон
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
            )}
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="8" y1="23" x2="16" y2="23" />
          </svg>
        </button>

        {/* Переключатель режима рации */}
        <button
          type="button"
          className={`${styles.radioButton} ${
            radioMode ? styles.radioButtonActive : ''
          }`}
          onClick={() => setRadioMode(!radioMode)}
          aria-label={
            radioMode ? 'Выключить режим рации' : 'Включить режим рации'
          }
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
        </button>

        {/* Кнопка отправки */}
        <button
          type="submit"
          className={styles.sendButton}
          aria-label="Отправить вопрос"
          disabled={isLoading || !inputValue.trim()}
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
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>

        {/* Индикатор загрузки */}
        {(isLoading || isLoadingSuggestions) && (
          <div className={styles.loading} aria-hidden="true" />
        )}

        {/* Подсказка по использованию пробела */}
        {radioMode && (
          <div className={`${styles.spaceHint} ${styles.spaceHintVisible}`}>
            Удерживайте пробел для записи
          </div>
        )}

        {/* Кнопка отмены отправки */}
        {showCancel && (
          <button
            type="button"
            className={styles.cancelButton}
            onClick={handleCancelSend}
            style={{ position: 'absolute', left: 10, bottom: -36, zIndex: 20 }}
          >
            Отменить отправку
          </button>
        )}
      </form>
    </div>
  );
};

export default TextInput;
