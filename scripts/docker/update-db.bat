@echo off
chcp 65001 >nul

echo Скрипт для обновления базы данных в Docker

REM Проверяем, запущен ли Docker контейнер
docker ps -q -f name=trenerfront_postgres >nul 2>&1
if %errorlevel% neq 0 (
    echo 🚀 Запускаем Docker контейнер с базой данных...
    docker-compose up -d
    
    REM Ждем, пока контейнер полностью запустится
    echo ⏳ Ожидаем запуска базы данных...
    timeout /t 5 /nobreak >nul
) else (
    echo ✅ Docker контейнер с базой данных запущен
)

REM Применяем миграции Prisma
echo 🔄 Применяем миграции базы данных...
npx prisma migrate deploy

REM Генерируем Prisma клиент
echo 🔧 Генерируем Prisma клиент...
npx prisma generate

REM Импортируем вопросы из файла questions.txt
if exist "questions.txt" (
    echo 📥 Импортируем вопросы из файла questions.txt...
    node scripts/add-questions.js
) else (
    echo ⚠️ Файл questions.txt не найден, пропускаем импорт вопросов
)

REM Если существует файл txt, импортируем вопросы из него
if exist "txt" (
    echo 📥 Импортируем вопросы из файла txt...
    node scripts/import-extended.js
) else (
    echo ⚠️ Файл txt не найден, пропускаем импорт расширенных вопросов
)

echo ✅ Обновление базы данных завершено!