#!/bin/bash

# Скрипт для деплоя Next.js приложения на VPS сервер
# Использование: ./deploy.sh

echo "Начинаем деплой приложения на VPS сервер..."

# Подключение к серверу и выполнение команд
ssh supermock << 'EOF'
  # Переход в директорию проекта
  cd /root/supermock

  # Обновление кода из репозитория (если используется Git)
  # git pull origin main

  # Установка зависимостей
  echo "Установка зависимостей..."
  npm ci

  # Создание директории для логов, если она не существует
  mkdir -p logs

  # Запуск миграций Prisma
  echo "Применение миграций базы данных..."
  # Явно указываем переменную окружения DATABASE_URL для миграций
  export DATABASE_URL=postgresql://user:password@localhost:5432/interview_prep
  npx prisma migrate deploy

  # Сборка приложения
  echo "Сборка приложения..."
  npm run build

  # Запуск приложения с помощью PM2
  echo "Запуск приложения с помощью PM2..."
  # Проверка, запущено ли уже приложение
  if pm2 list | grep -q "supermock"; then
    echo "Перезапуск приложения..."
    pm2 reload supermock
  else
    echo "Первый запуск приложения..."
    pm2 start ecosystem.config.js
  fi

  # Сохранение конфигурации PM2 для автозапуска при перезагрузке сервера
  pm2 save

  echo "Деплой завершен успешно!"
EOF

echo "Скрипт деплоя выполнен."