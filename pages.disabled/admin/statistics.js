import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import AdminLayout from '../../components/admin/AdminLayout';
import StatisticsOverview from '../../components/admin/StatisticsOverview';
import StatisticsChart from '../../components/admin/StatisticsChart';
import { useNotification } from '../../contexts/NotificationContext';
import styles from '../../styles/admin/StatisticsOverview.module.css';

/**
 * Страница просмотра статистики системы
 * @returns {JSX.Element} Страница просмотра статистики
 */
export default function AdminStatisticsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { showError } = useNotification();

  // Состояние для хранения данных статистики
  const [statistics, setStatistics] = useState([]);
  // Состояние для хранения общей статистики
  const [summary, setSummary] = useState(null);
  // Состояние для хранения фильтров по дате
  const [dateFilters, setDateFilters] = useState({
    startDate: '',
    endDate: '',
  });
  // Состояние для отслеживания загрузки данных
  const [loading, setLoading] = useState(true);
  // Состояние для хранения ошибки
  const [error, setError] = useState(null);

  // Проверяем права доступа
  useEffect(() => {
    if (status === 'authenticated') {
      // Проверяем роль пользователя
      if (session.user.role !== 'admin' && session.user.role !== 'superadmin') {
        showError('У вас нет прав для доступа к этой странице');
        router.push('/');
      }
    } else if (status === 'unauthenticated') {
      router.push('/admin/signin');
    }
  }, [status, session, router, showError]);

  // Загрузка данных статистики
  const fetchStatistics = async () => {
    setLoading(true);
    setError(null);

    try {
      // Формируем параметры запроса
      const queryParams = new URLSearchParams();

      // Добавляем фильтры по дате в параметры запроса
      if (dateFilters.startDate) {
        queryParams.append('startDate', dateFilters.startDate);
      }
      if (dateFilters.endDate) {
        queryParams.append('endDate', dateFilters.endDate);
      }

      // Выполняем запрос к API
      const response = await fetch(
        `/api/admin/statistics?${queryParams.toString()}`
      );

      if (!response.ok) {
        throw new Error('Ошибка при получении статистики');
      }

      const data = await response.json();

      // Обновляем состояние
      setStatistics(data.statistics);
      setSummary(data.summary);
    } catch (err) {
      console.error('Ошибка при загрузке статистики:', err);
      setError(
        'Не удалось загрузить статистику. Пожалуйста, попробуйте позже.'
      );
    } finally {
      setLoading(false);
    }
  };

  // Загружаем данные при монтировании компонента и при изменении фильтров
  useEffect(() => {
    if (status === 'authenticated') {
      fetchStatistics();
    }
  }, [status, dateFilters]);

  // Обработчик изменения фильтров по дате
  const handleDateFilterChange = (newFilters) => {
    setDateFilters(newFilters);
  };

  // Если статус загрузки или пользователь не авторизован, показываем загрузку
  if (status === 'loading' || status === 'unauthenticated') {
    return null;
  }

  return (
    <>
      <Head>
        <title>Статистика системы | Админ-панель</title>
        <meta name="description" content="Просмотр статистики системы" />
      </Head>

      <AdminLayout>
        <div className={styles.statisticsPageContainer}>
          <h1 className={styles.statisticsPageTitle}>Статистика системы</h1>

          {loading ? (
            <div className={styles.loadingContainer}>
              <div className={styles.loadingSpinner}></div>
              <p>Загрузка статистики...</p>
            </div>
          ) : error ? (
            <div className={styles.errorContainer}>
              <p className={styles.errorMessage}>{error}</p>
              <button onClick={fetchStatistics} className={styles.retryButton}>
                Повторить
              </button>
            </div>
          ) : (
            <>
              <StatisticsOverview
                summary={summary}
                onDateFilterChange={handleDateFilterChange}
              />
              <StatisticsChart statistics={statistics} />
            </>
          )}
        </div>
      </AdminLayout>
    </>
  );
}

// Серверная проверка прав доступа
export async function getServerSideProps(context) {
  return {
    props: {}, // Передаем пустой объект props
  };
}
