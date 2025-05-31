import { useState, useEffect } from 'react';
import Head from 'next/head';
import AdminLayout from '../../components/admin/AdminLayout';
import styles from '../../styles/admin/AdminLayout.module.css';
import { useNotification } from '../../contexts/NotificationContext';

/**
 * Главная страница административной панели
 * @returns {JSX.Element} Главная страница административной панели
 */
export default function AdminDashboard() {
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const { showError } = useNotification();

  // Загрузка статистики при монтировании компонента
  useEffect(() => {
    const fetchStatistics = async () => {
      try {
        const response = await fetch('/api/admin/statistics');

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('Ошибка API:', response.status, errorData);
          throw new Error(
            errorData.message ||
              `Ошибка загрузки статистики: ${response.status}`
          );
        }

        const data = await response.json();
        console.log('Полученные данные от API:', data);

        // Проверяем успешность ответа API
        if (!data.success || !data.data) {
          throw new Error('API вернул некорректную структуру данных');
        }

        const apiData = data.data;

        // Извлекаем данные из фактической структуры API
        const usersData = apiData.users || {};
        const interviewsData = apiData.interviews || {};
        const interviewsByStatus = interviewsData.byStatus || {};

        // Рассчитываем общее количество собеседований из статусов
        const totalInterviews = Object.values(interviewsByStatus).reduce(
          (sum, count) => sum + count,
          0
        );

        // Рассчитываем активные собеседования (pending + confirmed + in_progress)
        const activeInterviewsCount =
          (interviewsByStatus.pending || 0) +
          (interviewsByStatus.confirmed || 0) +
          (interviewsByStatus.in_progress || 0);

        setStatistics({
          usersCount: usersData.total || 0,
          interviewsCount: totalInterviews,
          activeInterviewsCount: activeInterviewsCount,
          noShowCount: interviewsByStatus.no_show || 0,
          recentLogs: [], // API не возвращает recentLogs, устанавливаем пустой массив
        });
      } catch (error) {
        console.error('Ошибка при загрузке статистики:', error);
        showError(`Не удалось загрузить статистику: ${error.message}`);

        // Устанавливаем fallback значения при ошибке
        setStatistics({
          usersCount: 0,
          interviewsCount: 0,
          activeInterviewsCount: 0,
          noShowCount: 0,
          recentLogs: [],
        });
      } finally {
        setLoading(false);
      }
    };

    fetchStatistics();
  }, [showError]);

  return (
    <>
      <Head>
        <title>Административная панель</title>
        <meta name="description" content="Административная панель" />
      </Head>
      <AdminLayout>
        <div className={styles.dashboardContainer}>
          <h1 className={styles.pageTitle}>Дашборд</h1>

          {loading ? (
            <div className={styles.loadingContainer}>
              <div className={styles.loadingSpinner}></div>
              <p>Загрузка статистики...</p>
            </div>
          ) : statistics ? (
            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <h3 className={styles.statTitle}>Пользователи</h3>
                <div className={styles.statValue}>
                  {statistics.usersCount || 0}
                </div>
                <div className={styles.statDescription}>
                  Всего зарегистрировано
                </div>
              </div>

              <div className={styles.statCard}>
                <h3 className={styles.statTitle}>Собеседования</h3>
                <div className={styles.statValue}>
                  {statistics.interviewsCount || 0}
                </div>
                <div className={styles.statDescription}>Всего проведено</div>
              </div>

              <div className={styles.statCard}>
                <h3 className={styles.statTitle}>Активные собеседования</h3>
                <div className={styles.statValue}>
                  {statistics.activeInterviewsCount || 0}
                </div>
                <div className={styles.statDescription}>Ожидают проведения</div>
              </div>

              <div className={styles.statCard}>
                <h3 className={styles.statTitle}>Неявки</h3>
                <div className={styles.statValue}>
                  {statistics.noShowCount || 0}
                </div>
                <div className={styles.statDescription}>Всего неявок</div>
              </div>
            </div>
          ) : (
            <div className={styles.errorMessage}>
              Не удалось загрузить статистику. Пожалуйста, попробуйте позже.
            </div>
          )}

          <div className={styles.recentActivitySection}>
            <h2 className={styles.sectionTitle}>Последние действия</h2>
            {loading ? (
              <div className={styles.loadingContainer}>
                <div className={styles.loadingSpinner}></div>
                <p>Загрузка...</p>
              </div>
            ) : statistics &&
              statistics.recentLogs &&
              statistics.recentLogs.length > 0 ? (
              <div className={styles.activityList}>
                {statistics.recentLogs.map((log) => (
                  <div key={log.id} className={styles.activityItem}>
                    <div className={styles.activityIcon}>
                      {log.action === 'create' && '➕'}
                      {log.action === 'update' && '✏️'}
                      {log.action === 'delete' && '🗑️'}
                      {log.action === 'login' && '🔐'}
                      {!['create', 'update', 'delete', 'login'].includes(
                        log.action
                      ) && '📋'}
                    </div>
                    <div className={styles.activityContent}>
                      <div className={styles.activityTitle}>
                        {log.adminName || 'Администратор'}{' '}
                        {getActionText(log.action)} {log.entityType}
                        {log.entityId && ` (ID: ${log.entityId})`}
                      </div>
                      <div className={styles.activityTime}>
                        {new Date(log.createdAt).toLocaleString('ru-RU')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.emptyState}>
                Нет недавних действий для отображения
              </div>
            )}
          </div>
        </div>
      </AdminLayout>
    </>
  );
}

/**
 * Возвращает текстовое описание действия
 * @param {string} action - Тип действия
 * @returns {string} Текстовое описание действия
 */
function getActionText(action) {
  switch (action) {
    case 'create':
      return 'создал';
    case 'update':
      return 'обновил';
    case 'delete':
      return 'удалил';
    case 'login':
      return 'вошел в систему';
    default:
      return 'выполнил действие с';
  }
}
