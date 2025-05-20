import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import QuestionCard from '../components/QuestionCard';
import AuthButton from '../components/auth/AuthButton';
import InterviewButton from '../components/interview/InterviewButton';
import styles from '../styles/Home.module.css';

export default function Home() {
  const { data: session, status } = useSession();
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isStarted, setIsStarted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isStarted && session) {
      fetchQuestions();
    }
  }, [isStarted, session]);

  async function fetchQuestions() {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch('/api/questions');

      if (!response.ok) {
        throw new Error('Не удалось загрузить вопросы');
      }

      const data = await response.json();

      if (data.length === 0) {
        setError(
          'Нет доступных вопросов. Пожалуйста, импортируйте вопросы из файла.'
        );
      } else {
        setQuestions(data);
        setCurrentIndex(0);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleAnswer(questionId, status) {
    if (!session) return;

    try {
      await fetch('/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId,
          status,
          userId: session.user.id,
        }),
      });

      if (currentIndex < questions.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        alert('Вы прошли все вопросы!');
        setIsStarted(false);
      }
    } catch (err) {
      setError('Не удалось сохранить прогресс');
    }
  }

  // Обработчик события поиска в Яндексе
  async function handleSearch(questionId) {
    if (!session) return;

    try {
      await fetch('/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId,
          isSearch: true,
          userId: session.user.id,
        }),
      });
    } catch (err) {
      console.error('Не удалось сохранить статистику поиска:', err);
    }
  }

  return (
    <div className={styles.container}>
      <main className={styles.main}>
        <h1 className={styles.title}>
          Подготовка к собеседованию Frontend разработчика
        </h1>

        {/* Блок с информацией о сервисе подготовки к собеседованиям */}
        <div className={styles.interviewAssistantBlock}>
          <div className={styles.interviewAssistantContent}>
            <div className={styles.interviewAssistantIcon}>
              <svg
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M12 16v-4"></path>
                <path d="M12 8h.01"></path>
              </svg>
            </div>
            <div className={styles.interviewAssistantInfo}>
              <h2>
                Новый сервис: AI-ассистент для подготовки к собеседованиям
              </h2>
              <p>
                Задавайте вопросы по HTML, CSS, JavaScript, React и другим
                технологиям Frontend разработки и получайте подробные ответы с
                примерами кода.
              </p>
              <ul className={styles.interviewAssistantFeatures}>
                <li>Мгновенные ответы на ваши вопросы</li>
                <li>Подробные объяснения с примерами кода</li>
                <li>История вопросов и ответов</li>
                <li>Умные подсказки при вводе</li>
              </ul>
            </div>
          </div>
          <a
            href="/interview-assistant/company"
            className={styles.interviewAssistantButton}
            aria-label="Перейти к AI-ассистенту"
          >
            Попробовать AI-ассистент
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
              <path d="M5 12h14"></path>
              <path d="M12 5l7 7-7 7"></path>
            </svg>
          </a>
        </div>

        <div className={styles.authSection}>
          <AuthButton />
        </div>

        {error && <div className={styles.error}>{error}</div>}

        {status === 'loading' ? (
          <div className={styles.loading}>Загрузка...</div>
        ) : !session ? (
          <div className={styles.authMessage}>
            Пожалуйста, войдите в систему, чтобы начать тренировку
          </div>
        ) : !isStarted ? (
          <div className={styles.startScreen}>
            <div className={styles.buttonGroup}>
              <button
                className={styles.startButton}
                onClick={() => setIsStarted(true)}
              >
                Тренироваться по
              </button>
              <InterviewButton />
            </div>
          </div>
        ) : isLoading ? (
          <div className={styles.loading}>Загрузка вопросов...</div>
        ) : questions.length > 0 ? (
          <div className={styles.cardContainer}>
            <div className={styles.header}>
              <button
                className={styles.backButton}
                onClick={() => setIsStarted(false)}
              >
                Назад на главную
              </button>
              <div className={styles.progress}>
                Вопрос {currentIndex + 1} из {questions.length}
              </div>
            </div>
            <QuestionCard
              question={questions[currentIndex]}
              onAnswer={handleAnswer}
              onSearch={handleSearch}
            />
          </div>
        ) : null}
      </main>
    </div>
  );
}
