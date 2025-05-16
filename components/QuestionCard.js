import { useState } from 'react';
import styles from '../styles/QuestionCard.module.css';

export default function QuestionCard({ question, onAnswer }) {
  const [flipped, setFlipped] = useState(false);

  const handleFlip = () => {
    setFlipped(!flipped);
  };

  return (
    <div className={`${styles.card} ${flipped ? styles.flipped : ''}`}>
      <div className={styles.cardInner}>
        <div className={styles.cardFront}>
          <div className={styles.cardContent}>
            <p className={styles.questionText}>{question.text}</p>
          </div>
          <button className={styles.flipButton} onClick={handleFlip}>
            Перевернуть
          </button>
        </div>
        <div className={styles.cardBack}>
          <div className={styles.cardActions}>
            <button
              className={`${styles.actionButton} ${styles.repeatButton}`}
              onClick={() => {
                setFlipped(false);
                onAnswer(question.id, 'repeat');
              }}
            >
              Повторить
            </button>
            <button
              className={`${styles.actionButton} ${styles.knowButton}`}
              onClick={() => {
                setFlipped(false);
                onAnswer(question.id, 'known');
              }}
            >
              Знаю
            </button>
            <button
              className={`${styles.actionButton} ${styles.dontKnowButton}`}
              onClick={() => {
                setFlipped(false);
                onAnswer(question.id, 'unknown');
              }}
            >
              Не знаю
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
