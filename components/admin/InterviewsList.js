import { useState } from 'react';
import { useRouter } from 'next/router';
import AdminTable from './AdminTable';
import AdminPagination from './AdminPagination';
import styles from '../../styles/admin/InterviewsList.module.css';

/**
 * Компонент для отображения списка собеседований в административной панели
 * @param {Object} props - Свойства компонента
 * @param {Array} props.interviews - Массив собеседований
 * @param {Object} props.pagination - Информация о пагинации
 * @param {Object} props.sorting - Информация о сортировке
 * @param {Function} props.onPageChange - Функция, вызываемая при изменении страницы
 * @param {Function} props.onPageSizeChange - Функция, вызываемая при изменении размера страницы
 * @param {Function} props.onSortChange - Функция, вызываемая при изменении сортировки
 * @returns {JSX.Element} Компонент списка собеседований
 */
export default function InterviewsList({
  interviews,
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
      field: 'scheduledTime',
      title: 'Дата и время',
      sortable: true,
      width: '20%',
      format: (value) => {
        const date = new Date(value);
        return date.toLocaleString('ru-RU', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
      },
    },
    {
      field: 'interviewer',
      title: 'Интервьюер',
      sortable: false,
      width: '20%',
      format: (value) => (
        <div className={styles.userCell}>
          {value.image && (
            <img
              src={value.image}
              alt={value.name}
              className={styles.userAvatar}
            />
          )}
          <div className={styles.userInfo}>
            <div className={styles.userName}>{value.name}</div>
            <div className={styles.userEmail}>{value.email}</div>
          </div>
        </div>
      ),
    },
    {
      field: 'interviewee',
      title: 'Интервьюируемый',
      sortable: false,
      width: '20%',
      format: (value) => {
        if (!value)
          return <span className={styles.emptyValue}>Не назначен</span>;

        return (
          <div className={styles.userCell}>
            {value.image && (
              <img
                src={value.image}
                alt={value.name}
                className={styles.userAvatar}
              />
            )}
            <div className={styles.userInfo}>
              <div className={styles.userName}>{value.name}</div>
              <div className={styles.userEmail}>{value.email}</div>
            </div>
          </div>
        );
      },
    },
    {
      field: 'status',
      title: 'Статус',
      sortable: true,
      width: '15%',
      format: (value) => {
        const statusLabels = {
          scheduled: 'Запланировано',
          completed: 'Завершено',
          cancelled: 'Отменено',
          no_show: 'Неявка',
        };

        const statusClasses = {
          scheduled: styles.statusScheduled,
          completed: styles.statusCompleted,
          cancelled: styles.statusCancelled,
          no_show: styles.statusNoShow,
        };

        return (
          <span
            className={`${styles.statusLabel} ${statusClasses[value] || ''}`}
          >
            {statusLabels[value] || value}
          </span>
        );
      },
    },
    {
      field: 'interviewFeedback',
      title: 'Отзыв',
      sortable: false,
      width: '10%',
      format: (value) => {
        if (!value || value.length === 0) {
          return <span className={styles.emptyValue}>Нет</span>;
        }

        const feedback = value[0];
        return (
          <div className={styles.feedbackInfo}>
            <div className={styles.feedbackScore}>
              Оценка: {feedback.technicalScore}/10
            </div>
            <div className={styles.feedbackRating}>
              Рейтинг: {feedback.interviewerRating}/5
            </div>
          </div>
        );
      },
    },
    {
      field: 'actions',
      title: 'Действия',
      sortable: false,
      width: '15%',
      format: (_, interview) => (
        <div className={styles.actionButtons}>
          <button
            className={`${styles.actionButton} ${styles.viewButton}`}
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/admin/interviews/${interview.id}`);
            }}
            title="Просмотр"
          >
            👁️
          </button>
          <button
            className={`${styles.actionButton} ${styles.editButton}`}
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/admin/interviews/${interview.id}?edit=true`);
            }}
            title="Редактировать"
          >
            ✏️
          </button>
          <button
            className={`${styles.actionButton} ${styles.deleteButton}`}
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(interview);
            }}
            title="Удалить"
          >
            🗑️
          </button>
        </div>
      ),
    },
  ];

  // Обработчик клика на строку таблицы
  const handleRowClick = (interview) => {
    router.push(`/admin/interviews/${interview.id}`);
  };

  // Обработчик изменения сортировки
  const handleSortChange = (field, order) => {
    if (onSortChange) {
      onSortChange(field, order);
    }
  };

  // Обработчик удаления собеседования
  const handleDelete = async (interview) => {
    if (
      !confirm(
        `Вы уверены, что хотите удалить собеседование от ${new Date(
          interview.scheduledTime
        ).toLocaleString('ru-RU')}?`
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/interviews/${interview.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Ошибка при удалении собеседования');
      }

      // Обновляем страницу для отображения изменений
      router.reload();
    } catch (error) {
      console.error('Ошибка при удалении собеседования:', error);
      alert('Произошла ошибка при удалении собеседования');
    }
  };

  return (
    <div className={styles.interviewsListContainer}>
      <AdminTable
        columns={columns}
        data={interviews}
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
