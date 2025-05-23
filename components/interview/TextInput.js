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
  const handleSubmit = (e) => {
    if (e) {
      e.preventDefault();
    }

    const question = inputValue.trim();
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

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.lang = 'ru-RU';
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInputValue(transcript);
      debounceFetchSuggestions(transcript);
    };

    recognition.onerror = (event) => {
      console.error('Ошибка распознавания речи:', event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  // Эффект для добавления обработчика клика вне компонента
  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [handleClickOutside]);

  // Эффект для очистки таймера дебаунсинга при размонтировании компонента
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return (
    <div className={styles.container}>
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
      <form onSubmit={handleSubmit} className={styles.inputWrapper}>
        <input
          type="text"
          className={styles.input}
          placeholder="Введите вопрос по Frontend разработке..."
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
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
      </form>
    </div>
  );
};

export default TextInput;
