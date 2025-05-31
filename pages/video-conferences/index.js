import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useNotification } from '../../contexts/NotificationContext';
import AuthButton from '../../components/auth/AuthButton';
import styles from '../../styles/VideoConferences.module.css';

export default function VideoConferences() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [videoRooms, setVideoRooms] = useState([]);
  const [userPoints, setUserPoints] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const { showSuccess, showError, showInfo } = useNotification();

  useEffect(() => {
    console.log('VideoConferences: Состояние сессии', {
      status,
      id: session?.user?.id,
      role: session?.user?.role,
      timestamp: session?.timestamp,
    });

    if (session) {
      fetchVideoRooms();
      fetchUserPoints();
    }
  }, [session]);

  async function fetchVideoRooms() {
    try {
      setIsLoading(true);
      setError(null);

      console.log('VideoConferences: Загрузка видеоконференций');

      const response = await fetch('/api/video-conferences?status=active');

      console.log('VideoConferences: Получен ответ', {
        status: response.status,
        statusText: response.statusText,
      });

      if (!response.ok) {
        throw new Error('Не удалось загрузить видеоконференции');
      }

      const data = await response.json();
      setVideoRooms(data);
    } catch (err) {
      setError(err.message);
      showError('Не удалось загрузить видеоконференции: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  }

  async function fetchUserPoints() {
    try {
      console.log('VideoConferences: Загрузка баллов пользователя');

      const response = await fetch('/api/user/points');

      if (!response.ok) {
        throw new Error('Не удалось загрузить баллы пользователя');
      }

      const data = await response.json();
      console.log('Получены баллы пользователя:', data.points);
      setUserPoints(data.points);
    } catch (err) {
      console.error('Ошибка при загрузке баллов:', err);
      showError('Не удалось загрузить баллы пользователя');
    }
  }

  function handleCreateVideoRoom() {
    router.push('/video-conferences/create');
  }

  function handleJoinVideoRoom(roomId) {
    router.push(`/video-conferences/${roomId}/join`);
  }

  function formatDateTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function getStatusText(status) {
    const statusMap = {
      scheduled: 'Запланирована',
      in_progress: 'В процессе',
      completed: 'Завершена',
      cancelled: 'Отменена',
    };
    return statusMap[status] || status;
  }

  function getStatusClass(status) {
    const statusClassMap = {
      scheduled: styles.statusScheduled,
      in_progress: styles.statusInProgress,
      completed: styles.statusCompleted,
      cancelled: styles.statusCancelled,
    };
    return statusClassMap[status] || '';
  }

  return (
    <div className={styles.container}>
      <main className={styles.main}>
        <h1 className={styles.title}>Видеоконференции</h1>

        <div className={styles.authSection}>
          <AuthButton />
        </div>

        {error && <div className={styles.error}>{error}</div>}

        {status === 'loading' ? (
          <div className={styles.loading}>Загрузка...</div>
        ) : !session ? (
          <div className={styles.authMessage}>
            Пожалуйста, войдите в систему, чтобы использовать функционал
            видеоконференций
          </div>
        ) : (
          <>
            <div className={styles.statsSection}>
              <div className={styles.statCard}>
                <div className={styles.statValue}>{userPoints}</div>
                <div className={styles.statLabel}>Ваши баллы</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statValue}>{videoRooms.length}</div>
                <div className={styles.statLabel}>Активных конференций</div>
              </div>
            </div>

            <div className={styles.actionButtons}>
              <button
                className={styles.createButton}
                onClick={handleCreateVideoRoom}
              >
                Создать видеоконференцию
              </button>
              <button
                className={styles.backButton}
                onClick={() => router.push('/')}
              >
                Вернуться на главную
              </button>
            </div>

            {isLoading ? (
              <div className={styles.loading}>Загрузка видеоконференций...</div>
            ) : (
              <div className={styles.roomsGrid}>
                {videoRooms.length === 0 ? (
                  <div className={styles.emptyState}>
                    <h3>Нет активных видеоконференций</h3>
                    <p>
                      Создайте новую видеоконференцию или дождитесь, когда
                      другие пользователи создадут свои.
                    </p>
                  </div>
                ) : (
                  videoRooms.map((room) => (
                    <div key={room.id} className={styles.roomCard}>
                      <div className={styles.roomHeader}>
                        <h3 className={styles.roomTitle}>{room.name}</h3>
                        <span
                          className={`${styles.roomStatus} ${getStatusClass(
                            room.status
                          )}`}
                        >
                          {getStatusText(room.status)}
                        </span>
                      </div>

                      {room.description && (
                        <p className={styles.roomDescription}>
                          {room.description}
                        </p>
                      )}

                      <div className={styles.roomInfo}>
                        <div className={styles.roomInfoItem}>
                          <span className={styles.roomInfoLabel}>
                            Организатор:
                          </span>
                          <span className={styles.roomInfoValue}>
                            {room.host?.name || 'Неизвестно'}
                          </span>
                        </div>

                        {room.scheduledStartTime && (
                          <div className={styles.roomInfoItem}>
                            <span className={styles.roomInfoLabel}>
                              Начало:
                            </span>
                            <span className={styles.roomInfoValue}>
                              {formatDateTime(room.scheduledStartTime)}
                            </span>
                          </div>
                        )}

                        <div className={styles.roomInfoItem}>
                          <span className={styles.roomInfoLabel}>
                            Участники:
                          </span>
                          <span className={styles.roomInfoValue}>
                            {room.participants?.length || 0} /{' '}
                            {room.maxParticipants}
                          </span>
                        </div>

                        <div className={styles.roomInfoItem}>
                          <span className={styles.roomInfoLabel}>
                            Код комнаты:
                          </span>
                          <span className={styles.roomCode}>
                            {room.roomCode}
                          </span>
                        </div>
                      </div>

                      <div className={styles.roomActions}>
                        <Link
                          href={`/video-conferences/${room.id}`}
                          className={styles.detailsButton}
                        >
                          Подробнее
                        </Link>

                        {room.isActive && (
                          <button
                            className={styles.joinButton}
                            onClick={() => handleJoinVideoRoom(room.id)}
                            disabled={
                              room.participants?.length >= room.maxParticipants
                            }
                          >
                            {room.participants?.length >= room.maxParticipants
                              ? 'Комната заполнена'
                              : 'Присоединиться'}
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
