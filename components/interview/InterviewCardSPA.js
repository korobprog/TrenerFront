import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import { useState } from 'react';
import { useNotification } from '../../contexts/NotificationContext';
import CreateMeetButton from './CreateMeetButton';
import styles from '../../styles/InterviewCard.module.css';

/**
 * Компонент карточки собеседования с SPA-навигацией
 * @param {Object} props - Свойства компонента
 * @param {Object} props.interview - Данные о собеседовании
 * @param {number} props.userPoints - Количество баллов пользователя
 * @param {Function} props.onRefresh - Функция для обновления списка собеседований
 * @returns {JSX.Element} Компонент карточки собеседования
 */
export default function InterviewCardSPA({ interview, userPoints, onRefresh }) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [showNoShowModal, setShowNoShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
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

  // Обработчик клика по кнопке записи на собеседование
  const handleBookClick = (e) => {
    e.stopPropagation(); // Предотвращаем всплытие события

    // Проверяем, загружена ли сессия
    if (status !== 'authenticated') {
      showError('Необходимо авторизоваться для записи на собеседование');
      return;
    }

    if (userPoints < 1) {
      showError('Для записи на собеседование необходимо минимум 1 балл');
      return;
    }

    // Открываем модальное окно для подтверждения записи
    setShowBookingModal(true);
  };

  // Обработчик создания Google Meet-ссылки
  const handleMeetLinkCreated = async ({ meetingLink, eventId }) => {
    try {
      setIsSubmitting(true);

      // Отправляем запрос на бронирование собеседования с полученной ссылкой
      const response = await fetch(
        `/api/mock-interviews/${interview.id}/book`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            meetingLink,
            calendarEventId: eventId,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || 'Не удалось записаться на собеседование'
        );
      }

      showSuccess('Вы успешно записались на собеседование');

      // Закрываем модальное окно
      setShowBookingModal(false);

      // Обновляем список собеседований
      if (onRefresh) {
        onRefresh();
      } else {
        // Если функция обновления не передана, используем SPA-навигацию
        router.push(`/mock-interviews/${interview.id}`);
      }
    } catch (error) {
      console.error('Ошибка при записи на собеседование:', error);
      showError(error.message);
    } finally {
      setIsSubmitting(false);
    }
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

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Ошибка при отметке неявки');
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
          {interview.status === 'booked' && 'Забронировано'}
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

        {/* Кнопка отметки неявки - показывается только для забронированных собеседований после запланированного времени */}
        {interview.status === 'booked' &&
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

      {/* Модальное окно для записи на собеседование */}
      {showBookingModal && (
        <div
          className={styles.modalOverlay}
          onClick={() => setShowBookingModal(false)}
        >
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3>Запись на собеседование</h3>
            <p>
              Для записи на собеседование будет создана ссылка на Google Meet и
              списан 1 балл.
            </p>
            <p>Дата и время: {formatDateTime(interview.scheduledTime)}</p>
            <p>Интервьюер: {interview.interviewer?.name}</p>

            <div className={styles.modalButtons}>
              <CreateMeetButton
                onMeetLinkCreated={handleMeetLinkCreated}
                buttonText="Создать ссылку и записаться"
                disabled={isSubmitting}
                className={styles.bookButton}
              />
              <button
                onClick={() => setShowBookingModal(false)}
                className={styles.cancelButton}
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
