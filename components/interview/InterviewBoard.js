import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import { useNotification } from '../../contexts/NotificationContext';
import InterviewCard from './InterviewCard';
import styles from '../../styles/InterviewBoard.module.css';

/**
 * Компонент доски с карточками доступных собеседований
 * @param {Object} props - Свойства компонента
 * @param {Array} props.interviews - Массив собеседований
 * @param {number} props.userPoints - Количество баллов пользователя
 * @param {Function} props.onRefresh - Функция для обновления списка собеседований
 * @returns {JSX.Element} Компонент доски собеседований
 */
export default function InterviewBoard({
  interviews = [],
  userPoints = 0,
  onRefresh,
  isArchive = false,
}) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [filteredInterviews, setFilteredInterviews] = useState([]);
  const [filter, setFilter] = useState('all'); // all, my, pending, booked, completed
  const [isLoading, setIsLoading] = useState(false);
  const { showSuccess, showError, showInfo } = useNotification();

  // Проверяем, является ли пользователь администратором (только если сессия загружена)
  const isAdmin = status === 'authenticated' && session?.user?.role === 'admin';

  // Удалено избыточное логирование

  // Применяем фильтр при изменении списка собеседований или фильтра
  useEffect(() => {
    if (filter === 'all') {
      setFilteredInterviews(interviews);
    } else if (filter === 'my') {
      // Фильтруем собеседования, созданные текущим пользователем
      setFilteredInterviews(
        interviews.filter(
          (interview) => interview.isCreatedByCurrentUser === true
        )
      );
    } else {
      // Фильтруем по статусу
      setFilteredInterviews(
        interviews.filter((interview) => interview.status === filter)
      );
    }
  }, [interviews, filter]);

  // Обработчик изменения фильтра
  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
  };

  // Обработчик записи на собеседование
  const handleBookInterview = async (interviewId) => {
    // Проверяем, загружена ли сессия
    if (status !== 'authenticated') {
      showError('Необходимо авторизоваться для записи на собеседование');
      return;
    }

    if (userPoints < 1) {
      showInfo('Для записи на собеседование необходимо минимум 1 балл');
      return;
    }

    try {
      setIsLoading(true);

      const response = await fetch(`/api/mock-interviews/${interviewId}/book`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || 'Не удалось записаться на собеседование'
        );
      }

      showSuccess('Вы успешно записались на собеседование');
      // Перенаправляем на страницу с деталями собеседования
      router.push(`/mock-interviews/${interviewId}`);
    } catch (error) {
      showError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Функция для группировки собеседований по дате
  const groupInterviewsByDate = (interviews) => {
    const grouped = {};

    interviews.forEach((interview) => {
      const date = new Date(interview.scheduledTime).toLocaleDateString(
        'ru-RU',
        {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        }
      );

      if (!grouped[date]) {
        grouped[date] = [];
      }

      grouped[date].push(interview);
    });

    return grouped;
  };

  // Группируем отфильтрованные собеседования по дате
  const groupedInterviews = groupInterviewsByDate(filteredInterviews);

  // Добавляем обработку состояния загрузки сессии
  if (status === 'loading') {
    return (
      <div className={styles.boardContainer}>
        <div className={styles.loadingState}>
          <p>Загрузка данных сессии...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.boardContainer}>
      <div className={styles.boardHeader}>
        <h2 className={styles.boardTitle}>
          {isArchive ? 'Архив собеседований' : 'Доступные собеседования'}
        </h2>

        <div className={styles.filterContainer}>
          <button
            className={`${styles.filterButton} ${
              filter === 'all' ? styles.active : ''
            }`}
            onClick={() => handleFilterChange('all')}
          >
            Все
          </button>
          {status === 'authenticated' && (
            <button
              className={`${styles.filterButton} ${
                filter === 'my' ? styles.active : ''
              }`}
              onClick={() => handleFilterChange('my')}
            >
              Мои собеседования
            </button>
          )}

          {!isArchive ? (
            // Фильтры для актуальных собеседований
            <>
              <button
                className={`${styles.filterButton} ${
                  filter === 'pending' ? styles.active : ''
                }`}
                onClick={() => handleFilterChange('pending')}
              >
                Ожидают записи
              </button>
              <button
                className={`${styles.filterButton} ${
                  filter === 'booked' ? styles.active : ''
                }`}
                onClick={() => handleFilterChange('booked')}
              >
                Забронированы
              </button>
            </>
          ) : (
            // Фильтры для архивных собеседований
            <>
              <button
                className={`${styles.filterButton} ${
                  filter === 'completed' ? styles.active : ''
                }`}
                onClick={() => handleFilterChange('completed')}
              >
                Завершены
              </button>
              <button
                className={`${styles.filterButton} ${
                  filter === 'cancelled' ? styles.active : ''
                }`}
                onClick={() => handleFilterChange('cancelled')}
              >
                Отменены
              </button>
              <button
                className={`${styles.filterButton} ${
                  filter === 'no_show' ? styles.active : ''
                }`}
                onClick={() => handleFilterChange('no_show')}
              >
                Неявки
              </button>
            </>
          )}
        </div>

        <div className={styles.actionButtons}>
          {status === 'authenticated' && isAdmin && (
            <button
              className={styles.refreshButton}
              onClick={() => router.push('/admin')}
            >
              Панель администратора
            </button>
          )}
          <button
            className={styles.refreshButton}
            onClick={onRefresh}
            disabled={isLoading}
          >
            {isLoading ? 'Обновление...' : 'Обновить'}
          </button>
        </div>
      </div>

      {Object.keys(groupedInterviews).length > 0 ? (
        <div className={styles.boardContent}>
          {Object.entries(groupedInterviews).map(([date, dateInterviews]) => (
            <div key={date} className={styles.dateGroup}>
              <h3 className={styles.dateHeader}>{date}</h3>
              <div className={styles.interviewsGrid}>
                {dateInterviews.map((interview) => (
                  <InterviewCard
                    key={interview.id}
                    interview={interview}
                    userPoints={userPoints}
                    onBookInterview={handleBookInterview}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.emptyState}>
          <p className={styles.emptyMessage}>
            {filter === 'all'
              ? isArchive
                ? 'В архиве нет собеседований'
                : 'Нет доступных собеседований'
              : filter === 'my'
              ? isArchive
                ? 'У вас нет архивных собеседований'
                : 'У вас нет созданных собеседований'
              : `Нет собеседований со статусом "${
                  filter === 'pending'
                    ? 'Ожидают записи'
                    : filter === 'booked'
                    ? 'Забронированы'
                    : filter === 'completed'
                    ? 'Завершены'
                    : filter === 'cancelled'
                    ? 'Отменены'
                    : 'Неявки'
                }"`}
          </p>
          {!isArchive ? (
            <>
              <p className={styles.emptyHint}>
                Создайте собеседование или дождитесь, пока другие пользователи
                создадут собеседования
              </p>
              {status === 'authenticated' ? (
                <button
                  className={styles.createButton}
                  onClick={() => router.push('/mock-interviews/new')}
                >
                  Создать собеседование
                </button>
              ) : (
                <p className={styles.emptyHint}>
                  Авторизуйтесь, чтобы создать собеседование
                </p>
              )}
            </>
          ) : (
            <p className={styles.emptyHint}>
              Завершенные и отмененные собеседования будут отображаться здесь
            </p>
          )}
        </div>
      )}

      <div className={styles.pointsInfo}>
        <p>
          Ваши баллы: <span className={styles.pointsValue}>{userPoints}</span>
        </p>
        <p className={styles.pointsHint}>
          Для записи на собеседование в роли отвечающего необходимо минимум 1
          балл. За регистрацию дается 1 балл. Баллы начисляются за проведение
          собеседований в роли интервьюера (1-2 балла в зависимости от оценки).
          При отмене собеседования или неявке интервьюера отвечающему
          возвращается 2 балла (1 потраченный + 1 компенсация).
        </p>
      </div>
    </div>
  );
}
