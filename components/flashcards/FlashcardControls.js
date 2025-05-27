import { useState } from 'react';
import styles from '../../styles/Flashcards.module.css';

/**
 * Компонент элементов управления флеш-карточками
 * Включает кнопки оценки, навигации и переворота карточки
 */
const FlashcardControls = ({
  currentIndex,
  totalQuestions,
  isFlipped,
  isGeneratingAnswer,
  onPrevious,
  onNext,
  onFlip,
  onEvaluate,
}) => {
  const [selectedEvaluation, setSelectedEvaluation] = useState(null);
  const [isEvaluating, setIsEvaluating] = useState(false);

  // Обработка оценки с анимацией
  const handleEvaluate = async (evaluation) => {
    setSelectedEvaluation(evaluation);
    setIsEvaluating(true);

    try {
      await onEvaluate(evaluation);
    } finally {
      // Сброс состояния после небольшой задержки
      setTimeout(() => {
        setSelectedEvaluation(null);
        setIsEvaluating(false);
      }, 500);
    }
  };

  // Получение иконки для оценки
  const getEvaluationIcon = (evaluation) => {
    switch (evaluation) {
      case 'known':
        return '✅';
      case 'partial':
        return '🤔';
      case 'unknown':
        return '❌';
      default:
        return '';
    }
  };

  // Получение цвета для оценки
  const getEvaluationColor = (evaluation) => {
    switch (evaluation) {
      case 'known':
        return '#28a745';
      case 'partial':
        return '#ffc107';
      case 'unknown':
        return '#dc3545';
      default:
        return '#6c757d';
    }
  };

  return (
    <div className={styles.controlsContainer}>
      {/* Кнопка переворота карточки */}
      <div className={styles.flipControls}>
        <button
          className={`${styles.flipButton} ${isFlipped ? styles.flipped : ''}`}
          onClick={onFlip}
          disabled={isGeneratingAnswer}
        >
          <span className={styles.flipIcon}>
            {isGeneratingAnswer ? (
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="2"
                />
                <path
                  d="M12 6v6l4 2"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            ) : isFlipped ? (
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M19 12H5"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M12 19l-7-7 7-7"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            ) : (
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M1 4v6h6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </span>
          <span className={styles.flipText}>
            {isGeneratingAnswer
              ? 'Генерация...'
              : isFlipped
              ? 'К вопросу'
              : 'Показать ответ'}
          </span>
        </button>
      </div>

      {/* Кнопки оценки (показываются только когда карточка перевернута) */}
      {isFlipped && !isGeneratingAnswer && (
        <div className={styles.evaluationControls}>
          <div className={styles.evaluationTitle}>
            Как хорошо вы знали ответ?
          </div>

          <div className={styles.evaluationButtons}>
            <button
              className={`${styles.evaluationButton} ${styles.known} ${
                selectedEvaluation === 'known' ? styles.selected : ''
              }`}
              onClick={() => handleEvaluate('known')}
              disabled={isEvaluating}
              style={{ backgroundColor: getEvaluationColor('known') }}
            >
              <span className={styles.evaluationIcon}>
                {getEvaluationIcon('known')}
              </span>
              <span className={styles.evaluationText}>Знал</span>
              <div className={styles.evaluationHint}>
                Ответил правильно и уверенно
              </div>
            </button>

            <button
              className={`${styles.evaluationButton} ${styles.partial} ${
                selectedEvaluation === 'partial' ? styles.selected : ''
              }`}
              onClick={() => handleEvaluate('partial')}
              disabled={isEvaluating}
              style={{ backgroundColor: getEvaluationColor('partial') }}
            >
              <span className={styles.evaluationIcon}>
                {getEvaluationIcon('partial')}
              </span>
              <span className={styles.evaluationText}>Частично знал</span>
              <div className={styles.evaluationHint}>
                Знал часть ответа или был неуверен
              </div>
            </button>

            <button
              className={`${styles.evaluationButton} ${styles.unknown} ${
                selectedEvaluation === 'unknown' ? styles.selected : ''
              }`}
              onClick={() => handleEvaluate('unknown')}
              disabled={isEvaluating}
              style={{ backgroundColor: getEvaluationColor('unknown') }}
            >
              <span className={styles.evaluationIcon}>
                {getEvaluationIcon('unknown')}
              </span>
              <span className={styles.evaluationText}>Не знал</span>
              <div className={styles.evaluationHint}>
                Не знал ответа или ответил неправильно
              </div>
            </button>
          </div>

          {isEvaluating && (
            <div className={styles.evaluatingMessage}>
              <div className={styles.evaluatingSpinner}></div>
              <span>Сохранение оценки...</span>
            </div>
          )}
        </div>
      )}

      {/* Навигационные кнопки */}
      <div className={styles.navigationControls}>
        <button
          className={`${styles.navButton} ${styles.previousButton}`}
          onClick={onPrevious}
          disabled={currentIndex === 0 || isEvaluating}
        >
          <span className={styles.navIcon}>⬅️</span>
          <span className={styles.navText}>Предыдущий</span>
        </button>

        <div className={styles.positionIndicator}>
          <span className={styles.currentPosition}>{currentIndex + 1}</span>
          <span className={styles.positionSeparator}>из</span>
          <span className={styles.totalPosition}>{totalQuestions}</span>
        </div>

        <button
          className={`${styles.navButton} ${styles.nextButton}`}
          onClick={onNext}
          disabled={currentIndex >= totalQuestions - 1 || isEvaluating}
        >
          <span className={styles.navText}>Следующий</span>
          <span className={styles.navIcon}>➡️</span>
        </button>
      </div>

      {/* Подсказки для пользователя */}
      <div className={styles.controlsHints}>
        {!isFlipped ? (
          <div className={styles.hint}>
            💡 Сначала попробуйте ответить на вопрос, затем переверните карточку
          </div>
        ) : isGeneratingAnswer ? (
          <div className={styles.hint}>
            🤖 AI генерирует подробный ответ для изучения...
          </div>
        ) : (
          <div className={styles.hint}>
            📝 Оцените, насколько хорошо вы знали ответ, чтобы перейти к
            следующему вопросу
          </div>
        )}
      </div>

      {/* Горячие клавиши */}
      <div className={styles.hotkeys}>
        <div className={styles.hotkeyItem}>
          <kbd>Space</kbd> - Перевернуть карточку
        </div>
        <div className={styles.hotkeyItem}>
          <kbd>1</kbd> - Знал
        </div>
        <div className={styles.hotkeyItem}>
          <kbd>2</kbd> - Частично знал
        </div>
        <div className={styles.hotkeyItem}>
          <kbd>3</kbd> - Не знал
        </div>
        <div className={styles.hotkeyItem}>
          <kbd>←</kbd> - Предыдущий
        </div>
        <div className={styles.hotkeyItem}>
          <kbd>→</kbd> - Следующий
        </div>
      </div>
    </div>
  );
};

export default FlashcardControls;
