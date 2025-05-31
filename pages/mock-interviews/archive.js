import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useNotification } from '../../contexts/NotificationContext';
import AuthButton from '../../components/auth/AuthButton';
import InterviewBoard from '../../components/interview/InterviewBoard';
import styles from '../../styles/MockInterviews.module.css';

export default function ArchivedInterviews() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { showSuccess, showError } = useNotification();
  const [interviews, setInterviews] = useState([]);
  const [userPoints, setUserPoints] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (session) {
      fetchInterviews();
      fetchUserPoints();
    }
  }, [session]);

  async function fetchInterviews() {
    try {
      setIsLoading(true);
      // Используем параметр status=archived для получения архивных собеседований
      const response = await fetch('/api/mock-interviews?status=archived');

      // Парсим JSON ответ независимо от статуса
      const data = await response.json();

      if (!response.ok) {
        // Используем сообщение об ошибке из API, если доступно
        const errorMessage =
          data.message ||
          data.error ||
          'Не удалось загрузить архивные собеседования';

        // Специальная обработка для 401 ошибки
        if (response.status === 401) {
          throw new Error(
            'Необходима авторизация для просмотра архива собеседований'
          );
        }

        throw new Error(errorMessage);
      }

      setInterviews(data);
      // Убрано уведомление об успешной загрузке, чтобы не показывать его слишком часто
    } catch (err) {
      showError(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  async function fetchUserPoints() {
    try {
      const response = await fetch('/api/user/points');

      // Парсим JSON ответ независимо от статуса
      const data = await response.json();

      if (!response.ok) {
        // Используем сообщение об ошибке из API, если доступно
        const errorMessage =
          data.message ||
          data.error ||
          'Не удалось загрузить баллы пользователя';

        // Специальная обработка для 401 ошибки
        if (response.status === 401) {
          throw new Error('Необходима авторизация для просмотра баллов');
        }

        throw new Error(errorMessage);
      }

      setUserPoints(data.points);
    } catch (err) {
      console.error('Ошибка при загрузке баллов:', err);
      showError('Не удалось загрузить баллы пользователя: ' + err.message);
    }
  }

  return (
    <div className={styles.container}>
      <main className={styles.main}>
        <h1 className={styles.title}>Архив собеседований</h1>

        <div className={styles.authSection}>
          <AuthButton />
        </div>

        {status === 'loading' ? (
          <div className={styles.loading}>Загрузка...</div>
        ) : !session ? (
          <div className={styles.authMessage}>
            Пожалуйста, войдите в систему, чтобы использовать функционал
            мок-собеседований
          </div>
        ) : (
          <>
            <div className={styles.actionButtons}>
              <Link href="/mock-interviews" className={styles.backButton}>
                Актуальные собеседования
              </Link>
              <button
                className={styles.backButton}
                onClick={() => router.push('/')}
              >
                Вернуться на главную
              </button>
            </div>

            {isLoading ? (
              <div className={styles.loading}>Загрузка собеседований...</div>
            ) : (
              <InterviewBoard
                interviews={interviews}
                userPoints={userPoints}
                onRefresh={fetchInterviews}
                isArchive={true}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}
