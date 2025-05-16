import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import prisma from '../../../lib/prisma';

// Добавляем логирование переменных окружения для отладки
console.log('NextAuth: Проверка переменных окружения');
console.log('NextAuth: NEXTAUTH_URL =', process.env.NEXTAUTH_URL);
console.log(
  'NextAuth: NEXTAUTH_SECRET существует =',
  !!process.env.NEXTAUTH_SECRET
);
console.log(
  'NextAuth: GOOGLE_CLIENT_ID существует =',
  !!process.env.GOOGLE_CLIENT_ID
);
console.log(
  'NextAuth: GOOGLE_CLIENT_SECRET существует =',
  !!process.env.GOOGLE_CLIENT_SECRET
);

export const authOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: true, // Разрешаем связывание аккаунтов по email
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      console.log('NextAuth callback: session вызван');
      console.log('NextAuth callback: session параметры:', { session, user });

      // Добавляем id пользователя в объект сессии
      session.user.id = user.id;
      console.log('NextAuth callback: обновленная сессия:', session);

      return session;
    },
    async signIn({ user, account, profile, email, credentials }) {
      console.log('NextAuth callback: signIn вызван');
      console.log('NextAuth callback: signIn параметры:', {
        user: user ? { id: user.id, email: user.email } : null,
        account: account ? { provider: account.provider } : null,
        profile: profile ? { email: profile.email } : null,
      });

      // Всегда разрешаем вход, даже если аккаунт не связан
      // Это позволит создать новый аккаунт, если старый был удален
      return true;
    },
  },
  pages: {
    signIn: '/auth/signin', // Кастомная страница входа
    // error: '/auth/error', // Опционально: страница ошибки
    // signOut: '/auth/signout', // Опционально: страница выхода
  },
  secret: process.env.NEXTAUTH_SECRET,
};

// Добавляем логирование перед экспортом
console.log('NextAuth: Конфигурация загружена');
console.log(
  'NextAuth: Провайдеры:',
  authOptions.providers.map((p) => p.id).join(', ')
);
console.log('NextAuth: Адаптер настроен:', !!authOptions.adapter);
console.log('NextAuth: Секрет настроен:', !!authOptions.secret);

export default NextAuth(authOptions);
