import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import AdminLayout from '../../../components/admin/AdminLayout';
import InterviewFilter from '../../../components/admin/InterviewFilter';
import InterviewsList from '../../../components/admin/InterviewsList';
import { useNotification } from '../../../contexts/NotificationContext';
import styles from '../../../styles/admin/InterviewsList.module.css';

/**
 * Страница со списком собеседований в административной панели
 * @returns {JSX.Element} Страница со списком собеседований
 */
export default function InterviewsPage() {
  const router = useRouter();
  const { showError, showSuccess } = useNotification();

  // Состояние для хранения списка собеседований
  const [interviews, setInterviews] = useState([]);

  // Состояние для хранения информации о пагинации
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

  // Состояние для хранения фильтров
  const [filters, setFilters] = useState({
    status: '',
    interviewerId: '',
    intervieweeId: '',
    startDate: '',
    endDate: '',
  });

  // Состояние для хранения информации о сортировке
  const [sorting, setSorting] = useState({
    sortBy: 'scheduledTime',
    sortOrder: 'desc',
  });

  // Состояние для отслеживания загрузки данных
  const [loading, setLoading] = useState(true);

  // Загрузка данных при изменении параметров
  useEffect(() => {
    fetchInterviews();
  }, [pagination.page, pagination.limit, filters, sorting]);

  // Функция для загрузки списка собеседований
  const fetchInterviews = async () => {
    try {
      setLoading(true);

      // Формируем параметры запроса
      const queryParams = new URLSearchParams({
        page: pagination.page,
        limit: pagination.limit,
        sortBy: sorting.sortBy,
        sortOrder: sorting.sortOrder,
      });

      // Добавляем фильтры, если они заданы
      if (filters.status) queryParams.append('status', filters.status);
      if (filters.interviewerId)
        queryParams.append('interviewerId', filters.interviewerId);
      if (filters.intervieweeId)
        queryParams.append('intervieweeId', filters.intervieweeId);
      if (filters.startDate) queryParams.append('startDate', filters.startDate);
      if (filters.endDate) queryParams.append('endDate', filters.endDate);

      // Выполняем запрос к API
      const response = await fetch(
        `/api/admin/interviews?${queryParams.toString()}`
      );

      if (!response.ok) {
        throw new Error('Ошибка при получении списка собеседований');
      }

      const data = await response.json();

      // Обновляем состояние
      setInterviews(data.interviews);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Ошибка при загрузке собеседований:', error);
      showError('Не удалось загрузить список собеседований');
    } finally {
      setLoading(false);
    }
  };

  // Обработчик изменения страницы
  const handlePageChange = (page) => {
    setPagination((prev) => ({ ...prev, page }));
  };

  // Обработчик изменения размера страницы
  const handlePageSizeChange = (limit) => {
    setPagination((prev) => ({ ...prev, page: 1, limit }));
  };

  // Обработчик изменения фильтров
  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  // Обработчик изменения сортировки
  const handleSortChange = (sortBy, sortOrder) => {
    setSorting({ sortBy, sortOrder });
  };

  // Обработчик создания нового собеседования
  const handleCreateInterview = () => {
    router.push('/admin/interviews/new');
  };

  return (
    <AdminLayout>
      <Head>
        <title>Управление собеседованиями | Админ-панель</title>
      </Head>

      <div className={styles.interviewsPageContainer}>
        <div className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>Управление собеседованиями</h1>
          <button
            className={styles.createButton}
            onClick={handleCreateInterview}
          >
            Создать собеседование
          </button>
        </div>

        <InterviewFilter
          filters={filters}
          onFilterChange={handleFilterChange}
        />

        {loading ? (
          <div className={styles.loadingContainer}>
            <div className={styles.loadingSpinner}></div>
            <p>Загрузка собеседований...</p>
          </div>
        ) : (
          <InterviewsList
            interviews={interviews}
            pagination={pagination}
            sorting={sorting}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
            onSortChange={handleSortChange}
          />
        )}
      </div>
    </AdminLayout>
  );
}
