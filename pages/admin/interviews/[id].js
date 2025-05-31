import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import AdminLayout from '../../../components/admin/AdminLayout';
import InterviewDetails from '../../../components/admin/InterviewDetails';
import InterviewForm from '../../../components/admin/InterviewForm';
import { useNotification } from '../../../contexts/NotificationContext';
import styles from '../../../styles/admin/InterviewDetails.module.css';

/**
 * Страница с детальной информацией о собеседовании в административной панели
 * @returns {JSX.Element} Страница с детальной информацией о собеседовании
 */
export default function InterviewDetailsPage() {
  const router = useRouter();
  const { id, edit } = router.query;
  const { showError, showSuccess } = useNotification();

  // Состояние для хранения данных собеседования
  const [interview, setInterview] = useState(null);

  // Состояние для отслеживания загрузки данных
  const [loading, setLoading] = useState(true);

  // Состояние для отслеживания режима редактирования
  const [isEditing, setIsEditing] = useState(false);

  // Устанавливаем режим редактирования на основе параметра URL
  useEffect(() => {
    if (edit === 'true') {
      setIsEditing(true);
    }
  }, [edit]);

  // Загрузка данных собеседования при изменении ID
  useEffect(() => {
    if (id) {
      fetchInterviewDetails();
    }
  }, [id]);

  // Функция для загрузки детальной информации о собеседовании
  const fetchInterviewDetails = async () => {
    try {
      setLoading(true);

      // Выполняем запрос к API
      const response = await fetch(`/api/admin/interviews/${id}`);

      if (!response.ok) {
        throw new Error('Ошибка при получении информации о собеседовании');
      }

      const interviewData = await response.json();

      // Обновляем состояние
      setInterview(interviewData);
    } catch (error) {
      console.error('Ошибка при загрузке данных собеседования:', error);
      showError('Не удалось загрузить информацию о собеседовании');
    } finally {
      setLoading(false);
    }
  };

  // Обработчик обновления собеседования
  const handleInterviewUpdate = (updatedInterview) => {
    setInterview(updatedInterview);
    setIsEditing(false);
    showSuccess('Информация о собеседовании успешно обновлена');
  };

  // Обработчик отмены редактирования
  const handleCancelEdit = () => {
    setIsEditing(false);
    // Если был передан параметр edit=true, удаляем его из URL
    if (edit) {
      router.push(`/admin/interviews/${id}`, undefined, { shallow: true });
    }
  };

  // Обработчик перехода в режим редактирования
  const handleEdit = () => {
    setIsEditing(true);
    // Добавляем параметр edit=true в URL
    router.push(`/admin/interviews/${id}?edit=true`, undefined, {
      shallow: true,
    });
  };

  // Обработчик удаления собеседования
  const handleDelete = async () => {
    if (!confirm('Вы уверены, что хотите удалить это собеседование?')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/interviews/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Ошибка при удалении собеседования');
      }

      showSuccess('Собеседование успешно удалено');
      router.push('/admin/interviews');
    } catch (error) {
      console.error('Ошибка при удалении собеседования:', error);
      showError('Не удалось удалить собеседование');
    }
  };

  // Обработчик возврата к списку собеседований
  const handleBackToList = () => {
    router.push('/admin/interviews');
  };

  return (
    <AdminLayout>
      <Head>
        <title>
          {interview
            ? `Собеседование ${new Date(
                interview.scheduledTime
              ).toLocaleDateString('ru-RU')} | Админ-панель`
            : 'Информация о собеседовании | Админ-панель'}
        </title>
      </Head>

      <div className={styles.interviewDetailsPageContainer}>
        <div className={styles.pageHeader}>
          <button className={styles.backButton} onClick={handleBackToList}>
            ← Назад к списку
          </button>
          <h1 className={styles.pageTitle}>
            {interview
              ? `Собеседование от ${new Date(
                  interview.scheduledTime
                ).toLocaleString('ru-RU')}`
              : 'Информация о собеседовании'}
          </h1>
        </div>

        {loading ? (
          <div className={styles.loadingContainer}>
            <div className={styles.loadingSpinner}></div>
            <p>Загрузка информации о собеседовании...</p>
          </div>
        ) : interview ? (
          <div className={styles.interviewContentContainer}>
            {isEditing ? (
              <InterviewForm
                interview={interview}
                onUpdate={handleInterviewUpdate}
                onCancel={handleCancelEdit}
              />
            ) : (
              <InterviewDetails
                interview={interview}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            )}
          </div>
        ) : (
          <div className={styles.errorContainer}>
            <p className={styles.errorMessage}>
              Собеседование не найдено или произошла ошибка при загрузке данных
            </p>
            <button
              className={styles.retryButton}
              onClick={fetchInterviewDetails}
            >
              Повторить попытку
            </button>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
