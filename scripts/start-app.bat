@echo off
REM Скрипт для быстрого запуска приложения TrenerFront

echo TrenerFront - Запуск приложения
echo ==============================
echo.

REM Проверяем, запущен ли Docker контейнер
echo Проверка Docker контейнеров...
docker ps -q -f name=trenerfront_postgres > nul 2>&1
if %ERRORLEVEL% == 0 (
    echo ✅ Docker контейнер с базой данных уже запущен
) else (
    echo 🚀 Запускаем Docker контейнер с базой данных...
    docker-compose up -d
    
    REM Ждем, пока контейнер полностью запустится
    echo ⏳ Ожидаем запуска базы данных...
    timeout /t 5 /nobreak > nul
)

REM Проверяем, нужно ли применить миграции
echo 🔍 Проверка миграций базы данных...
call npx prisma migrate status | findstr "not applied" > nul
if %ERRORLEVEL% == 0 (
    echo 🔄 Применяем миграции базы данных...
    call npx prisma migrate deploy
) else (
    echo ✅ Миграции базы данных уже применены
)

REM Запускаем приложение
echo 🚀 Запускаем приложение...
start "" http://localhost:3000
call npm run dev

REM Этот код выполнится только если приложение будет закрыто
echo.
echo Приложение остановлено.
echo.
echo Нажмите любую клавишу для выхода...
pause > nul