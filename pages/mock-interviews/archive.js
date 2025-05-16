import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import AuthButton from '../../components/auth/AuthButton';
import InterviewBoard from '../../components/interview/InterviewBoard';
import styles from '../../styles/MockInterviews.module.css';

export default function ArchivedInterviews() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [interviews, setInterviews] = useState([]);
  const [userPoints, setUserPoints] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

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
      // Используем параметр status=archived для получения архивных собеседований
      const response = await fetch('/api/mock-interviews?status=archived');

      if (!response.ok) {
        throw new Error('Не удалось загрузить архивные собеседования');
      }

      const data = await response.json();
      setInterviews(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  async function fetchUserPoints() {
    try {
      const response = await fetch('/api/user/points');

      if (!response.ok) {
        throw new Error('Не удалось загрузить баллы пользователя');
      }

      const data = await response.json();
      setUserPoints(data.points);
    } catch (err) {
      console.error('Ошибка при загрузке баллов:', err);
    }
  }

  return (
    <div className={styles.container}>
      <main className={styles.main}>
        <h1 className={styles.title}>Архив собеседований</h1>

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
              <Link href="/mock-interviews">
                <button className={styles.backButton}>
                  Актуальные собеседования
                </button>
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
