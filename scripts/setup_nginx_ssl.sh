#!/bin/bash

# Скрипт для автоматической настройки NGINX с SSL-сертификатами для supermock.ru
# Автор: Roo
# Дата: 17.05.2025

# Цвета для вывода
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Функция для вывода сообщений с временной меткой
log() {
    local level=$1
    local message=$2
    local timestamp=$(date +"%Y-%m-%d %H:%M:%S")
    
    case $level in
        "INFO")
            echo -e "${GREEN}[INFO]${NC} $timestamp - $message"
            ;;
        "WARN")
            echo -e "${YELLOW}[WARN]${NC} $timestamp - $message"
            ;;
        "ERROR")
            echo -e "${RED}[ERROR]${NC} $timestamp - $message"
            ;;
        "STEP")
            echo -e "\n${BLUE}[STEP]${NC} $message"
            ;;
        *)
            echo -e "$timestamp - $message"
            ;;
    esac
}

# Функция для проверки успешности выполнения команды
check_result() {
    if [ $? -ne 0 ]; then
        log "ERROR" "$1"
        exit 1
    else
        log "INFO" "$2"
    fi
}

# Проверка прав суперпользователя
if [ "$EUID" -ne 0 ]; then
    log "ERROR" "Этот скрипт должен быть запущен с правами суперпользователя (sudo)."
    exit 1
fi

log "STEP" "=== Начало автоматической настройки NGINX с SSL-сертификатами для supermock.ru ==="

# Шаг 1: Создание резервных копий текущих конфигураций
log "STEP" "Шаг 1: Создание резервных копий текущих конфигураций"

timestamp=$(date +"%Y%m%d%H%M%S")
backup_dir="/etc/nginx/backups/$timestamp"

log "INFO" "Создание директории для резервных копий: $backup_dir"
mkdir -p $backup_dir
check_result "Не удалось создать директорию для резервных копий." "Директория для резервных копий создана успешно."

# Копирование конфигураций NGINX
log "INFO" "Копирование конфигураций NGINX..."
cp -r /etc/nginx/sites-available/ $backup_dir/
check_result "Не удалось скопировать конфигурации из /etc/nginx/sites-available/." "Конфигурации из /etc/nginx/sites-available/ скопированы успешно."

cp -r /etc/nginx/sites-enabled/ $backup_dir/
check_result "Не удалось скопировать конфигурации из /etc/nginx/sites-enabled/." "Конфигурации из /etc/nginx/sites-enabled/ скопированы успешно."

cp /etc/nginx/nginx.conf $backup_dir/
check_result "Не удалось скопировать файл /etc/nginx/nginx.conf." "Файл /etc/nginx/nginx.conf скопирован успешно."

log "INFO" "Резервные копии созданы в директории: $backup_dir"

# Шаг 2: Проверка наличия сертификатов и их копирование при необходимости
log "STEP" "Шаг 2: Проверка наличия сертификатов"

# Проверка наличия директории для сертификатов
if [ ! -d "/etc/nginx/sites-available" ]; then
    log "INFO" "Создание директории /etc/nginx/sites-available..."
    mkdir -p /etc/nginx/sites-available
    check_result "Не удалось создать директорию /etc/nginx/sites-available." "Директория /etc/nginx/sites-available создана успешно."
fi

# Проверка наличия файлов сертификатов
if [ ! -f "/etc/nginx/sites-available/fullchain.pem" ] || [ ! -f "/etc/nginx/sites-available/privkey.pem" ]; then
    log "WARN" "Файлы сертификатов не найдены в директории /etc/nginx/sites-available/"
    
    # Проверка наличия сертификатов в стандартной директории Let's Encrypt
    if [ -f "/etc/letsencrypt/live/supermock.ru/fullchain.pem" ] && [ -f "/etc/letsencrypt/live/supermock.ru/privkey.pem" ]; then
        log "INFO" "Найдены сертификаты в стандартной директории Let's Encrypt."
        log "INFO" "Копирование сертификатов в директорию /etc/nginx/sites-available/..."
        
        cp /etc/letsencrypt/live/supermock.ru/fullchain.pem /etc/nginx/sites-available/fullchain.pem
        check_result "Не удалось скопировать файл fullchain.pem." "Файл fullchain.pem скопирован успешно."
        
        cp /etc/letsencrypt/live/supermock.ru/privkey.pem /etc/nginx/sites-available/privkey.pem
        check_result "Не удалось скопировать файл privkey.pem." "Файл privkey.pem скопирован успешно."
    else
        log "ERROR" "Сертификаты не найдены ни в стандартной директории Let's Encrypt, ни в /etc/nginx/sites-available/."
        log "ERROR" "Пожалуйста, укажите правильный путь к сертификатам или получите новые сертификаты с помощью certbot."
        exit 1
    fi
