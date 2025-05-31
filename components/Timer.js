import { useState, useEffect, useRef } from 'react';
import styles from '../styles/Timer.module.css';

export default function Timer({
  isRunning = false,
  onTimeUpdate = null,
  onStop = null,
  showSessionTime = false,
  className = '',
}) {
  const [currentTime, setCurrentTime] = useState(0); // Время текущего вопроса в секундах
  const [sessionTime, setSessionTime] = useState(0); // Общее время сессии в секундах
  const [isPaused, setIsPaused] = useState(false);

  const intervalRef = useRef(null);
  const startTimeRef = useRef(null);
  const pausedTimeRef = useRef(0);

  // Форматирование времени в MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs
      .toString()
      .padStart(2, '0')}`;
  };

  // Запуск таймера
  const startTimer = () => {
    if (!startTimeRef.current) {
      startTimeRef.current = Date.now();
    }

    intervalRef.current = setInterval(() => {
      const now = Date.now();
      const elapsed = Math.floor(
        (now - startTimeRef.current - pausedTimeRef.current) / 1000
      );

      setCurrentTime(elapsed);
      setSessionTime((prev) => prev + 1);

      if (onTimeUpdate) {
        onTimeUpdate(elapsed, sessionTime + 1);
      }
    }, 1000);
  };

  // Остановка таймера
  const stopTimer = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (onStop) {
      onStop(currentTime, sessionTime);
    }
  };

  // Пауза/возобновление таймера
  const togglePause = () => {
    if (isPaused) {
      // Возобновление
      const pauseDuration = Date.now() - pausedTimeRef.current;
      pausedTimeRef.current += pauseDuration;
      startTimer();
      setIsPaused(false);
    } else {
      // Пауза
      stopTimer();
      pausedTimeRef.current = Date.now();
      setIsPaused(true);
    }
  };

  // Сброс таймера
  const resetTimer = () => {
    stopTimer();
    setCurrentTime(0);
    setIsPaused(false);
    startTimeRef.current = null;
    pausedTimeRef.current = 0;
  };

  // Эффект для управления таймером извне
  useEffect(() => {
    if (isRunning && !isPaused) {
      // Если таймер только что запустился, сбрасываем его
      if (!startTimeRef.current) {
        resetTimer();
        startTimer();
      } else {
        startTimer();
      }
    } else {
      stopTimer();
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, isPaused]);

  // Сброс при смене вопроса
  useEffect(() => {
    if (isRunning) {
      resetTimer();
    }
  }, [isRunning]);

  // Определение цвета индикатора на основе времени
  const getTimerColor = () => {
    if (currentTime < 30) return 'green';
    if (currentTime < 60) return 'yellow';
    if (currentTime < 120) return 'orange';
    return 'red';
  };

  return (
    <div className={`${styles.timerContainer} ${className}`}>
      <div className={styles.timerDisplay}>
        <div className={`${styles.timerCircle} ${styles[getTimerColor()]}`}>
          <div className={styles.timerTime}>{formatTime(currentTime)}</div>
          <div className={styles.timerLabel}>Текущий вопрос</div>
        </div>

        {showSessionTime && (
          <div className={styles.sessionTimer}>
            <div className={styles.sessionTime}>{formatTime(sessionTime)}</div>
            <div className={styles.sessionLabel}>Общее время</div>
          </div>
        )}
      </div>

      <div className={styles.timerControls}>
        {isRunning && (
          <button
            onClick={togglePause}
            className={`${styles.controlButton} ${
              isPaused ? styles.playButton : styles.pauseButton
            }`}
            title={isPaused ? 'Возобновить' : 'Пауза'}
          >
            {isPaused ? '▶️' : '⏸️'}
          </button>
        )}

        <button
          onClick={resetTimer}
          className={`${styles.controlButton} ${styles.resetButton}`}
          title="Сбросить"
        >
          🔄
        </button>
      </div>

      {/* Визуальный индикатор состояния */}
      <div className={styles.statusIndicator}>
        {!isRunning && (
          <span className={styles.statusStopped}>⏹️ Остановлен</span>
        )}
        {isRunning && !isPaused && (
          <span className={styles.statusRunning}>▶️ Идет</span>
        )}
        {isRunning && isPaused && (
          <span className={styles.statusPaused}>⏸️ Пауза</span>
        )}
      </div>
    </div>
  );
}
