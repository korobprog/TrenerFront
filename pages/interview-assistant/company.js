import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import styles from '../../styles/interview-assistant/Company.module.css';

/**
 * Страница для указания названия компании перед входом в сервис подготовки к собеседованиям
 *
 * @returns {JSX.Element} - React компонент
 */
export default function CompanyForm() {
  // Состояние для хранения названия компании
  const [company, setCompany] = useState('');
  // Состояние для хранения даты собеседования
  const [interviewDate, setInterviewDate] = useState('');
  // Состояние для хранения списка подсказок компаний
  const [suggestions, setSuggestions] = useState([]);
  // Состояние для отображения списка подсказок
  const [showSuggestions, setShowSuggestions] = useState(false);
  // Состояние для выбранной подсказки
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  // Состояние для отображения индикатора загрузки
  const [isLoading, setIsLoading] = useState(false);
  // Состояние для отображения ошибок валидации
  const [errors, setErrors] = useState({});

  // Ссылки на DOM элементы
  const companyInputRef = useRef(null);
  const suggestionsRef = useRef(null);
  const debounceTimerRef = useRef(null);

  // Получаем данные сессии пользователя
  const { data: session, status } = useSession();
  const router = useRouter();

  // Перенаправляем неавторизованных пользователей на страницу входа
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin?callbackUrl=/interview-assistant/company');
    }
  }, [status, router]);

  /**
   * Функция для получения подсказок компаний с сервера
   *
   * @param {string} query - Текст запроса
   */
  const fetchCompanySuggestions = async (query) => {
    if (!query || query.trim() === '' || !session) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch(
        `/api/interview-assistant/companies?query=${encodeURIComponent(query)}`
      );

      if (!response.ok) {
        throw new Error('Ошибка при получении списка компаний');
      }

      const data = await response.json();

      if (data.companies && Array.isArray(data.companies)) {
        setSuggestions(data.companies);
        setShowSuggestions(data.companies.length > 0);
        setSelectedSuggestionIndex(-1);
      }
    } catch (error) {
      console.error('Ошибка при получении списка компаний:', error);
      setSuggestions([]);
      setShowSuggestions(false);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Дебаунсинг запросов к API для улучшения производительности
   *
   * @param {string} query - Текст запроса
   * @param {number} delay - Задержка в миллисекундах
   */
  const debounceFetchSuggestions = (query, delay = 300) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      fetchCompanySuggestions(query);
    }, delay);
  };

  /**
   * Обработчик изменения текста в поле ввода компании
   *
   * @param {Object} e - Событие изменения
   */
  const handleCompanyChange = (e) => {
    const value = e.target.value;
    setCompany(value);

    // Сбрасываем ошибку при вводе
    if (errors.company) {
      setErrors((prev) => ({ ...prev, company: null }));
    }

    if (value.trim()) {
      debounceFetchSuggestions(value);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  /**
   * Обработчик выбора подсказки компании
   *
   * @param {string} suggestion - Выбранная подсказка
   */
  const handleSelectSuggestion = (suggestion) => {
    setCompany(suggestion);
    setSuggestions([]);
    setShowSuggestions(false);
    setSelectedSuggestionIndex(-1);

    // Фокус на поле ввода после выбора подсказки
    if (companyInputRef.current) {
      companyInputRef.current.focus();
    }
  };

  /**
   * Обработчик изменения даты собеседования
   *
   * @param {Object} e - Событие изменения
   */
  const handleDateChange = (e) => {
    setInterviewDate(e.target.value);

    // Сбрасываем ошибку при вводе
    if (errors.interviewDate) {
      setErrors((prev) => ({ ...prev, interviewDate: null }));
    }
  };

  /**
   * Валидация формы перед отправкой
   *
   * @returns {boolean} - Результат валидации
   */
  const validateForm = () => {
    const newErrors = {};

    if (!company.trim()) {
      newErrors.company = 'Пожалуйста, укажите название компании';
    }

    // Дата собеседования не обязательна, но если указана, проверяем её валидность
    if (interviewDate) {
      const selectedDate = new Date(interviewDate);
      const today = new Date();

      // Сбрасываем время для корректного сравнения дат
      today.setHours(0, 0, 0, 0);

      if (selectedDate < today) {
        newErrors.interviewDate = 'Дата собеседования не может быть в прошлом';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Обработчик отправки формы
   *
   * @param {Object} e - Событие отправки
   */
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    if (!session) {
      alert('Необходимо войти в систему для использования сервиса');
      return;
    }

    setIsLoading(true);

    try {
      // Отправляем данные на сервер
      const response = await fetch('/api/interview-assistant/companies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          company: company.trim(),
          interviewDate: interviewDate || null,
        }),
      });

      if (!response.ok) {
        throw new Error('Ошибка при сохранении данных');
      }

      // Перенаправляем на основную страницу сервиса
      router.push('/interview-assistant');
    } catch (error) {
      console.error('Ошибка при сохранении данных:', error);
      alert(
        'Произошла ошибка при сохранении данных. Пожалуйста, попробуйте еще раз.'
      );
    } finally {
      setIsLoading(false);
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
  const handleClickOutside = (e) => {
    if (
      companyInputRef.current &&
      !companyInputRef.current.contains(e.target) &&
      suggestionsRef.current &&
      !suggestionsRef.current.contains(e.target)
    ) {
      setShowSuggestions(false);
    }
  };

  /**
   * Обработчик кнопки "Пропустить"
   */
  const handleSkip = () => {
    router.push('/interview-assistant');
  };

  // Эффект для добавления обработчика клика вне компонента
  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Эффект для очистки таймера дебаунсинга при размонтировании компонента
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Если пользователь не авторизован, показываем сообщение о загрузке
  if (status === 'loading' || status === 'unauthenticated') {
    return (
      <div className={styles.container}>
        <div className={styles.loadingContainer}>
          <div className={styles.spinner}></div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Укажите компанию | Frontend Interview Assistant</title>
        <meta
          name="description"
          content="Укажите название компании для подготовки к собеседованию"
        />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1"
        />
      </Head>

      <div className={styles.container}>
        <div className={styles.formContainer}>
          <div className={styles.formHeader}>
            <div className={styles.iconContainer}>
              <svg
                width="40"
                height="40"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
              </svg>
            </div>
            <h1>Подготовка к собеседованию</h1>
          </div>

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.formGroup}>
              <label htmlFor="company" className={styles.label}>
                Название компании
              </label>
              <div className={styles.inputWrapper}>
                <input
                  type="text"
                  id="company"
                  className={`${styles.input} ${
                    errors.company ? styles.inputError : ''
                  }`}
                  placeholder="Введите название компании..."
                  value={company}
                  onChange={handleCompanyChange}
                  onKeyDown={handleKeyDown}
                  ref={companyInputRef}
                  aria-label="Название компании"
                  aria-autocomplete="list"
                  aria-controls={
                    showSuggestions ? 'company-suggestions' : undefined
                  }
                  aria-activedescendant={
                    selectedSuggestionIndex >= 0
                      ? `company-suggestion-${selectedSuggestionIndex}`
                      : undefined
                  }
                  autoComplete="off"
                  required
                />
                {isLoading && (
                  <div className={styles.inputLoading} aria-hidden="true" />
                )}
              </div>
              {errors.company && (
                <div className={styles.errorMessage}>{errors.company}</div>
              )}

              {/* Контейнер с подсказками */}
              {showSuggestions && (
                <div
                  className={styles.suggestionsContainer}
                  role="listbox"
                  id="company-suggestions"
                  aria-label="Подсказки компаний"
                >
                  <ul className={styles.suggestionsList} ref={suggestionsRef}>
                    {suggestions.map((suggestion, index) => (
                      <li
                        key={index}
                        id={`company-suggestion-${index}`}
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
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="interviewDate" className={styles.label}>
                Дата собеседования (опционально)
              </label>
              <input
                type="date"
                id="interviewDate"
                className={`${styles.input} ${
                  errors.interviewDate ? styles.inputError : ''
                }`}
                value={interviewDate}
                onChange={handleDateChange}
                aria-label="Дата собеседования"
                min={new Date().toISOString().split('T')[0]} // Минимальная дата - сегодня
              />
              {errors.interviewDate && (
                <div className={styles.errorMessage}>
                  {errors.interviewDate}
                </div>
              )}
            </div>

            <div className={styles.buttonGroup}>
              <button
                type="button"
                className={styles.skipButton}
                onClick={handleSkip}
                aria-label="Пропустить"
              >
                Пропустить
              </button>
              <button
                type="submit"
                className={styles.submitButton}
                disabled={isLoading}
                aria-label="Продолжить"
              >
                {isLoading ? 'Загрузка...' : 'Продолжить'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