else
    log "INFO" "Файлы сертификатов найдены в директории /etc/nginx/sites-available/"
fi

# Шаг 3: Создание нового конфигурационного файла с обновленными путями к сертификатам
log "STEP" "Шаг 3: Создание нового конфигурационного файла с обновленными путями к сертификатам"

log "INFO" "Создание конфигурационного файла /etc/nginx/sites-available/supermock.ru..."
cat > /etc/nginx/sites-available/supermock.ru << 'EOL'
# HTTP сервер (перенаправление на HTTPS)
server {
    listen 80;
    server_name supermock.ru;
    
    # Логирование для отладки
    access_log /var/log/nginx/supermock-http-access.log;
    error_log /var/log/nginx/supermock-http-error.log debug;
    
    # Перенаправление на HTTPS
    location / {
        return 301 https://$host$request_uri;
    }
    
    # Для Let's Encrypt
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }
}

# HTTPS сервер
server {
    listen 443 ssl;
    server_name supermock.ru;
    
    # Логирование для отладки
    access_log /var/log/nginx/supermock-https-access.log;
    error_log /var/log/nginx/supermock-https-error.log debug;
    
    # SSL настройки с обновленными путями к сертификатам
    ssl_certificate /etc/nginx/sites-available/fullchain.pem;
    ssl_certificate_key /etc/nginx/sites-available/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # Настройки безопасности
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options nosniff;
    add_header X-Frame-Options SAMEORIGIN;
    add_header X-XSS-Protection "1; mode=block";
    
    # Маршрутизация всех запросов на Next.js
    location / {
        # Добавляем заголовки для отладки
        add_header X-Debug-Path "nextjs-path" always;
        add_header X-Original-URI $request_uri always;
        
        # Прокси к Next.js
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Настройки для WebSocket
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 86400;
        proxy_cache_bypass $http_upgrade;
    }
}
EOL
check_result "Не удалось создать конфигурационный файл." "Конфигурационный файл создан успешно."

# Создание директории для Let's Encrypt, если она не существует
if [ ! -d "/var/www/html/.well-known/acme-challenge" ]; then
    log "INFO" "Создание директории для Let's Encrypt..."
    mkdir -p /var/www/html/.well-known/acme-challenge
    chmod -R 755 /var/www/html
    check_result "Не удалось создать директорию для Let's Encrypt." "Директория для Let's Encrypt создана успешно."
fi

# Шаг 4: Настройка правильных прав доступа к сертификатам
log "STEP" "Шаг 4: Настройка правильных прав доступа к сертификатам"

log "INFO" "Установка владельца файлов сертификатов..."
chown root:root /etc/nginx/sites-available/fullchain.pem
check_result "Не удалось установить владельца для файла fullchain.pem." "Владелец для файла fullchain.pem установлен успешно."

chown root:root /etc/nginx/sites-available/privkey.pem
check_result "Не удалось установить владельца для файла privkey.pem." "Владелец для файла privkey.pem установлен успешно."

log "INFO" "Установка прав доступа к файлам сертификатов..."
chmod 644 /etc/nginx/sites-available/fullchain.pem
check_result "Не удалось установить права доступа для файла fullchain.pem." "Права доступа для файла fullchain.pem установлены успешно."

chmod 600 /etc/nginx/sites-available/privkey.pem
check_result "Не удалось установить права доступа для файла privkey.pem." "Права доступа для файла privkey.pem установлены успешно."

