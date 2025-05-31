import { useState } from 'react';
import styles from '../styles/QuestionCard.module.css';

export default function QuestionCard({
  question,
  onAnswer,
  onSearch,
  currentTime = 0,
  onFavoriteToggle,
}) {
  const [showAnswer, setShowAnswer] = useState(false);
  const [selectedOption, setSelectedOption] = useState(null);
  const [isFavorite, setIsFavorite] = useState(question.isFavorite || false);
  const [isTogglingFavorite, setIsTogglingFavorite] = useState(false);

  // Получаем данные о прогрессе пользователя
  const userProgress = question.userProgress || null;

  // Определяем тип вопроса
  const hasOptions = question.options && question.options.length > 0;

  // Обработчик ответа
  const handleAnswer = (answerType, optionIndex = null) => {
    let isCorrect = false;
    let selectedAnswer = answerType;

    if (hasOptions && optionIndex !== null) {
      // Для вопросов с вариантами ответов
      selectedAnswer = question.options[optionIndex];
      // Предполагаем, что правильный ответ - первый в массиве options
      // В реальной системе это должно быть отдельное поле
      isCorrect = optionIndex === 0;
      setSelectedOption(optionIndex);
    } else {
      // Для простых вопросов "знаю/не знаю"
      isCorrect = answerType === 'known';
    }

    // Показываем ответ
    setShowAnswer(true);

    // Отправляем результат родительскому компоненту
    setTimeout(() => {
      onAnswer(question.id, selectedAnswer, isCorrect);
    }, 2000); // Даем время посмотреть на правильный ответ
  };

  // Обработчик поиска
  const handleSearch = () => {
    const searchQuery = question.question || question.text;
    onSearch(searchQuery);

    // Открываем поиск в новой вкладке
    window.open(
      `https://yandex.ru/search/?text=${encodeURIComponent(searchQuery)}`,
      '_blank'
    );
  };

  // Обработчик переключения избранного
  const handleFavoriteToggle = async () => {
    if (isTogglingFavorite) return;

    setIsTogglingFavorite(true);

    try {
      const action = isFavorite ? 'remove' : 'add';
      const response = await fetch('/api/training/favorites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          questionId: question.id,
          action,
        }),
      });

      if (!response.ok) {
        throw new Error('Не удалось обновить избранное');
      }

      const data = await response.json();
      setIsFavorite(data.isFavorite);

      // Вызываем callback если он передан
      if (onFavoriteToggle) {
        onFavoriteToggle(question.id, data.isFavorite);
      }
    } catch (error) {
      console.error('Ошибка при обновлении избранного:', error);
      // Можно добавить уведомление об ошибке
    } finally {
      setIsTogglingFavorite(false);
    }
  };

  return (
    <div className={styles.container}>
      {/* Метаинформация о вопросе */}
      <div className={styles.questionMeta}>
        {question.topic && (
          <span className={styles.topicTag}>{question.topic}</span>
        )}
        {question.difficulty && (
          <span
            className={`${styles.difficultyTag} ${styles[question.difficulty]}`}
          >
            {question.difficulty === 'easy'
              ? 'Легкий'
              : question.difficulty === 'medium'
              ? 'Средний'
              : 'Сложный'}
          </span>
        )}
        {question.estimatedTime && (
          <span className={styles.timeTag}>
            ~{Math.round(question.estimatedTime / 60)} мин
          </span>
        )}
      </div>

      {/* Статистика прогресса */}
      {userProgress && (
        <div className={styles.progressInfo}>
          <div className={styles.progressItem}>
            <span className={styles.progressLabel}>Последний ответ:</span>
            <span
              className={`${styles.progressValue} ${
                userProgress.isCorrect ? styles.correct : styles.incorrect
              }`}
            >
              {userProgress.isCorrect ? 'Правильно' : 'Неправильно'}
            </span>
          </div>
          {userProgress.timeSpent && (
            <div className={styles.progressItem}>
              <span className={styles.progressLabel}>Последнее время:</span>
              <span className={styles.progressValue}>
                {userProgress.timeSpent}с
              </span>
            </div>
          )}
          {currentTime > 0 && (
            <div className={styles.progressItem}>
              <span className={styles.progressLabel}>Текущее время:</span>
              <span className={`${styles.progressValue} ${styles.currentTime}`}>
                {currentTime}с
              </span>
            </div>
          )}
        </div>
      )}

      {/* Основная карточка вопроса */}
      <div className={styles.card}>
        {/* Заголовок карточки с кнопкой избранного */}
        <div className={styles.cardHeader}>
          <div className={styles.questionSection}>
            <h3 className={styles.questionTitle}>Вопрос:</h3>
            <p className={styles.questionText}>
              {question.question || question.text}
            </p>
          </div>

          <button
            className={`${styles.favoriteButton} ${
              isFavorite ? styles.active : styles.inactive
            }`}
            onClick={handleFavoriteToggle}
            disabled={isTogglingFavorite}
            title={
              isFavorite ? 'Удалить из избранного' : 'Добавить в избранное'
            }
          >
            <span className={styles.favoriteIcon}>
              {isFavorite ? '★' : '☆'}
            </span>
          </button>
        </div>

        <div className={styles.cardContent}>
          {/* Варианты ответов для вопросов с выбором */}
          {hasOptions && !showAnswer && (
            <div className={styles.optionsSection}>
              <h4 className={styles.optionsTitle}>
                Выберите правильный ответ:
              </h4>
              <div className={styles.optionsList}>
                {question.options.map((option, index) => (
                  <button
                    key={index}
                    className={`${styles.optionButton} ${
                      selectedOption === index ? styles.selected : ''
                    }`}
                    onClick={() => handleAnswer('option', index)}
                  >
                    {String.fromCharCode(65 + index)}. {option}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Показ правильного ответа */}
          {showAnswer && (
            <div className={styles.answerSection}>
              <h4 className={styles.answerTitle}>Правильный ответ:</h4>
              <div className={styles.answerContent}>{question.answer}</div>
              {hasOptions && selectedOption !== null && (
                <div className={styles.resultFeedback}>
                  {selectedOption === 0 ? (
                    <span className={styles.correctFeedback}>✓ Правильно!</span>
                  ) : (
                    <span className={styles.incorrectFeedback}>
                      ✗ Неправильно
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Действия для простых вопросов */}
          {!hasOptions && !showAnswer && (
            <div className={styles.actionsSection}>
              <p className={styles.actionsPrompt}>
                Знаете ли вы ответ на этот вопрос?
              </p>
              <div className={styles.actionButtons}>
                <button
                  className={`${styles.actionButton} ${styles.knowButton}`}
                  onClick={() => handleAnswer('known')}
                >
                  ✓ Знаю
                </button>
                <button
                  className={`${styles.actionButton} ${styles.dontKnowButton}`}
                  onClick={() => handleAnswer('unknown')}
                >
                  ✗ Не знаю
                </button>
                <button
                  className={`${styles.actionButton} ${styles.repeatButton}`}
                  onClick={() => handleAnswer('repeat')}
                >
                  ↻ Повторить позже
                </button>
              </div>
            </div>
          )}

          {/* Показ ответа для простых вопросов */}
          {!hasOptions && showAnswer && (
            <div className={styles.answerSection}>
              <h4 className={styles.answerTitle}>Ответ:</h4>
              <div className={styles.answerContent}>{question.answer}</div>
            </div>
          )}
        </div>

        {/* Нижняя панель с дополнительными действиями */}
        <div className={styles.cardFooter}>
          <button
            className={styles.searchButton}
            onClick={handleSearch}
            title="Поиск в Яндексе"
          >
            🔍 Поиск
          </button>

          {question.tags && question.tags.length > 0 && (
            <div className={styles.tagsContainer}>
              {question.tags.map((tag, index) => (
                <span key={index} className={styles.tag}>
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
