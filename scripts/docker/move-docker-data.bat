@echo off
echo TrenerFront - Перенос данных Docker на другой диск
echo ===================================================
echo.

REM Проверяем, существует ли целевая директория
if not exist "E:\Вос\Git" (
    echo Директория E:\Вос\Git не существует!
    echo Создаем директорию...
    mkdir "E:\Вос\Git"
)

REM Останавливаем все контейнеры
echo Останавливаем все Docker контейнеры...
docker-compose down

REM Останавливаем Docker Desktop
echo Останавливаем Docker Desktop...
echo Пожалуйста, закройте Docker Desktop, если он запущен.
pause

REM Создаем директории для данных Docker на новом диске
echo Создаем директории для данных Docker на новом диске...
mkdir "E:\Вос\Git\docker-data"
mkdir "E:\Вос\Git\docker-data\postgres"
mkdir "E:\Вос\Git\docker-data\pgadmin"

REM Создаем файл docker-compose с новыми путями
echo Создаем новый файл docker-compose.yml с обновленными путями...
echo version: '3' > "E:\Вос\Git\docker-compose.yml"
echo services: >> "E:\Вос\Git\docker-compose.yml"
echo   postgres: >> "E:\Вос\Git\docker-compose.yml"
echo     image: postgres:14 >> "E:\Вос\Git\docker-compose.yml"
echo     container_name: trenerfront_postgres >> "E:\Вос\Git\docker-compose.yml"
echo     restart: unless-stopped >> "E:\Вос\Git\docker-compose.yml"
echo     environment: >> "E:\Вос\Git\docker-compose.yml"
echo       POSTGRES_USER: user >> "E:\Вос\Git\docker-compose.yml"
echo       POSTGRES_PASSWORD: password >> "E:\Вос\Git\docker-compose.yml"
echo       POSTGRES_DB: interview_prep >> "E:\Вос\Git\docker-compose.yml"
echo     ports: >> "E:\Вос\Git\docker-compose.yml"
echo       - '5432:5432' >> "E:\Вос\Git\docker-compose.yml"
echo     volumes: >> "E:\Вос\Git\docker-compose.yml"
echo       - ./docker-data/postgres:/var/lib/postgresql/data >> "E:\Вос\Git\docker-compose.yml"
echo     healthcheck: >> "E:\Вос\Git\docker-compose.yml"
echo       test: ['CMD-SHELL', 'pg_isready -U user -d interview_prep'] >> "E:\Вос\Git\docker-compose.yml"
echo       interval: 10s >> "E:\Вос\Git\docker-compose.yml"
echo       timeout: 5s >> "E:\Вос\Git\docker-compose.yml"
echo       retries: 5 >> "E:\Вос\Git\docker-compose.yml"
echo. >> "E:\Вос\Git\docker-compose.yml"
echo   pgadmin: >> "E:\Вос\Git\docker-compose.yml"
echo     image: dpage/pgadmin4 >> "E:\Вос\Git\docker-compose.yml"
echo     container_name: trenerfront_pgadmin >> "E:\Вос\Git\docker-compose.yml"
echo     restart: unless-stopped >> "E:\Вос\Git\docker-compose.yml"
echo     environment: >> "E:\Вос\Git\docker-compose.yml"
echo       PGADMIN_DEFAULT_EMAIL: admin@example.com >> "E:\Вос\Git\docker-compose.yml"
echo       PGADMIN_DEFAULT_PASSWORD: admin >> "E:\Вос\Git\docker-compose.yml"
echo       PGADMIN_LISTEN_PORT: 80 >> "E:\Вос\Git\docker-compose.yml"
echo     ports: >> "E:\Вос\Git\docker-compose.yml"
echo       - '8080:80' >> "E:\Вос\Git\docker-compose.yml"
echo     volumes: >> "E:\Вос\Git\docker-compose.yml"
echo       - ./docker-data/pgadmin:/var/lib/pgadmin >> "E:\Вос\Git\docker-compose.yml"
echo     depends_on: >> "E:\Вос\Git\docker-compose.yml"
echo       - postgres >> "E:\Вос\Git\docker-compose.yml"

REM Копируем скрипты управления Docker
echo Копируем скрипты управления Docker...
mkdir "E:\Вос\Git\scripts"
mkdir "E:\Вос\Git\scripts\docker"
copy "scripts\docker\docker-control.bat" "E:\Вос\Git\scripts\docker\"
copy "scripts\docker\update-db.bat" "E:\Вос\Git\scripts\docker\"

REM Создаем скрипт для запуска Docker из нового расположения
echo Создаем скрипт для запуска Docker из нового расположения...
echo @echo off > "E:\Вос\Git\start-docker.bat"
echo cd /d "E:\Вос\Git" >> "E:\Вос\Git\start-docker.bat"
echo docker-compose up -d >> "E:\Вос\Git\start-docker.bat"
echo echo Docker контейнеры запущены! >> "E:\Вос\Git\start-docker.bat"
echo pause >> "E:\Вос\Git\start-docker.bat"

echo.
echo Перенос завершен!
echo.
echo Для запуска Docker контейнеров из нового расположения:
echo 1. Запустите Docker Desktop
echo 2. Запустите файл E:\Вос\Git\start-docker.bat
echo.
pause