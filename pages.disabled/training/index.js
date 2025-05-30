import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useNotification } from '../../contexts/NotificationContext';
import QuestionCard from '../../components/QuestionCard';
import Timer from '../../components/Timer';
import FlashcardContainer from '../../components/flashcards/FlashcardContainer';
import styles from '../../styles/Training.module.css';
import flashcardStyles from '../../styles/Flashcards.module.css';

export default function TrainingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { showError, showSuccess } = useNotification();

  // Состояние для переключения режимов
  const [activeMode, setActiveMode] = useState('questions'); // 'questions' или 'flashcards'

  // Состояния для тренировки
  const [questions, setQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Состояния для таймера
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [currentQuestionTime, setCurrentQuestionTime] = useState(0);
  const [sessionTime, setSessionTime] = useState(0);

  // Состояния для фильтров
  const [filters, setFilters] = useState({
    topic: 'all',
    difficulty: 'all',
    status: 'all',
    search: '',
    mode: 'study', // study, review, exam, sprint
  });

  // Состояния для статистики
  const [stats, setStats] = useState({
    totalQuestions: 0,
    answeredQuestions: 0,
    correctAnswers: 0,
    streak: 0,
    timeSpent: 0,
  });

  // Состояния для пагинации
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

  // Защита маршрута - перенаправление неавторизованных пользователей
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin?callbackUrl=/training');
    }
  }, [status, router]);

  // Загрузка вопросов при изменении фильтров
  useEffect(() => {
    if (session) {
      fetchQuestions();
    }
  }, [session, filters, pagination.page]);

  // Загрузка статистики при монтировании компонента
  useEffect(() => {
    if (session) {
      fetchStats();
    }
  }, [session]);

  // Функция загрузки вопросов
  const fetchQuestions = async () => {
    setIsLoading(true);
    setError(null);

    console.log('=== ДИАГНОСТИКА ЗАГРУЗКИ ВОПРОСОВ ===');
    console.log('🔍 Проверяем доступность API флеш-карточек...');

    try {
      const queryParams = new URLSearchParams({
        topic: filters.topic,
        difficulty: filters.difficulty,
        status: filters.status,
        search: filters.search,
        mode: filters.mode,
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });

      console.log('🔍 Параметры запроса:', Object.fromEntries(queryParams));

      // ДИАГНОСТИКА: Проверяем API флеш-карточек
      console.log('🔍 Тестируем API флеш-карточек...');
      try {
        const flashcardsResponse = await fetch(
          '/api/flashcards/questions?limit=5'
        );
        console.log('🔍 Статус API флеш-карточек:', flashcardsResponse.status);
        if (flashcardsResponse.ok) {
          const flashcardsData = await flashcardsResponse.json();
          console.log(
            '✅ API флеш-карточек работает, получено вопросов:',
            flashcardsData.questions?.length || 0
          );
        } else {
          console.log(
            '❌ API флеш-карточек не работает:',
            flashcardsResponse.statusText
          );
        }
      } catch (flashcardsError) {
        console.log(
          '❌ Ошибка при тестировании API флеш-карточек:',
          flashcardsError.message
        );
      }

      const response = await fetch(`/api/training/questions?${queryParams}`);

      if (!response.ok) {
        throw new Error('Не удалось загрузить вопросы');
      }

      const data = await response.json();
      console.log(
        '🔍 Получено вопросов из training API:',
        data.questions?.length || 0
      );

      setQuestions(data.questions);
      setPagination(data.pagination);

      if (data.questions.length > 0) {
        setCurrentQuestion(0);
      }
    } catch (err) {
      console.error('❌ Ошибка при загрузке вопросов:', err);
      setError(err.message);
      showError('Не удалось загрузить вопросы');
    } finally {
      setIsLoading(false);
      console.log('=== КОНЕЦ ДИАГНОСТИКИ ЗАГРУЗКИ ===');
    }
  };

  // Функция загрузки статистики
  const fetchStats = async () => {
    try {
      const response = await fetch('/api/training/stats');

      if (!response.ok) {
        throw new Error('Не удалось загрузить статистику');
      }

      const data = await response.json();
      setStats(data.overall);
    } catch (err) {
      console.error('Ошибка при загрузке статистики:', err);
    }
  };

  // Обработчик ответа на вопрос
  const handleAnswer = async (questionId, selectedAnswer, isCorrect) => {
    // Останавливаем таймер
    setIsTimerRunning(false);

    try {
      const response = await fetch('/api/progress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          questionId,
          selectedAnswer,
          isCorrect,
          timeSpent: currentQuestionTime, // Добавляем время ответа
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Ошибка API:', data);
        throw new Error(data.message || 'Не удалось сохранить прогресс');
      }

      console.log('Ответ успешно сохранен:', data);

      // Показываем успешное сообщение
      showSuccess(isCorrect ? 'Правильно! Ответ сохранен' : 'Ответ сохранен');

      // Обновляем статистику
      await fetchStats();

      // Переходим к следующему вопросу
      if (currentQuestion < questions.length - 1) {
        setCurrentQuestion(currentQuestion + 1);
        // Запускаем таймер для следующего вопроса
        setIsTimerRunning(true);
      } else {
        showSuccess('Тренировка завершена!');
        // Можно добавить логику завершения тренировки
      }
    } catch (err) {
      console.error('Ошибка при сохранении ответа:', err);
      showError('Не удалось сохранить ответ: ' + err.message);
    }
  };

  // Обработчик поиска
  const handleSearch = (searchTerm) => {
    setFilters((prev) => ({ ...prev, search: searchTerm }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  // Обработчик изменения фильтров
  const handleFilterChange = (filterType, value) => {
    setFilters((prev) => ({ ...prev, [filterType]: value }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  // Обработчик сброса фильтров
  const handleResetFilters = () => {
    setFilters({
      topic: 'all',
      difficulty: 'all',
      status: 'all',
      search: '',
      mode: 'study',
    });
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  // Обработчики таймера
  const handleTimerUpdate = (currentTime, totalSessionTime) => {
    setCurrentQuestionTime(currentTime);
    setSessionTime(totalSessionTime);
  };

  const handleTimerStop = (finalTime, totalSessionTime) => {
    setCurrentQuestionTime(finalTime);
    setSessionTime(totalSessionTime);
  };

  // Запуск таймера при загрузке нового вопроса
  useEffect(() => {
    if (questions.length > 0 && !isLoading) {
      setIsTimerRunning(true);
    }
  }, [currentQuestion, questions.length, isLoading]);

  // Остановка таймера при загрузке
  useEffect(() => {
    if (isLoading) {
      setIsTimerRunning(false);
    }
  }, [isLoading]);

  // Показываем загрузку для неавторизованных пользователей
  if (status === 'loading') {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Загрузка...</div>
      </div>
    );
  }

  // Не показываем ничего для неавторизованных (они будут перенаправлены)
  if (!session) {
    return null;
  }

  return (
    <>
      <Head>
        <title>Тренировка - SuperMock</title>
        <meta
          name="description"
          content="Тренировочные вопросы для подготовки к собеседованиям"
        />
      </Head>

      <div className={styles.container}>
        <main className={styles.main}>
          {/* Заголовок страницы */}
          <div className={styles.header}>
            <h1 className={styles.title}>Тренировка</h1>
            <p className={styles.subtitle}>
              Изучайте теорию и практикуйтесь в решении задач
            </p>

            {/* Переключатель режимов */}
            <div className={styles.modeToggle}>
              <button
                className={`${styles.modeButton} ${
                  activeMode === 'questions' ? styles.active : ''
                }`}
                onClick={() => setActiveMode('questions')}
              >
                📝 Обычные вопросы
              </button>
              <button
                className={`${styles.modeButton} ${
                  activeMode === 'flashcards' ? styles.active : ''
                }`}
                onClick={() => setActiveMode('flashcards')}
              >
                🎯 Флеш-карточки
              </button>
            </div>
          </div>

          {/* Статистика */}
          <div className={styles.statsSection}>
            <div className={styles.statCard}>
              <div className={styles.statValue}>{stats.totalQuestions}</div>
              <div className={styles.statLabel}>Всего вопросов</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statValue}>{stats.answeredQuestions}</div>
              <div className={styles.statLabel}>Отвечено</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statValue}>{stats.correctAnswers}</div>
              <div className={styles.statLabel}>Правильных</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statValue}>
                {stats.answeredQuestions > 0
                  ? Math.round(
                      (stats.correctAnswers / stats.answeredQuestions) * 100
                    )
                  : 0}
                %
              </div>
              <div className={styles.statLabel}>Точность</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statValue}>{stats.streak}</div>
              <div className={styles.statLabel}>Серия</div>
            </div>
          </div>

          {/* Фильтры */}
          <div className={styles.filtersSection}>
            <div className={styles.filtersRow}>
              <select
                value={filters.mode}
                onChange={(e) => handleFilterChange('mode', e.target.value)}
                className={styles.filterSelect}
              >
                <option value="study">Изучение</option>
                <option value="review">Повторение</option>
                <option value="exam">Экзамен</option>
                <option value="sprint">Спринт</option>
              </select>

              <select
                value={filters.topic}
                onChange={(e) => handleFilterChange('topic', e.target.value)}
                className={styles.filterSelect}
              >
                <option value="all">Все темы</option>
                <option value="javascript">JavaScript</option>
                <option value="react">React</option>
                <option value="html">HTML</option>
                <option value="css">CSS</option>
                <option value="nodejs">Node.js</option>
              </select>

              <select
                value={filters.difficulty}
                onChange={(e) =>
                  handleFilterChange('difficulty', e.target.value)
                }
                className={styles.filterSelect}
              >
                <option value="all">Все уровни</option>
                <option value="easy">Легкий</option>
                <option value="medium">Средний</option>
                <option value="hard">Сложный</option>
              </select>

              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className={styles.filterSelect}
              >
                <option value="all">Все статусы</option>
                <option value="new">Новые</option>
                <option value="known">Знаю</option>
                <option value="unknown">Не знаю</option>
                <option value="repeat">Повторить</option>
              </select>

              <button
                onClick={handleResetFilters}
                className={styles.resetButton}
              >
                Сбросить
              </button>
            </div>

            <div className={styles.searchRow}>
              <input
                type="text"
                placeholder="Поиск по тексту вопроса..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className={styles.searchInput}
              />
            </div>
          </div>

          {/* Контент тренировки */}
          <div className={styles.content}>
            {activeMode === 'questions' ? (
              <>
                {error && <div className={styles.error}>{error}</div>}

                {isLoading ? (
                  <div className={styles.loading}>Загрузка вопросов...</div>
                ) : questions.length > 0 ? (
                  <div className={styles.questionSection}>
                    <div className={styles.progressBar}>
                      <div className={styles.progressInfo}>
                        Вопрос {currentQuestion + 1} из {questions.length}
                      </div>
                      <div className={styles.progressTrack}>
                        <div
                          className={styles.progressFill}
                          style={{
                            width: `${
                              ((currentQuestion + 1) / questions.length) * 100
                            }%`,
                          }}
                        />
                      </div>
                    </div>

                    {/* Таймер */}
                    <Timer
                      isRunning={isTimerRunning}
                      onTimeUpdate={handleTimerUpdate}
                      onStop={handleTimerStop}
                      showSessionTime={true}
                      className={styles.questionTimer}
                    />

                    <QuestionCard
                      question={questions[currentQuestion]}
                      onAnswer={handleAnswer}
                      onSearch={handleSearch}
                      currentTime={currentQuestionTime}
                    />

                    {/* Навигация между вопросами */}
                    <div className={styles.navigation}>
                      <button
                        onClick={() =>
                          setCurrentQuestion(Math.max(0, currentQuestion - 1))
                        }
                        disabled={currentQuestion === 0}
                        className={styles.navButton}
                      >
                        ← Предыдущий
                      </button>

                      <span className={styles.questionCounter}>
                        {currentQuestion + 1} / {questions.length}
                      </span>

                      <button
                        onClick={() =>
                          setCurrentQuestion(
                            Math.min(questions.length - 1, currentQuestion + 1)
                          )
                        }
                        disabled={currentQuestion === questions.length - 1}
                        className={styles.navButton}
                      >
                        Следующий →
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className={styles.noQuestions}>
                    <h3>Вопросы не найдены</h3>
                    <p>Попробуйте изменить фильтры или сбросить их</p>
                    <button
                      onClick={handleResetFilters}
                      className={styles.resetButton}
                    >
                      Сбросить фильтры
                    </button>
                  </div>
                )}
              </>
            ) : (
              /* Режим флеш-карточек */
              <div className={styles.flashcardsSection}>
                <div className={flashcardStyles.container}>
                  <FlashcardContainer
                    topic={filters.topic !== 'all' ? filters.topic : null}
                    difficulty={
                      filters.difficulty !== 'all' ? filters.difficulty : null
                    }
                    mode={filters.mode}
                    limit={10}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Пагинация */}
          {pagination.totalPages > 1 && (
            <div className={styles.pagination}>
              <button
                onClick={() =>
                  setPagination((prev) => ({
                    ...prev,
                    page: Math.max(1, prev.page - 1),
                  }))
                }
                disabled={pagination.page === 1}
                className={styles.paginationButton}
              >
                ← Предыдущая
              </button>

              <span className={styles.paginationInfo}>
                Страница {pagination.page} из {pagination.totalPages}
              </span>

              <button
                onClick={() =>
                  setPagination((prev) => ({
                    ...prev,
                    page: Math.min(prev.totalPages, prev.page + 1),
                  }))
                }
                disabled={pagination.page === pagination.totalPages}
                className={styles.paginationButton}
              >
                Следующая →
              </button>
            </div>
          )}
        </main>
      </div>
    </>
  );
}
