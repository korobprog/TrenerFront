#!/bin/bash

# Скрипт автоматической настройки базы данных TrenerFront
# Автор: Система автоматизации
# Дата: $(date)

set -e

echo "🚀 Начинаем настройку базы данных TrenerFront..."

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

# Проверка наличия Docker
if ! command -v docker &> /dev/null; then
    log_error "Docker не установлен. Пожалуйста, установите Docker сначала."
    exit 1
fi

# Проверка наличия docker-compose
if ! command -v docker-compose &> /dev/null; then
    log_error "Docker Compose не установлен. Пожалуйста, установите Docker Compose сначала."
    exit 1
fi

# Проверка наличия .env файла
if [ ! -f ".env" ]; then
    log_error "Файл .env не найден. Создайте его сначала."
    exit 1
fi

# Проверка наличия Node.js и npm
if ! command -v node &> /dev/null; then
    log_error "Node.js не установлен. Пожалуйста, установите Node.js сначала."
    exit 1
fi

if ! command -v npm &> /dev/null; then
    log_error "npm не установлен. Пожалуйста, установите npm сначала."
    exit 1
fi

log_info "Останавливаем существующие контейнеры..."
docker-compose down || true

log_info "Удаляем старые volumes (если есть)..."
docker volume rm trenerfront_postgres_data 2>/dev/null || true
docker volume rm trenerfront_pgadmin_data 2>/dev/null || true

log_info "Создаем директорию для резервных копий..."
mkdir -p backups

log_info "Запускаем PostgreSQL контейнер..."
docker-compose up -d postgres

log_info "Ожидаем готовности PostgreSQL..."
sleep 10

# Проверяем готовность PostgreSQL
max_attempts=30
attempt=1
while [ $attempt -le $max_attempts ]; do
    if docker-compose exec -T postgres pg_isready -U trenerfront_user -d interview_prep &> /dev/null; then
        log_success "PostgreSQL готов к работе!"
        break
    fi
    
    if [ $attempt -eq $max_attempts ]; then
        log_error "PostgreSQL не готов после $max_attempts попыток"
        exit 1
    fi
    
    log_info "Попытка $attempt/$max_attempts: ожидаем готовности PostgreSQL..."
    sleep 2
    ((attempt++))
done

log_info "Устанавливаем зависимости Node.js..."
npm install

log_info "Генерируем Prisma клиент..."
npx prisma generate

log_info "Применяем миграции Prisma..."
npx prisma migrate deploy

log_info "Проверяем подключение к базе данных..."
if npx prisma db pull &> /dev/null; then
    log_success "Подключение к базе данных успешно!"
else
    log_error "Не удалось подключиться к базе данных"
    exit 1
fi

log_info "Запускаем PgAdmin..."
docker-compose up -d pgadmin

log_success "🎉 Настройка базы данных завершена успешно!"
echo ""
echo "📋 Информация о доступе:"
echo "   PostgreSQL: localhost:5432"
echo "   Пользователь: trenerfront_user"
echo "   База данных: interview_prep"
echo "   PgAdmin: http://localhost:8080"
echo "   Email PgAdmin: admin@trenerfront.local"
echo ""
echo "🔧 Полезные команды:"
echo "   Просмотр логов: docker-compose logs -f"
echo "   Остановка: docker-compose down"
echo "   Перезапуск: docker-compose restart"
echo "   Резервная копия: ./scripts/backup-database.sh"
echo ""
log_warning "Пароли находятся в .env файле. Храните их в безопасности!"