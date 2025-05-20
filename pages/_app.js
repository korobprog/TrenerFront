import '../styles/globals.css';
import { SessionProvider } from 'next-auth/react';
import { NotificationProvider } from '../contexts/NotificationContext';
import Header from '../components/Header';

function MyApp({ Component, pageProps: { session, ...pageProps } }) {
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
