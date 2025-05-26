import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import Head from 'next/head';
import AdminLayout from '../../../../components/admin/AdminLayout';
import AdminsList from '../../../../components/admin/AdminsList';
import { useNotification } from '../../../../contexts/NotificationContext';
import styles from '../../../../styles/admin/UsersList.module.css';

/**
 * Страница списка администраторов для супер-администратора
 * @returns {JSX.Element} Страница списка администраторов
 */
export default function AdminsListPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { showError } = useNotification();

  // Состояние для хранения списка администраторов
  const [admins, setAdmins] = useState([]);

  // Состояние для хранения информации о пагинации
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  // Состояние для хранения информации о сортировке
  const [sorting, setSorting] = useState({
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });

  // Состояние для хранения строки поиска
  const [searchQuery, setSearchQuery] = useState('');

  // Состояние для отслеживания загрузки данных
  const [isLoading, setIsLoading] = useState(true);

  // Проверяем, авторизован ли пользователь и имеет ли он роль супер-администратора
  useEffect(() => {
    if (status === 'authenticated') {
      if (session.user.role !== 'superadmin') {
        router.push('/admin');
      }
    } else if (status === 'unauthenticated') {
      router.push('/admin/superadmin-signin');
    }
  }, [status, session, router]);

  // Загружаем список администраторов при изменении параметров пагинации, сортировки или поиска
  useEffect(() => {
    if (status === 'authenticated' && session.user.role === 'superadmin') {
      fetchAdmins();
    }
  }, [
    pagination.page,
    pagination.limit,
    sorting,
    searchQuery,
    status,
    session,
  ]);

  // Функция для загрузки списка администраторов
  const fetchAdmins = async () => {
    try {
      setIsLoading(true);

      // Формируем параметры запроса
      const params = new URLSearchParams({
        page: pagination.page,
        limit: pagination.limit,
        sortBy: sorting.sortBy,
        sortOrder: sorting.sortOrder,
      });

      // Добавляем параметр поиска, если он указан
      if (searchQuery) {
        params.append('search', searchQuery);
      }

      // Отправляем запрос на получение списка администраторов
      const response = await fetch(`/api/admin/superadmin/admins?${params}`);

      if (!response.ok) {
        throw new Error('Ошибка при получении списка администраторов');
      }

      const data = await response.json();

      // Обновляем состояние
      setAdmins(data.admins);
      setPagination({
        page: data.pagination.page,
        limit: data.pagination.limit,
        total: data.pagination.total,
        totalPages: data.pagination.pages,
      });
    } catch (error) {
      console.error('Ошибка при загрузке списка администраторов:', error);
      showError('Не удалось загрузить список администраторов');
    } finally {
      setIsLoading(false);
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

  // Обработчик изменения сортировки
  const handleSortChange = (sortBy, sortOrder) => {
    setSorting({ sortBy, sortOrder });
  };

  // Обработчик изменения строки поиска
  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  // Обработчик отправки формы поиска
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  // Обработчик создания нового администратора
  const handleCreateAdmin = () => {
    router.push('/admin/superadmin/admins/new');
  };

  // Если пользователь не авторизован или не загружена сессия, показываем заглушку
  if (
    status === 'loading' ||
    (status === 'authenticated' && session.user.role !== 'superadmin')
  ) {
    return (
      <AdminLayout>
        <div className={styles.loadingContainer}>
          <div className={styles.loadingSpinner}></div>
          <p>Загрузка...</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <Head>
        <title>Управление администраторами | Панель супер-администратора</title>
      </Head>

      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Управление администраторами</h1>
        <button className={styles.createButton} onClick={handleCreateAdmin}>
          Создать администратора
        </button>
      </div>

      <div className={styles.searchContainer}>
        <form onSubmit={handleSearchSubmit} className={styles.searchForm}>
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Поиск по имени или email"
            className={styles.searchInput}
          />
          <button type="submit" className={styles.searchButton}>
            🔍
          </button>
        </form>
      </div>

      {isLoading ? (
        <div className={styles.loadingContainer}>
          <div className={styles.loadingSpinner}></div>
          <p>Загрузка списка администраторов...</p>
        </div>
      ) : admins.length === 0 ? (
        <div className={styles.emptyState}>
          <p>
            {searchQuery
              ? 'По вашему запросу ничего не найдено'
              : 'Список администраторов пуст'}
          </p>
          {searchQuery && (
            <button
              className={styles.clearSearchButton}
              onClick={() => setSearchQuery('')}
            >
              Очистить поиск
            </button>
          )}
        </div>
      ) : (
        <AdminsList
          admins={admins}
          pagination={pagination}
          sorting={sorting}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
          onSortChange={handleSortChange}
        />
      )}
    </AdminLayout>
  );
}
