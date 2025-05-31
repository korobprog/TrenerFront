import { useState } from 'react';
import { useRouter } from 'next/router';
import AdminTable from './AdminTable';
import AdminPagination from './AdminPagination';
import styles from '../../styles/admin/UsersList.module.css';

/**
 * Компонент для отображения списка пользователей в административной панели
 * @param {Object} props - Свойства компонента
 * @param {Array} props.users - Массив пользователей
 * @param {Object} props.pagination - Информация о пагинации
 * @param {Object} props.sorting - Информация о сортировке
 * @param {Function} props.onPageChange - Функция, вызываемая при изменении страницы
 * @param {Function} props.onPageSizeChange - Функция, вызываемая при изменении размера страницы
 * @param {Function} props.onSortChange - Функция, вызываемая при изменении сортировки
 * @param {Function} props.onRefresh - Функция для обновления списка пользователей
 * @returns {JSX.Element} Компонент списка пользователей
 */
export default function UsersList({
  users,
  pagination,
  sorting,
  onPageChange,
  onPageSizeChange,
  onSortChange,
  onRefresh,
}) {
  const router = useRouter();

  // Определение колонок таблицы
  const columns = [
    {
      field: 'name',
      title: 'Имя',
      sortable: true,
      width: '25%',
      format: (value, user) => (
        <div className={styles.userNameCell}>
          {user?.image && (
            <img
              src={user.image}
              alt={user?.name || 'Пользователь'}
              className={styles.userAvatar}
            />
          )}
          <div className={styles.userInfo}>
            <div className={styles.userName}>{value || 'Без имени'}</div>
            <div className={styles.userEmail}>{user?.email || 'Без email'}</div>
          </div>
        </div>
      ),
    },
    {
      field: 'role',
      title: 'Роль',
      sortable: true,
      width: '15%',
      format: (value) => {
        const roleLabels = {
          user: 'Пользователь',
          interviewer: 'Интервьюер',
          admin: 'Администратор',
        };

        const roleClasses = {
          user: styles.roleUser,
          interviewer: styles.roleInterviewer,
          admin: styles.roleAdmin,
        };

        return (
          <span className={`${styles.roleLabel} ${roleClasses[value] || ''}`}>
            {roleLabels[value] || value}
          </span>
        );
      },
    },
    {
      field: 'isBlocked',
      title: 'Статус',
      sortable: true,
      width: '15%',
      format: (value) => (
        <span
          className={`${styles.statusLabel} ${
            value ? styles.statusBlocked : styles.statusActive
          }`}
        >
          {value ? 'Заблокирован' : 'Активен'}
        </span>
      ),
    },
    {
      field: '_count',
      title: 'Собеседования',
      sortable: false,
      width: '15%',
      format: (value) => {
        const interviewerCount = value?.interviewerSessions || 0;
        const intervieweeCount = value?.intervieweeSessions || 0;
        return (
          <div className={styles.interviewsCount}>
            <div className={styles.interviewerCount}>
              Проведено: {interviewerCount}
            </div>
            <div className={styles.intervieweeCount}>
              Пройдено: {intervieweeCount}
            </div>
          </div>
        );
      },
    },
    {
      field: 'createdAt',
      title: 'Дата регистрации',
      sortable: true,
      width: '15%',
      format: (value) => {
        if (!value) return 'Не указано';
        const date = new Date(value);
        return isNaN(date.getTime())
          ? 'Неверная дата'
          : date.toLocaleDateString('ru-RU', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
            });
      },
    },
    {
      field: 'actions',
      title: 'Действия',
      sortable: false,
      width: '15%',
      format: (_, user) => (
        <div className={styles.actionButtons}>
          <button
            className={`${styles.actionButton} ${styles.viewButton}`}
            onClick={(e) => {
              e.stopPropagation();
              if (user?.id) {
                router.push(`/admin/users/${user.id}`);
              }
            }}
            title="Просмотр"
            disabled={!user?.id}
          >
            👁️
          </button>
          <button
            className={`${styles.actionButton} ${
              user?.isBlocked ? styles.unblockButton : styles.blockButton
            }`}
            onClick={(e) => {
              e.stopPropagation();
              if (user?.id) {
                handleToggleBlock(user);
              }
            }}
            title={user?.isBlocked ? 'Разблокировать' : 'Заблокировать'}
            disabled={!user?.id}
          >
            {user?.isBlocked ? '🔓' : '🔒'}
          </button>
        </div>
      ),
    },
  ];

  // Обработчик клика на строку таблицы
  const handleRowClick = (user) => {
    if (user?.id) {
      router.push(`/admin/users/${user.id}`);
    }
  };

  // Обработчик изменения сортировки
  const handleSortChange = (field, order) => {
    if (onSortChange) {
      onSortChange(field, order);
    }
  };

  // Обработчик блокировки/разблокировки пользователя
  const handleToggleBlock = async (user) => {
    if (!user?.id) {
      console.error('Невозможно изменить статус: отсутствует ID пользователя');
      alert('Ошибка: отсутствует ID пользователя');
      return;
    }

    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isBlocked: !user.isBlocked,
        }),
      });

      if (!response.ok) {
        throw new Error('Ошибка при обновлении статуса пользователя');
      }

      // Обновляем данные для отображения изменений
      if (onRefresh) {
        onRefresh();
      } else {
        // Если функция обновления не передана, используем SPA-навигацию без перезагрузки
        router.push(router.asPath, undefined, { shallow: true });
      }
    } catch (error) {
      console.error('Ошибка при блокировке/разблокировке пользователя:', error);
      alert('Произошла ошибка при обновлении статуса пользователя');
    }
  };

  return (
    <div className={styles.usersListContainer}>
      <AdminTable
        columns={columns}
        data={users || []}
        onRowClick={handleRowClick}
        sortBy={sorting?.sortBy}
        sortOrder={sorting?.sortOrder}
        onSort={handleSortChange}
      />

      <div className={styles.paginationWrapper}>
        <AdminPagination
          currentPage={pagination?.page || 1}
          totalPages={pagination?.pages || pagination?.totalPages || 0}
          totalItems={pagination?.total || 0}
          pageSize={pagination?.limit || 10}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
        />
      </div>
    </div>
  );
}
