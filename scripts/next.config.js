/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  // Настройки для обработки изображений
  images: {
    domains: [],
    remotePatterns: [],
  },
  // Настройки для компилятора
  compiler: {
    // Отключаем удаление консольных логов в режиме разработки
    removeConsole: process.env.NODE_ENV === 'production',
  },
};

module.exports = nextConfig;
