import { useState, useEffect } from 'react';
import styles from '../../styles/Flashcards.module.css';

/**
 * Компонент отдельной флеш-карточки с 3D анимацией переворота
 * Двусторонняя карточка (вопрос/ответ) с индикаторами загрузки
 */
const FlashcardItem = ({
  question,
  answer,
  isFlipped,
  isGeneratingAnswer,
  onFlip,
}) => {
  const [isAnimating, setIsAnimating] = useState(false);

  // Обработка анимации переворота
  useEffect(() => {
    setIsAnimating(true);
    const timer = setTimeout(() => {
      setIsAnimating(false);
    }, 300); // Длительность анимации

    return () => clearTimeout(timer);
  }, [isFlipped]);

  // Форматирование текста с поддержкой markdown
  const formatText = (text) => {
    if (!text) return '';

    // Простое форматирование markdown
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/\n/g, '<br>');
  };

  // Получение цвета сложности
  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'easy':
        return '#28a745';
      case 'medium':
        return '#ffc107';
      case 'hard':
        return '#dc3545';
      default:
        return '#6c757d';
    }
  };

  // Получение иконки темы
  const getTopicIcon = (topic) => {
    const topicIcons = {
      javascript: '🟨',
      react: '⚛️',
      nodejs: '🟢',
      css: '🎨',
      html: '📄',
      database: '🗄️',
      algorithms: '🧮',
      'system-design': '🏗️',
      general: '💡',
    };

    return topicIcons[topic?.toLowerCase()] || '📚';
  };

  if (!question) {
    return (
      <div className={styles.flashcard}>
        <div className={styles.cardContent}>
          <p>Вопрос не найден</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.flashcardContainer}>
      <div
        className={`${styles.flashcard} ${isFlipped ? styles.flipped : ''} ${
          isAnimating ? styles.animating : ''
        }`}
        onClick={onFlip}
      >
        {/* Передняя сторона - Вопрос */}
        <div className={`${styles.cardSide} ${styles.cardFront}`}>
          <div className={styles.cardHeader}>
            <div className={styles.cardMeta}>
              <span className={styles.topicIcon}>
                {getTopicIcon(question.topic)}
              </span>
              <span className={styles.topic}>
                {question.topic || 'Общие вопросы'}
              </span>
              <span
                className={styles.difficulty}
                style={{
                  backgroundColor: getDifficultyColor(question.difficulty),
                }}
              >
                {question.difficulty === 'easy'
                  ? 'Легкий'
                  : question.difficulty === 'medium'
                  ? 'Средний'
                  : question.difficulty === 'hard'
                  ? 'Сложный'
                  : 'Неизвестно'}
              </span>
            </div>
            {question.estimatedTime && (
              <div className={styles.estimatedTime}>
                ⏱️ {question.estimatedTime} мин
              </div>
            )}
          </div>

          <div className={styles.cardContent}>
            <div className={styles.questionLabel}>Вопрос:</div>
            <div
              className={styles.questionText}
              dangerouslySetInnerHTML={{
                __html: formatText(question.questionText),
              }}
            />

            {question.tags && question.tags.length > 0 && (
              <div className={styles.tags}>
                {question.tags.map((tag, index) => (
                  <span key={index} className={styles.tag}>
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className={styles.cardFooter}>
            <div className={styles.flipHint}>
              <span className={styles.flipIcon}>🔄</span>
              Нажмите, чтобы увидеть ответ
            </div>
          </div>
        </div>

        {/* Задняя сторона - Ответ */}
        <div className={`${styles.cardSide} ${styles.cardBack}`}>
          <div className={styles.cardHeader}>
            <div className={styles.cardMeta}>
              <span className={styles.topicIcon}>
                {getTopicIcon(question.topic)}
              </span>
              <span className={styles.topic}>
                {question.topic || 'Общие вопросы'}
              </span>
              <span
                className={styles.difficulty}
                style={{
                  backgroundColor: getDifficultyColor(question.difficulty),
                }}
              >
                {question.difficulty === 'easy'
                  ? 'Легкий'
                  : question.difficulty === 'medium'
                  ? 'Средний'
                  : question.difficulty === 'hard'
                  ? 'Сложный'
                  : 'Неизвестно'}
              </span>
            </div>
          </div>

          <div className={styles.cardContent}>
            <div className={styles.answerLabel}>Ответ:</div>

            {isGeneratingAnswer ? (
              <div className={styles.loadingAnswer}>
                <div className={styles.answerSpinner}></div>
                <p>Генерируется ответ...</p>
                <div className={styles.loadingDots}>
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            ) : answer ? (
              <div className={styles.answerContent}>
                <div
                  className={styles.answerText}
                  dangerouslySetInnerHTML={{
                    __html: formatText(answer.answer),
                  }}
                />
                {answer.source && (
                  <div className={styles.answerMeta}>
                    <span className={styles.answerSource}>
                      {answer.source === 'database'
                        ? '📚 Из базы знаний'
                        : answer.source === 'cache'
                        ? '💾 Из кэша'
                        : answer.source === 'ai_generated'
                        ? '🤖 Сгенерировано AI'
                        : ''}
                    </span>
                    {answer.cached && (
                      <span className={styles.cachedIndicator}>
                        ⚡ Быстрый ответ
                      </span>
                    )}
                  </div>
                )}
              </div>
            ) : question.hasAnswer ? (
              <div className={styles.answerPlaceholder}>
                <p>Ответ доступен, но не загружен</p>
                <button
                  className={styles.loadAnswerButton}
                  onClick={(e) => {
                    e.stopPropagation();
                    // Триггер загрузки ответа
                  }}
                >
                  Загрузить ответ
                </button>
              </div>
            ) : (
              <div className={styles.noAnswer}>
                <p>Ответ будет сгенерирован автоматически</p>
                <div className={styles.generatingHint}>
                  🤖 AI готовит подробный ответ...
                </div>
              </div>
            )}
          </div>

          <div className={styles.cardFooter}>
            <div className={styles.flipHint}>
              <span className={styles.flipIcon}>🔄</span>
              Нажмите, чтобы вернуться к вопросу
            </div>
          </div>
        </div>
      </div>

      {/* Индикатор состояния карточки */}
      <div className={styles.cardStateIndicator}>
        <div
          className={`${styles.stateIcon} ${
            isFlipped ? styles.answer : styles.question
          }`}
        >
          {isFlipped ? '💡' : '❓'}
        </div>
        <span className={styles.stateText}>
          {isFlipped ? 'Ответ' : 'Вопрос'}
        </span>
      </div>
    </div>
  );
};

export default FlashcardItem;
