import '../styles/globals.css';
import { SessionProvider } from 'next-auth/react';
import { NotificationProvider } from '../contexts/NotificationContext';
import Header from '../components/Header';

function MyApp({ Component, pageProps: { session, ...pageProps } }) {
  return (
    <SessionProvider
      session={session}
      refetchInterval={0} // Отключаем автоматическое обновление сессии
      refetchOnWindowFocus={false} // Отключаем обновление при фокусе окна
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
