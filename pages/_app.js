import '../styles/globals.css';
import { SessionProvider } from 'next-auth/react';
import { NotificationProvider } from '../contexts/NotificationContext';
import Header from '../components/Header';
import { useEffect } from 'react';

function MyApp({ Component, pageProps: { session, ...pageProps } }) {
  // Предотвращение мерцания при загрузке темы
  useEffect(() => {
    // Скрипт для предотвращения мерцания при загрузке страницы
    const setInitialTheme = `
      (function() {
        // Получаем сохраненную тему из localStorage
        const savedTheme = localStorage.getItem('theme');
        // Проверяем системные предпочтения
        const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        
        // Устанавливаем тему на основе сохраненных настроек или системных предпочтений
        if (savedTheme) {
          document.documentElement.setAttribute('data-theme', savedTheme);
        } else if (prefersDark) {
          document.documentElement.setAttribute('data-theme', 'dark');
        }
      })();
    `;

    // Добавляем скрипт в head для выполнения до рендеринга страницы
    const script = document.createElement('script');
    script.innerHTML = setInitialTheme;
    document.head.appendChild(script);

    return () => {
      // Удаляем скрипт при размонтировании компонента
      document.head.removeChild(script);
    };
  }, []);

  return (
    <SessionProvider
      session={session}
      refetchInterval={60} // Обновлять каждую минуту вместо 0
      refetchOnWindowFocus={true} // Включить обновление при фокусе окна
    >
      <NotificationProvider>
        <Header />
        <main className="main-content">
          <Component {...pageProps} />
        </main>
      </NotificationProvider>
    </SessionProvider>
  );
}

export default MyApp;
