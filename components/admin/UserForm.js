import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useNotification } from '../../contexts/NotificationContext';
import styles from '../../styles/admin/UserForm.module.css';

/**
 * Компонент формы для редактирования информации о пользователе
 * @param {Object} props - Свойства компонента
 * @param {Object} props.user - Данные пользователя
 * @param {Function} props.onUpdate - Функция, вызываемая после успешного обновления пользователя
 * @param {Function} props.onCancel - Функция, вызываемая при отмене редактирования
 * @returns {JSX.Element} Компонент формы редактирования пользователя
 */
export default function UserForm({ user, onUpdate, onCancel }) {
  const router = useRouter();
  const { showSuccess, showError } = useNotification();

  // Состояние для хранения данных формы
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'user',
    isBlocked: false,
  });

  // Состояние для отслеживания отправки формы
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Состояние для отслеживания подтверждения удаления
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Инициализация формы данными пользователя
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        role: user.role || 'user',
        isBlocked: user.isBlocked || false,
      });
    }
  }, [user]);

  // Обработчик изменения полей формы
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  // Обработчик отправки формы
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setIsSubmitting(true);

      // Отправляем запрос на обновление пользователя
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || 'Ошибка при обновлении пользователя'
        );
      }

      const updatedUser = await response.json();

      showSuccess('Информация о пользователе успешно обновлена');

      // Вызываем функцию обратного вызова с обновленными данными
      if (onUpdate) {
        onUpdate(updatedUser);
      }
    } catch (error) {
      console.error('Ошибка при обновлении пользователя:', error);
      showError(
        error.message || 'Не удалось обновить информацию о пользователе'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Обработчик удаления пользователя
  const handleDelete = async () => {
    try {
      setIsSubmitting(true);

      // Отправляем запрос на удаление пользователя
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || 'Ошибка при удалении пользователя'
        );
      }

      showSuccess('Пользователь успешно удален');

      // Перенаправляем на страницу со списком пользователей
      router.push('/admin/users');
    } catch (error) {
      console.error('Ошибка при удалении пользователя:', error);
      showError(error.message || 'Не удалось удалить пользователя');
    } finally {
      setIsSubmitting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className={styles.userFormContainer}>
      <form onSubmit={handleSubmit} className={styles.userForm}>
        <div className={styles.formGroup}>
          <label htmlFor="name" className={styles.formLabel}>
            Имя пользователя
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className={styles.formInput}
            required
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="email" className={styles.formLabel}>
            Email
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className={styles.formInput}
            required
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="role" className={styles.formLabel}>
            Роль
          </label>
          <select
            id="role"
            name="role"
            value={formData.role}
            onChange={handleChange}
            className={styles.formSelect}
          >
            <option value="user">Пользователь</option>
            <option value="interviewer">Интервьюер</option>
            <option value="admin">Администратор</option>
          </select>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.formCheckboxLabel}>
            <input
              type="checkbox"
              name="isBlocked"
              checked={formData.isBlocked}
              onChange={handleChange}
              className={styles.formCheckbox}
            />
            Заблокировать пользователя
          </label>
          <p className={styles.formHelpText}>
            Заблокированные пользователи не могут входить в систему и
            использовать функции платформы
          </p>
        </div>

        <div className={styles.formActions}>
          <button
            type="button"
            onClick={onCancel}
            className={`${styles.formButton} ${styles.cancelButton}`}
            disabled={isSubmitting}
          >
            Отмена
          </button>

          <button
            type="submit"
            className={`${styles.formButton} ${styles.saveButton}`}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Сохранение...' : 'Сохранить изменения'}
          </button>

          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className={`${styles.formButton} ${styles.deleteButton}`}
            disabled={isSubmitting}
          >
            Удалить пользователя
          </button>
        </div>
      </form>

      {showDeleteConfirm && (
        <div className={styles.deleteConfirmOverlay}>
          <div className={styles.deleteConfirmDialog}>
            <h3 className={styles.deleteConfirmTitle}>
              Подтверждение удаления
            </h3>
            <p className={styles.deleteConfirmText}>
              Вы уверены, что хотите удалить пользователя{' '}
              <strong>{user.name}</strong>? Это действие нельзя отменить.
            </p>
            <div className={styles.deleteConfirmActions}>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className={`${styles.formButton} ${styles.cancelButton}`}
                disabled={isSubmitting}
              >
                Отмена
              </button>
              <button
                onClick={handleDelete}
                className={`${styles.formButton} ${styles.confirmDeleteButton}`}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Удаление...' : 'Да, удалить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
