import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useNotification } from '../../contexts/NotificationContext';
import AuthButton from '../../components/auth/AuthButton';
import InterviewBoard from '../../components/interview/InterviewBoard';
import styles from '../../styles/MockInterviews.module.css';

export default function MockInterviews() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [interviews, setInterviews] = useState([]);
  const [userPoints, setUserPoints] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const { showSuccess, showError, showInfo } = useNotification();

  useEffect(() => {
    if (session) {
      fetchInterviews();
      fetchUserPoints();
    }
  }, [session]);

  async function fetchInterviews() {
    try {
      setIsLoading(true);
      setError(null);
      // Используем параметр status=active для получения только актуальных собеседований
      const response = await fetch('/api/mock-interviews?status=active');

      if (!response.ok) {
        throw new Error('Не удалось загрузить собеседования');
      }

      const data = await response.json();
      setInterviews(data);
      // Убрано уведомление об успешной загрузке, чтобы не показывать его слишком часто
    } catch (err) {
      setError(err.message);
      showError('Не удалось загрузить собеседования: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  }

  async function fetchUserPoints() {
    try {
      console.log('Запрос баллов пользователя...');
      console.log(
        'Информация о сессии:',
        session
          ? JSON.stringify(
              {
                id: session.user.id,
                name: session.user.name,
                email: session.user.email,
              },
              null,
              2
            )
          : 'Сессия отсутствует'
      );

      const response = await fetch('/api/user/points');
      console.log('Статус ответа:', response.status, response.statusText);

      if (!response.ok) {
        throw new Error('Не удалось загрузить баллы пользователя');
      }

      const data = await response.json();
      console.log('Полный ответ API:', JSON.stringify(data, null, 2));
      console.log('Получены баллы пользователя:', data.points);
      setUserPoints(data.points);
    } catch (err) {
      console.error('Ошибка при загрузке баллов:', err);
      console.error('Детали ошибки:', err.stack);
      showError('Не удалось загрузить баллы пользователя');
    }
  }

  function handleCreateInterview() {
    router.push('/mock-interviews/new');
  }

  function handleBookInterview(interviewId) {
    if (userPoints < 1) {
      showInfo('Для записи на собеседование необходимо минимум 1 балл');
      return;
    }

    router.push(`/mock-interviews/${interviewId}/book`);
  }

  return (
    <div className={styles.container}>
      <main className={styles.main}>
        <h1 className={styles.title}>Актуальные собеседования</h1>

        <div className={styles.authSection}>
          <AuthButton />
        </div>

        {error && <div className={styles.error}>{error}</div>}

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
              <button
                className={styles.createButton}
                onClick={handleCreateInterview}
              >
                Создать собеседование
              </button>
              <Link
                href="/mock-interviews/archive"
                className={styles.archiveButton || styles.backButton}
              >
                Архив собеседований
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
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}
