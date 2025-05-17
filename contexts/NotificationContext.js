import { createContext, useState, useContext, useCallback } from 'react';
import Notification from '../components/Notification';

// Создаем контекст для уведомлений
const NotificationContext = createContext();

/**
 * Провайдер контекста уведомлений
 * @param {Object} props - Свойства компонента
 * @param {React.ReactNode} props.children - Дочерние компоненты
 * @returns {JSX.Element} Провайдер контекста уведомлений
 */
export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);

  // Функция для добавления нового уведомления
  const addNotification = useCallback(
    (message, type = 'info', duration = 3000) => {
      const id = Date.now().toString();
      setNotifications((prev) => [...prev, { id, message, type, duration }]);
      return id;
    },
    []
  );

  // Функция для удаления уведомления по ID
  const removeNotification = useCallback((id) => {
    setNotifications((prev) =>
      prev.filter((notification) => notification.id !== id)
    );
  }, []);

  // Вспомогательные функции для разных типов уведомлений
  const showSuccess = useCallback(
    (message, duration) => addNotification(message, 'success', duration),
    [addNotification]
  );

  const showError = useCallback(
    (message, duration) => addNotification(message, 'error', duration),
    [addNotification]
  );

  const showInfo = useCallback(
    (message, duration) => addNotification(message, 'info', duration),
    [addNotification]
  );

  return (
    <NotificationContext.Provider
      value={{
        addNotification,
        removeNotification,
        showSuccess,
        showError,
        showInfo,
      }}
    >
      {children}
      <div className="notifications-container">
        {notifications.map((notification) => (
          <Notification
            key={notification.id}
            message={notification.message}
            type={notification.type}
            duration={notification.duration}
            onClose={() => removeNotification(notification.id)}
          />
        ))}
      </div>
    </NotificationContext.Provider>
  );
}

/**
 * Хук для использования контекста уведомлений
 * @returns {Object} Объект с функциями для работы с уведомлениями
 */
export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      'useNotification должен использоваться внутри NotificationProvider'
    );
  }
  return context;
}
