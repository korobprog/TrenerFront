import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const authOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      // Добавляем id пользователя в объект сессии
      session.user.id = user.id;
      return session;
    },
  },
  pages: {
    signIn: '/auth/signin', // Кастомная страница входа
    // error: '/auth/error', // Опционально: страница ошибки
    // signOut: '/auth/signout', // Опционально: страница выхода
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export default NextAuth(authOptions);
