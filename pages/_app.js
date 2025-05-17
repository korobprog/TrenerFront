import '../styles/globals.css';
import { SessionProvider } from 'next-auth/react';
import { NotificationProvider } from '../contexts/NotificationContext';
import Header from '../components/Header';

// Добавляем логирование для отладки
console.log('_app.js: Инициализация приложения');

function MyApp({ Component, pageProps: { session, ...pageProps } }) {
  // Логируем состояние сессии при инициализации
  console.log('_app.js: Получена сессия:', session ? 'да' : 'нет');
  console.log('_app.js: Данные сессии:', session);

  return (
    <SessionProvider session={session}>
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
