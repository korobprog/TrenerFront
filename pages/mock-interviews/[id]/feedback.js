import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useNotification } from '../../../contexts/NotificationContext';
import FeedbackForm from '../../../components/interview/FeedbackForm';
import styles from '../../../styles/FeedbackForm.module.css';

export default function LeaveFeedback() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { id } = router.query;
  const { showSuccess, showError } = useNotification();

  const [interview, setInterview] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (session && id) {
      fetchInterviewDetails();
    }
  }, [session, id]);

  async function fetchInterviewDetails() {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/mock-interviews/${id}`);

      // Парсим JSON ответ независимо от статуса
      const data = await response.json();

      if (!response.ok) {
        // Используем сообщение об ошибке из API, если доступно
        const errorMessage =
          data.message ||
          data.error ||
          'Не удалось загрузить информацию о собеседовании';

        // Специальная обработка для 401 ошибки
        if (response.status === 401) {
          throw new Error('Необходима авторизация для просмотра собеседования');
        }

        throw new Error(errorMessage);
      }

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
      showError(err.message);
      router.push('/mock-interviews');
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

        {isLoading ? (
          <div className={styles.loading}>
            Загрузка информации о собеседовании...
          </div>
        ) : interview ? (
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
