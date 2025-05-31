#!/bin/bash

# Скрипт для обновления конфигурации NGINX с нестандартным расположением SSL-сертификатов
# Автор: Roo
# Дата: 17.05.2025

# Цвета для вывода
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
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
        *)
            echo -e "$timestamp - $message"
            ;;
    esac
}

# Проверка прав суперпользователя
if [ "$EUID" -ne 0 ]; then
    log "ERROR" "Этот скрипт должен быть запущен с правами суперпользователя (sudo)."
    exit 1
fi

log "INFO" "=== Обновление конфигурации NGINX с нестандартным расположением SSL-сертификатов ==="
echo

# Проверка наличия NGINX
if ! command -v nginx &> /dev/null; then
    log "ERROR" "NGINX не установлен. Установите NGINX перед запуском этого скрипта."
    exit 1
fi

# Проверка наличия файлов сертификатов
if [ ! -f "/etc/nginx/sites-available/fullchain.pem" ] || [ ! -f "/etc/nginx/sites-available/privkey.pem" ]; then
    log "ERROR" "Файлы сертификатов не найдены в директории /etc/nginx/sites-available/"
    log "ERROR" "Убедитесь, что файлы fullchain.pem и privkey.pem существуют в этой директории."
    
    # Проверка наличия сертификатов в стандартной директории Let's Encrypt
    if [ -f "/etc/letsencrypt/live/supermock.ru/fullchain.pem" ] && [ -f "/etc/letsencrypt/live/supermock.ru/privkey.pem" ]; then
        log "INFO" "Найдены сертификаты в стандартной директории Let's Encrypt."
        log "INFO" "Копирование сертификатов в директорию /etc/nginx/sites-available/..."
        
        cp /etc/letsencrypt/live/supermock.ru/fullchain.pem /etc/nginx/sites-available/fullchain.pem
        cp /etc/letsencrypt/live/supermock.ru/privkey.pem /etc/nginx/sites-available/privkey.pem
        
        log "INFO" "Сертификаты успешно скопированы."
    else
        log "ERROR" "Сертификаты не найдены ни в стандартной директории Let's Encrypt, ни в /etc/nginx/sites-available/."
        log "ERROR" "Пожалуйста, укажите правильный путь к сертификатам или получите новые сертификаты с помощью certbot."
        exit 1
    fi
fi

# Создание резервных копий текущих конфигураций
log "INFO" "Создание резервных копий текущих конфигураций..."
timestamp=$(date +"%Y%m%d%H%M%S")

# Проверка наличия файла конфигурации
if [ -f "/etc/nginx/sites-available/supermock.ru" ]; then
    cp /etc/nginx/sites-available/supermock.ru /etc/nginx/sites-available/supermock.ru.bak.$timestamp
    log "INFO" "Резервная копия создана: /etc/nginx/sites-available/supermock.ru.bak.$timestamp"
else
    log "WARN" "Файл конфигурации /etc/nginx/sites-available/supermock.ru не найден. Будет создан новый файл."
fi

# Создание резервных копий сертификатов
log "INFO" "Создание резервных копий сертификатов..."
cp /etc/nginx/sites-available/fullchain.pem /etc/nginx/sites-available/fullchain.pem.bak.$timestamp
cp /etc/nginx/sites-available/privkey.pem /etc/nginx/sites-available/privkey.pem.bak.$timestamp
log "INFO" "Резервные копии сертификатов созданы."

# Обновление конфигурации NGINX
log "INFO" "Обновление конфигурации NGINX..."
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
log "INFO" "Конфигурация NGINX обновлена."

# Создание директории для Let's Encrypt, если она не существует
if [ ! -d "/var/www/html/.well-known/acme-challenge" ]; then
    log "INFO" "Создание директории для Let's Encrypt..."
    mkdir -p /var/www/html/.well-known/acme-challenge
    chmod -R 755 /var/www/html
fi

# Настройка прав доступа к сертификатам
log "INFO" "Настройка прав доступа к сертификатам..."
chown root:root /etc/nginx/sites-available/fullchain.pem
chown root:root /etc/nginx/sites-available/privkey.pem
chmod 644 /etc/nginx/sites-available/fullchain.pem
chmod 600 /etc/nginx/sites-available/privkey.pem

# Проверка, запущен ли NGINX от имени www-data
nginx_user=$(ps -ef | grep "nginx: master process" | grep -v grep | awk '{print $1}')
if [ "$nginx_user" == "www-data" ]; then
    log "INFO" "NGINX запущен от имени пользователя www-data. Добавление www-data в группу с доступом к сертификатам..."
    chown root:www-data /etc/nginx/sites-available/fullchain.pem
    chown root:www-data /etc/nginx/sites-available/privkey.pem
fi

