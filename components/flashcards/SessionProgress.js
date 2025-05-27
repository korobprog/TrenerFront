import { useState, useEffect } from 'react';
import styles from '../../styles/Flashcards.module.css';

/**
 * Компонент индикатора прогресса сессии флеш-карточек
 * Показывает прогресс-бар, счетчик карточек и статистику сессии
 */
const SessionProgress = ({
  currentIndex,
  totalQuestions,
  sessionStats,
  mode,
}) => {
  const [animatedStats, setAnimatedStats] = useState(sessionStats);
  const [isStatsVisible, setIsStatsVisible] = useState(false);

  // Анимация изменения статистики
  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedStats(sessionStats);
    }, 100);

    return () => clearTimeout(timer);
  }, [sessionStats]);

  // Вычисление прогресса в процентах
  const progressPercentage =
    totalQuestions > 0 ? ((currentIndex + 1) / totalQuestions) * 100 : 0;

  // Общее количество оцененных карточек
  const totalEvaluated =
    animatedStats.known + animatedStats.unknown + animatedStats.partial;

  // Получение цвета режима
  const getModeColor = (mode) => {
    switch (mode) {
      case 'study':
        return '#0070f3';
      case 'review':
        return '#ffc107';
      case 'exam':
        return '#dc3545';
      default:
        return '#6c757d';
    }
  };

  // Получение названия режима
  const getModeName = (mode) => {
    switch (mode) {
      case 'study':
        return 'Изучение';
      case 'review':
        return 'Повторение';
      case 'exam':
        return 'Экзамен';
      default:
        return 'Обучение';
    }
  };

  // Получение иконки режима
  const getModeIcon = (mode) => {
    switch (mode) {
      case 'study':
        return '📚';
      case 'review':
        return '🔄';
      case 'exam':
        return '📝';
      default:
        return '🎯';
    }
  };

  // Вычисление процента успешности
  const getSuccessRate = () => {
    if (totalEvaluated === 0) return 0;
    return Math.round((animatedStats.known / totalEvaluated) * 100);
  };

  return (
    <div className={styles.progressContainer}>
      {/* Заголовок с режимом */}
      <div className={styles.progressHeader}>
        <div className={styles.modeInfo}>
          <span className={styles.modeIcon}>{getModeIcon(mode)}</span>
          <span
            className={styles.modeName}
            style={{ color: getModeColor(mode) }}
          >
            {getModeName(mode)}
          </span>
        </div>

        <button
          className={styles.statsToggle}
          onClick={() => setIsStatsVisible(!isStatsVisible)}
        >
          <span className={styles.statsIcon}>
            {isStatsVisible ? '📊' : '📈'}
          </span>
          <span className={styles.statsText}>
            {isStatsVisible ? 'Скрыть' : 'Статистика'}
          </span>
        </button>
      </div>

      {/* Основной прогресс-бар */}
      <div className={styles.progressBarContainer}>
        <div className={styles.progressInfo}>
          <span className={styles.progressText}>
            Карточка {currentIndex + 1} из {totalQuestions}
          </span>
          <span className={styles.progressPercentage}>
            {Math.round(progressPercentage)}%
          </span>
        </div>

        <div className={styles.progressBar}>
          <div
            className={styles.progressFill}
            style={{
              width: `${progressPercentage}%`,
              backgroundColor: getModeColor(mode),
            }}
          >
            <div className={styles.progressGlow}></div>
          </div>

          {/* Индикаторы карточек */}
          <div className={styles.cardIndicators}>
            {Array.from({ length: totalQuestions }, (_, index) => (
              <div
                key={index}
                className={`${styles.cardIndicator} ${
                  index < currentIndex
                    ? styles.completed
                    : index === currentIndex
                    ? styles.current
                    : styles.pending
                }`}
                style={{
                  left: `${(index / (totalQuestions - 1)) * 100}%`,
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Детальная статистика */}
      {isStatsVisible && (
        <div className={styles.detailedStats}>
          <div className={styles.statsGrid}>
            <div className={styles.statItem}>
              <div className={styles.statIcon}>✅</div>
              <div className={styles.statValue}>{animatedStats.known}</div>
              <div className={styles.statLabel}>Знал</div>
            </div>

            <div className={styles.statItem}>
              <div className={styles.statIcon}>🤔</div>
              <div className={styles.statValue}>{animatedStats.partial}</div>
              <div className={styles.statLabel}>Частично</div>
            </div>

            <div className={styles.statItem}>
              <div className={styles.statIcon}>❌</div>
              <div className={styles.statValue}>{animatedStats.unknown}</div>
              <div className={styles.statLabel}>Не знал</div>
            </div>

            <div className={styles.statItem}>
              <div className={styles.statIcon}>🎯</div>
              <div className={styles.statValue}>{getSuccessRate()}%</div>
              <div className={styles.statLabel}>Успешность</div>
            </div>
          </div>

          {/* Визуальное представление статистики */}
          {totalEvaluated > 0 && (
            <div className={styles.statsVisualization}>
              <div className={styles.statsBar}>
                <div
                  className={styles.knownSegment}
                  style={{
                    width: `${(animatedStats.known / totalEvaluated) * 100}%`,
                  }}
                />
                <div
                  className={styles.partialSegment}
                  style={{
                    width: `${(animatedStats.partial / totalEvaluated) * 100}%`,
                  }}
                />
                <div
                  className={styles.unknownSegment}
                  style={{
                    width: `${(animatedStats.unknown / totalEvaluated) * 100}%`,
                  }}
                />
              </div>

              <div className={styles.statsLegend}>
                <div className={styles.legendItem}>
                  <div
                    className={styles.legendColor}
                    style={{ backgroundColor: '#28a745' }}
                  ></div>
                  <span>Знал ({animatedStats.known})</span>
                </div>
                <div className={styles.legendItem}>
                  <div
                    className={styles.legendColor}
                    style={{ backgroundColor: '#ffc107' }}
                  ></div>
                  <span>Частично ({animatedStats.partial})</span>
                </div>
                <div className={styles.legendItem}>
                  <div
                    className={styles.legendColor}
                    style={{ backgroundColor: '#dc3545' }}
                  ></div>
                  <span>Не знал ({animatedStats.unknown})</span>
                </div>
              </div>
            </div>
          )}

          {/* Рекомендации на основе статистики */}
          {totalEvaluated >= 3 && (
            <div className={styles.recommendations}>
              <div className={styles.recommendationTitle}>💡 Рекомендации:</div>
              <div className={styles.recommendationText}>
                {getSuccessRate() >= 80
                  ? 'Отличная работа! Можете переходить к более сложным темам.'
                  : getSuccessRate() >= 60
                  ? 'Хорошие результаты! Рекомендуем повторить сложные вопросы.'
                  : 'Стоит уделить больше времени изучению этой темы.'}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Быстрая статистика (всегда видна) */}
      <div className={styles.quickStats}>
        <div className={styles.quickStatItem}>
          <span className={styles.quickStatLabel}>Оценено:</span>
          <span className={styles.quickStatValue}>
            {totalEvaluated} / {currentIndex + 1}
          </span>
        </div>

        {totalEvaluated > 0 && (
          <div className={styles.quickStatItem}>
            <span className={styles.quickStatLabel}>Успешность:</span>
            <span
              className={styles.quickStatValue}
              style={{
                color:
                  getSuccessRate() >= 70
                    ? '#28a745'
                    : getSuccessRate() >= 50
                    ? '#ffc107'
                    : '#dc3545',
              }}
            >
              {getSuccessRate()}%
            </span>
          </div>
        )}

        <div className={styles.quickStatItem}>
          <span className={styles.quickStatLabel}>Осталось:</span>
          <span className={styles.quickStatValue}>
            {totalQuestions - currentIndex - 1}
          </span>
        </div>
      </div>
    </div>
  );
};

export default SessionProgress;
