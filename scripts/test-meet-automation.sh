#!/bin/bash

echo "Запуск тестирования автоматизации создания ссылок на Google Meet..."

echo "Запуск сервера разработки..."
npm run dev &
SERVER_PID=$!

echo "Ожидание запуска сервера..."
sleep 5

echo "Открытие страницы создания нового собеседования..."
if [[ "$OSTYPE" == "darwin"* ]]; then
  # macOS
  open http://localhost:3000/mock-interviews/new
else
  # Linux
  xdg-open http://localhost:3000/mock-interviews/new || sensible-browser http://localhost:3000/mock-interviews/new || firefox http://localhost:3000/mock-interviews/new || google-chrome http://localhost:3000/mock-interviews/new
fi

echo ""
echo "Инструкции по тестированию:"
echo "1. Войдите в систему, если потребуется"
echo "2. Выберите дату и время собеседования"
echo "3. Нажмите \"Далее\""
echo "4. На странице подтверждения нажмите \"Создать собеседование\""
echo "5. Проверьте, что собеседование создано и содержит ссылку на Google Meet"
echo ""
echo "Проверьте логи сервера в консоли для отслеживания процесса создания ссылки"
echo ""
echo "Нажмите Ctrl+C для завершения сервера разработки"

# Ожидаем завершения сервера
wait $SERVER_PID