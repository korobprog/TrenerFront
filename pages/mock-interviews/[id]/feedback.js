import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import FeedbackForm from '../../../components/interview/FeedbackForm';
import styles from '../../../styles/FeedbackForm.module.css';

export default function LeaveFeedback() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { id } = router.query;

  const [interview, setInterview] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (session && id) {
      fetchInterviewDetails();
    }
  }, [session, id]);

  async function fetchInterviewDetails() {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch(`/api/mock-interviews/${id}`);

      if (!response.ok) {
        throw new Error('Не удалось загрузить информацию о собеседовании');
      }

      const data = await response.json();
      setInterview(data);

      // Проверяем, является ли пользователь интервьюером
      if (data.interviewerId !== session.user.id) {
        throw new Error('Только интервьюер может оставить отзыв');
      }

      // Проверяем, что собеседование завершено и отзыв еще не оставлен
      if (data.status !== 'completed' && data.status !== 'booked') {
        throw new Error(
          'Отзыв можно оставить только для забронированного или завершенного собеседования'
        );
      }

      if (data.interviewFeedback) {
        throw new Error('Отзыв для этого собеседования уже существует');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  // Функция handleSubmit перемещена в компонент FeedbackForm

  // Если пользователь не авторизован, перенаправляем на страницу входа
  if (status === 'unauthenticated') {
    router.push('/auth/signin');
    return null;
  }

  return (
    <div className={styles.container}>
      <main className={styles.main}>
        <h1 className={styles.title}>Оставить отзыв о собеседовании</h1>

        {error && <div className={styles.error}>{error}</div>}

        {isLoading ? (
          <div className={styles.loading}>
            Загрузка информации о собеседовании...
          </div>
        ) : interview && !error ? (
          <FeedbackForm
            interview={interview}
            onSubmitSuccess={() => router.push(`/mock-interviews/${id}`)}
          />
        ) : (
          <div className={styles.notFound}>
            <p>
              Собеседование не найдено или у вас нет прав для оставления отзыва
            </p>
            <button
              className={styles.backButton}
              onClick={() => router.push('/mock-interviews')}
            >
              Вернуться к списку собеседований
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
