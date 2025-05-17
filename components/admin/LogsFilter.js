import { useState, useEffect } from 'react';
import styles from '../../styles/admin/LogsList.module.css';

/**
 * Компонент для фильтрации логов в административной панели
 * @param {Object} props - Свойства компонента
 * @param {Object} props.filters - Текущие фильтры
 * @param {Array} props.actionTypes - Доступные типы действий
 * @param {Array} props.entityTypes - Доступные типы сущностей
 * @param {Array} props.admins - Список администраторов
 * @param {Function} props.onFilterChange - Функция, вызываемая при изменении фильтров
 * @returns {JSX.Element} Компонент фильтрации логов
 */
export default function LogsFilter({
  filters,
  actionTypes,
  entityTypes,
  admins,
  onFilterChange,
}) {
  // Локальное состояние для хранения значений фильтров
  const [localFilters, setLocalFilters] = useState({
    adminId: '',
    action: '',
    entityType: '',
    entityId: '',
    startDate: '',
    endDate: '',
    ...filters,
  });

  // Обновляем локальные фильтры при изменении входных фильтров
  useEffect(() => {
    setLocalFilters({
      adminId: '',
      action: '',
      entityType: '',
      entityId: '',
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
      adminId: '',
      action: '',
      entityType: '',
      entityId: '',
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
            <label htmlFor="adminId" className={styles.filterLabel}>
              Администратор
            </label>
            <select
              id="adminId"
              name="adminId"
              value={localFilters.adminId}
              onChange={handleFilterChange}
              className={styles.filterSelect}
            >
              <option value="">Все администраторы</option>
              {admins &&
                admins.map((admin) => (
                  <option key={admin.id} value={admin.id}>
                    {admin.name}
                  </option>
                ))}
            </select>
          </div>

          <div className={styles.filterItem}>
            <label htmlFor="action" className={styles.filterLabel}>
              Тип действия
            </label>
            <select
              id="action"
              name="action"
              value={localFilters.action}
              onChange={handleFilterChange}
              className={styles.filterSelect}
            >
              <option value="">Все действия</option>
              {actionTypes &&
                actionTypes.map((action) => (
                  <option key={action} value={action}>
                    {action}
                  </option>
                ))}
            </select>
          </div>

          <div className={styles.filterItem}>
            <label htmlFor="entityType" className={styles.filterLabel}>
              Тип сущности
            </label>
            <select
              id="entityType"
              name="entityType"
              value={localFilters.entityType}
              onChange={handleFilterChange}
              className={styles.filterSelect}
            >
              <option value="">Все типы</option>
              {entityTypes &&
                entityTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
            </select>
          </div>
        </div>

        <div className={styles.filterRow}>
          <div className={styles.filterItem}>
            <label htmlFor="entityId" className={styles.filterLabel}>
              ID сущности
            </label>
            <input
              type="text"
              id="entityId"
              name="entityId"
              value={localFilters.entityId}
              onChange={handleFilterChange}
              placeholder="ID сущности"
              className={styles.filterInput}
            />
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
      </form>
    </div>
  );
}
