#!/bin/bash

# Скрипт резервного копирования базы данных TrenerFront (для standalone Docker)
# Автор: Система автоматизации
# Дата: $(date)

set -e

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Функция для вывода сообщений
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Загружаем переменные окружения
if [ -f ".env" ]; then
    source .env
else
    log_error "Файл .env не найден"
    exit 1
fi

# Проверяем, что контейнер PostgreSQL запущен
CONTAINER_NAME="trenerfront_postgres"
if ! sudo docker ps | grep -q "$CONTAINER_NAME"; then
    log_error "Контейнер PostgreSQL ($CONTAINER_NAME) не запущен."
    exit 1
fi

# Создаем директорию для резервных копий
mkdir -p backups

# Генерируем имя файла с текущей датой и временем
BACKUP_DATE=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="backups/backup_${BACKUP_DATE}.sql"

log_info "Создаем резервную копию базы данных..."
log_info "Файл: $BACKUP_FILE"

# Создаем резервную копию
if sudo docker exec "$CONTAINER_NAME" pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" > "$BACKUP_FILE"; then
    log_success "Резервная копия создана успешно: $BACKUP_FILE"
    
    # Показываем размер файла
    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    log_info "Размер резервной копии: $BACKUP_SIZE"
    
    # Сжимаем резервную копию
    log_info "Сжимаем резервную копию..."
    gzip "$BACKUP_FILE"
    COMPRESSED_FILE="${BACKUP_FILE}.gz"
    COMPRESSED_SIZE=$(du -h "$COMPRESSED_FILE" | cut -f1)
    log_success "Сжатая резервная копия: $COMPRESSED_FILE (размер: $COMPRESSED_SIZE)"
    
else
    log_error "Ошибка при создании резервной копии"
    exit 1
fi

# Удаляем старые резервные копии (старше 30 дней)
log_info "Удаляем старые резервные копии (старше 30 дней)..."
find backups/ -name "backup_*.sql.gz" -mtime +30 -delete 2>/dev/null || true

# Показываем список всех резервных копий
log_info "Список всех резервных копий:"
ls -lah backups/backup_*.sql.gz 2>/dev/null || log_warning "Резервные копии не найдены"

echo ""
log_success "🎉 Резервное копирование завершено успешно!"
echo ""
echo "📋 Информация:"
echo "   Файл резервной копии: $COMPRESSED_FILE"
echo "   Размер: $COMPRESSED_SIZE"
echo ""
echo "🔧 Восстановление из резервной копии:"
echo "   1. Распакуйте: gunzip $COMPRESSED_FILE"
echo "   2. Восстановите: sudo docker exec -i $CONTAINER_NAME psql -U $POSTGRES_USER -d $POSTGRES_DB < ${BACKUP_FILE}"
echo ""