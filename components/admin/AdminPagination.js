import styles from '../../styles/admin/AdminPagination.module.css';

/**
 * Компонент пагинации для административных страниц
 * @param {Object} props - Свойства компонента
 * @param {number} props.currentPage - Текущая страница
 * @param {number} props.totalPages - Общее количество страниц
 * @param {number} props.totalItems - Общее количество элементов
 * @param {number} props.pageSize - Количество элементов на странице
 * @param {Function} props.onPageChange - Функция, вызываемая при изменении страницы
 * @param {Function} props.onPageSizeChange - Функция, вызываемая при изменении количества элементов на странице
 * @returns {JSX.Element} Компонент пагинации для административных страниц
 */
export default function AdminPagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
}) {
  // Массив доступных размеров страницы
  const pageSizeOptions = [10, 20, 50, 100];

  // Вычисляем диапазон отображаемых элементов
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  // Функция для генерации массива номеров страниц для отображения
  const getPageNumbers = () => {
    const pageNumbers = [];
    const maxPagesToShow = 5; // Максимальное количество страниц для отображения

    if (totalPages <= maxPagesToShow) {
      // Если общее количество страниц меньше или равно максимальному, показываем все страницы
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      // Иначе показываем страницы вокруг текущей
      let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
      let endPage = startPage + maxPagesToShow - 1;

      if (endPage > totalPages) {
        endPage = totalPages;
        startPage = Math.max(1, endPage - maxPagesToShow + 1);
      }

      // Добавляем первую страницу и многоточие, если нужно
      if (startPage > 1) {
        pageNumbers.push(1);
        if (startPage > 2) {
          pageNumbers.push('...');
        }
      }

      // Добавляем страницы вокруг текущей
      for (let i = startPage; i <= endPage; i++) {
        pageNumbers.push(i);
      }

      // Добавляем последнюю страницу и многоточие, если нужно
      if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
          pageNumbers.push('...');
        }
        pageNumbers.push(totalPages);
      }
    }

    return pageNumbers;
  };

  // Обработчик изменения размера страницы
  const handlePageSizeChange = (e) => {
    if (onPageSizeChange) {
      onPageSizeChange(Number(e.target.value));
    }
  };

  return (
    <div className={styles.paginationContainer}>
      <div className={styles.paginationInfo}>
        Показано {startItem}-{endItem} из {totalItems} записей
      </div>

      <div className={styles.paginationControls}>
        <button
          className={`${styles.paginationButton} ${
            currentPage === 1 ? styles.disabled : ''
          }`}
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
        >
          &laquo;
        </button>

        <button
          className={`${styles.paginationButton} ${
            currentPage === 1 ? styles.disabled : ''
          }`}
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          &lsaquo;
        </button>

        {getPageNumbers().map((page, index) => (
          <button
            key={index}
            className={`${styles.paginationButton} ${
              page === currentPage ? styles.active : ''
            } ${page === '...' ? styles.ellipsis : ''}`}
            onClick={() => page !== '...' && onPageChange(page)}
            disabled={page === '...'}
          >
            {page}
          </button>
        ))}

        <button
          className={`${styles.paginationButton} ${
            currentPage === totalPages ? styles.disabled : ''
          }`}
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          &rsaquo;
        </button>

        <button
          className={`${styles.paginationButton} ${
            currentPage === totalPages ? styles.disabled : ''
          }`}
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
        >
          &raquo;
        </button>
      </div>

      <div className={styles.pageSizeSelector}>
        <select
          value={pageSize}
          onChange={handlePageSizeChange}
          className={styles.pageSizeSelect}
        >
          {pageSizeOptions.map((size) => (
            <option key={size} value={size}>
              {size} записей
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
