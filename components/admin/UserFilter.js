import { useState, useEffect } from 'react';
import styles from '../../styles/admin/UsersList.module.css';

/**
 * Компонент для фильтрации пользователей в административной панели
 * @param {Object} props - Свойства компонента
 * @param {Object} props.filters - Текущие фильтры
 * @param {Function} props.onFilterChange - Функция, вызываемая при изменении фильтров
 * @returns {JSX.Element} Компонент фильтрации пользователей
 */
export default function UserFilter({ filters, onFilterChange }) {
  // Локальное состояние для хранения значений фильтров
  const [localFilters, setLocalFilters] = useState({
    search: '',
    role: '',
    isBlocked: '',
    ...filters,
  });

  // Обновляем локальные фильтры при изменении входных фильтров
  useEffect(() => {
    setLocalFilters({
      search: '',
      role: '',
      isBlocked: '',
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
      search: '',
      role: '',
      isBlocked: '',
    };
    setLocalFilters(resetFilters);
    onFilterChange(resetFilters);
  };

  return (
    <div className={styles.filterContainer}>
      <form onSubmit={handleSubmit} className={styles.filterForm}>
        <div className={styles.filterRow}>
          <div className={styles.filterItem}>
            <label htmlFor="search" className={styles.filterLabel}>
              Поиск
            </label>
            <input
              type="text"
              id="search"
              name="search"
              value={localFilters.search}
              onChange={handleFilterChange}
              placeholder="Имя или email"
              className={styles.filterInput}
            />
          </div>

          <div className={styles.filterItem}>
            <label htmlFor="role" className={styles.filterLabel}>
              Роль
            </label>
            <select
              id="role"
              name="role"
              value={localFilters.role}
              onChange={handleFilterChange}
              className={styles.filterSelect}
            >
              <option value="">Все роли</option>
              <option value="user">Пользователь</option>
              <option value="interviewer">Интервьюер</option>
              <option value="admin">Администратор</option>
            </select>
          </div>

          <div className={styles.filterItem}>
            <label htmlFor="isBlocked" className={styles.filterLabel}>
              Статус
            </label>
            <select
              id="isBlocked"
              name="isBlocked"
              value={localFilters.isBlocked}
              onChange={handleFilterChange}
              className={styles.filterSelect}
            >
              <option value="">Все пользователи</option>
              <option value="false">Активные</option>
              <option value="true">Заблокированные</option>
            </select>
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
  );
}
