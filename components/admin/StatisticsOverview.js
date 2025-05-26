import { useState, useEffect } from 'react';
import styles from '../../styles/admin/StatisticsOverview.module.css';

/**
 * Компонент для отображения общей статистики системы
 * @param {Object} props - Свойства компонента
 * @param {Object} props.summary - Объект с общей статистикой
 * @param {Function} props.onDateFilterChange - Функция, вызываемая при изменении фильтра по дате
 * @returns {JSX.Element} Компонент общей статистики
 */
export default function StatisticsOverview({ summary, onDateFilterChange }) {
  // Локальное состояние для хранения значений фильтров по дате
  const [dateFilters, setDateFilters] = useState({
    startDate: '',
    endDate: '',
  });

  // Обработчик изменения значения фильтра
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setDateFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Обработчик отправки формы фильтрации
  const handleSubmit = (e) => {
    e.preventDefault();
    onDateFilterChange(dateFilters);
  };

  // Обработчик сброса фильтров
  const handleReset = () => {
    const resetFilters = {
      startDate: '',
      endDate: '',
    };
    setDateFilters(resetFilters);
    onDateFilterChange(resetFilters);
  };

  // Если статистика не загружена, показываем сообщение о загрузке
  if (!summary) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}></div>
        <p>Загрузка статистики...</p>
      </div>
    );
  }

  return (
    <div className={styles.statisticsOverviewContainer}>
      <div className={styles.filterContainer}>
        <form onSubmit={handleSubmit} className={styles.filterForm}>
          <div className={styles.filterRow}>
            <div className={styles.filterItem}>
              <label htmlFor="startDate" className={styles.filterLabel}>
                Дата начала
              </label>
              <input
                type="date"
                id="startDate"
                name="startDate"
                value={dateFilters.startDate}
                onChange={handleFilterChange}
                className={styles.filterInput}
              />
            </div>

            <div className={styles.filterItem}>
              <label htmlFor="endDate" className={styles.filterLabel}>
                Дата окончания
              </label>
              <input
                type="date"
                id="endDate"
                name="endDate"
                value={dateFilters.endDate}
                onChange={handleFilterChange}
                className={styles.filterInput}
              />
            </div>

            <div className={styles.filterActions}>
              <button type="submit" className={styles.filterButton}>
                Применить
              </button>
              <button
                type="button"
                onClick={handleReset}
                className={`${styles.filterButton} ${styles.resetButton}`}
              >
                Сбросить
              </button>
            </div>
          </div>
        </form>
      </div>

      <div className={styles.statisticsGrid}>
        {/* Статистика по пользователям */}
        <div className={styles.statisticsCard}>
          <h3 className={styles.cardTitle}>Пользователи</h3>
          <div className={styles.cardContent}>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Всего пользователей:</span>
              <span className={styles.statValue}>{summary.users.total}</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Администраторы:</span>
              <span className={styles.statValue}>{summary.users.admins}</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Обычные пользователи:</span>
              <span className={styles.statValue}>{summary.users.regular}</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Заблокированные:</span>
              <span className={styles.statValue}>{summary.users.blocked}</span>
            </div>
          </div>
        </div>

        {/* Статистика по собеседованиям */}
        <div className={styles.statisticsCard}>
          <h3 className={styles.cardTitle}>Собеседования</h3>
          <div className={styles.cardContent}>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Всего собеседований:</span>
              <span className={styles.statValue}>
                {summary.interviews.total}
              </span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Завершенные:</span>
              <span className={styles.statValue}>
                {summary.interviews.completed}
              </span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Ожидающие:</span>
              <span className={styles.statValue}>
                {summary.interviews.pending}
              </span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Забронированные:</span>
              <span className={styles.statValue}>
                {summary.interviews.booked}
              </span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Отмененные:</span>
              <span className={styles.statValue}>
                {summary.interviews.cancelled}
              </span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Неявки:</span>
              <span className={styles.statValue}>
                {summary.interviews.noShow}
              </span>
            </div>
          </div>
        </div>

        {/* Статистика по баллам */}
        <div className={styles.statisticsCard}>
          <h3 className={styles.cardTitle}>Баллы</h3>
          <div className={styles.cardContent}>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Всего выдано:</span>
              <span className={styles.statValue}>
                {summary.points.totalIssued}
              </span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Всего потрачено:</span>
              <span className={styles.statValue}>
                {summary.points.totalSpent}
              </span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Баланс в системе:</span>
              <span className={styles.statValue}>
                {summary.points.totalIssued - summary.points.totalSpent}
              </span>
            </div>
          </div>
        </div>

        {/* Статистика по отзывам */}
        <div className={styles.statisticsCard}>
          <h3 className={styles.cardTitle}>Отзывы</h3>
          <div className={styles.cardContent}>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Количество отзывов:</span>
              <span className={styles.statValue}>{summary.feedback.count}</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>
                Средняя техническая оценка:
              </span>
              <span className={styles.statValue}>
                {summary.feedback.averageTechnicalScore.toFixed(2)}
              </span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>
                Средняя оценка интервьюера:
              </span>
              <span className={styles.statValue}>
                {summary.feedback.averageInterviewerRating.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Статистика по нарушениям */}
        <div className={styles.statisticsCard}>
          <h3 className={styles.cardTitle}>Нарушения</h3>
          <div className={styles.cardContent}>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Количество нарушений:</span>
              <span className={styles.statValue}>
                {summary.violations.count}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
