@echo off
REM Скрипт для управления Docker контейнерами

echo TrenerFront - Управление Docker контейнерами
echo =============================================
echo.
echo 1. Запустить контейнеры
echo 2. Остановить контейнеры
echo 3. Перезапустить контейнеры
echo 4. Проверить статус контейнеров
echo 5. Открыть pgAdmin (http://localhost:8080)
echo 6. Обновить базу данных
echo 0. Выход
echo.

:menu
set /p choice="Выберите действие (0-6): "

if "%choice%"=="1" goto start
if "%choice%"=="2" goto stop
if "%choice%"=="3" goto restart
if "%choice%"=="4" goto status
if "%choice%"=="5" goto pgadmin
if "%choice%"=="6" goto update_db
if "%choice%"=="0" goto end

echo Неверный выбор. Пожалуйста, выберите снова.
goto menu

:start
echo.
echo Запуск Docker контейнеров...
docker-compose up -d
echo.
echo Контейнеры запущены!
goto end

:stop
echo.
echo Остановка Docker контейнеров...
docker-compose down
echo.
echo Контейнеры остановлены!
goto end

:restart
echo.
echo Перезапуск Docker контейнеров...
docker-compose down
docker-compose up -d
echo.
echo Контейнеры перезапущены!
goto end

:status
echo.
echo Статус Docker контейнеров:
docker-compose ps
echo.
goto end

:pgadmin
echo.
echo Открытие pgAdmin в браузере...
start http://localhost:8080
echo.
echo Для входа используйте:
echo Email: admin@example.com
echo Пароль: admin
echo.
goto end

:update_db
echo.
echo Обновление базы данных...
call scripts\docker\update-db.bat
goto end

:end
echo.
echo Нажмите любую клавишу для выхода...
pause > nul