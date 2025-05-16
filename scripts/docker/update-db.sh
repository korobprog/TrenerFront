#!/bin/bash

# Скрипт для обновления базы данных в Docker

# Проверяем, запущен ли Docker контейнер
if [ "$(docker ps -q -f name=trenerfront_postgres)" ]; then
    echo "✅ Docker контейнер с базой данных запущен"
else
    echo "🚀 Запускаем Docker контейнер с базой данных..."
    docker-compose up -d
    
    # Ждем, пока контейнер полностью запустится
    echo "⏳ Ожидаем запуска базы данных..."
    sleep 5
fi

# Применяем миграции Prisma
echo "🔄 Применяем миграции базы данных..."
npx prisma migrate deploy

# Импортируем вопросы из файла questions.txt
echo "📥 Импортируем вопросы из файла questions.txt..."
node scripts/import-questions.js

# Если существует файл txt, импортируем вопросы из него
if [ -f "txt" ]; then
    echo "📥 Импортируем вопросы из файла txt..."
    node scripts/import-extended.js
else
    echo "⚠️ Файл txt не найден, пропускаем импорт расширенных вопросов"
fi

echo "✅ Обновление базы данных завершено!"