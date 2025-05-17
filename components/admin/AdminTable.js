import { useState } from 'react';
import styles from '../../styles/admin/AdminTable.module.css';

/**
 * Компонент таблицы для административных страниц
 * @param {Object} props - Свойства компонента
 * @param {Array} props.columns - Массив объектов с описанием колонок таблицы
 * @param {Array} props.data - Массив данных для отображения в таблице
 * @param {Function} props.onRowClick - Функция, вызываемая при клике на строку таблицы
 * @param {string} props.sortBy - Поле, по которому выполняется сортировка
 * @param {string} props.sortOrder - Порядок сортировки ('asc' или 'desc')
 * @param {Function} props.onSort - Функция, вызываемая при изменении сортировки
 * @returns {JSX.Element} Компонент таблицы для административных страниц
 */
export default function AdminTable({
  columns,
  data,
  onRowClick,
  sortBy,
  sortOrder,
  onSort,
}) {
  // Состояние для отслеживания наведения на строку
  const [hoveredRowId, setHoveredRowId] = useState(null);

  // Обработчик клика на заголовок колонки для сортировки
  const handleSortClick = (field) => {
    if (onSort) {
      // Если текущее поле сортировки совпадает с выбранным, меняем порядок сортировки
      // Иначе устанавливаем сортировку по выбранному полю в порядке 'asc'
      const newSortOrder =
        field === sortBy ? (sortOrder === 'asc' ? 'desc' : 'asc') : 'asc';
      onSort(field, newSortOrder);
    }
  };

  // Функция для отображения иконки сортировки
  const renderSortIcon = (field) => {
    if (field !== sortBy) return null;

    return (
      <span className={styles.sortIcon}>{sortOrder === 'asc' ? '▲' : '▼'}</span>
    );
  };

  // Функция для форматирования значения ячейки
  const formatCellValue = (column, item) => {
    // Если у колонки есть функция форматирования, используем её
    if (column.format) {
      return column.format(item[column.field], item);
    }

    // Если значение не определено, возвращаем дефолтное значение
    if (item[column.field] === undefined || item[column.field] === null) {
      return column.defaultValue || '-';
    }

    return item[column.field];
  };

  return (
    <div className={styles.tableContainer}>
      <table className={styles.adminTable}>
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.field}
                className={`${styles.tableHeader} ${
                  column.sortable ? styles.sortable : ''
                }`}
                onClick={
                  column.sortable
                    ? () => handleSortClick(column.field)
                    : undefined
                }
                style={{ width: column.width || 'auto' }}
              >
                {column.title}
                {column.sortable && renderSortIcon(column.field)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length > 0 ? (
            data.map((item) => (
              <tr
                key={item.id}
                className={`${styles.tableRow} ${
                  hoveredRowId === item.id ? styles.hovered : ''
                }`}
                onClick={onRowClick ? () => onRowClick(item) : undefined}
                onMouseEnter={() => setHoveredRowId(item.id)}
                onMouseLeave={() => setHoveredRowId(null)}
              >
                {columns.map((column) => (
                  <td
                    key={`${item.id}-${column.field}`}
                    className={styles.tableCell}
                    style={{ textAlign: column.align || 'left' }}
                  >
                    {formatCellValue(column, item)}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={columns.length} className={styles.emptyMessage}>
                Нет данных для отображения
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
