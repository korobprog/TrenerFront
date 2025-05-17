import { useState, useEffect } from 'react';
import styles from '../../styles/admin/InterviewsList.module.css';

/**
 * Компонент для фильтрации собеседований в административной панели
 * @param {Object} props - Свойства компонента
 * @param {Object} props.filters - Текущие фильтры
 * @param {Function} props.onFilterChange - Функция, вызываемая при изменении фильтров
 * @returns {JSX.Element} Компонент фильтрации собеседований
 */
export default function InterviewFilter({ filters, onFilterChange }) {
  // Локальное состояние для хранения значений фильтров
  const [localFilters, setLocalFilters] = useState({
    status: '',
    interviewerId: '',
    intervieweeId: '',
    startDate: '',
    endDate: '',
    ...filters,
  });

  // Обновляем локальные фильтры при изменении входных фильтров
  useEffect(() => {
    setLocalFilters({
      status: '',
      interviewerId: '',
      intervieweeId: '',
      startDate: '',
      endDate: '',
      ...filters,
    });
  }, [filters]);

  // Обработчик изменения значения фильтра
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setLocalFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Обработчик отправки формы фильтрации
  const handleSubmit = (e) => {
    e.preventDefault();
    onFilterChange(localFilters);
  };

  // Обработчик сброса фильтров
  const handleReset = () => {
    const resetFilters = {
      status: '',
      interviewerId: '',
      intervieweeId: '',
      startDate: '',
      endDate: '',
    };
    setLocalFilters(resetFilters);
    onFilterChange(resetFilters);
  };

  return (
    <div className={styles.filterContainer}>
      <form onSubmit={handleSubmit} className={styles.filterForm}>
        <div className={styles.filterRow}>
          <div className={styles.filterItem}>
            <label htmlFor="status" className={styles.filterLabel}>
              Статус
            </label>
            <select
              id="status"
              name="status"
              value={localFilters.status}
              onChange={handleFilterChange}
              className={styles.filterSelect}
            >
              <option value="">Все статусы</option>
              <option value="scheduled">Запланировано</option>
              <option value="completed">Завершено</option>
              <option value="cancelled">Отменено</option>
              <option value="no_show">Неявка</option>
            </select>
          </div>

          <div className={styles.filterItem}>
            <label htmlFor="startDate" className={styles.filterLabel}>
              Дата начала
            </label>
            <input
              type="date"
              id="startDate"
              name="startDate"
              value={localFilters.startDate}
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
              value={localFilters.endDate}
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

        <div className={styles.filterRow}>
          <div className={styles.filterItem}>
            <label htmlFor="interviewerId" className={styles.filterLabel}>
              ID интервьюера
            </label>
            <input
              type="text"
              id="interviewerId"
              name="interviewerId"
              value={localFilters.interviewerId}
              onChange={handleFilterChange}
              placeholder="ID интервьюера"
              className={styles.filterInput}
            />
          </div>

          <div className={styles.filterItem}>
            <label htmlFor="intervieweeId" className={styles.filterLabel}>
              ID интервьюируемого
            </label>
            <input
              type="text"
              id="intervieweeId"
              name="intervieweeId"
              value={localFilters.intervieweeId}
              onChange={handleFilterChange}
              placeholder="ID интервьюируемого"
              className={styles.filterInput}
            />
          </div>
        </div>
      </form>
    </div>
  );
}
