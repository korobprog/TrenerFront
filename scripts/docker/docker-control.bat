@echo off
chcp 65001 >nul
title TrenerFront - Управление Docker контейнерами

:menu
cls
echo.
echo ===============================================
echo TrenerFront - Управление Docker контейнерами
echo ===============================================
echo.
echo 1. Запустить контейнеры
echo 2. Остановить контейнеры
echo 3. Перезапустить контейнеры
echo 4. Проверить статус контейнеров
echo 5. Открыть pgAdmin (http://localhost:8080)
echo 6. Обновить базу данных
echo 7. Показать логи PostgreSQL
echo 8. Показать логи pgAdmin
echo 0. Выход
echo.

set /p choice="Выберите действие (0-8): "

if "%choice%"=="1" goto start
if "%choice%"=="2" goto stop
if "%choice%"=="3" goto restart
if "%choice%"=="4" goto status
if "%choice%"=="5" goto pgadmin
if "%choice%"=="6" goto update_db
if "%choice%"=="7" goto logs_postgres
if "%choice%"=="8" goto logs_pgadmin
if "%choice%"=="0" goto exit
goto invalid

:start
echo.
echo Запуск Docker контейнеров...
docker-compose up -d
echo.
echo Контейнеры запущены!
goto pause

:stop
echo.
echo Остановка Docker контейнеров...
docker-compose down
echo.
echo Контейнеры остановлены!
goto pause

:restart
echo.
echo Перезапуск Docker контейнеров...
docker-compose down
docker-compose up -d
echo.
echo Контейнеры перезапущены!
goto pause

:status
echo.
echo Статус Docker контейнеров:
docker-compose ps
echo.
goto pause

:pgadmin
echo.
echo Открытие pgAdmin в браузере...
start http://localhost:8080
echo.
echo Для входа используйте:
echo Email: admin@example.com
echo Пароль: password
echo.
echo Для подключения к базе данных:
echo Host: postgres
echo Port: 5432
echo Database: interview_prep
echo Username: user
echo Password: password
echo.
goto pause

:update_db
echo.
echo Обновление базы данных...
call scripts\docker\update-db.bat
goto pause

:logs_postgres
echo.
echo Логи PostgreSQL (нажмите Ctrl+C для выхода):
docker-compose logs -f postgres
goto pause

:logs_pgadmin
echo.
echo Логи pgAdmin (нажмите Ctrl+C для выхода):
docker-compose logs -f pgadmin
goto pause

:invalid
echo.
echo Неверный выбор. Пожалуйста, выберите снова.
goto pause

:pause
echo.
pause
goto menu

:exit
echo.
echo Выход из программы...
exit /b 0