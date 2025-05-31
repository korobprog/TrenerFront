import { useState } from 'react';
import styles from '../../styles/InterviewTypeSelector.module.css';

export default function InterviewTypeSelector({
  selectedType,
  onTypeSelect,
  onNext,
}) {
  const [hoveredType, setHoveredType] = useState(null);

  const interviewTypes = [
    {
      id: 'google_meet',
      title: 'Google Meet',
      description: 'Использовать Google Meet для видеосвязи',
      icon: '📹',
      features: [
        'Автоматическое создание ссылки',
        'Интеграция с Google Calendar',
        'Знакомый интерфейс',
        'Высокое качество связи',
      ],
      color: '#4285f4',
    },
    {
      id: 'built_in',
      title: 'Встроенная видеосистема',
      description: 'Использовать собственную видеосистему',
      icon: '🎥',
      features: [
        'Полный контроль над процессом',
        'Встроенная запись',
        'Чат и совместное использование экрана',
        'Специальные функции для интервью',
      ],
      color: '#28a745',
    },
  ];

  const handleTypeSelect = (typeId) => {
    onTypeSelect(typeId);
  };

  const handleNext = () => {
    if (!selectedType) {
      return;
    }
    onNext();
  };

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Выберите тип собеседования</h2>
      <p className={styles.subtitle}>
        Выберите платформу для проведения видеособеседования
      </p>

      <div className={styles.typesGrid}>
        {interviewTypes.map((type) => {
          // Определяем CSS класс для цвета
          let colorClass = '';
          if (type.color === '#4285f4') {
            colorClass = styles.googleColor;
          } else if (type.color === '#28a745') {
            colorClass = styles.greenColor;
          }

          return (
            <div
              key={type.id}
              className={`${styles.typeCard} ${colorClass} ${
                selectedType === type.id ? styles.selected : ''
              } ${hoveredType === type.id ? styles.hovered : ''}`}
              onClick={() => handleTypeSelect(type.id)}
              onMouseEnter={() => setHoveredType(type.id)}
              onMouseLeave={() => setHoveredType(null)}
            >
              <div className={styles.cardHeader}>
                <div className={styles.iconContainer}>
                  <span className={styles.icon}>{type.icon}</span>
                </div>
                <div className={styles.cardTitle}>
                  <h3>{type.title}</h3>
                  <p className={styles.cardDescription}>{type.description}</p>
                </div>
              </div>

              <div className={styles.features}>
                <h4 className={styles.featuresTitle}>Преимущества:</h4>
                <ul className={styles.featuresList}>
                  {type.features.map((feature, index) => (
                    <li key={index} className={styles.feature}>
                      <span className={styles.featureIcon}>✓</span>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>

              <div className={styles.selectIndicator}>
                {selectedType === type.id && (
                  <div className={styles.selectedBadge}>
                    <span className={styles.selectedIcon}>✓</span>
                    Выбрано
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {!selectedType && (
        <div className={styles.hint}>
          Пожалуйста, выберите тип собеседования для продолжения
        </div>
      )}

      <div className={styles.buttonGroup}>
        <button
          type="button"
          className={styles.nextButton}
          onClick={handleNext}
          disabled={!selectedType}
        >
          Далее
        </button>
      </div>
    </div>
  );
}
