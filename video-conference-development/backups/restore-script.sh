#!/bin/bash

# Скрипт для восстановления из резервных копий системы видеоконференций
# Использование: ./restore-script.sh [backup-type] [backup-name-or-date]

set -e

# Конфигурация
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_DIR="$PROJECT_ROOT/backups"

# Загрузка переменных окружения
if [ -f "$PROJECT_ROOT/.env.development" ]; then
    export $(grep -v '^#' "$PROJECT_ROOT/.env.development" | xargs)
fi

# Извлечение параметров БД из DATABASE_URL
DB_NAME=$(echo $DATABASE_URL | sed 's/.*\/\([^?]*\).*/\1/')
DB_USER=$(echo $DATABASE_URL | sed 's/.*:\/\/\([^:]*\):.*/\1/')
DB_PASSWORD=$(echo $DATABASE_URL | sed 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/')
DB_HOST=$(echo $DATABASE_URL | sed 's/.*@\([^:]*\):.*/\1/')
DB_PORT=$(echo $DATABASE_URL | sed 's/.*:\([0-9]*\)\/.*/\1/')

# Функция логирования
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$BACKUP_DIR/logs/restore.log"
}

# Функция подтверждения действия
confirm() {
    read -p "$1 (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log "Операция отменена пользователем"
        exit 1
    fi
}

# Функция восстановления базы данных
restore_database() {
    local backup_file="$1"
    
    if [ ! -f "$backup_file" ]; then
        log "ОШИБКА: Файл резервной копии БД не найден: $backup_file"
        exit 1
    fi
    
    log "Восстановление базы данных из: $backup_file"
    
    # Подтверждение
    confirm "ВНИМАНИЕ: Это действие перезапишет текущую базу данных. Продолжить?"
    
    # Создание резервной копии текущей БД перед восстановлением
    local current_backup="$BACKUP_DIR/database/pre-restore-$(date +%Y-%m-%d_%H-%M-%S).sql"
    log "Создание резервной копии текущей БД..."
    
    # Проверяем, запущен ли Docker контейнер с PostgreSQL
    if docker ps | grep -q "trenerfront_postgres"; then
        log "Используется Docker контейнер PostgreSQL"
        docker exec trenerfront_postgres pg_dump -U "$DB_USER" "$DB_NAME" > "$current_backup"
        gzip "$current_backup"
        
        # Восстановление из резервной копии
        if [[ "$backup_file" == *.gz ]]; then
            gunzip -c "$backup_file" | docker exec -i trenerfront_postgres psql -U "$DB_USER" -d "$DB_NAME"
        else
            docker exec -i trenerfront_postgres psql -U "$DB_USER" -d "$DB_NAME" < "$backup_file"
        fi
    else
        log "Используется локальная установка PostgreSQL"
        export PGPASSWORD="$DB_PASSWORD"
        pg_dump -U "$DB_USER" -h "$DB_HOST" -p "$DB_PORT" "$DB_NAME" > "$current_backup"
        gzip "$current_backup"
        
        # Восстановление из резервной копии
        if [[ "$backup_file" == *.gz ]]; then
            gunzip -c "$backup_file" | psql -U "$DB_USER" -h "$DB_HOST" -p "$DB_PORT" -d "$DB_NAME"
        else
            psql -U "$DB_USER" -h "$DB_HOST" -p "$DB_PORT" -d "$DB_NAME" < "$backup_file"
        fi
        unset PGPASSWORD
    fi
    
    log "База данных восстановлена успешно"
}

# Функция восстановления файлов проекта
restore_files() {
    local backup_file="$1"
    local restore_path="${2:-$PROJECT_ROOT}"
    
    if [ ! -f "$backup_file" ]; then
        log "ОШИБКА: Файл резервной копии не найден: $backup_file"
        exit 1
    fi
    
    log "Восстановление файлов из: $backup_file"
    log "Путь восстановления: $restore_path"
    
    # Подтверждение
    confirm "ВНИМАНИЕ: Это действие перезапишет файлы проекта. Продолжить?"
    
    # Создание резервной копии текущих файлов
    local current_backup="$BACKUP_DIR/stages/pre-restore-$(date +%Y-%m-%d_%H-%M-%S).tar.gz"
    log "Создание резервной копии текущих файлов..."
    tar -czf "$current_backup" \
        -C "$PROJECT_ROOT" \
        --exclude="node_modules" \
        --exclude=".next" \
        --exclude="backups" \
        --exclude=".git" \
        --exclude="*.log" \
        .
    
    # Восстановление файлов
    tar -xzf "$backup_file" -C "$restore_path"
    
    log "Файлы восстановлены успешно"
    
    # Восстановление зависимостей
    if [ -f "$restore_path/package.json" ]; then
        log "Установка зависимостей..."
        cd "$restore_path"
        npm install
        log "Зависимости установлены"
    fi
}

# Функция восстановления из полной резервной копии
restore_full() {
    local backup_file="$1"
    
    if [ ! -f "$backup_file" ]; then
        log "ОШИБКА: Файл полной резервной копии не найден: $backup_file"
        exit 1
    fi
    
    log "Восстановление из полной резервной копии: $backup_file"
    
    # Подтверждение
    confirm "ВНИМАНИЕ: Это действие полностью восстановит систему. Продолжить?"
    
    # Создание временной директории
    local temp_dir=$(mktemp -d)
    
    # Извлечение архива
    tar -xzf "$backup_file" -C "$temp_dir"
    
    # Восстановление базы данных
    if [ -f "$temp_dir/database.sql.gz" ]; then
        restore_database "$temp_dir/database.sql.gz"
    fi
    
    # Восстановление файлов (исключая БД)
    rsync -av --exclude="database.sql.gz" --exclude="*backup-info.json" "$temp_dir/" "$PROJECT_ROOT/"
    
    # Очистка
    rm -rf "$temp_dir"
    
    log "Полное восстановление завершено"
    
    # Перезапуск сервисов
    if command -v pm2 >/dev/null 2>&1; then
        log "Перезапуск сервисов..."
        cd "$PROJECT_ROOT"
        pm2 restart all || true
    fi
}

