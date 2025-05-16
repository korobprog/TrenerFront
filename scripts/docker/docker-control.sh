#!/bin/bash
# Скрипт для управления Docker контейнерами в Linux/Mac

echo "TrenerFront - Управление Docker контейнерами"
echo "============================================="
echo ""
echo "1. Запустить контейнеры"
echo "2. Остановить контейнеры"
echo "3. Перезапустить контейнеры"
echo "4. Проверить статус контейнеров"
echo "5. Открыть pgAdmin (http://localhost:8080)"
echo "6. Обновить базу данных"
echo "0. Выход"
echo ""

while true; do
    read -p "Выберите действие (0-6): " choice
    
    case $choice in
        1)
            echo ""
            echo "Запуск Docker контейнеров..."
            docker-compose up -d
            echo ""
            echo "Контейнеры запущены!"
            ;;
        2)
            echo ""
            echo "Остановка Docker контейнеров..."
            docker-compose down
            echo ""
            echo "Контейнеры остановлены!"
            ;;
        3)
            echo ""
            echo "Перезапуск Docker контейнеров..."
            docker-compose down
            docker-compose up -d
            echo ""
            echo "Контейнеры перезапущены!"
            ;;
        4)
            echo ""
            echo "Статус Docker контейнеров:"
            docker-compose ps
            echo ""
            ;;
        5)
            echo ""
            echo "Открытие pgAdmin в браузере..."
            if command -v xdg-open > /dev/null; then
                xdg-open http://localhost:8080 &
            elif command -v open > /dev/null; then
                open http://localhost:8080 &
            else
                echo "Откройте http://localhost:8080 в вашем браузере"
            fi
            echo ""
            echo "Для входа используйте:"
            echo "Email: admin@example.com"
            echo "Пароль: admin"
            echo ""
            ;;
        6)
            echo ""
            echo "Обновление базы данных..."
            bash scripts/docker/update-db.sh
            ;;
        0)
            echo ""
            echo "Выход из программы..."
            exit 0
            ;;
        *)
            echo "Неверный выбор. Пожалуйста, выберите снова."
            ;;
    esac
    
    echo ""
    read -p "Нажмите Enter для продолжения..."
done