# Проверка, запущен ли NGINX от имени www-data
nginx_user=$(ps -ef | grep "nginx: master process" | grep -v grep | awk '{print $1}')
if [ "$nginx_user" == "www-data" ]; then
    log "INFO" "NGINX запущен от имени пользователя www-data. Добавление www-data в группу с доступом к сертификатам..."
    chown root:www-data /etc/nginx/sites-available/fullchain.pem
    check_result "Не удалось изменить группу для файла fullchain.pem." "Группа для файла fullchain.pem изменена успешно."
    
    chown root:www-data /etc/nginx/sites-available/privkey.pem
    check_result "Не удалось изменить группу для файла privkey.pem." "Группа для файла privkey.pem изменена успешно."
fi

# Шаг 5: Создание символической ссылки в sites-enabled
log "STEP" "Шаг 5: Создание символической ссылки в sites-enabled"

# Проверка наличия директории sites-enabled
if [ ! -d "/etc/nginx/sites-enabled" ]; then
    log "INFO" "Создание директории /etc/nginx/sites-enabled..."
    mkdir -p /etc/nginx/sites-enabled
    check_result "Не удалось создать директорию /etc/nginx/sites-enabled." "Директория /etc/nginx/sites-enabled создана успешно."
fi

# Удаление существующей символической ссылки, если она существует
if [ -L "/etc/nginx/sites-enabled/supermock.ru" ]; then
    log "INFO" "Удаление существующей символической ссылки..."
    rm -f /etc/nginx/sites-enabled/supermock.ru
    check_result "Не удалось удалить существующую символическую ссылку." "Существующая символическая ссылка удалена успешно."
fi

# Создание новой символической ссылки
log "INFO" "Создание символической ссылки..."
ln -sf /etc/nginx/sites-available/supermock.ru /etc/nginx/sites-enabled/
check_result "Не удалось создать символическую ссылку." "Символическая ссылка создана успешно."

# Удаление символической ссылки на default, если она существует
if [ -L "/etc/nginx/sites-enabled/default" ]; then
    log "INFO" "Удаление символической ссылки на default..."
    rm -f /etc/nginx/sites-enabled/default
    check_result "Не удалось удалить символическую ссылку на default." "Символическая ссылка на default удалена успешно."
fi

# Шаг 6: Проверка конфигурации NGINX
log "STEP" "Шаг 6: Проверка конфигурации NGINX"

log "INFO" "Проверка синтаксиса конфигурации NGINX..."
nginx_test=$(nginx -t 2>&1)
if [ $? -ne 0 ]; then
    log "ERROR" "Конфигурация NGINX содержит ошибки:"
    echo "$nginx_test"
    
    log "INFO" "Восстановление предыдущей конфигурации из резервной копии..."
    cp $backup_dir/sites-available/supermock.ru /etc/nginx/sites-available/supermock.ru 2>/dev/null
    
    log "ERROR" "Настройка NGINX не удалась. Пожалуйста, исправьте ошибки и попробуйте снова."
    exit 1
else
    log "INFO" "Конфигурация NGINX проверена успешно."
fi

# Шаг 7: Перезапуск NGINX
log "STEP" "Шаг 7: Перезапуск NGINX"

log "INFO" "Перезапуск службы NGINX..."
systemctl restart nginx
if [ $? -ne 0 ]; then
    log "ERROR" "Не удалось перезапустить NGINX."
    log "ERROR" "Проверьте статус службы: systemctl status nginx"
    exit 1
else
    log "INFO" "NGINX успешно перезапущен."
fi

# Шаг 8: Проверка доступности сайта
log "STEP" "Шаг 8: Проверка доступности сайта"

log "INFO" "Ожидание запуска NGINX (5 секунд)..."
sleep 5

log "INFO" "Проверка доступности сайта..."
curl_result=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 -k https://supermock.ru)
if [ "$curl_result" == "200" ] || [ "$curl_result" == "301" ] || [ "$curl_result" == "302" ]; then
    log "INFO" "Сайт доступен, код ответа: $curl_result"
