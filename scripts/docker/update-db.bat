@echo off
REM Скрипт для обновления базы данных в Docker для Windows

echo Проверяем, запущен ли Docker контейнер...
docker ps -q -f name=trenerfront_postgres > nul 2>&1
if %ERRORLEVEL% == 0 (
    echo ✅ Docker контейнер с базой данных запущен
) else (
    echo 🚀 Запускаем Docker контейнер с базой данных...
    docker-compose up -d
    
    REM Ждем, пока контейнер полностью запустится
    echo ⏳ Ожидаем запуска базы данных...
    timeout /t 5 /nobreak > nul
)

REM Применяем миграции Prisma
echo 🔄 Применяем миграции базы данных...
call npx prisma migrate deploy

REM Импортируем вопросы из файла questions.txt
echo 📥 Импортируем вопросы из файла questions.txt...
node scripts/import-questions.js

REM Если существует файл txt, импортируем вопросы из него
if exist txt (
    echo 📥 Импортируем вопросы из файла txt...
    node scripts/import-extended.js
) else (
    echo ⚠️ Файл txt не найден, пропускаем импорт расширенных вопросов
)

echo ✅ Обновление базы данных завершено!
pause