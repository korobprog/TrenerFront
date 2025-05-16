import '../styles/globals.css';
import { SessionProvider } from 'next-auth/react';

// Добавляем логирование для отладки
console.log('_app.js: Инициализация приложения');

function MyApp({ Component, pageProps: { session, ...pageProps } }) {
  // Логируем состояние сессии при инициализации
  console.log('_app.js: Получена сессия:', session ? 'да' : 'нет');
  console.log('_app.js: Данные сессии:', session);

  return (
    <SessionProvider session={session}>
      <Component {...pageProps} />
    </SessionProvider>
  );
}

export default MyApp;
