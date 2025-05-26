import { useState, useEffect } from 'react';
import styles from '../styles/Notification.module.css';

/**
 * Компонент для отображения всплывающих уведомлений
 * @param {Object} props - Свойства компонента
 * @param {string} props.message - Текст уведомления
 * @param {string} props.type - Тип уведомления (success, error, info)
 * @param {number} props.duration - Длительность отображения в миллисекундах
 * @param {Function} props.onClose - Функция, вызываемая при закрытии уведомления
 * @returns {JSX.Element} Компонент уведомления
 */
export default function Notification({
  message,
  type = 'info',
  duration = 3000,
  onClose,
}) {
  const [isVisible, setIsVisible] = useState(true);

  // Автоматически скрываем уведомление через указанное время
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      if (onClose) {
        setTimeout(onClose, 300); // Вызываем onClose после анимации исчезновения
      }
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  // Обработчик закрытия уведомления
  const handleClose = () => {
    setIsVisible(false);
    if (onClose) {
      setTimeout(onClose, 300); // Вызываем onClose после анимации исчезновения
    }
  };

  return (
    <div
      className={`${styles.notification} ${styles[type]} ${
        isVisible ? styles.visible : styles.hidden
      }`}
    >
      <div className={styles.content}>
        {type === 'success' && <span className={styles.icon}>✓</span>}
        {type === 'error' && <span className={styles.icon}>✗</span>}
        {type === 'info' && <span className={styles.icon}>ℹ</span>}
        <span className={styles.message}>{message}</span>
      </div>
      <button className={styles.closeButton} onClick={handleClose}>
        ×
      </button>
    </div>
  );
}
