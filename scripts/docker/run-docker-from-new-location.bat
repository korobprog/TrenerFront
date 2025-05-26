@echo off
echo TrenerFront - Запуск Docker контейнеров из нового расположения
echo =========================================================
echo.

REM Проверяем, существует ли директория E:\Вос\Git
if not exist "E:\Вос\Git" (
    echo Ошибка: Директория E:\Вос\Git не существует!
    echo Сначала выполните перенос Docker контейнеров, запустив скрипт move-docker-data.bat
    echo.
    pause
    exit /b 1
)

REM Проверяем, существует ли файл docker-compose.yml в новом расположении
if not exist "E:\Вос\Git\docker-compose.yml" (
    echo Ошибка: Файл docker-compose.yml не найден в E:\Вос\Git
    echo Сначала выполните перенос Docker контейнеров, запустив скрипт move-docker-data.bat
    echo.
    pause
    exit /b 1
)

REM Запускаем Docker контейнеры из нового расположения
echo Запускаем Docker контейнеры из нового расположения...
cd /d "E:\Вос\Git"
docker-compose up -d

if %ERRORLEVEL% neq 0 (
    echo.
    echo Ошибка при запуске Docker контейнеров!
    echo Убедитесь, что Docker Desktop запущен и работает корректно.
    echo.
) else (
    echo.
    echo Docker контейнеры успешно запущены из нового расположения!
    echo.
    echo Для доступа к pgAdmin откройте http://localhost:8080 в браузере
    echo Учетные данные для входа:
    echo   Email: admin@example.com
    echo   Пароль: admin
    echo.
)

pause