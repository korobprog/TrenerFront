import { useState, useEffect } from 'react';
import QuestionCard from '../components/QuestionCard';
import styles from '../styles/Home.module.css';

export default function Home() {
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isStarted, setIsStarted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isStarted) {
      fetchQuestions();
    }
  }, [isStarted]);

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
    try {
      await fetch('/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId, status }),
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

  return (
    <div className={styles.container}>
      <main className={styles.main}>
        <h1 className={styles.title}>
          Подготовка к собеседованию Frontend разработчика
        </h1>

        {error && <div className={styles.error}>{error}</div>}

        {!isStarted ? (
          <div className={styles.startScreen}>
            <button
              className={styles.startButton}
              onClick={() => setIsStarted(true)}
            >
              Начать
            </button>
          </div>
        ) : isLoading ? (
          <div className={styles.loading}>Загрузка вопросов...</div>
        ) : questions.length > 0 ? (
          <div className={styles.cardContainer}>
            <div className={styles.progress}>
              Вопрос {currentIndex + 1} из {questions.length}
            </div>
            <QuestionCard
              question={questions[currentIndex]}
              onAnswer={handleAnswer}
            />
          </div>
        ) : null}
      </main>
    </div>
  );
}