# Функция восстановления этапа разработки
restore_stage() {
    local stage_name="$1"
    local backup_date="$2"
    
    # Поиск файла резервной копии
    local backup_file
    if [ -n "$backup_date" ]; then
        backup_file="$BACKUP_DIR/stages/${stage_name}_${backup_date}.tar.gz"
    else
        # Поиск последней резервной копии этапа
        backup_file=$(ls -t "$BACKUP_DIR/stages/${stage_name}_"*.tar.gz 2>/dev/null | head -n1)
    fi
    
    if [ -z "$backup_file" ] || [ ! -f "$backup_file" ]; then
        log "ОШИБКА: Резервная копия этапа не найдена: $stage_name"
        log "Доступные резервные копии этапов:"
        ls -la "$BACKUP_DIR/stages/" | grep "$stage_name" || echo "Нет резервных копий для этапа $stage_name"
        exit 1
    fi
    
    log "Восстановление этапа: $stage_name"
    log "Файл резервной копии: $backup_file"
    
    # Восстановление файлов этапа
    restore_files "$backup_file"
    
    # Поиск и восстановление соответствующей резервной копии БД
    local db_backup_date=$(basename "$backup_file" | sed "s/${stage_name}_\(.*\)\.tar\.gz/\1/")
    local db_backup_file=$(ls -t "$BACKUP_DIR/database/"*"${db_backup_date}"*.sql.gz 2>/dev/null | head -n1)
    
    if [ -n "$db_backup_file" ] && [ -f "$db_backup_file" ]; then
        log "Найдена соответствующая резервная копия БД: $db_backup_file"
        confirm "Восстановить также базу данных?"
        restore_database "$db_backup_file"
    fi
}

# Функция отображения доступных резервных копий
list_backups() {
    echo "=== Доступные резервные копии ==="
    echo
    echo "Полные резервные копии:"
    ls -la "$BACKUP_DIR/full/" 2>/dev/null || echo "Нет полных резервных копий"
    echo
    echo "Резервные копии этапов:"
    ls -la "$BACKUP_DIR/stages/" 2>/dev/null || echo "Нет резервных копий этапов"
    echo
    echo "Резервные копии базы данных:"
    ls -la "$BACKUP_DIR/database/" 2>/dev/null || echo "Нет резервных копий БД"
}

# Функция проверки целостности резервной копии
verify_backup() {
    local backup_file="$1"
    
    if [ ! -f "$backup_file" ]; then
        log "ОШИБКА: Файл не найден: $backup_file"
        return 1
    fi
    
    log "Проверка целостности: $backup_file"
    
    # Проверка архива
    if tar -tzf "$backup_file" >/dev/null 2>&1; then
        log "Архив корректен"
        return 0
    else
        log "ОШИБКА: Архив поврежден"
        return 1
    fi
}

# Основная логика
case "${1:-help}" in
    "full")
        if [ -n "$2" ]; then
            backup_file="$BACKUP_DIR/full/${2}_full_backup.tar.gz"
        else
            backup_file=$(ls -t "$BACKUP_DIR/full/"*.tar.gz 2>/dev/null | head -n1)
        fi
        restore_full "$backup_file"
        ;;
    "database")
        if [ -n "$2" ]; then
            backup_file="$BACKUP_DIR/database/${2}_database.sql.gz"
        else
            backup_file=$(ls -t "$BACKUP_DIR/database/"*.sql.gz 2>/dev/null | head -n1)
        fi
        restore_database "$backup_file"
        ;;
    "stage-"*)
        restore_stage "$1" "$2"
        ;;
    "files")
        if [ -n "$2" ]; then
            backup_file="$BACKUP_DIR/stages/$2"
        else
            backup_file=$(ls -t "$BACKUP_DIR/stages/"*.tar.gz 2>/dev/null | head -n1)
        fi
        restore_files "$backup_file"
        ;;
    "list")
        list_backups
        ;;
    "verify")
        if [ -n "$2" ]; then
            verify_backup "$2"
        else
            echo "Укажите файл для проверки"
            exit 1
        fi
        ;;
    "help"|*)
        echo "Использование: $0 [команда] [параметры]"
        echo
        echo "Команды:"
        echo "  full [дата]              - Восстановление из полной резервной копии"
        echo "  database [дата]          - Восстановление только базы данных"
        echo "  stage-XX [дата]          - Восстановление конкретного этапа"
        echo "  files [файл]             - Восстановление только файлов"
        echo "  list                     - Показать доступные резервные копии"
        echo "  verify [файл]            - Проверить целостность резервной копии"
        echo
        echo "Примеры:"
        echo "  $0 full 2025-05-29_14-30-00"
        echo "  $0 database"
        echo "  $0 stage-01-infrastructure"
        echo "  $0 stage-02-webrtc-video 2025-05-30_10-15-00"
        echo "  $0 list"
        exit 1
        ;;
esac

log "Восстановление завершено успешно"