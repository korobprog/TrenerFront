import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useNotification } from '../../../contexts/NotificationContext';
import styles from '../../../styles/InterviewDetails.module.css';

export default function InterviewDetails() {
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

      if (!response.ok) {
        throw new Error('Не удалось загрузить информацию о собеседовании');
      }

      const data = await response.json();
      setInterview(data);
      showSuccess('Информация о собеседовании успешно загружена');
    } catch (err) {
      showError(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  function handleLeaveFeedback() {
    router.push(`/mock-interviews/${id}/feedback`);
  }

  function formatDateTime(dateString) {
    return new Date(dateString).toLocaleString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  // Определяем, является ли текущий пользователь интервьюером или отвечающим
  const isInterviewer = interview?.interviewerId === session?.user?.id;
  const isInterviewee = interview?.intervieweeId === session?.user?.id;

  // Если пользователь не авторизован, перенаправляем на страницу входа
  if (status === 'unauthenticated') {
    router.push('/auth/signin');
    return null;
  }

  return (
    <div className={styles.container}>
      <main className={styles.main}>
        <h1 className={styles.title}>Детали собеседования</h1>

        {isLoading ? (
          <div className={styles.loading}>
            Загрузка информации о собеседовании...
          </div>
        ) : interview ? (
          <div className={styles.interviewDetails}>
            <div className={styles.card}>
              <div
                className={styles.statusBadge}
                data-status={interview.status}
              >
                {interview.status === 'pending' && 'Ожидает записи'}
                {interview.status === 'booked' && 'Забронировано'}
                {interview.status === 'completed' && 'Завершено'}
                {interview.status === 'cancelled' && 'Отменено'}
              </div>

              <div className={styles.detailsSection}>
                <h2>Информация о собеседовании</h2>

                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Дата и время:</span>
                  <span className={styles.detailValue}>
                    {formatDateTime(interview.scheduledTime)}
                  </span>
                </div>

                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Интервьюер:</span>
                  <span className={styles.detailValue}>
                    {interview.interviewer?.name || 'Неизвестный пользователь'}
                  </span>
                </div>

                {interview.interviewee && (
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Отвечающий:</span>
                    <span className={styles.detailValue}>
                      {interview.interviewee?.name ||
                        'Неизвестный пользователь'}
                    </span>
                  </div>
                )}

                {(isInterviewer || isInterviewee) &&
                  interview.status === 'booked' && (
                    <div className={styles.meetingLinkSection}>
                      <h3>Ссылка на встречу</h3>
                      <a
                        href={interview.meetingLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.meetingLink}
                      >
                        Присоединиться к собеседованию
                      </a>
                    </div>
                  )}
              </div>

              {interview.interviewFeedback &&
                (isInterviewer || isInterviewee) && (
                  <div className={styles.feedbackSection}>
                    <h2>Отзыв о собеседовании</h2>

                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>
                        Техническая оценка:
                      </span>
                      <div className={styles.ratingStars}>
                        {Array.from({ length: 5 }, (_, i) => (
                          <span
                            key={i}
                            className={
                              i < interview.interviewFeedback.technicalScore
                                ? styles.starFilled
                                : styles.starEmpty
                            }
                          >
                            ★
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>Комментарий:</span>
                      <div className={styles.feedbackText}>
                        {interview.interviewFeedback.feedback}
                      </div>
                    </div>

                    {isInterviewee &&
                      !interview.interviewFeedback.isAccepted && (
                        <button
                          className={styles.acceptButton}
                          onClick={async () => {
                            try {
                              const response = await fetch(
                                `/api/mock-interviews/${id}/feedback`,
                                {
                                  method: 'PUT',
                                }
                              );

                              if (!response.ok) {
                                throw new Error('Не удалось принять отзыв');
                              }

                              showSuccess('Отзыв успешно принят');
                              // Обновляем данные о собеседовании
                              fetchInterviewDetails();
                            } catch (err) {
                              showError(err.message);
                            }
                          }}
                        >
                          Принять отзыв и начислить балл интервьюеру
                        </button>
                      )}

                    {interview.interviewFeedback.isAccepted && (
                      <div className={styles.acceptedBadge}>Отзыв принят</div>
                    )}
                  </div>
                )}

              {isInterviewer &&
                interview.status === 'completed' &&
                !interview.interviewFeedback && (
                  <div className={styles.actionSection}>
                    <button
                      className={styles.feedbackButton}
                      onClick={handleLeaveFeedback}
                    >
                      Оставить отзыв
                    </button>
                  </div>
                )}

              <div className={styles.actionButtons}>
                <button
                  className={styles.backButton}
                  onClick={() => router.push('/mock-interviews')}
                >
                  Вернуться к списку собеседований
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className={styles.notFound}>
            <p>Собеседование не найдено</p>
            <Link href="/mock-interviews" className={styles.backLink}>
              Вернуться к списку собеседований
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
