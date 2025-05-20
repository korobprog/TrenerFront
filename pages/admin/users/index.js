import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import AdminLayout from '../../../components/admin/AdminLayout';
import UserFilter from '../../../components/admin/UserFilter';
import UsersList from '../../../components/admin/UsersList';
import { useNotification } from '../../../contexts/NotificationContext';
import styles from '../../../styles/admin/UsersList.module.css';

/**
 * Страница со списком пользователей в административной панели
 * @returns {JSX.Element} Страница со списком пользователей
 */
export default function UsersPage() {
  const router = useRouter();
  const { showError, showSuccess } = useNotification();

  // Состояние для хранения списка пользователей
  const [users, setUsers] = useState([]);

  // Состояние для хранения информации о пагинации
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

  // Состояние для хранения фильтров
  const [filters, setFilters] = useState({
    search: '',
    role: '',
    isBlocked: '',
  });

  // Состояние для хранения информации о сортировке
  const [sorting, setSorting] = useState({
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });

  // Состояние для отслеживания загрузки данных
  const [loading, setLoading] = useState(true);

  // Загрузка данных при изменении параметров
  useEffect(() => {
    fetchUsers();
  }, [pagination.page, pagination.limit, filters, sorting]);

  // Функция для загрузки списка пользователей
  const fetchUsers = async () => {
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
      if (filters.search) queryParams.append('search', filters.search);
      if (filters.role) queryParams.append('role', filters.role);
      if (filters.isBlocked !== '')
        queryParams.append('isBlocked', filters.isBlocked);

      // Выполняем запрос к API
      const response = await fetch(
        `/api/admin/users?${queryParams.toString()}`
      );

      if (!response.ok) {
        throw new Error('Ошибка при получении списка пользователей');
      }

      const data = await response.json();

      // Обновляем состояние
      setUsers(data.users);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Ошибка при загрузке пользователей:', error);
      showError('Не удалось загрузить список пользователей');
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

  // Обработчик создания нового пользователя
  const handleCreateUser = () => {
    // В данной версии не реализуем создание пользователей через админку
    showError(
      'Создание пользователей через админку не реализовано в текущей версии'
    );
  };

  return (
    <AdminLayout>
      <Head>
        <title>Управление пользователями | Админ-панель</title>
      </Head>

      <div className={styles.usersPageContainer}>
        <div className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>Управление пользователями</h1>
          <button className={styles.createButton} onClick={handleCreateUser}>
            Создать пользователя
          </button>
        </div>

        <UserFilter filters={filters} onFilterChange={handleFilterChange} />

        {loading ? (
          <div className={styles.loadingContainer}>
            <div className={styles.loadingSpinner}></div>
            <p>Загрузка пользователей...</p>
          </div>
        ) : (
          <UsersList
            users={users}
            pagination={pagination}
            sorting={sorting}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
            onSortChange={handleSortChange}
<<<<<<< HEAD
            onRefresh={fetchUsers}
=======
>>>>>>> 077838ba75b141eded3ed5dc28fbb94584f109f4
          />
        )}
      </div>
    </AdminLayout>
  );
}