else
    log "WARN" "Сайт может быть недоступен, код ответа: $curl_result"
    log "WARN" "Проверьте логи NGINX: tail -f /var/log/nginx/supermock-https-error.log"
    
    # Проверка статуса Next.js приложения
    log "INFO" "Проверка статуса Next.js приложения..."
    if pgrep -f "node.*next" > /dev/null; then
        log "INFO" "Next.js приложение запущено."
    else
        log "WARN" "Next.js приложение не запущено. Запустите приложение командой:"
        log "WARN" "cd /path/to/nextjs/app && npm run start"
    fi
    
    # Проверка открытых портов
    log "INFO" "Проверка открытых портов..."
    if command -v netstat &> /dev/null; then
        log "INFO" "Порт 3000 (Next.js):"
        netstat -tuln | grep ":3000" || log "WARN" "Порт 3000 не прослушивается."
    elif command -v ss &> /dev/null; then
        log "INFO" "Порт 3000 (Next.js):"
        ss -tuln | grep ":3000" || log "WARN" "Порт 3000 не прослушивается."
    fi
fi

# Шаг 9: Создание скрипта для автоматического обновления сертификатов
log "STEP" "Шаг 9: Создание скрипта для автоматического обновления сертификатов"

log "INFO" "Создание директории для хуков обновления сертификатов..."
mkdir -p /etc/letsencrypt/renewal-hooks/post
check_result "Не удалось создать директорию для хуков обновления сертификатов." "Директория для хуков обновления сертификатов создана успешно."

log "INFO" "Создание скрипта для автоматического обновления сертификатов..."
cat > /etc/letsencrypt/renewal-hooks/post/copy-certs.sh << 'EOL'
#!/bin/bash

# Копирование обновленных сертификатов в нужную директорию
cp /etc/letsencrypt/live/supermock.ru/fullchain.pem /etc/nginx/sites-available/fullchain.pem
cp /etc/letsencrypt/live/supermock.ru/privkey.pem /etc/nginx/sites-available/privkey.pem

# Установка правильных прав доступа
chmod 644 /etc/nginx/sites-available/fullchain.pem
chmod 600 /etc/nginx/sites-available/privkey.pem

# Проверка, запущен ли NGINX от имени www-data
nginx_user=$(ps -ef | grep "nginx: master process" | grep -v grep | awk '{print $1}')
if [ "$nginx_user" == "www-data" ]; then
    chown root:www-data /etc/nginx/sites-available/fullchain.pem
    chown root:www-data /etc/nginx/sites-available/privkey.pem
fi

# Перезапуск NGINX для применения новых сертификатов
systemctl restart nginx
EOL
check_result "Не удалось создать скрипт для автоматического обновления сертификатов." "Скрипт для автоматического обновления сертификатов создан успешно."

log "INFO" "Установка прав на выполнение скрипта..."
chmod +x /etc/letsencrypt/renewal-hooks/post/copy-certs.sh
check_result "Не удалось установить права на выполнение скрипта." "Права на выполнение скрипта установлены успешно."

# Завершение
log "STEP" "=== Настройка NGINX с SSL-сертификатами для supermock.ru завершена успешно ==="

log "INFO" "Резервные копии сохранены в директории: $backup_dir"
log "INFO" "Конфигурация NGINX обновлена с правильными путями к сертификатам."
log "INFO" "Права доступа к сертификатам настроены."
log "INFO" "NGINX перезапущен и проверен."
log "INFO" "Создан скрипт для автоматического обновления сертификатов."

echo
log "INFO" "Рекомендации по дальнейшим действиям:"
log "INFO" "1. Проверьте доступность сайта в браузере: https://supermock.ru"
log "INFO" "2. Если сайт недоступен, проверьте логи NGINX: tail -f /var/log/nginx/supermock-https-error.log"
log "INFO" "3. Убедитесь, что Next.js приложение запущено и работает на порту 3000"
log "INFO" "4. Для получения дополнительной информации см. РЕШЕНИЕ_ПРОБЛЕМ.md"