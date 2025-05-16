import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import styles from '../../styles/InterviewCard.module.css';

/**
 * Компонент карточки собеседования для отображения на доске
 * @param {Object} props - Свойства компонента
 * @param {Object} props.interview - Данные о собеседовании
 * @param {number} props.userPoints - Количество баллов пользователя
 * @param {Function} props.onBookInterview - Функция обработки записи на собеседование
 * @returns {JSX.Element} Компонент карточки собеседования
 */
export default function InterviewCard({
  interview,
  userPoints,
  onBookInterview,
}) {
  const router = useRouter();
  const { data: session } = useSession();

  // Форматирование даты и времени
  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString('ru-RU', {
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Проверка, является ли текущий пользователь интервьюером
  const isInterviewer = session?.user?.id === interview.interviewerId;

  // Обработчик клика по карточке для перехода к деталям собеседования
  const handleCardClick = () => {
    router.push(`/mock-interviews/${interview.id}`);
  };

  // Обработчик записи на собеседование
  const handleBookClick = (e) => {
    e.stopPropagation(); // Предотвращаем всплытие события, чтобы не срабатывал handleCardClick
    onBookInterview(interview.id);
  };

  return (
    <div
      className={`${styles.card} ${styles[interview.status]}`}
      onClick={handleCardClick}
    >
      <div className={styles.cardHeader}>
        <div className={styles.interviewerInfo}>
          <span className={styles.interviewerName}>
            {interview.interviewer?.name || 'Интервьюер'}
          </span>
          {isInterviewer && <span className={styles.youBadge}>Вы</span>}
        </div>
        <div className={styles.statusBadge} data-status={interview.status}>
          {interview.status === 'pending' && 'Ожидает записи'}
          {interview.status === 'booked' && 'Забронировано'}
          {interview.status === 'completed' && 'Завершено'}
          {interview.status === 'cancelled' && 'Отменено'}
        </div>
      </div>

      <div className={styles.cardBody}>
        <div className={styles.dateTime}>
          <span className={styles.icon}>🗓️</span>
          <span>{formatDateTime(interview.scheduledTime)}</span>
        </div>

        {interview.interviewee && (
          <div className={styles.interviewee}>
            <span className={styles.icon}>👤</span>
            <span>Отвечающий: {interview.interviewee.name}</span>
          </div>
        )}

        {interview.interviewFeedback && (
          <div className={styles.feedbackInfo}>
            <div className={styles.rating}>
              <span className={styles.icon}>⭐</span>
              <span>
                Оценка: {interview.interviewFeedback.technicalScore}/5
              </span>
            </div>
            <div className={styles.feedbackStatus}>
              {interview.interviewFeedback.isAccepted ? (
                <span className={styles.accepted}>Отзыв принят</span>
              ) : (
                <span className={styles.pending}>Ожидает принятия</span>
              )}
            </div>
          </div>
        )}
      </div>

      <div className={styles.cardFooter}>
        {interview.status === 'pending' && !isInterviewer && (
          <button
            className={styles.bookButton}
            onClick={handleBookClick}
            disabled={userPoints < 1}
            title={userPoints < 1 ? 'Необходимо минимум 1 балл' : ''}
          >
            Записаться
          </button>
        )}

        {interview.status === 'booked' &&
          isInterviewer &&
          !interview.interviewFeedback && (
            <button
              className={styles.feedbackButton}
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/mock-interviews/${interview.id}/feedback`);
              }}
            >
              Оставить отзыв
            </button>
          )}

        <button className={styles.detailsButton} onClick={handleCardClick}>
          Подробнее
        </button>
      </div>
    </div>
  );
}
