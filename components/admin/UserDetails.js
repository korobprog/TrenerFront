import { useState } from 'react';
import Link from 'next/link';
import styles from '../../styles/admin/UserDetails.module.css';
import PointsEditModal from './PointsEditModal';

/**
 * Компонент для отображения детальной информации о пользователе
 * @param {Object} props - Свойства компонента
 * @param {Object} props.user - Данные пользователя
 * @param {Function} props.onEdit - Функция, вызываемая при нажатии на кнопку редактирования
 * @returns {JSX.Element} Компонент детальной информации о пользователе
 */
export default function UserDetails({ user, onEdit }) {
  // Состояние для отслеживания активной вкладки
  const [activeTab, setActiveTab] = useState('info');

  // Состояние для отслеживания открытия/закрытия модального окна редактирования баллов
  const [isPointsEditModalOpen, setIsPointsEditModalOpen] = useState(false);

  // Функция для форматирования даты
  const formatDate = (dateString) => {
    if (!dateString) return 'Не указано';

    const date = new Date(dateString);
    return date.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Функция для отображения роли пользователя
  const getRoleLabel = (role) => {
    const roleLabels = {
      user: 'Пользователь',
      interviewer: 'Интервьюер',
      admin: 'Администратор',
    };

    return roleLabels[role] || role;
  };

  // Функция для отображения статуса пользователя
  const getStatusLabel = (isBlocked) => {
    return isBlocked ? 'Заблокирован' : 'Активен';
  };

  // Функция для отображения типа транзакции
  const getTransactionTypeLabel = (type) => {
    const typeLabels = {
      booking: 'Бронирование собеседования',
      refund: 'Возврат баллов',
      bonus: 'Бонусные баллы',
      penalty: 'Штраф',
      admin_adjustment: 'Корректировка администратором',
    };

    return typeLabels[type] || type;
  };

  // Обработчик сохранения изменений баллов
  const handleSavePoints = async (pointsData) => {
    try {
      const response = await fetch(
        `/api/admin/users/${pointsData.userId}/points`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(pointsData),
        }
      );

      if (!response.ok) {
        throw new Error('Ошибка при сохранении баллов');
      }

      // Перезагрузка страницы для обновления данных
      window.location.reload();
    } catch (error) {
      console.error('Ошибка при сохранении баллов:', error);
      throw error;
    }
  };

  return (
    <>
      <div className={styles.userDetailsContainer}>
        <div className={styles.userHeader}>
          <div className={styles.userInfo}>
            {user.image && (
              <img
                src={user.image}
                alt={user.name}
                className={styles.userAvatar}
              />
            )}
            <div className={styles.userMeta}>
              <h2 className={styles.userName}>{user.name}</h2>
              <p className={styles.userEmail}>{user.email}</p>
              <div className={styles.userLabels}>
                <span
                  className={`${styles.userRole} ${styles[`role${user.role}`]}`}
                >
                  {getRoleLabel(user.role)}
                </span>
                <span
                  className={`${styles.userStatus} ${
                    user.isBlocked ? styles.statusBlocked : styles.statusActive
                  }`}
                >
                  {getStatusLabel(user.isBlocked)}
                </span>
              </div>
            </div>
          </div>
          <div className={styles.userActions}>
            <button className={styles.editButton} onClick={onEdit}>
              Редактировать
            </button>
          </div>
        </div>

        <div className={styles.userTabs}>
          <button
            className={`${styles.tabButton} ${
              activeTab === 'info' ? styles.activeTab : ''
            }`}
            onClick={() => setActiveTab('info')}
          >
            Основная информация
          </button>
          <button
            className={`${styles.tabButton} ${
              activeTab === 'interviews' ? styles.activeTab : ''
            }`}
            onClick={() => setActiveTab('interviews')}
          >
            Собеседования
          </button>
          <button
            className={`${styles.tabButton} ${
              activeTab === 'points' ? styles.activeTab : ''
            }`}
            onClick={() => setActiveTab('points')}
          >
            Баллы и транзакции
          </button>
          <button
            className={`${styles.tabButton} ${
              activeTab === 'violations' ? styles.activeTab : ''
            }`}
            onClick={() => setActiveTab('violations')}
          >
            Нарушения
          </button>
        </div>

        <div className={styles.userTabContent}>
          {activeTab === 'info' && (
            <div className={styles.infoTab}>
              <div className={styles.infoSection}>
                <h3 className={styles.sectionTitle}>Основная информация</h3>
                <div className={styles.infoGrid}>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>ID пользователя:</span>
                    <span className={styles.infoValue}>{user.id}</span>
                  </div>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Дата регистрации:</span>
                    <span className={styles.infoValue}>
                      {formatDate(user.createdAt)}
                    </span>
                  </div>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>
                      Последнее обновление:
                    </span>
                    <span className={styles.infoValue}>
                      {formatDate(user.updatedAt)}
                    </span>
                  </div>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Последний вход:</span>
                    <span className={styles.infoValue}>
                      {formatDate(user.lastLoginAt)}
                    </span>
                  </div>
                </div>
              </div>

              <div className={styles.infoSection}>
                <h3 className={styles.sectionTitle}>Статистика</h3>
                <div className={styles.infoGrid}>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>
                      Проведено собеседований:
                    </span>
                    <span className={styles.infoValue}>
                      {user._count?.interviewerSessions || 0}
                    </span>
                  </div>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>
                      Пройдено собеседований:
                    </span>
                    <span className={styles.infoValue}>
                      {user._count?.intervieweeSessions || 0}
                    </span>
                  </div>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Нарушений:</span>
                    <span className={styles.infoValue}>
                      {user._count?.violations || 0}
                    </span>
                  </div>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Баллов:</span>
                    <span className={styles.infoValue}>
                      {user.userPoints?.points || 0}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'interviews' && (
            <div className={styles.interviewsTab}>
              <div className={styles.interviewsSection}>
                <h3 className={styles.sectionTitle}>
                  Проведенные собеседования (
                  {user._count?.interviewerSessions || 0})
                </h3>
                {user.interviewerSessions &&
                user.interviewerSessions.length > 0 ? (
                  <div className={styles.interviewsList}>
                    {user.interviewerSessions.map((session) => (
                      <div key={session.id} className={styles.interviewItem}>
                        <div className={styles.interviewHeader}>
                          <span className={styles.interviewDate}>
                            {formatDate(session.scheduledTime)}
                          </span>
                          <span
                            className={`${styles.interviewStatus} ${
                              styles[`status${session.status}`]
                            }`}
                          >
                            {session.status}
                          </span>
                        </div>
                        <div className={styles.interviewDetails}>
                          <span className={styles.interviewParticipant}>
                            Собеседуемый:{' '}
                            {session.interviewee?.name || 'Не указан'}
                          </span>
                          <Link
                            href={`/admin/interviews/${session.id}`}
                            className={styles.interviewLink}
                          >
                            Подробнее
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className={styles.emptyMessage}>
                    Пользователь не провел ни одного собеседования
                  </p>
                )}
                {user._count?.interviewerSessions > 5 && (
                  <div className={styles.viewAllLink}>
                    <Link href={`/admin/interviews?interviewerId=${user.id}`}>
                      Просмотреть все проведенные собеседования
                    </Link>
                  </div>
                )}
              </div>

              <div className={styles.interviewsSection}>
                <h3 className={styles.sectionTitle}>
                  Пройденные собеседования (
                  {user._count?.intervieweeSessions || 0})
                </h3>
                {user.intervieweeSessions &&
                user.intervieweeSessions.length > 0 ? (
                  <div className={styles.interviewsList}>
                    {user.intervieweeSessions.map((session) => (
                      <div key={session.id} className={styles.interviewItem}>
                        <div className={styles.interviewHeader}>
                          <span className={styles.interviewDate}>
                            {formatDate(session.scheduledTime)}
                          </span>
                          <span
                            className={`${styles.interviewStatus} ${
                              styles[`status${session.status}`]
                            }`}
                          >
                            {session.status}
                          </span>
                        </div>
                        <div className={styles.interviewDetails}>
                          <span className={styles.interviewParticipant}>
                            Интервьюер:{' '}
                            {session.interviewer?.name || 'Не указан'}
                          </span>
                          <Link
                            href={`/admin/interviews/${session.id}`}
                            className={styles.interviewLink}
                          >
                            Подробнее
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className={styles.emptyMessage}>
                    Пользователь не прошел ни одного собеседования
                  </p>
                )}
                {user._count?.intervieweeSessions > 5 && (
                  <div className={styles.viewAllLink}>
                    <Link href={`/admin/interviews?intervieweeId=${user.id}`}>
                      Просмотреть все пройденные собеседования
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'points' && (
            <div className={styles.pointsTab}>
              <div className={styles.pointsSection}>
                <div className={styles.sectionHeader}>
                  <h3 className={styles.sectionTitle}>Баланс баллов</h3>
                  <button
                    className={styles.editPointsButton}
                    onClick={() => setIsPointsEditModalOpen(true)}
                  >
                    Изменить баллы
                  </button>
                </div>
                <div className={styles.pointsBalance}>
                  <span className={styles.pointsValue}>
                    {user.userPoints?.points || 0}
                  </span>
                  <span className={styles.pointsLabel}>баллов</span>
                </div>
              </div>

              <div className={styles.transactionsSection}>
                <h3 className={styles.sectionTitle}>
                  История транзакций ({user._count?.pointsTransactions || 0})
                </h3>
                {user.pointsTransactions &&
                user.pointsTransactions.length > 0 ? (
                  <div className={styles.transactionsList}>
                    {user.pointsTransactions.map((transaction) => (
                      <div
                        key={transaction.id}
                        className={styles.transactionItem}
                      >
                        <div className={styles.transactionHeader}>
                          <span className={styles.transactionDate}>
                            {formatDate(transaction.createdAt)}
                          </span>
                          <span
                            className={`${styles.transactionAmount} ${
                              transaction.amount >= 0
                                ? styles.amountPositive
                                : styles.amountNegative
                            }`}
                          >
                            {transaction.amount > 0 ? '+' : ''}
                            {transaction.amount} баллов
                          </span>
                        </div>
                        <div className={styles.transactionDetails}>
                          <span className={styles.transactionType}>
                            {getTransactionTypeLabel(transaction.type)}
                          </span>
                          <span className={styles.transactionDescription}>
                            {transaction.description}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className={styles.emptyMessage}>
                    У пользователя нет транзакций
                  </p>
                )}
                {user._count?.pointsTransactions > 10 && (
                  <div className={styles.viewAllLink}>
                    <Link href={`/admin/transactions?userId=${user.id}`}>
                      Просмотреть все транзакции
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'violations' && (
            <div className={styles.violationsTab}>
              <div className={styles.violationsSection}>
                <h3 className={styles.sectionTitle}>
                  Нарушения ({user._count?.violations || 0})
                </h3>
                {user.violations && user.violations.length > 0 ? (
                  <div className={styles.violationsList}>
                    {user.violations.map((violation) => (
                      <div key={violation.id} className={styles.violationItem}>
                        <div className={styles.violationHeader}>
                          <span className={styles.violationDate}>
                            {formatDate(violation.createdAt)}
                          </span>
                          <span
                            className={`${styles.violationType} ${
                              styles[`violation${violation.type}`]
                            }`}
                          >
                            {violation.type}
                          </span>
                        </div>
                        <div className={styles.violationDetails}>
                          <span className={styles.violationDescription}>
                            {violation.description}
                          </span>
                          {violation.interviewSessionId && (
                            <Link
                              href={`/admin/interviews/${violation.interviewSessionId}`}
                              className={styles.violationLink}
                            >
                              Связанное собеседование
                            </Link>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className={styles.emptyMessage}>
                    У пользователя нет нарушений
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Модальное окно редактирования баллов */}
      <PointsEditModal
        isOpen={isPointsEditModalOpen}
        onClose={() => setIsPointsEditModalOpen(false)}
        user={user}
        onSave={handleSavePoints}
      />
    </>
  );
}
