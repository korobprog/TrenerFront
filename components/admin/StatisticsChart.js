import { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import styles from '../../styles/admin/StatisticsChart.module.css';

/**
 * Компонент для отображения графиков и диаграмм статистики
 * @param {Object} props - Свойства компонента
 * @param {Array} props.statistics - Массив данных статистики
 * @returns {JSX.Element} Компонент графиков и диаграмм
 */
export default function StatisticsChart({ statistics }) {
  // Рефы для канвасов графиков
  const interviewsChartRef = useRef(null);
  const usersChartRef = useRef(null);
  const pointsChartRef = useRef(null);
  const feedbackChartRef = useRef(null);

  // Рефы для экземпляров графиков
  const interviewsChartInstance = useRef(null);
  const usersChartInstance = useRef(null);
  const pointsChartInstance = useRef(null);
  const feedbackChartInstance = useRef(null);

  // Создаем и обновляем графики при изменении данных
  useEffect(() => {
    // ДИАГНОСТИЧЕСКИЕ ЛОГИ
    console.log(
      '📊 ДИАГНОСТИКА StatisticsChart: Получены statistics:',
      statistics
    );
    console.log(
      '📊 ДИАГНОСТИКА StatisticsChart: Тип statistics:',
      typeof statistics
    );
    console.log(
      '📊 ДИАГНОСТИКА StatisticsChart: Array.isArray(statistics):',
      Array.isArray(statistics)
    );
    console.log(
      '📊 ДИАГНОСТИКА StatisticsChart: statistics.length:',
      statistics?.length
    );

    if (!statistics || statistics.length === 0) {
      console.log(
        '📊 ДИАГНОСТИКА StatisticsChart: Нет данных для отображения - statistics пустой или undefined'
      );
      return;
    }

    // Подготавливаем данные для графиков
    const dates = statistics.map((stat) =>
      new Date(stat.date).toLocaleDateString('ru-RU')
    );

    // Данные для графика собеседований
    const completedInterviews = statistics.map(
      (stat) => stat.completedInterviews
    );
    const pendingInterviews = statistics.map((stat) => stat.pendingInterviews);
    const bookedInterviews = statistics.map((stat) => stat.bookedInterviews);
    const cancelledInterviews = statistics.map(
      (stat) => stat.cancelledInterviews
    );
    const noShowInterviews = statistics.map((stat) => stat.noShowInterviews);

    // Данные для графика пользователей
    const totalUsers = statistics.map((stat) => stat.totalUsers);
    const newUsers = statistics.map((stat) => stat.newUsers);
    const activeUsers = statistics.map((stat) => stat.activeUsers);

    // Данные для графика баллов
    const pointsIssued = statistics.map((stat) => stat.pointsIssued);
    const pointsSpent = statistics.map((stat) => stat.pointsSpent);

    // Данные для графика отзывов
    const averageTechnicalScore = statistics.map(
      (stat) => stat.averageTechnicalScore
    );
    const averageInterviewerRating = statistics.map(
      (stat) => stat.averageInterviewerRating
    );

    // Создаем или обновляем график собеседований
    if (interviewsChartRef.current) {
      if (interviewsChartInstance.current) {
        interviewsChartInstance.current.destroy();
      }

      interviewsChartInstance.current = new Chart(interviewsChartRef.current, {
        type: 'line',
        data: {
          labels: dates,
          datasets: [
            {
              label: 'Завершенные',
              data: completedInterviews,
              borderColor: '#4CAF50',
              backgroundColor: 'rgba(76, 175, 80, 0.1)',
              tension: 0.1,
            },
            {
              label: 'Ожидающие',
              data: pendingInterviews,
              borderColor: '#2196F3',
              backgroundColor: 'rgba(33, 150, 243, 0.1)',
              tension: 0.1,
            },
            {
              label: 'Забронированные',
              data: bookedInterviews,
              borderColor: '#FF9800',
              backgroundColor: 'rgba(255, 152, 0, 0.1)',
              tension: 0.1,
            },
            {
              label: 'Отмененные',
              data: cancelledInterviews,
              borderColor: '#F44336',
              backgroundColor: 'rgba(244, 67, 54, 0.1)',
              tension: 0.1,
            },
            {
              label: 'Неявки',
              data: noShowInterviews,
              borderColor: '#9C27B0',
              backgroundColor: 'rgba(156, 39, 176, 0.1)',
              tension: 0.1,
            },
          ],
        },
        options: {
          responsive: true,
          plugins: {
            title: {
              display: true,
              text: 'Динамика собеседований',
              font: {
                size: 16,
              },
            },
            legend: {
              position: 'bottom',
            },
          },
          scales: {
            y: {
              beginAtZero: true,
              title: {
                display: true,
                text: 'Количество',
              },
            },
            x: {
              title: {
                display: true,
                text: 'Дата',
              },
            },
          },
        },
      });
    }

    // Создаем или обновляем график пользователей
    if (usersChartRef.current) {
      if (usersChartInstance.current) {
        usersChartInstance.current.destroy();
      }

      usersChartInstance.current = new Chart(usersChartRef.current, {
        type: 'line',
        data: {
          labels: dates,
          datasets: [
            {
              label: 'Всего пользователей',
              data: totalUsers,
              borderColor: '#2196F3',
              backgroundColor: 'rgba(33, 150, 243, 0.1)',
              tension: 0.1,
            },
            {
              label: 'Новые пользователи',
              data: newUsers,
              borderColor: '#4CAF50',
              backgroundColor: 'rgba(76, 175, 80, 0.1)',
              tension: 0.1,
            },
            {
              label: 'Активные пользователи',
              data: activeUsers,
              borderColor: '#FF9800',
              backgroundColor: 'rgba(255, 152, 0, 0.1)',
              tension: 0.1,
            },
          ],
        },
        options: {
          responsive: true,
          plugins: {
            title: {
              display: true,
              text: 'Динамика пользователей',
              font: {
                size: 16,
              },
            },
            legend: {
              position: 'bottom',
            },
          },
          scales: {
            y: {
              beginAtZero: true,
              title: {
                display: true,
                text: 'Количество',
              },
            },
            x: {
              title: {
                display: true,
                text: 'Дата',
              },
            },
          },
        },
      });
    }

    // Создаем или обновляем график баллов
    if (pointsChartRef.current) {
      if (pointsChartInstance.current) {
        pointsChartInstance.current.destroy();
      }

      pointsChartInstance.current = new Chart(pointsChartRef.current, {
        type: 'bar',
        data: {
          labels: dates,
          datasets: [
            {
              label: 'Выдано баллов',
              data: pointsIssued,
              backgroundColor: 'rgba(76, 175, 80, 0.7)',
            },
            {
              label: 'Потрачено баллов',
              data: pointsSpent,
              backgroundColor: 'rgba(244, 67, 54, 0.7)',
            },
          ],
        },
        options: {
          responsive: true,
          plugins: {
            title: {
              display: true,
              text: 'Динамика баллов',
              font: {
                size: 16,
              },
            },
            legend: {
              position: 'bottom',
            },
          },
          scales: {
            y: {
              beginAtZero: true,
              title: {
                display: true,
                text: 'Количество',
              },
            },
            x: {
              title: {
                display: true,
                text: 'Дата',
              },
            },
          },
        },
      });
    }

    // Создаем или обновляем график отзывов
    if (feedbackChartRef.current) {
      if (feedbackChartInstance.current) {
        feedbackChartInstance.current.destroy();
      }

      feedbackChartInstance.current = new Chart(feedbackChartRef.current, {
        type: 'line',
        data: {
          labels: dates,
          datasets: [
            {
              label: 'Средняя техническая оценка',
              data: averageTechnicalScore,
              borderColor: '#2196F3',
              backgroundColor: 'rgba(33, 150, 243, 0.1)',
              tension: 0.1,
            },
            {
              label: 'Средняя оценка интервьюера',
              data: averageInterviewerRating,
              borderColor: '#FF9800',
              backgroundColor: 'rgba(255, 152, 0, 0.1)',
              tension: 0.1,
            },
          ],
        },
        options: {
          responsive: true,
          plugins: {
            title: {
              display: true,
              text: 'Динамика оценок',
              font: {
                size: 16,
              },
            },
            legend: {
              position: 'bottom',
            },
          },
          scales: {
            y: {
              min: 0,
              max: 5,
              title: {
                display: true,
                text: 'Оценка',
              },
            },
            x: {
              title: {
                display: true,
                text: 'Дата',
              },
            },
          },
        },
      });
    }

    // Очищаем графики при размонтировании компонента
    return () => {
      if (interviewsChartInstance.current) {
        interviewsChartInstance.current.destroy();
      }
      if (usersChartInstance.current) {
        usersChartInstance.current.destroy();
      }
      if (pointsChartInstance.current) {
        pointsChartInstance.current.destroy();
      }
      if (feedbackChartInstance.current) {
        feedbackChartInstance.current.destroy();
      }
    };
  }, [statistics]);

  // Если статистика не загружена, показываем сообщение о загрузке
  if (!statistics || statistics.length === 0) {
    return (
      <div className={styles.loadingContainer}>
        <p>Нет данных для отображения графиков</p>
      </div>
    );
  }

  return (
    <div className={styles.statisticsChartContainer}>
      <div className={styles.chartRow}>
        <div className={styles.chartCard}>
          <canvas ref={interviewsChartRef}></canvas>
        </div>
        <div className={styles.chartCard}>
          <canvas ref={usersChartRef}></canvas>
        </div>
      </div>
      <div className={styles.chartRow}>
        <div className={styles.chartCard}>
          <canvas ref={pointsChartRef}></canvas>
        </div>
        <div className={styles.chartCard}>
          <canvas ref={feedbackChartRef}></canvas>
        </div>
      </div>
    </div>
  );
}
