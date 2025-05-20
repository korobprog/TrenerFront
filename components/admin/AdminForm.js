import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useNotification } from '../../contexts/NotificationContext';
import styles from '../../styles/admin/UserForm.module.css'; // Используем те же стили, что и для UserForm

/**
 * Компонент формы для создания/редактирования администратора
 * @param {Object} props - Свойства компонента
 * @param {Object} props.admin - Данные администратора (null для создания нового)
 * @param {Function} props.onUpdate - Функция, вызываемая после успешного обновления
 * @param {Function} props.onCancel - Функция, вызываемая при отмене
 * @param {boolean} props.isCreating - Флаг, указывающий, что форма используется для создания нового администратора
 * @returns {JSX.Element} Компонент формы администратора
 */
export default function AdminForm({
  admin,
  onUpdate,
  onCancel,
  isCreating = false,
}) {
  const router = useRouter();
  const { showSuccess, showError } = useNotification();

  // Состояние для хранения данных формы
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'admin',
    isBlocked: false,
  });

  // Состояние для отслеживания отправки формы
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Состояние для отслеживания подтверждения удаления
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Состояние для отображения пароля
  const [showPassword, setShowPassword] = useState(false);

  // Инициализация формы данными администратора
  useEffect(() => {
    if (admin && !isCreating) {
      setFormData({
        name: admin.name || '',
        email: admin.email || '',
        password: '', // Пароль не передается с сервера
        role: admin.role || 'admin',
        isBlocked: admin.isBlocked || false,
      });
    }
  }, [admin, isCreating]);

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

      // Проверяем обязательные поля
      if (!formData.name || !formData.email) {
        throw new Error('Необходимо заполнить имя и email');
      }

      // Проверяем пароль при создании нового администратора
      if (isCreating && !formData.password) {
        throw new Error('Необходимо указать пароль для нового администратора');
      }

      // Формируем данные для отправки
      const dataToSend = { ...formData };

      // Если пароль пустой и это не создание нового администратора, удаляем его из данных
      if (!isCreating && !dataToSend.password) {
        delete dataToSend.password;
      }

      // Определяем URL и метод запроса в зависимости от режима (создание/редактирование)
      const url = isCreating
        ? '/api/admin/superadmin/admins'
        : `/api/admin/superadmin/admins/${admin.id}`;

      const method = isCreating ? 'POST' : 'PATCH';

      // Отправляем запрос
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSend),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Ошибка при обработке запроса');
      }

      const result = await response.json();

      // Показываем уведомление об успешном выполнении
      showSuccess(
        isCreating
          ? 'Администратор успешно создан'
          : 'Информация об администраторе успешно обновлена'
      );

      // Вызываем функцию обратного вызова с обновленными данными
      if (onUpdate) {
        onUpdate(result.admin);
      }

      // Если это создание нового администратора, перенаправляем на страницу со списком
      if (isCreating) {
        router.push('/admin/superadmin/admins');
      }
    } catch (error) {
      console.error('Ошибка при обработке формы:', error);
      showError(error.message || 'Произошла ошибка при обработке запроса');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Обработчик удаления администратора
  const handleDelete = async () => {
    try {
      setIsSubmitting(true);

      // Отправляем запрос на удаление администратора
      const response = await fetch(`/api/admin/superadmin/admins/${admin.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || 'Ошибка при удалении администратора'
        );
      }

      showSuccess('Администратор успешно удален');

      // Перенаправляем на страницу со списком администраторов
      router.push('/admin/superadmin/admins');
    } catch (error) {
      console.error('Ошибка при удалении администратора:', error);
      showError(error.message || 'Не удалось удалить администратора');
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
            Имя администратора
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
          <label htmlFor="password" className={styles.formLabel}>
            {isCreating
              ? 'Пароль'
              : 'Новый пароль (оставьте пустым, чтобы не менять)'}
          </label>
          <div className={styles.passwordInputContainer}>
            <input
              type={showPassword ? 'text' : 'password'}
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className={styles.formInput}
              required={isCreating}
            />
            <button
              type="button"
              className={styles.togglePasswordButton}
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? '🙈' : '👁️'}
            </button>
          </div>
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
            <option value="admin">Администратор</option>
            <option value="superadmin">Супер-администратор</option>
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
              disabled={admin && admin.id === getCurrentAdminId()}
            />
            Заблокировать администратора
          </label>
          <p className={styles.formHelpText}>
            Заблокированные администраторы не могут входить в систему и
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
            {isSubmitting
              ? isCreating
                ? 'Создание...'
                : 'Сохранение...'
              : isCreating
              ? 'Создать администратора'
              : 'Сохранить изменения'}
          </button>

          {!isCreating && (
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className={`${styles.formButton} ${styles.deleteButton}`}
              disabled={
                isSubmitting || (admin && admin.id === getCurrentAdminId())
              }
            >
              Удалить администратора
            </button>
          )}
        </div>
      </form>

      {showDeleteConfirm && (
        <div className={styles.deleteConfirmOverlay}>
          <div className={styles.deleteConfirmDialog}>
            <h3 className={styles.deleteConfirmTitle}>
              Подтверждение удаления
            </h3>
            <p className={styles.deleteConfirmText}>
              Вы уверены, что хотите удалить администратора{' '}
              <strong>{admin.name}</strong>? Это действие нельзя отменить.
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

// Функция для получения ID текущего супер-администратора
function getCurrentAdminId() {
  // В реальном приложении это должно быть получено из сессии или контекста
  // Здесь мы просто возвращаем пустую строку, чтобы избежать ошибок
  return '';
}
