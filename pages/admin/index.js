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
          throw new Error('Не удалось загрузить статистику');
        }

        const data = await response.json();
        // Извлекаем данные summary из ответа API
        setStatistics({
          usersCount: data.summary.users.total,
          interviewsCount: data.summary.interviews.total,
          activeInterviewsCount:
            data.summary.interviews.pending + data.summary.interviews.booked,
          noShowCount: data.summary.interviews.noShow,
          recentLogs: data.recentLogs || [],
        });
      } catch (error) {
        console.error('Ошибка при загрузке статистики:', error);
        showError('Не удалось загрузить статистику');
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
