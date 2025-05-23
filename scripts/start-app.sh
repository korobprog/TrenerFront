#!/bin/bash
# Скрипт для быстрого запуска приложения TrenerFront в Linux/Mac

echo "TrenerFront - Запуск приложения"
echo "=============================="
echo ""

# Проверяем, запущен ли Docker контейнер
echo "Проверка Docker контейнеров..."
if docker ps -q -f name=trenerfront_postgres > /dev/null 2>&1; then
    echo "✅ Docker контейнер с базой данных уже запущен"
else
    echo "🚀 Запускаем Docker контейнер с базой данных..."
    docker-compose up -d
    
    # Ждем, пока контейнер полностью запустится
    echo "⏳ Ожидаем запуска базы данных..."
    sleep 5
fi

# Проверяем, нужно ли применить миграции
echo "🔍 Проверка миграций базы данных..."
if npx prisma migrate status | grep "not applied" > /dev/null; then
    echo "🔄 Применяем миграции базы данных..."
    npx prisma migrate deploy
else
    echo "✅ Миграции базы данных уже применены"
fi

# Открываем приложение в браузере (если доступно)
if command -v xdg-open > /dev/null; then
    xdg-open http://localhost:3000 &
elif command -v open > /dev/null; then
    open http://localhost:3000 &
else
    echo "📝 После запуска приложения откройте http://localhost:3000 в браузере"
fi

# Запускаем приложение
echo "🚀 Запускаем приложение..."
npm run dev

# Этот код выполнится только если приложение будет закрыто
echo ""
echo "Приложение остановлено."
echo ""
echo "Нажмите Enter для выхода..."
read