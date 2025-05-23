import Link from 'next/link';
import styles from '../../styles/admin/InterviewDetails.module.css';

/**
 * Компонент для отображения детальной информации о собеседовании
 * @param {Object} props - Свойства компонента
 * @param {Object} props.interview - Данные собеседования
 * @param {Function} props.onEdit - Функция, вызываемая при нажатии на кнопку редактирования
 * @param {Function} props.onDelete - Функция, вызываемая при нажатии на кнопку удаления
 * @returns {JSX.Element} Компонент детальной информации о собеседовании
 */
export default function InterviewDetails({ interview, onEdit, onDelete }) {
  // Функция для форматирования даты
  const formatDate = (dateString) => {
    if (!dateString) return 'Не указано';

    const date = new Date(dateString);
    return date.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Функция для отображения статуса собеседования
  const getStatusLabel = (status) => {
    const statusLabels = {
      scheduled: 'Запланировано',
      completed: 'Завершено',
      cancelled: 'Отменено',
      no_show: 'Неявка',
    };

    return statusLabels[status] || status;
  };

  // Функция для получения класса стиля статуса
  const getStatusClass = (status) => {
    const statusClasses = {
      scheduled: styles.statusScheduled,
      completed: styles.statusCompleted,
      cancelled: styles.statusCancelled,
      no_show: styles.statusNoShow,
    };

    return statusClasses[status] || '';
  };

  return (
    <div className={styles.interviewDetailsContainer}>
      <div className={styles.interviewHeader}>
        <div className={styles.interviewInfo}>
          <div className={styles.interviewMeta}>
            <h2 className={styles.interviewTitle}>
              Собеседование от {formatDate(interview.scheduledTime)}
            </h2>
            <div className={styles.interviewLabels}>
              <span
                className={`${styles.interviewStatus} ${getStatusClass(
                  interview.status
                )}`}
              >
                {getStatusLabel(interview.status)}
              </span>
            </div>
          </div>
        </div>
        <div className={styles.interviewActions}>
          <button className={styles.editButton} onClick={onEdit}>
            Редактировать
          </button>
          <button className={styles.deleteButton} onClick={onDelete}>
            Удалить
          </button>
        </div>
      </div>

      <div className={styles.interviewContent}>
        <div className={styles.infoSection}>
          <h3 className={styles.sectionTitle}>Основная информация</h3>
          <div className={styles.infoGrid}>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>ID собеседования:</span>
              <span className={styles.infoValue}>{interview.id}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Дата и время:</span>
              <span className={styles.infoValue}>
                {formatDate(interview.scheduledTime)}
              </span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Статус:</span>
              <span
                className={`${styles.infoValue} ${getStatusClass(
                  interview.status
                )}`}
              >
                {getStatusLabel(interview.status)}
              </span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Ссылка на встречу:</span>
              {interview.meetingLink ? (
                <a
                  href={interview.meetingLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.meetingLink}
                >
                  {interview.meetingLink}
                </a>
              ) : (
                <span className={styles.emptyValue}>Не указана</span>
              )}
            </div>
          </div>
        </div>

        <div className={styles.participantsSection}>
          <h3 className={styles.sectionTitle}>Участники</h3>
          <div className={styles.participantsGrid}>
            <div className={styles.participantCard}>
              <h4 className={styles.participantTitle}>Интервьюер</h4>
              {interview.interviewer ? (
                <div className={styles.participantInfo}>
                  {interview.interviewer.image && (
                    <img
                      src={interview.interviewer.image}
                      alt={interview.interviewer.name}
                      className={styles.participantAvatar}
                    />
                  )}
                  <div className={styles.participantDetails}>
                    <div className={styles.participantName}>
                      {interview.interviewer.name}
                    </div>
                    <div className={styles.participantEmail}>
                      {interview.interviewer.email}
                    </div>
                    <Link
                      href={`/admin/users/${interview.interviewer.id}`}
                      className={styles.participantLink}
                    >
                      Просмотреть профиль
                    </Link>
                  </div>
                </div>
              ) : (
                <div className={styles.emptyParticipant}>
                  Интервьюер не назначен
                </div>
              )}
            </div>

            <div className={styles.participantCard}>
              <h4 className={styles.participantTitle}>Интервьюируемый</h4>
              {interview.interviewee ? (
                <div className={styles.participantInfo}>
                  {interview.interviewee.image && (
                    <img
                      src={interview.interviewee.image}
                      alt={interview.interviewee.name}
                      className={styles.participantAvatar}
                    />
                  )}
                  <div className={styles.participantDetails}>
                    <div className={styles.participantName}>
                      {interview.interviewee.name}
                    </div>
                    <div className={styles.participantEmail}>
                      {interview.interviewee.email}
                    </div>
                    <Link
                      href={`/admin/users/${interview.interviewee.id}`}
                      className={styles.participantLink}
                    >
                      Просмотреть профиль
                    </Link>
                  </div>
                </div>
              ) : (
                <div className={styles.emptyParticipant}>
                  Интервьюируемый не назначен
                </div>
              )}
            </div>
          </div>
        </div>

        {interview.interviewFeedback &&
          interview.interviewFeedback.length > 0 && (
            <div className={styles.feedbackSection}>
              <h3 className={styles.sectionTitle}>Отзыв о собеседовании</h3>
              <div className={styles.feedbackContent}>
                <div className={styles.feedbackScores}>
                  <div className={styles.scoreItem}>
                    <span className={styles.scoreLabel}>
                      Техническая оценка:
                    </span>
                    <span className={styles.scoreValue}>
                      {interview.interviewFeedback[0].technicalScore}/10
                    </span>
                  </div>
                  <div className={styles.scoreItem}>
                    <span className={styles.scoreLabel}>
                      Рейтинг интервьюера:
                    </span>
                    <span className={styles.scoreValue}>
                      {interview.interviewFeedback[0].interviewerRating}/5
                    </span>
                  </div>
                  <div className={styles.scoreItem}>
                    <span className={styles.scoreLabel}>Статус:</span>
                    <span className={styles.scoreValue}>
                      {interview.interviewFeedback[0].isAccepted
                        ? 'Принят'
                        : 'Отклонен'}
                    </span>
                  </div>
                </div>
                {interview.interviewFeedback[0].feedback && (
                  <div className={styles.feedbackText}>
                    <h4 className={styles.feedbackTextTitle}>Комментарий:</h4>
                    <p className={styles.feedbackTextContent}>
                      {interview.interviewFeedback[0].feedback}
                    </p>
                  </div>
                )}
                {interview.interviewFeedback[0].strengths && (
                  <div className={styles.feedbackText}>
                    <h4 className={styles.feedbackTextTitle}>
                      Сильные стороны:
                    </h4>
                    <p className={styles.feedbackTextContent}>
                      {interview.interviewFeedback[0].strengths}
                    </p>
                  </div>
                )}
                {interview.interviewFeedback[0].weaknesses && (
                  <div className={styles.feedbackText}>
                    <h4 className={styles.feedbackTextTitle}>
                      Области для улучшения:
                    </h4>
                    <p className={styles.feedbackTextContent}>
                      {interview.interviewFeedback[0].weaknesses}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

        <div className={styles.systemInfoSection}>
          <h3 className={styles.sectionTitle}>Системная информация</h3>
          <div className={styles.infoGrid}>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Дата создания:</span>
              <span className={styles.infoValue}>
                {formatDate(interview.createdAt)}
              </span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Последнее обновление:</span>
              <span className={styles.infoValue}>
                {formatDate(interview.updatedAt)}
              </span>
            </div>
            {interview.calendarEventId && (
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>
                  ID события в календаре:
                </span>
                <span className={styles.infoValue}>
                  {interview.calendarEventId}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
