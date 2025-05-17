# План реализации функциональности редактирования баллов пользователей в админской панели

## Обзор

Данный план описывает реализацию функциональности редактирования баллов пользователей в админской панели. Администраторы смогут добавлять или вычитать баллы у пользователей с указанием причины (бонус, штраф, компенсация и т.д.).

## Диаграмма процесса

```mermaid
flowchart TD
    A[Страница пользователя] --> B[Вкладка "Баллы и транзакции"]
    B --> C[Кнопка "Изменить баллы"]
    C --> D[Модальное окно редактирования баллов]
    D --> E[Форма с полями: количество баллов, тип операции, описание]
    E --> F[Кнопки "Отмена" и "Сохранить"]
    F --> G[API запрос на изменение баллов]
    G --> H[Обновление интерфейса]
```

## Детальный план реализации

### 1. Обновление компонента UserDetails.js

#### 1.1. Добавление состояния для модального окна

```javascript
const [showPointsEditModal, setShowPointsEditModal] = useState(false);
```

#### 1.2. Добавление кнопки "Изменить баллы" на вкладке "Баллы и транзакции"

```jsx
<div className={styles.pointsSection}>
  <h3 className={styles.sectionTitle}>Баланс баллов</h3>
  <div className={styles.pointsBalance}>
    <span className={styles.pointsValue}>{user.userPoints?.points || 0}</span>
    <span className={styles.pointsLabel}>баллов</span>
    <button
      className={styles.editPointsButton}
      onClick={() => setShowPointsEditModal(true)}
    >
      Изменить баллы
    </button>
  </div>
</div>
```

#### 1.3. Добавление обработчика обновления баллов

```javascript
const handlePointsUpdate = (updatedPoints, newTransaction) => {
  // Обновляем данные пользователя с новыми баллами
  setUser({
    ...user,
    userPoints: {
      ...user.userPoints,
      points: updatedPoints,
    },
    pointsTransactions: [newTransaction, ...user.pointsTransactions],
    _count: {
      ...user._count,
      pointsTransactions: (user._count?.pointsTransactions || 0) + 1,
    },
  });
  setShowPointsEditModal(false);
};
```

#### 1.4. Добавление компонента модального окна

```jsx
{
  showPointsEditModal && (
    <PointsEditModal
      user={user}
      onClose={() => setShowPointsEditModal(false)}
      onUpdate={handlePointsUpdate}
    />
  );
}
```

### 2. Создание компонента PointsEditModal.js

Создать новый файл `components/admin/PointsEditModal.js`:

```jsx
import { useState } from 'react';
import { useNotification } from '../../contexts/NotificationContext';
import styles from '../../styles/admin/PointsEditModal.module.css';

export default function PointsEditModal({ user, onClose, onUpdate }) {
  const { showSuccess, showError } = useNotification();

  // Состояние для хранения данных формы
  const [formData, setFormData] = useState({
    amount: 0,
    type: 'admin_adjustment',
    description: '',
  });

  // Состояние для отслеживания отправки формы
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Обработчик изменения полей формы
  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'number' ? parseInt(value, 10) : value,
    }));
  };

  // Обработчик отправки формы
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Проверка валидности данных
    if (formData.amount === 0) {
      showError('Количество баллов должно быть отличным от нуля');
      return;
    }

    if (!formData.description) {
      showError('Необходимо указать описание операции');
      return;
    }

    try {
      setIsSubmitting(true);

      // Отправляем запрос на обновление баллов
      const response = await fetch(`/api/admin/users/${user.id}/points`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Ошибка при обновлении баллов');
      }

      const data = await response.json();

      showSuccess('Баллы пользователя успешно обновлены');

      // Вызываем функцию обратного вызова с обновленными данными
      if (onUpdate) {
        onUpdate(data.points, data.transaction);
      }
    } catch (error) {
      console.error('Ошибка при обновлении баллов:', error);
      showError(error.message || 'Не удалось обновить баллы пользователя');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <h2 className={styles.modalTitle}>Изменение баллов пользователя</h2>
        <p className={styles.modalSubtitle}>
          Текущий баланс: <strong>{user.userPoints?.points || 0}</strong> баллов
        </p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="amount" className={styles.formLabel}>
              Количество баллов
            </label>
            <input
              type="number"
              id="amount"
              name="amount"
              value={formData.amount}
              onChange={handleChange}
              className={styles.formInput}
              required
            />
            <p className={styles.formHint}>
              Положительное значение - начисление, отрицательное - списание
            </p>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="type" className={styles.formLabel}>
              Тип операции
            </label>
            <select
              id="type"
              name="type"
              value={formData.type}
              onChange={handleChange}
              className={styles.formSelect}
              required
            >
              <option value="admin_adjustment">
                Корректировка администратором
              </option>
              <option value="bonus">Бонус</option>
              <option value="penalty">Штраф</option>
              <option value="refund">Возврат</option>
            </select>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="description" className={styles.formLabel}>
              Описание
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              className={styles.formTextarea}
              required
            />
          </div>

          <div className={styles.formActions}>
            <button
              type="button"
              onClick={onClose}
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
          </div>
        </form>
      </div>
    </div>
  );
}
```

