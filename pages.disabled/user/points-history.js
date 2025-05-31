import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../api/auth/[...nextauth]';
import { useNotification } from '../../contexts/NotificationContext';
import styles from '../../styles/user/PointsHistory.module.css';

export default function PointsHistory() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [transactions, setTransactions] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPoints, setCurrentPoints] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [page, setPage] = useState(1);
  const limit = 10;
  const { showSuccess, showError } = useNotification();

  // Перенаправляем на страницу входа, если пользователь не авторизован
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  // Загружаем историю транзакций при монтировании компонента или изменении фильтра/страницы
  useEffect(() => {
    if (status === 'authenticated') {
      fetchTransactions();
    }
  }, [status, filter, page]);

  // Функция для загрузки истории транзакций
  const fetchTransactions = async () => {
    setIsLoading(true);
    try {
      const offset = (page - 1) * limit;
      const queryParams = new URLSearchParams({
        limit,
        offset,
        ...(filter && { type: filter }),
      });

      const response = await fetch(`/api/user/points-history?${queryParams}`);
      if (!response.ok) {
        throw new Error('Не удалось загрузить историю транзакций');
      }

      const result = await response.json();
      if (result.success && result.data) {
        setTransactions(result.data.transactions);
        setTotalCount(result.data.pagination.totalCount);
        setCurrentPoints(result.data.currentPoints);
      } else {
        throw new Error(result.error || 'Неизвестная ошибка');
      }
      // Убрано уведомление об успешной загрузке, чтобы не показывать его слишком часто
    } catch (error) {
      console.error('Ошибка при загрузке истории транзакций:', error);
      showError('Не удалось загрузить историю транзакций: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Обработчик изменения фильтра
  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
    setPage(1); // Сбрасываем страницу при изменении фильтра
  };

  // Функция для форматирования даты
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Функция для получения описания типа транзакции
  const getTypeDescription = (type) => {
    const types = {
      booking: 'Запись на собеседование',
      feedback: 'Проведение собеседования',
      cancellation: 'Отмена собеседования',
      no_show: 'Неявка на собеседование',
      bonus: 'Бонус за активность',
    };
    return types[type] || type;
  };

  // Функция для получения класса стиля в зависимости от суммы транзакции
  const getAmountClass = (amount) => {
    return amount > 0 ? styles.positive : amount < 0 ? styles.negative : '';
  };

  // Вычисляем общее количество страниц
  const totalPages = Math.ceil(totalCount / limit);

  // Если пользователь не авторизован, показываем сообщение о загрузке
  if (status === 'loading' || status === 'unauthenticated') {
    return <div className={styles.loading}>Загрузка...</div>;
  }

  return (
    <div className={styles.container}>
      <Head>
        <title>История баллов | Тренер собеседований</title>
        <meta
          name="description"
          content="История транзакций баллов пользователя"
        />
      </Head>

      <h1 className={styles.title}>История баллов</h1>

      <div className={styles.pointsInfo}>
        <div className={styles.currentPoints}>
          <span>Текущий баланс:</span>
          <span className={styles.pointsValue}>{currentPoints}</span>
        </div>
      </div>

      <div className={styles.filterContainer}>
        <button
          className={`${styles.filterButton} ${!filter ? styles.active : ''}`}
          onClick={() => handleFilterChange('')}
        >
          Все транзакции
        </button>
        <button
          className={`${styles.filterButton} ${
            filter === 'booking' ? styles.active : ''
          }`}
          onClick={() => handleFilterChange('booking')}
        >
          Записи на собеседования
        </button>
        <button
          className={`${styles.filterButton} ${
            filter === 'feedback' ? styles.active : ''
          }`}
          onClick={() => handleFilterChange('feedback')}
        >
          Проведение собеседований
        </button>
        <button
          className={`${styles.filterButton} ${
            filter === 'cancellation' ? styles.active : ''
          }`}
          onClick={() => handleFilterChange('cancellation')}
        >
          Отмены собеседований
        </button>
        <button
          className={`${styles.filterButton} ${
            filter === 'no_show' ? styles.active : ''
          }`}
          onClick={() => handleFilterChange('no_show')}
        >
          Неявки
        </button>
        <button
          className={`${styles.filterButton} ${
            filter === 'bonus' ? styles.active : ''
          }`}
          onClick={() => handleFilterChange('bonus')}
        >
          Бонусы
        </button>
      </div>

      {isLoading ? (
        <div className={styles.loading}>Загрузка транзакций...</div>
      ) : transactions.length > 0 ? (
        <>
          <div className={styles.transactionsContainer}>
            <table className={styles.transactionsTable}>
              <thead>
                <tr>
                  <th>Дата</th>
                  <th>Тип</th>
                  <th>Описание</th>
                  <th>Сумма</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((transaction) => (
                  <tr key={transaction.id}>
                    <td>{formatDate(transaction.createdAt)}</td>
                    <td>{getTypeDescription(transaction.type)}</td>
                    <td>{transaction.description || '-'}</td>
                    <td className={getAmountClass(transaction.amount)}>
                      {transaction.amount > 0 ? '+' : ''}
                      {transaction.amount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className={styles.pagination}>
              <button
                className={styles.pageButton}
                onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                disabled={page === 1}
              >
                &laquo; Назад
              </button>
              <span className={styles.pageInfo}>
                Страница {page} из {totalPages}
              </span>
              <button
                className={styles.pageButton}
                onClick={() =>
                  setPage((prev) => Math.min(prev + 1, totalPages))
                }
                disabled={page === totalPages}
              >
                Вперед &raquo;
              </button>
            </div>
          )}
        </>
      ) : (
        <div className={styles.emptyState}>
          <p className={styles.emptyMessage}>
            {filter
              ? `Нет транзакций типа "${getTypeDescription(filter)}"`
              : 'История транзакций пуста'}
          </p>
          <p className={styles.emptyHint}>
            Транзакции будут появляться здесь при записи на собеседования,
            проведении собеседований и других операциях с баллами
          </p>
        </div>
      )}

      <div className={styles.backButtonContainer}>
        <button
          className={styles.backButton}
          onClick={() => router.push('/mock-interviews')}
        >
          Вернуться к собеседованиям
        </button>
      </div>
    </div>
  );
}

// Серверная проверка авторизации
export async function getServerSideProps(context) {
  const session = await getServerSession(context.req, context.res, authOptions);

  // Если пользователь не авторизован, перенаправляем на страницу входа
  if (!session) {
    return {
      redirect: {
        destination: '/auth/signin',
        permanent: false,
      },
    };
  }

  return {
    props: {
      session,
    },
  };
}