# Проверка наличия символической ссылки в sites-enabled
if [ ! -L "/etc/nginx/sites-enabled/supermock.ru" ]; then
    log "INFO" "Создание символической ссылки в sites-enabled..."
    ln -sf /etc/nginx/sites-available/supermock.ru /etc/nginx/sites-enabled/
    
    # Удаление символической ссылки на default, если она существует
    if [ -L "/etc/nginx/sites-enabled/default" ]; then
        log "INFO" "Удаление символической ссылки на default..."
        rm -f /etc/nginx/sites-enabled/default
    fi
fi

# Проверка конфигурации NGINX
log "INFO" "Проверка конфигурации NGINX..."
nginx_test=$(nginx -t 2>&1)
if [ $? -ne 0 ]; then
    log "ERROR" "Конфигурация NGINX содержит ошибки:"
    echo "$nginx_test"
    log "INFO" "Восстановление предыдущей конфигурации..."
    
    if [ -f "/etc/nginx/sites-available/supermock.ru.bak.$timestamp" ]; then
        cp /etc/nginx/sites-available/supermock.ru.bak.$timestamp /etc/nginx/sites-available/supermock.ru
        log "INFO" "Предыдущая конфигурация восстановлена."
    else
        log "ERROR" "Не удалось восстановить предыдущую конфигурацию, так как резервная копия не найдена."
    fi
    
    exit 1
else
    log "INFO" "Конфигурация NGINX проверена успешно."
fi

# Перезапуск NGINX
log "INFO" "Перезапуск NGINX..."
systemctl restart nginx
if [ $? -ne 0 ]; then
    log "ERROR" "Не удалось перезапустить NGINX."
    log "ERROR" "Проверьте статус службы: systemctl status nginx"
    exit 1
else
    log "INFO" "NGINX успешно перезапущен."
fi

# Проверка доступности сайта
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
        netstat -tuln | grep ":3000"
    elif command -v ss &> /dev/null; then
        log "INFO" "Порт 3000 (Next.js):"
        ss -tuln | grep ":3000"
    fi
fi

# Создание скрипта для автоматического обновления сертификатов
log "INFO" "Создание скрипта для автоматического обновления сертификатов..."
mkdir -p /etc/letsencrypt/renewal-hooks/post
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
chmod +x /etc/letsencrypt/renewal-hooks/post/copy-certs.sh
log "INFO" "Скрипт для автоматического обновления сертификатов создан: /etc/letsencrypt/renewal-hooks/post/copy-certs.sh"

# Создание скрипта для мониторинга срока действия сертификатов
log "INFO" "Создание скрипта для мониторинга срока действия сертификатов..."
cat > /usr/local/bin/check-ssl-expiry.sh << 'EOL'
#!/bin/bash

# Проверка срока действия SSL-сертификата
cert_file="/etc/nginx/sites-available/fullchain.pem"
days_warning=30

if [ ! -f "$cert_file" ]; then
    echo "Ошибка: Файл сертификата $cert_file не найден."
    exit 1
fi

# Получение даты истечения срока действия сертификата
expiry_date=$(openssl x509 -in "$cert_file" -noout -enddate | cut -d= -f2)
expiry_epoch=$(date -d "$expiry_date" +%s)
current_epoch=$(date +%s)
seconds_diff=$((expiry_epoch - current_epoch))
days_diff=$((seconds_diff / 86400))

if [ $days_diff -le 0 ]; then
    echo "КРИТИЧЕСКАЯ ОШИБКА: SSL-сертификат для supermock.ru истек!"
    exit 2
elif [ $days_diff -le $days_warning ]; then
    echo "ПРЕДУПРЕЖДЕНИЕ: SSL-сертификат для supermock.ru истекает через $days_diff дней."
    exit 1
else
    echo "OK: SSL-сертификат для supermock.ru действителен еще $days_diff дней."
    exit 0
fi
EOL
chmod +x /usr/local/bin/check-ssl-expiry.sh
log "INFO" "Скрипт для мониторинга срока действия сертификатов создан: /usr/local/bin/check-ssl-expiry.sh"

# Добавление задания в crontab для ежедневной проверки срока действия сертификатов
log "INFO" "Добавление задания в crontab для ежедневной проверки срока действия сертификатов..."
(crontab -l 2>/dev/null | grep -v "check-ssl-expiry.sh"; echo "0 0 * * * /usr/local/bin/check-ssl-expiry.sh | mail -s 'SSL Certificate Status for supermock.ru' root") | crontab -

echo
log "INFO" "=== Обновление конфигурации NGINX завершено успешно ==="
log "INFO" "Для получения дополнительной информации см. NGINX_SSL_INSTRUCTIONS.md"
echo
log "INFO" "Рекомендации по дальнейшим действиям:"
log "INFO" "1. Проверьте доступность сайта в браузере: https://supermock.ru"
log "INFO" "2. Если сайт недоступен, проверьте логи NGINX: tail -f /var/log/nginx/supermock-https-error.log"
log "INFO" "3. Убедитесь, что Next.js приложение запущено и работает на порту 3000"
log "INFO" "4. Проверьте срок действия сертификатов: /usr/local/bin/check-ssl-expiry.sh"