### 3. Создание стилей для модального окна

Создать новый файл `styles/admin/PointsEditModal.module.css`:

```css
.modalOverlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modalContent {
  background-color: white;
  border-radius: 8px;
  padding: 24px;
  width: 100%;
  max-width: 500px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.modalTitle {
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 8px;
  color: #333;
}

.modalSubtitle {
  font-size: 1rem;
  margin-bottom: 24px;
  color: #666;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.formGroup {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.formLabel {
  font-weight: 500;
  color: #333;
}

.formInput,
.formSelect,
.formTextarea {
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
}

.formTextarea {
  min-height: 100px;
  resize: vertical;
}

.formHint {
  font-size: 0.875rem;
  color: #666;
  margin-top: 4px;
}

.formActions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
}

.formButton {
  padding: 10px 16px;
  border: none;
  border-radius: 4px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.cancelButton {
  background-color: #f0f0f0;
  color: #333;
}

.cancelButton:hover {
  background-color: #e0e0e0;
}

.saveButton {
  background-color: #2563eb;
  color: white;
}

.saveButton:hover {
  background-color: #1d4ed8;
}

.formButton:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}
```

### 4. Создание API эндпоинта для изменения баллов

Создать новый файл `pages/api/admin/users/[id]/points.js`:

```javascript
import {
  withAdminAuth,
  logAdminAction,
} from '../../../../../lib/middleware/adminAuth';
import prisma from '../../../../../lib/prisma';

async function handler(req, res) {
  // Получаем ID пользователя из параметров запроса
  const { id } = req.query;

  // Проверяем, что ID пользователя предоставлен
  if (!id) {
    return res.status(400).json({ message: 'ID пользователя не указан' });
  }

  // Обработка только POST запросов
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Метод не поддерживается' });
  }

  try {
    // Получаем данные из тела запроса
    const { amount, type, description } = req.body;

    // Проверяем обязательные поля
    if (amount === undefined) {
      return res.status(400).json({ message: 'Количество баллов не указано' });
    }

    if (!type) {
      return res.status(400).json({ message: 'Тип операции не указан' });
    }

    if (!description) {
      return res.status(400).json({ message: 'Описание операции не указано' });
    }

    // Проверяем, что пользователь существует
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        userPoints: true,
      },
    });

    if (!user) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }

    // Начинаем транзакцию для обеспечения целостности данных
    const result = await prisma.$transaction(async (prisma) => {
      // Создаем запись в истории транзакций
      const transaction = await prisma.pointsTransaction.create({
        data: {
          userId: id,
          amount: amount,
          type: type,
          description: description,
        },
      });

      // Обновляем баланс пользователя
      let userPoints;
      if (user.userPoints) {
        // Обновляем существующую запись
        userPoints = await prisma.userPoints.update({
          where: { userId: id },
          data: {
            points: {
              increment: amount,
            },
          },
        });
      } else {
        // Создаем новую запись
        userPoints = await prisma.userPoints.create({
          data: {
            userId: id,
            points: amount,
          },
        });
      }

      return { transaction, userPoints };
    });

    // Логируем действие администратора
    await logAdminAction(req.admin.id, 'update_user_points', 'user', id, {
      amount,
      type,
      description,
      previousPoints: user.userPoints?.points || 0,
      newPoints: result.userPoints.points,
    });

    // Возвращаем обновленные данные
    return res.status(200).json({
      points: result.userPoints.points,
      transaction: result.transaction,
    });
  } catch (error) {
    console.error('Ошибка при обновлении баллов пользователя:', error);
    return res
      .status(500)
      .json({ message: 'Ошибка сервера при обновлении баллов пользователя' });
  }
}

export default withAdminAuth(handler);
```

## Тестирование

1. Проверить отображение кнопки "Изменить баллы" на вкладке "Баллы и транзакции"
2. Проверить открытие модального окна при нажатии на кнопку
3. Проверить валидацию формы (обязательные поля, корректные значения)
4. Проверить начисление баллов (положительное значение)
5. Проверить списание баллов (отрицательное значение)
6. Проверить отображение новой транзакции в истории
7. Проверить обновление баланса пользователя
