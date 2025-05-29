# Docker База Данных для TrenerFront

Этот проект использует Docker для запуска PostgreSQL базы данных и pgAdmin для управления базой данных.

## Требования

- Docker Desktop для Windows
- Node.js (для работы с Prisma)

## Быстрый старт

### Windows

1. Запустите скрипт управления Docker:
   ```cmd
   scripts\docker\docker-control.bat
   ```

2. Выберите опцию "1" для запуска контейнеров

3. Выберите опцию "6" для обновления базы данных

### Linux/Mac

1. Запустите скрипт управления Docker:
   ```bash
   bash scripts/docker/docker-control.sh
   ```

2. Выберите опцию "1" для запуска контейнеров

3. Выберите опцию "6" для обновления базы данных

## Сервисы

### PostgreSQL
- **Порт**: 5432
- **База данных**: interview_prep
- **Пользователь**: user
- **Пароль**: password

### pgAdmin
- **URL**: http://localhost:8080
- **Email**: admin@example.com
- **Пароль**: password

## Подключение к базе данных через pgAdmin

1. Откройте http://localhost:8080 в браузере
2. Войдите используя:
   - Email: `admin@example.com`
   - Пароль: `password`
3. Добавьте новый сервер:
   - **Name**: TrenerFront
   - **Host**: `postgres` (имя контейнера)
   - **Port**: `5432`
   - **Database**: `interview_prep`
   - **Username**: `user`
   - **Password**: `password`

## Команды Docker Compose

### Запуск всех сервисов
```bash
docker-compose up -d
```

### Остановка всех сервисов
```bash
docker-compose down
```

### Просмотр статуса
```bash
docker-compose ps
```

### Просмотр логов
```bash
# Логи PostgreSQL
docker-compose logs -f postgres

# Логи pgAdmin
docker-compose logs -f pgadmin
```

## Управление базой данных

### Применение миграций
```bash
npx prisma migrate deploy
```

### Генерация Prisma клиента
```bash
npx prisma generate
```

### Сброс базы данных
```bash
npx prisma migrate reset
```

### Просмотр базы данных
```bash
npx prisma studio
```

## Резервное копирование и восстановление

### Создание резервной копии
```bash
docker exec trenerfront_postgres pg_dump -U user interview_prep > backup.sql
```

### Восстановление из резервной копии
```bash
docker exec -i trenerfront_postgres psql -U user interview_prep < backup.sql
```

## Решение проблем

### Контейнер не запускается
1. Убедитесь, что Docker Desktop запущен
2. Проверьте, не заняты ли порты 5432 и 8080
3. Попробуйте перезапустить Docker Desktop

### Ошибки подключения к базе данных
1. Убедитесь, что контейнер PostgreSQL запущен: `docker-compose ps`
2. Проверьте логи: `docker-compose logs postgres`
3. Убедитесь, что переменные окружения в `.env` файле корректны

### pgAdmin не открывается
1. Убедитесь, что контейнер pgAdmin запущен: `docker-compose ps`
2. Проверьте логи: `docker-compose logs pgadmin`
3. Попробуйте открыть http://localhost:8080 в другом браузере

## Переменные окружения

Убедитесь, что в вашем `.env` файле указана правильная строка подключения к базе данных:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/interview_prep"
```

## Полезные команды

### Подключение к базе данных через командную строку
```bash
docker exec -it trenerfront_postgres psql -U user -d interview_prep
```

### Просмотр размера базы данных
```bash
docker exec trenerfront_postgres psql -U user -d interview_prep -c "SELECT pg_size_pretty(pg_database_size('interview_prep'));"
```

### Просмотр активных подключений
```bash
docker exec trenerfront_postgres psql -U user -d interview_prep -c "SELECT * FROM pg_stat_activity;"