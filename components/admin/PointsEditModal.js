import { useState } from 'react';
import styles from '../../styles/admin/PointsEditModal.module.css';

/**
 * Модальное окно для редактирования баллов пользователя
 * @param {Object} props - Свойства компонента
 * @param {boolean} props.isOpen - Флаг, указывающий, открыто ли модальное окно
 * @param {Function} props.onClose - Функция, вызываемая при закрытии модального окна
 * @param {Object} props.user - Данные пользователя
 * @param {Function} props.onSave - Функция, вызываемая при сохранении изменений
 * @returns {JSX.Element|null} Компонент модального окна или null, если окно закрыто
 */
export default function PointsEditModal({ isOpen, onClose, user, onSave }) {
  // Состояние для хранения данных формы
  const [formData, setFormData] = useState({
    amount: '',
    type: 'admin_adjustment',
    description: '',
  });

  // Состояние для отслеживания ошибок валидации
  const [errors, setErrors] = useState({});

  // Состояние для отслеживания процесса отправки запроса
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Обработчик изменения полей формы
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Очистка ошибки при изменении поля
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  // Валидация формы
  const validateForm = () => {
    const newErrors = {};

    // Проверка суммы баллов
    if (!formData.amount) {
      newErrors.amount = 'Введите сумму баллов';
    } else if (isNaN(Number(formData.amount))) {
      newErrors.amount = 'Сумма должна быть числом';
    }

    // Проверка типа операции
    if (!formData.type) {
      newErrors.type = 'Выберите тип операции';
    }

    // Проверка описания
    if (!formData.description) {
      newErrors.description = 'Введите описание операции';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Обработчик отправки формы
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Валидация формы
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // 🔍 ДИАГНОСТИКА: Логируем данные перед отправкой
      console.log('🔍 ДИАГНОСТИКА PointsEditModal: Объект user:', user);
      console.log('🔍 ДИАГНОСТИКА PointsEditModal: user.id:', user.id);
      console.log(
        '🔍 ДИАГНОСТИКА PointsEditModal: typeof user.id:',
        typeof user.id
      );
      console.log(
        '🔍 ДИАГНОСТИКА PointsEditModal: user === undefined:',
        user === undefined
      );
      console.log(
        '🔍 ДИАГНОСТИКА PointsEditModal: user === null:',
        user === null
      );

      const pointsData = {
        userId: user.id,
        amount: Number(formData.amount),
        type: formData.type,
        description: formData.description,
      };

      console.log(
        '🔍 ДИАГНОСТИКА PointsEditModal: Данные для отправки:',
        pointsData
      );

      // Вызов функции сохранения с данными формы
      await onSave(pointsData);

      // Сброс формы и закрытие модального окна
      setFormData({
        amount: '',
        type: 'admin_adjustment',
        description: '',
      });
      onClose();
    } catch (error) {
      console.error('Ошибка при сохранении баллов:', error);
      setErrors((prev) => ({
        ...prev,
        submit:
          'Произошла ошибка при сохранении. Пожалуйста, попробуйте снова.',
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Если модальное окно закрыто, не рендерим компонент
  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>Изменение баллов пользователя</h3>
          <button className={styles.closeButton} onClick={onClose}>
            ×
          </button>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="amount">
              Сумма баллов (положительная или отрицательная)
            </label>
            <input
              id="amount"
              name="amount"
              type="text"
              className={styles.input}
              value={formData.amount}
              onChange={handleChange}
              placeholder="Например: 100 или -50"
            />
            {errors.amount && <p className={styles.error}>{errors.amount}</p>}
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="type">
              Тип операции
            </label>
            <select
              id="type"
              name="type"
              className={styles.select}
              value={formData.type}
              onChange={handleChange}
            >
              <option value="admin_adjustment">
                Корректировка администратором
              </option>
              <option value="bonus">Бонус</option>
              <option value="penalty">Штраф</option>
            </select>
            {errors.type && <p className={styles.error}>{errors.type}</p>}
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="description">
              Описание операции
            </label>
            <textarea
              id="description"
              name="description"
              className={styles.textarea}
              value={formData.description}
              onChange={handleChange}
              placeholder="Укажите причину изменения баллов"
            />
            {errors.description && (
              <p className={styles.error}>{errors.description}</p>
            )}
          </div>

          {errors.submit && <p className={styles.error}>{errors.submit}</p>}

          <div className={styles.buttonGroup}>
            <button
              type="button"
              className={styles.cancelButton}
              onClick={onClose}
              disabled={isSubmitting}
            >
              Отмена
            </button>
            <button
              type="submit"
              className={styles.saveButton}
              disabled={isSubmitting}
            >
              {isSubmitting && <span className={styles.loading}></span>}
              Сохранить
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
