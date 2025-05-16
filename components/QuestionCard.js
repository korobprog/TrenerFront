import styles from '../styles/QuestionCard.module.css';

export default function QuestionCard({ question, onAnswer, onSearch }) {
  // Получаем данные о прогрессе, если они есть
  const progress =
    question.userProgress && question.userProgress.length > 0
      ? question.userProgress[0]
      : { knownCount: 0, unknownCount: 0, repeatCount: 0, searchCount: 0 };

  return (
    <>
      {/* Статистика по вопросу */}
      <div className={styles.statistics}>
        <div className={styles.statisticsItem}>
          <span className={styles.statisticsValue}>{progress.knownCount}</span>
          <span>Знаю</span>
        </div>
        <div className={styles.statisticsItem}>
          <span className={styles.statisticsValue}>
            {progress.unknownCount}
          </span>
          <span>Не знаю</span>
        </div>
        <div className={styles.statisticsItem}>
          <span className={styles.statisticsValue}>{progress.repeatCount}</span>
          <span>Повторить</span>
        </div>
        <div className={styles.statisticsItem}>
          <span className={styles.statisticsValue}>{progress.searchCount}</span>
          <span>Поиск</span>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.cardInner}>
          <div className={styles.cardFront}>
            <div className={styles.cardContent}>
              <p className={styles.questionText}>{question.text}</p>
            </div>

            {/* Ссылка на Яндекс в отдельном блоке под вопросом */}
            <div className={styles.searchLinkContainer}>
              <a
                href={`https://yandex.ru/search/?text=${encodeURIComponent(
                  question.text
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.searchLink}
                onClick={() => onSearch(question.id)}
              >
                Поиск в Яндексе
              </a>
            </div>
            <div className={styles.cardActions}>
              {/* Изменили порядок кнопок, чтобы "Знаю" и "Не знаю" были по краям */}
              <button
                className={`${styles.actionButton} ${styles.knowButton}`}
                onClick={() => onAnswer(question.id, 'known')}
              >
                Знаю
              </button>
              <button
                className={`${styles.actionButton} ${styles.repeatButton}`}
                onClick={() => onAnswer(question.id, 'repeat')}
              >
                Повторить
              </button>
              <button
                className={`${styles.actionButton} ${styles.dontKnowButton}`}
                onClick={() => onAnswer(question.id, 'unknown')}
              >
                Не знаю
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
