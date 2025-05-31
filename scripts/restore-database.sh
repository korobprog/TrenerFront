#!/bin/bash

# Скрипт восстановления базы данных TrenerFront
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

# Проверяем аргументы
if [ $# -eq 0 ]; then
    log_error "Использование: $0 <путь_к_файлу_резервной_копии>"
    echo ""
    echo "Примеры:"
    echo "  $0 backups/backup_20250529_163000.sql"
    echo "  $0 backups/backup_20250529_163000.sql.gz"
    echo ""
    echo "Доступные резервные копии:"
    ls -lah backups/backup_*.sql* 2>/dev/null || echo "  Резервные копии не найдены"
    exit 1
fi

BACKUP_FILE="$1"

# Проверяем существование файла
if [ ! -f "$BACKUP_FILE" ]; then
    log_error "Файл резервной копии не найден: $BACKUP_FILE"
    exit 1
fi

# Загружаем переменные окружения
if [ -f ".env" ]; then
    source .env
else
    log_error "Файл .env не найден"
    exit 1
fi

# Проверяем, что контейнер PostgreSQL запущен
if ! docker-compose ps postgres | grep -q "Up"; then
    log_error "Контейнер PostgreSQL не запущен. Запустите его командой: docker-compose up -d postgres"
    exit 1
fi

# Определяем, сжат ли файл
TEMP_FILE=""
if [[ "$BACKUP_FILE" == *.gz ]]; then
    log_info "Распаковываем сжатую резервную копию..."
    TEMP_FILE="/tmp/restore_$(date +%s).sql"
    gunzip -c "$BACKUP_FILE" > "$TEMP_FILE"
    RESTORE_FILE="$TEMP_FILE"
else
    RESTORE_FILE="$BACKUP_FILE"
fi

# Предупреждение о перезаписи данных
log_warning "⚠️  ВНИМАНИЕ: Эта операция полностью перезапишет текущую базу данных!"
log_warning "⚠️  Все текущие данные будут потеряны!"
echo ""
read -p "Вы уверены, что хотите продолжить? (yes/no): " -r
if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    log_info "Операция отменена пользователем"
    [ -n "$TEMP_FILE" ] && rm -f "$TEMP_FILE"
    exit 0
fi

log_info "Создаем резервную копию текущей базы данных..."
CURRENT_BACKUP="backups/backup_before_restore_$(date +%Y%m%d_%H%M%S).sql"
docker-compose exec -T postgres pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" > "$CURRENT_BACKUP"
log_success "Текущая база сохранена в: $CURRENT_BACKUP"

log_info "Останавливаем приложение..."
docker-compose stop app 2>/dev/null || true

log_info "Удаляем текущую базу данных..."
docker-compose exec -T postgres psql -U "$POSTGRES_USER" -c "DROP DATABASE IF EXISTS $POSTGRES_DB;"

log_info "Создаем новую базу данных..."
docker-compose exec -T postgres psql -U "$POSTGRES_USER" -c "CREATE DATABASE $POSTGRES_DB;"

log_info "Восстанавливаем данные из резервной копии..."
if docker-compose exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" < "$RESTORE_FILE"; then
    log_success "База данных успешно восстановлена!"
else
    log_error "Ошибка при восстановлении базы данных"
    log_info "Восстанавливаем предыдущую версию..."
    docker-compose exec -T postgres psql -U "$POSTGRES_USER" -c "DROP DATABASE IF EXISTS $POSTGRES_DB;"
    docker-compose exec -T postgres psql -U "$POSTGRES_USER" -c "CREATE DATABASE $POSTGRES_DB;"
    docker-compose exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" < "$CURRENT_BACKUP"
    log_info "Предыдущая версия восстановлена"
    [ -n "$TEMP_FILE" ] && rm -f "$TEMP_FILE"
    exit 1
fi

# Удаляем временный файл
[ -n "$TEMP_FILE" ] && rm -f "$TEMP_FILE"

log_info "Применяем миграции Prisma..."
npx prisma migrate deploy

log_info "Генерируем Prisma клиент..."
npx prisma generate

log_success "🎉 Восстановление базы данных завершено успешно!"
echo ""
echo "📋 Информация:"
echo "   Восстановлено из: $BACKUP_FILE"
echo "   Резервная копия предыдущего состояния: $CURRENT_BACKUP"
echo ""
echo "🔧 Следующие шаги:"
echo "   1. Проверьте данные в PgAdmin: http://localhost:8080"
echo "   2. Запустите приложение: npm run dev"
echo ""