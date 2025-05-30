import { useState } from 'react';
import { useRouter } from 'next/router';
import AdminTable from './AdminTable';
import AdminPagination from './AdminPagination';
import styles from '../../styles/admin/UsersList.module.css'; // Используем те же стили, что и для UsersList

/**
 * Компонент для отображения списка администраторов в панели супер-администратора
 * @param {Object} props - Свойства компонента
 * @param {Array} props.admins - Массив администраторов
 * @param {Object} props.pagination - Информация о пагинации
 * @param {Object} props.sorting - Информация о сортировке
 * @param {Function} props.onPageChange - Функция, вызываемая при изменении страницы
 * @param {Function} props.onPageSizeChange - Функция, вызываемая при изменении размера страницы
 * @param {Function} props.onSortChange - Функция, вызываемая при изменении сортировки
 * @returns {JSX.Element} Компонент списка администраторов
 */
export default function AdminsList({
  admins,
  pagination,
  sorting,
  onPageChange,
  onPageSizeChange,
  onSortChange,
}) {
  const router = useRouter();

  // Определение колонок таблицы
  const columns = [
    {
      field: 'name',
      title: 'Имя',
      sortable: true,
      width: '25%',
      format: (value, admin) => (
        <div className={styles.userNameCell}>
          {admin.image && (
            <img
              src={admin.image}
              alt={admin.name}
              className={styles.userAvatar}
            />
          )}
          <div className={styles.userInfo}>
            <div className={styles.userName}>{value}</div>
            <div className={styles.userEmail}>{admin.email}</div>
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
          admin: 'Администратор',
          superadmin: 'Супер-администратор',
        };

        const roleClasses = {
          admin: styles.roleAdmin,
          superadmin: styles.roleAdmin, // Используем тот же класс, что и для admin
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
      field: 'actionsCount',
      title: 'Действия',
      sortable: false,
      width: '15%',
      format: (value) => (
        <div className={styles.actionsCount}>
          <div>Всего действий: {value}</div>
        </div>
      ),
    },
    {
      field: 'createdAt',
      title: 'Дата регистрации',
      sortable: true,
      width: '15%',
      format: (value) => {
        const date = new Date(value);
        return date.toLocaleDateString('ru-RU', {
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
      format: (_, admin) => (
        <div className={styles.actionButtons}>
          <button
            className={`${styles.actionButton} ${styles.viewButton}`}
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/admin/superadmin/admins/${admin.id}`);
            }}
            title="Просмотр"
          >
            👁️
          </button>
          <button
            className={`${styles.actionButton} ${
              admin.isBlocked ? styles.unblockButton : styles.blockButton
            }`}
            onClick={(e) => {
              e.stopPropagation();
              handleToggleBlock(admin);
            }}
            title={admin.isBlocked ? 'Разблокировать' : 'Заблокировать'}
            disabled={
              admin.role === 'superadmin' && admin.id === getCurrentAdminId()
            }
          >
            {admin.isBlocked ? '🔓' : '🔒'}
          </button>
        </div>
      ),
    },
  ];

  // Функция для получения ID текущего супер-администратора
  const getCurrentAdminId = () => {
    // В реальном приложении это должно быть получено из сессии или контекста
    // Здесь мы просто возвращаем пустую строку, чтобы избежать ошибок
    return '';
  };

  // Обработчик клика на строку таблицы
  const handleRowClick = (admin) => {
    router.push(`/admin/superadmin/admins/${admin.id}`);
  };

  // Обработчик изменения сортировки
  const handleSortChange = (field, order) => {
    if (onSortChange) {
      onSortChange(field, order);
    }
  };

  // Обработчик блокировки/разблокировки администратора
  const handleToggleBlock = async (admin) => {
    // Запрещаем блокировать самого себя
    if (admin.id === getCurrentAdminId() && admin.role === 'superadmin') {
      alert('Невозможно заблокировать собственную учетную запись');
      return;
    }

    try {
      const response = await fetch(`/api/admin/superadmin/admins/${admin.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isBlocked: !admin.isBlocked,
        }),
      });

      if (!response.ok) {
        throw new Error('Ошибка при обновлении статуса администратора');
      }

      // Обновляем страницу для отображения изменений
      router.reload();
    } catch (error) {
      console.error(
        'Ошибка при блокировке/разблокировке администратора:',
        error
      );
      alert('Произошла ошибка при обновлении статуса администратора');
    }
  };

  return (
    <div className={styles.usersListContainer}>
      <AdminTable
        columns={columns}
        data={admins}
        onRowClick={handleRowClick}
        sortBy={sorting?.sortBy}
        sortOrder={sorting?.sortOrder}
        onSort={handleSortChange}
      />

      <div className={styles.paginationWrapper}>
        <AdminPagination
          currentPage={pagination.page}
          totalPages={pagination.totalPages}
          totalItems={pagination.total}
          pageSize={pagination.limit}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
        />
      </div>
    </div>
  );
}
