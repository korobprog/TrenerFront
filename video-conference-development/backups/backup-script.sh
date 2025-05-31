#!/bin/bash

# Скрипт для создания резервных копий системы видеоконференций
# Использование: ./backup-script.sh [stage-name|full|database|daily|weekly]

set -e

# Конфигурация
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_DIR="$PROJECT_ROOT/backups"
DATE=$(date +"%Y-%m-%d_%H-%M-%S")

# Загрузка переменных окружения
if [ -f "$PROJECT_ROOT/.env.development" ]; then
    set -a
    source "$PROJECT_ROOT/.env.development"
    set +a
fi

# Извлечение параметров БД из DATABASE_URL или использование переменных окружения
if [ -n "$DATABASE_URL" ]; then
    DB_NAME=$(echo $DATABASE_URL | sed 's/.*\/\([^?]*\).*/\1/')
    DB_USER=$(echo $DATABASE_URL | sed 's/.*:\/\/\([^:]*\):.*/\1/')
    DB_PASSWORD=$(echo $DATABASE_URL | sed 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/')
    DB_HOST=$(echo $DATABASE_URL | sed 's/.*@\([^:]*\):.*/\1/')
    DB_PORT=$(echo $DATABASE_URL | sed 's/.*:\([0-9]*\)\/.*/\1/')
else
    DB_NAME=${POSTGRES_DB:-interview_prep}
    DB_USER=${POSTGRES_USER:-trenerfront_user}
    DB_PASSWORD=${POSTGRES_PASSWORD}
    DB_HOST=${DB_HOST:-localhost}
    DB_PORT=${DB_PORT:-5432}
fi

# Создание директорий для резервных копий
mkdir -p "$BACKUP_DIR/full"
mkdir -p "$BACKUP_DIR/stages"
mkdir -p "$BACKUP_DIR/database"
mkdir -p "$BACKUP_DIR/incremental"
mkdir -p "$BACKUP_DIR/logs"

# Функция логирования
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$BACKUP_DIR/logs/backup.log"
}

# Функция создания резервной копии базы данных
backup_database() {
    local backup_file="$BACKUP_DIR/database/${DATE}_database.sql"
    log "Создание резервной копии базы данных..."
    
    # Проверяем, запущен ли Docker контейнер с PostgreSQL
    if docker ps | grep -q "trenerfront_postgres"; then
        log "Используется Docker контейнер PostgreSQL"
        docker exec trenerfront_postgres pg_dump -U "$DB_USER" "$DB_NAME" > "$backup_file"
        gzip "$backup_file"
        log "Резервная копия базы данных создана: ${backup_file}.gz"
    elif command -v pg_dump >/dev/null 2>&1; then
        log "Используется локальная установка PostgreSQL"
        # Установка переменной окружения для пароля
        export PGPASSWORD="$DB_PASSWORD"
        pg_dump -U "$DB_USER" -h "$DB_HOST" -p "$DB_PORT" "$DB_NAME" > "$backup_file"
        unset PGPASSWORD
        gzip "$backup_file"
        log "Резервная копия базы данных создана: ${backup_file}.gz"
    else
        log "ОШИБКА: PostgreSQL не найден (ни Docker, ни локальная установка)"
        exit 1
    fi
}

# Функция создания резервной копии файлов проекта
backup_files() {
    local backup_name="$1"
    local backup_file="$BACKUP_DIR/stages/${backup_name}_${DATE}.tar.gz"
    
    log "Создание резервной копии файлов проекта: $backup_name"
    
    # Создание временной директории для метаданных
    local temp_dir=$(mktemp -d)
    
    # Сохранение информации о коммите
    if [ -d "$PROJECT_ROOT/.git" ]; then
        git -C "$PROJECT_ROOT" rev-parse HEAD > "$temp_dir/git-commit.txt" 2>/dev/null || echo "no-git-commit" > "$temp_dir/git-commit.txt"
        git -C "$PROJECT_ROOT" status --porcelain > "$temp_dir/git-status.txt" 2>/dev/null || echo "no-git-status" > "$temp_dir/git-status.txt"
    else
        echo "no-git-repo" > "$temp_dir/git-commit.txt"
        echo "no-git-repo" > "$temp_dir/git-status.txt"
    fi
    
    # Создание метаданных резервной копии
    cat > "$temp_dir/backup-info.json" << EOF
{
    "backup_name": "$backup_name",
    "date": "$DATE",
    "type": "stage",
    "project_root": "$PROJECT_ROOT",
    "node_version": "$(node --version 2>/dev/null || echo 'unknown')",
    "npm_version": "$(npm --version 2>/dev/null || echo 'unknown')"
}
EOF
    
    # Создание архива
    tar -czf "$backup_file" \
        -C "$PROJECT_ROOT" \
        --exclude="node_modules" \
        --exclude=".next" \
        --exclude="backups" \
        --exclude=".git" \
        --exclude="*.log" \
        . \
        -C "$temp_dir" \
        backup-info.json git-commit.txt git-status.txt
    
    # Очистка временной директории
    rm -rf "$temp_dir"
    
    log "Резервная копия файлов создана: $backup_file"
}

