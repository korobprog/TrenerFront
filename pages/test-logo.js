import { useState } from 'react';
import Head from 'next/head';
import Logo from '../components/Logo';
import styles from '../styles/Home.module.css';

export default function TestLogo() {
  const [theme, setTheme] = useState('light');

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  return (
    <div className={styles.container}>
      <Head>
        <title>Тест логотипа SuperMock</title>
        <meta name="description" content="Тестирование нового SVG логотипа" />
      </Head>

      <main className={styles.main}>
        <h1 className={styles.title}>Тест нового логотипа SuperMock</h1>

        <button
          onClick={toggleTheme}
          style={{
            padding: '10px 20px',
            margin: '20px 0',
            backgroundColor: theme === 'light' ? '#667eea' : '#90cdf4',
            color: theme === 'light' ? 'white' : 'black',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '16px',
          }}
        >
          Переключить тему ({theme === 'light' ? 'Светлая' : 'Темная'})
        </button>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '40px',
            alignItems: 'center',
            padding: '40px',
            backgroundColor: theme === 'light' ? '#f7fafc' : '#1a202c',
            borderRadius: '16px',
            transition: 'all 0.3s ease',
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <h2
              style={{
                marginBottom: '20px',
                color: theme === 'light' ? '#2d3748' : '#f7fafc',
              }}
            >
              Размер Large
            </h2>
            <Logo size="large" />
          </div>

          <div style={{ textAlign: 'center' }}>
            <h2
              style={{
                marginBottom: '20px',
                color: theme === 'light' ? '#2d3748' : '#f7fafc',
              }}
            >
              Размер Medium (по умолчанию)
            </h2>
            <Logo size="medium" />
          </div>

          <div style={{ textAlign: 'center' }}>
            <h2
              style={{
                marginBottom: '20px',
                color: theme === 'light' ? '#2d3748' : '#f7fafc',
              }}
            >
              Размер Small
            </h2>
            <Logo size="small" />
          </div>
        </div>

        <div
          style={{
            marginTop: '40px',
            padding: '20px',
            backgroundColor: theme === 'light' ? '#e2e8f0' : '#2d3748',
            borderRadius: '12px',
            color: theme === 'light' ? '#2d3748' : '#f7fafc',
          }}
        >
          <h3>Особенности нового логотипа:</h3>
          <ul style={{ marginTop: '10px', lineHeight: '1.6' }}>
            <li>✅ Современный SVG дизайн</li>
            <li>✅ Адаптивность под светлую и темную темы</li>
            <li>✅ Масштабируемость без потери качества</li>
            <li>✅ Анимированные эффекты при наведении</li>
            <li>✅ Плавные анимации появления элементов</li>
            <li>✅ Отражает тематику подготовки к собеседованиям</li>
          </ul>
        </div>
      </main>
    </div>
  );
}
