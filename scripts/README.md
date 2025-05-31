# Скрипты управления базой данных TrenerFront

Этот каталог содержит скрипты для автоматизации работы с базой данных PostgreSQL в Docker-контейнерах.

## Доступные скрипты

### 1. setup-database.sh

**Назначение:** Полная автоматическая настройка базы данных с нуля

**Что делает:**

- Останавливает существующие контейнеры
- Удаляет старые volumes
- Запускает PostgreSQL в Docker
- Ожидает готовности базы данных
- Устанавливает зависимости Node.js
- Генерирует Prisma клиент
- Применяет миграции
- Запускает PgAdmin
- Проверяет подключение

**Использование:**

```bash
chmod +x scripts/setup-database.sh
./scripts/setup-database.sh
```

### 2. backup-database.sh

**Назначение:** Создание резервной копии базы данных

**Что делает:**

- Создает SQL-дамп базы данных
- Сжимает резервную копию (gzip)
- Удаляет старые копии (старше 30 дней)
- Показывает список всех резервных копий

**Использование:**

```bash
chmod +x scripts/backup-database.sh
./scripts/backup-database.sh
```

**Результат:** Файл `backups/backup_YYYYMMDD_HHMMSS.sql.gz`

### 3. restore-database.sh

**Назначение:** Восстановление базы данных из резервной копии

**Что делает:**

- Создает резервную копию текущего состояния
- Удаляет текущую базу данных
- Восстанавливает данные из указанного файла
- Применяет миграции Prisma
- В случае ошибки восстанавливает предыдущее состояние

**Использование:**

```bash
chmod +x scripts/restore-database.sh
./scripts/restore-database.sh backups/backup_20250529_163000.sql.gz
```

## Требования

### Системные требования:

- Docker и Docker Compose
- Node.js и npm
- Bash shell
- gzip (для сжатия резервных копий)

### Файлы конфигурации:

- `.env` - переменные окружения для Docker Compose
- `docker-compose.yml` - конфигурация контейнеров
- `prisma/schema.prisma` - схема базы данных

## Структура файлов

```
TrenerFront/
├── .env                          # Переменные для Docker Compose
├── .env.development              # Переменные для разработки
├── .env.production               # Переменные для продакшена
├── docker-compose.yml            # Конфигурация Docker
├── scripts/
│   ├── setup-database.sh         # Настройка БД
│   ├── backup-database.sh        # Резервное копирование
│   ├── restore-database.sh       # Восстановление БД
│   └── README.md                 # Эта документация
├── backups/                      # Резервные копии
│   └── backup_*.sql.gz
└── prisma/
    ├── schema.prisma             # Схема БД
    └── migrations/               # Миграции
```

## Переменные окружения

### Основные переменные (.env):

```bash
POSTGRES_USER=trenerfront_user
POSTGRES_PASSWORD=<безопасный_пароль>
POSTGRES_DB=interview_prep
PGADMIN_EMAIL=admin@trenerfront.local
PGADMIN_PASSWORD=<безопасный_пароль>
```

### Переменные приложения (.env.development/.env.production):

```bash
DATABASE_URL=postgresql://user:password@localhost:5432/interview_prep
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<безопасный_секрет>
# ... другие переменные
```

## Безопасность

### Пароли:

- Все пароли генерируются с помощью `openssl rand -base64 32`
- Пароли хранятся только в .env файлах
- .env файлы должны быть добавлены в .gitignore

### Доступ:

- PostgreSQL доступен только на localhost:5432
- PgAdmin доступен на localhost:8080
- Контейнеры изолированы в отдельной сети

## Устранение неполадок

### Проблема: "Контейнер PostgreSQL не запущен"

**Решение:**

```bash
docker-compose up -d postgres
docker-compose logs postgres
```

### Проблема: "Не удалось подключиться к базе данных"

**Решение:**

```bash
# Проверить статус контейнера
docker-compose ps

# Проверить логи
docker-compose logs postgres

# Перезапустить контейнеры
docker-compose restart
```

### Проблема: "Ошибка миграции Prisma"

**Решение:**

```bash
# Сбросить миграции
npx prisma migrate reset

# Применить миграции заново
npx prisma migrate deploy

# Генерировать клиент
npx prisma generate
```

### Проблема: "Недостаточно прав доступа"

**Решение:**

```bash
# Сделать скрипты исполняемыми
chmod +x scripts/*.sh

# Добавить пользователя в группу docker
sudo usermod -aG docker $USER
# Перелогиниться или выполнить:
newgrp docker
```

## Мониторинг

### Проверка состояния:

```bash
# Статус контейнеров
docker-compose ps

# Логи в реальном времени
docker-compose logs -f

# Использование ресурсов
docker stats
```

### Проверка базы данных:

```bash
# Подключение к PostgreSQL
docker-compose exec postgres psql -U trenerfront_user -d interview_prep

# Список таблиц
\dt

# Выход
\q
```

## Автоматизация

### Cron для автоматического резервного копирования:

```bash
# Добавить в crontab (crontab -e):
0 2 * * * cd /path/to/TrenerFront && ./scripts/backup-database.sh >> /var/log/trenerfront-backup.log 2>&1
```

### Systemd сервис для автозапуска:

```bash
# Создать файл /etc/systemd/system/trenerfront.service
[Unit]
Description=TrenerFront Database
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/path/to/TrenerFront
ExecStart=/usr/bin/docker-compose up -d
ExecStop=/usr/bin/docker-compose down

[Install]
WantedBy=multi-user.target
```

## Контакты и поддержка

При возникновении проблем:

1. Проверьте логи: `docker-compose logs`
2. Убедитесь в корректности .env файлов
3. Проверьте доступность портов 5432 и 8080
4. Обратитесь к документации Prisma и PostgreSQL