# Функция создания полной резервной копии
backup_full() {
    local backup_file="$BACKUP_DIR/full/${DATE}_full_backup.tar.gz"
    
    log "Создание полной резервной копии системы..."
    
    # Создание резервной копии базы данных
    backup_database
    
    # Создание временной директории
    local temp_dir=$(mktemp -d)
    
    # Копирование последней резервной копии БД
    local latest_db_backup=$(ls -t "$BACKUP_DIR/database"/*.sql.gz | head -n1)
    if [ -n "$latest_db_backup" ]; then
        cp "$latest_db_backup" "$temp_dir/database.sql.gz"
    fi
    
    # Создание метаданных
    cat > "$temp_dir/full-backup-info.json" << EOF
{
    "backup_type": "full",
    "date": "$DATE",
    "includes": ["database", "files", "config"],
    "database_backup": "$(basename "$latest_db_backup")",
    "project_root": "$PROJECT_ROOT"
}
EOF
    
    # Создание полного архива
    tar -czf "$backup_file" \
        -C "$PROJECT_ROOT" \
        --exclude="node_modules" \
        --exclude=".next" \
        --exclude="backups" \
        --exclude=".git" \
        --exclude="*.log" \
        . \
        -C "$temp_dir" \
        database.sql.gz full-backup-info.json
    
    # Очистка
    rm -rf "$temp_dir"
    
    log "Полная резервная копия создана: $backup_file"
}

# Функция создания инкрементальной резервной копии
backup_incremental() {
    local backup_file="$BACKUP_DIR/incremental/${DATE}_incremental.tar.gz"
    
    log "Создание инкрементальной резервной копии..."
    
    # Поиск файлов, измененных за последние 24 часа
    find "$PROJECT_ROOT" -type f -mtime -1 \
        ! -path "*/node_modules/*" \
        ! -path "*/.next/*" \
        ! -path "*/backups/*" \
        ! -path "*/.git/*" \
        ! -name "*.log" \
        -print0 | tar -czf "$backup_file" --null -T -
    
    log "Инкрементальная резервная копия создана: $backup_file"
}

# Функция очистки старых резервных копий
cleanup_old_backups() {
    log "Очистка старых резервных копий..."
    
    # Удаление ежедневных копий старше 30 дней
    find "$BACKUP_DIR/incremental" -name "*.tar.gz" -mtime +30 -delete
    
    # Удаление резервных копий БД старше 60 дней
    find "$BACKUP_DIR/database" -name "*.sql.gz" -mtime +60 -delete
    
    # Удаление полных копий старше 180 дней
    find "$BACKUP_DIR/full" -name "*.tar.gz" -mtime +180 -delete
    
    log "Очистка завершена"
}

# Основная логика
case "${1:-daily}" in
    "stage-"*)
        backup_database
        backup_files "$1"
        ;;
    "full")
        backup_full
        cleanup_old_backups
        ;;
    "database")
        backup_database
        ;;
    "daily")
        backup_incremental
        backup_database
        ;;
    "weekly")
        backup_full
        cleanup_old_backups
        ;;
    *)
        echo "Использование: $0 [stage-name|full|database|daily|weekly]"
        echo "Примеры:"
        echo "  $0 stage-01-infrastructure"
        echo "  $0 full"
        echo "  $0 database"
        echo "  $0 daily"
        echo "  $0 weekly"
        exit 1
        ;;
esac

log "Резервное копирование завершено успешно"