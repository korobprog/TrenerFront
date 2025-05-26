import { useState, useEffect } from 'react';
import AdminTable from './AdminTable';
import AdminPagination from './AdminPagination';
import LogsFilter from './LogsFilter';
import styles from '../../styles/admin/LogsList.module.css';

/**
 * Компонент для отображения списка логов административных действий
 * @returns {JSX.Element} Компонент списка логов
 */
export default function LogsList() {
  // Состояние для хранения данных логов
  const [logs, setLogs] = useState([]);
  // Состояние для хранения информации о пагинации
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0,
  });
  // Состояние для хранения фильтров
  const [filters, setFilters] = useState({
    adminId: '',
    action: '',
    entityType: '',
    entityId: '',
    startDate: '',
    endDate: '',
  });
  // Состояние для хранения данных для фильтрации
  const [filterData, setFilterData] = useState({
    actionTypes: [],
    entityTypes: [],
    admins: [],
  });
  // Состояние для хранения параметров сортировки
  const [sortParams, setSortParams] = useState({
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });
  // Состояние для отслеживания загрузки данных
  const [loading, setLoading] = useState(true);
  // Состояние для хранения ошибки
  const [error, setError] = useState(null);

  // Колонки таблицы
  const columns = [
    {
      field: 'id',
      title: 'ID',
      sortable: true,
      width: '80px',
    },
    {
      field: 'admin',
      title: 'Администратор',
      sortable: false,
      format: (value) => (value ? value.name : '-'),
    },
    {
      field: 'action',
      title: 'Действие',
      sortable: true,
    },
    {
      field: 'entityType',
      title: 'Тип сущности',
      sortable: true,
    },
    {
      field: 'entityId',
      title: 'ID сущности',
      sortable: true,
    },
    {
      field: 'details',
      title: 'Детали',
      sortable: false,
      format: (value) => {
        if (!value) return '-';

        // Функция для форматирования JSON с подсветкой
        const formatJSON = (jsonObj) => {
          const jsonString = JSON.stringify(jsonObj, null, 2);
          return <pre className={styles.jsonDetails}>{jsonString}</pre>;
        };

        // Если значение уже является объектом
        if (typeof value === 'object') {
          // Проверяем, есть ли в объекте поле filters, которое является строкой JSON
          if (value.filters && typeof value.filters === 'string') {
            try {
              // Пытаемся распарсить строку JSON в поле filters
              const parsedFilters = JSON.parse(value.filters);
              // Создаем новый объект с распарсенными фильтрами
              const formattedValue = { ...value, filters: parsedFilters };
              return formatJSON(formattedValue);
            } catch (e) {
              // Если не удалось распарсить, оставляем как есть
              return formatJSON(value);
            }
          }

          return Object.keys(value).length > 0 ? formatJSON(value) : '-';
        }

        // Если значение является строкой, пытаемся распарсить как JSON
        try {
          const details = JSON.parse(value);

          // Проверяем, есть ли в распарсенном объекте поле filters, которое является строкой JSON
          if (details.filters && typeof details.filters === 'string') {
            try {
              // Пытаемся распарсить строку JSON в поле filters
              const parsedFilters = JSON.parse(details.filters);
              // Создаем новый объект с распарсенными фильтрами
              const formattedDetails = { ...details, filters: parsedFilters };
              return formatJSON(formattedDetails);
            } catch (e) {
              // Если не удалось распарсить, оставляем как есть
              return formatJSON(details);
            }
          }

          return Object.keys(details).length > 0 ? formatJSON(details) : '-';
        } catch (e) {
          // Если не удалось распарсить, возвращаем строковое представление
          return String(value);
        }
      },
    },
    {
      field: 'createdAt',
      title: 'Дата',
      sortable: true,
      format: (value) => new Date(value).toLocaleString('ru-RU'),
    },
  ];

  // Загрузка данных логов
  const fetchLogs = async () => {
    setLoading(true);
    setError(null);

    try {
      // Формируем параметры запроса
      const queryParams = new URLSearchParams({
        page: pagination.page,
        limit: pagination.limit,
        sortBy: sortParams.sortBy,
        sortOrder: sortParams.sortOrder,
      });

      // Добавляем фильтры в параметры запроса
      Object.entries(filters).forEach(([key, value]) => {
        if (value) {
          queryParams.append(key, value);
        }
      });

      // Выполняем запрос к API
      const response = await fetch(`/api/admin/logs?${queryParams.toString()}`);

      if (!response.ok) {
        throw new Error('Ошибка при получении логов');
      }

      const data = await response.json();

      // Обновляем состояние
      setLogs(data.logs);
      setPagination(data.pagination);
      setFilterData(data.filters);
    } catch (err) {
      console.error('Ошибка при загрузке логов:', err);
      setError('Не удалось загрузить логи. Пожалуйста, попробуйте позже.');
    } finally {
      setLoading(false);
    }
  };

  // Загружаем данные при монтировании компонента и при изменении параметров
  useEffect(() => {
    fetchLogs();
  }, [pagination.page, pagination.limit, sortParams, filters]);

  // Обработчик изменения страницы
  const handlePageChange = (page) => {
    setPagination((prev) => ({ ...prev, page }));
  };

  // Обработчик изменения количества элементов на странице
  const handlePageSizeChange = (limit) => {
    setPagination((prev) => ({ ...prev, page: 1, limit }));
  };

  // Обработчик изменения сортировки
  const handleSortChange = (sortBy, sortOrder) => {
    setSortParams({ sortBy, sortOrder });
  };

  // Обработчик изменения фильтров
  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  return (
    <div className={styles.logsListContainer}>
      <h1 className={styles.logsListTitle}>Логи административных действий</h1>

      <LogsFilter
        filters={filters}
        actionTypes={filterData.actionTypes}
        entityTypes={filterData.entityTypes}
        admins={filterData.admins}
        onFilterChange={handleFilterChange}
      />

      {loading ? (
        <div className={styles.loadingContainer}>
          <div className={styles.loadingSpinner}></div>
          <p>Загрузка логов...</p>
        </div>
      ) : error ? (
        <div className={styles.errorContainer}>
          <p className={styles.errorMessage}>{error}</p>
          <button onClick={fetchLogs} className={styles.retryButton}>
            Повторить
          </button>
        </div>
      ) : (
        <>
          <AdminTable
            columns={columns}
            data={logs}
            sortBy={sortParams.sortBy}
            sortOrder={sortParams.sortOrder}
            onSort={handleSortChange}
          />

          <AdminPagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            totalItems={pagination.total}
            pageSize={pagination.limit}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
          />
        </>
      )}
    </div>
  );
}
