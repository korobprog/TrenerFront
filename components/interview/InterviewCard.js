import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import { useState } from 'react';
import { useNotification } from '../../contexts/NotificationContext';
import styles from '../../styles/InterviewCard.module.css';

/**
 * Компонент карточки собеседования для отображения на доске
 * @param {Object} props - Свойства компонента
 * @param {Object} props.interview - Данные о собеседовании
 * @param {number} props.userPoints - Количество баллов пользователя
 * @param {Function} props.onBookInterview - Функция обработки записи на собеседование
 * @param {Function} props.onRefresh - Функция для обновления списка собеседований
 * @returns {JSX.Element} Компонент карточки собеседования
 */
export default function InterviewCard({
  interview,
  userPoints,
  onBookInterview,
  onRefresh,
}) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [showNoShowModal, setShowNoShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showSuccess, showError } = useNotification();

  // Форматирование даты и времени
  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString('ru-RU', {
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Проверка, является ли текущий пользователь интервьюером (только если сессия загружена)
  const isInterviewer =
    status === 'authenticated' && session?.user?.id === interview.interviewerId;

  // Проверка, является ли текущий пользователь отвечающим (только если сессия загружена)
  const isInterviewee =
    status === 'authenticated' && session?.user?.id === interview.intervieweeId;

  // Проверка, прошло ли запланированное время собеседования
  const isInterviewTimePassed = new Date() > new Date(interview.scheduledTime);

  // Обработчик клика по карточке для перехода к деталям собеседования
  const handleCardClick = () => {
    router.push(`/mock-interviews/${interview.id}`);
  };

  // Обработчик записи на собеседование
  const handleBookClick = (e) => {
    e.stopPropagation(); // Предотвращаем всплытие события, чтобы не срабатывал handleCardClick
    onBookInterview(interview.id);
  };

  // Обработчик отметки неявки
  const handleNoShowClick = (e) => {
    e.stopPropagation(); // Предотвращаем всплытие события
    setShowNoShowModal(true);
  };

  // Обработчик отправки формы отметки неявки
  const handleNoShowSubmit = async (noShowType) => {
    setIsSubmitting(true);
    try {
      const response = await fetch(
        `/api/mock-interviews/${interview.id}/no-show`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ noShowType }),
        }
      );

      // Парсим JSON ответ независимо от статуса
      const data = await response.json();

      if (!response.ok) {
        // Используем сообщение об ошибке из API, если доступно
        const errorMessage =
          data.message || data.error || 'Ошибка при отметке неявки';

        // Специальная обработка для 401 ошибки
        if (response.status === 401) {
          throw new Error('Необходима авторизация для отметки неявки');
        }

        throw new Error(errorMessage);
      }

      // Обновляем страницу после успешной отметки неявки
      showSuccess('Неявка успешно отмечена');

      // Вместо полной перезагрузки страницы используем SPA-навигацию
      // и обновляем данные через функцию обновления из родительского компонента
      if (onRefresh) {
        onRefresh(); // Вызываем функцию обновления данных из родительского компонента
      } else {
        // Если функция обновления не передана, перенаправляем на ту же страницу без перезагрузки
        router.push(router.asPath, undefined, { shallow: true });
      }
    } catch (error) {
      console.error('Ошибка при отметке неявки:', error);
      showError(error.message || 'Произошла ошибка при отметке неявки');
    } finally {
      setIsSubmitting(false);
      setShowNoShowModal(false);
    }
  };

  // Добавляем обработку состояния загрузки сессии
  if (status === 'loading') {
    return (
      <div
        className={`${styles.card} ${styles[interview.status]} ${
          styles.loading
        }`}
      >
        <div className={styles.loadingState}>Загрузка...</div>
      </div>
    );
  }

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
          {interview.status === 'scheduled' && 'Зарезервировано'}
          {interview.status === 'completed' && 'Завершено'}
          {interview.status === 'cancelled' && 'Отменено'}
          {interview.status === 'no_show' && 'Неявка'}
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

        {interview.status === 'scheduled' &&
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

        {/* Кнопка отметки неявки - показывается только для зарезервированных собеседований после запланированного времени */}
        {interview.status === 'scheduled' &&
          isInterviewTimePassed &&
          (isInterviewer || isInterviewee) && (
            <button className={styles.noShowButton} onClick={handleNoShowClick}>
              Отметить неявку
            </button>
          )}

        <button className={styles.detailsButton} onClick={handleCardClick}>
          Подробнее
        </button>
      </div>

      {/* Модальное окно для отметки неявки */}
      {showNoShowModal && (
        <div
          className={styles.modalOverlay}
          onClick={() => setShowNoShowModal(false)}
        >
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3>Кто не явился на собеседование?</h3>
            <div className={styles.modalButtons}>
              <button
                onClick={() => handleNoShowSubmit('interviewer')}
                disabled={isSubmitting || isInterviewer} // Интервьюер не может отметить свою неявку
                className={isInterviewer ? styles.disabledButton : ''}
              >
                Интервьюер не явился
              </button>
              <button
                onClick={() => handleNoShowSubmit('interviewee')}
                disabled={isSubmitting || isInterviewee} // Отвечающий не может отметить свою неявку
                className={isInterviewee ? styles.disabledButton : ''}
              >
                Отвечающий не явился
              </button>
              <button onClick={() => setShowNoShowModal(false)}>Отмена</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
