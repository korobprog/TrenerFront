import { useState, useEffect } from 'react';
import styles from '../styles/Header.module.css';

/**
 * Компонент переключателя темы (светлая/темная)
 * @returns {JSX.Element} Компонент переключателя темы
 */
export default function ThemeToggle() {
  const [isDarkTheme, setIsDarkTheme] = useState(false);

  // Инициализация темы при загрузке компонента
  useEffect(() => {
    // Проверяем сохраненную тему в localStorage
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    // Устанавливаем тему на основе сохраненных настроек или системных предпочтений
    if (savedTheme) {
      setIsDarkTheme(savedTheme === 'dark');
      document.documentElement.setAttribute('data-theme', savedTheme);
    } else if (prefersDark) {
      setIsDarkTheme(true);
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  }, []);

  // Обработчик переключения темы
  const toggleTheme = () => {
    const newTheme = isDarkTheme ? 'light' : 'dark';
    setIsDarkTheme(!isDarkTheme);
    
    // Устанавливаем атрибут data-theme для корневого элемента
    document.documentElement.setAttribute('data-theme', newTheme);
    
    // Сохраняем выбор пользователя в localStorage
    localStorage.setItem('theme', newTheme);
  };

  return (
    <div className={styles.themeToggle}>
      <span className={styles.themeToggleIcon}>☀️</span>
      <label className={styles.themeToggleSwitch}>
        <input 
          type="checkbox" 
          checked={isDarkTheme} 
          onChange={toggleTheme} 
        />
        <span className={styles.themeToggleSlider}></span>
      </label>
      <span className={styles.themeToggleIcon}>🌙</span>
    </div>
  );
}