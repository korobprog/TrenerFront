#!/bin/bash

# Скрипт для диагностики и исправления проблем запуска Next.js сервера
# Автор: Roo
# Дата: 30.05.2025

echo "🔧 Диагностика и исправление проблем Next.js сервера..."

# Функция для логирования
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Проверка запущенных процессов Next.js
check_processes() {
    log "Проверка запущенных процессов Next.js..."
    NEXT_PROCESSES=$(ps aux | grep -E "(next|npm.*dev)" | grep -v grep | wc -l)
    if [ $NEXT_PROCESSES -gt 0 ]; then
        log "⚠️  Найдены запущенные процессы Next.js: $NEXT_PROCESSES"
        return 1
    else
        log "✅ Процессы Next.js не запущены"
        return 0
    fi
}

# Остановка процессов Next.js
stop_processes() {
    log "Остановка всех процессов Next.js..."
    pkill -f "next" 2>/dev/null || true
    pkill -f "npm.*dev" 2>/dev/null || true
    sleep 2
    log "✅ Процессы остановлены"
}

# Очистка кеша
clear_cache() {
    log "Очистка кеша Next.js..."
    
    # Удаление .next
    if [ -d ".next" ]; then
        rm -rf .next
        log "✅ Удален .next"
    fi
    
    # Очистка кеша node_modules
    if [ -d "node_modules/.cache" ]; then
        rm -rf node_modules/.cache
        log "✅ Очищен кеш node_modules"
    fi
    
    log "✅ Кеш очищен"
}

# Проверка целостности зависимостей
check_dependencies() {
    log "Проверка целостности зависимостей..."
    
    if [ ! -d "node_modules" ]; then
        log "⚠️  Директория node_modules отсутствует"
        return 1
    fi
    
    if [ ! -f "package-lock.json" ]; then
        log "⚠️  Файл package-lock.json отсутствует"
        return 1
    fi
    
    # Проверка основных зависимостей
    if [ ! -d "node_modules/next" ]; then
        log "⚠️  Next.js не установлен"
        return 1
    fi
    
    if [ ! -d "node_modules/react" ]; then
        log "⚠️  React не установлен"
        return 1
    fi
    
    log "✅ Зависимости в порядке"
    return 0
}

# Переустановка зависимостей
reinstall_dependencies() {
    log "Переустановка зависимостей..."
    
    # Удаление старых зависимостей
    if [ -d "node_modules" ]; then
        rm -rf node_modules
        log "✅ Удален node_modules"
    fi
    
    if [ -f "package-lock.json" ]; then
        rm -f package-lock.json
        log "✅ Удален package-lock.json"
    fi
    
    # Установка зависимостей
    log "Установка зависимостей..."
    npm install
    
    if [ $? -eq 0 ]; then
        log "✅ Зависимости установлены успешно"
        return 0
    else
        log "❌ Ошибка установки зависимостей"
        return 1
    fi
}

# Проверка портов
check_ports() {
    log "Проверка доступности портов..."
    
    PORT_3000=$(netstat -tlnp 2>/dev/null | grep :3000 | wc -l)
    if [ $PORT_3000 -gt 0 ]; then
        log "⚠️  Порт 3000 занят"
        return 1
    else
        log "✅ Порт 3000 свободен"
        return 0
    fi
}

# Тестовый запуск сервера
test_server() {
    log "Тестовый запуск сервера..."
    
    # Запуск в фоне
    timeout 30 npm run dev &
    SERVER_PID=$!
    
    # Ожидание запуска
    sleep 15
    
    # Проверка доступности
    if curl -s http://localhost:3000 >/dev/null 2>&1; then
        log "✅ Сервер запустился успешно"
        kill $SERVER_PID 2>/dev/null || true
        return 0
    else
        log "❌ Сервер недоступен"
        kill $SERVER_PID 2>/dev/null || true
        return 1
    fi
}

# Создание резервных копий
create_backups() {
    log "Создание резервных копий..."
    
    BACKUP_DIR="backups/nextjs-$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$BACKUP_DIR"
    
    # Копирование важных файлов
    if [ -f "package.json" ]; then
        cp package.json "$BACKUP_DIR/"
    fi
    
    if [ -f "next.config.js" ]; then
        cp next.config.js "$BACKUP_DIR/"
    fi
    
    if [ -d "pages" ]; then
        cp -r pages "$BACKUP_DIR/"
    fi
    
    log "✅ Резервные копии созданы в $BACKUP_DIR"
}

# Основная функция
main() {
    log "🚀 Начало диагностики Next.js сервера"
    
    # Создание резервных копий
    create_backups
    
    # Остановка процессов
    if ! check_processes; then
        stop_processes
    fi
    
    # Очистка кеша
    clear_cache
    
    # Проверка портов
    check_ports
    
    # Проверка зависимостей
    if ! check_dependencies; then
        log "⚠️  Проблемы с зависимостями, переустановка..."
        if ! reinstall_dependencies; then
            log "❌ Не удалось переустановить зависимости"
            exit 1
        fi
    fi
    
    # Тестовый запуск
    if test_server; then
        log "🎉 Проблема решена! Сервер работает корректно"
        log "Теперь можно запустить: npm run dev"
    else
        log "❌ Проблема не решена. Требуется ручная диагностика"
        log "Проверьте логи: DEBUG=next:* npm run dev"
        exit 1
    fi
    
    log "✅ Диагностика завершена"
}

# Запуск основной функции
main "$@"