import React from 'react';
import styles from '../styles/Logo.module.css';

/**
 * Компонент SVG логотипа SuperMock с адаптивностью под темы
 * @returns {JSX.Element} SVG логотип
 */
export default function Logo({ className = '', size = 'medium' }) {
  return (
    <div className={`${styles.logoContainer} ${styles[size]} ${className}`}>
      <svg
        className={styles.logoSvg}
        viewBox="0 0 200 60"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="SuperMock логотип"
      >
        {/* Градиентные определения */}
        <defs>
          {/* Градиент для светлой темы */}
          <linearGradient
            id="logoGradientLight"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <stop offset="0%" stopColor="#667eea" />
            <stop offset="50%" stopColor="#764ba2" />
            <stop offset="100%" stopColor="#f093fb" />
          </linearGradient>

          {/* Градиент для темной темы */}
          <linearGradient
            id="logoGradientDark"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <stop offset="0%" stopColor="#90cdf4" />
            <stop offset="50%" stopColor="#667eea" />
            <stop offset="100%" stopColor="#764ba2" />
          </linearGradient>

          {/* Тень для иконки */}
          <filter id="iconShadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="2" dy="2" stdDeviation="3" floodOpacity="0.3" />
          </filter>

          {/* Свечение для темной темы */}
          <filter id="iconGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Иконка - стилизованная буква "S" с элементами интервью */}
        <g className={styles.logoIcon}>
          {/* Основная форма "S" */}
          <path
            d="M25 15 C35 15, 40 20, 40 25 C40 30, 35 35, 25 35 C15 35, 10 40, 10 45 C10 50, 15 55, 25 55"
            stroke="currentColor"
            strokeWidth="4"
            fill="none"
            strokeLinecap="round"
            className={styles.sPath}
          />

          {/* Декоративные элементы - точки интервью */}
          <circle
            cx="45"
            cy="20"
            r="2"
            fill="currentColor"
            className={styles.dot}
          />
          <circle
            cx="45"
            cy="30"
            r="2"
            fill="currentColor"
            className={styles.dot}
          />
          <circle
            cx="45"
            cy="40"
            r="2"
            fill="currentColor"
            className={styles.dot}
          />

          {/* Стрелка прогресса */}
          <path
            d="M48 25 L52 25 M50 23 L52 25 L50 27"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={styles.arrow}
          />
        </g>

        {/* Текст логотипа */}
        <g className={styles.logoText}>
          {/* Super */}
          <text x="65" y="25" className={styles.superText} fill="currentColor">
            Super
          </text>

          {/* Mock */}
          <text x="65" y="45" className={styles.mockText} fill="currentColor">
            Mock
          </text>
        </g>

        {/* Подчеркивание */}
        <line
          x1="65"
          y1="50"
          x2="190"
          y2="50"
          stroke="currentColor"
          strokeWidth="2"
          className={styles.underline}
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}
