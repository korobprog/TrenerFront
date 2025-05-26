#!/bin/bash

# Скрипт для обновления конфигурации NGINX с нестандартным расположением SSL-сертификатов
# Автор: Roo
# Дата: 17.05.2025

# Проверка прав суперпользователя
if [ "$EUID" -ne 0 ]; then
  echo "Этот скрипт должен быть запущен с правами суперпользователя (sudo)."
  exit 1
fi

echo "=== Обновление конфигурации NGINX с нестандартным расположением SSL-сертификатов ==="
echo

# Проверка наличия файлов сертификатов
if [ ! -f "/etc/nginx/sites-available/fullchain.pem" ] || [ ! -f "/etc/nginx/sites-available/privkey.pem" ]; then
  echo "ОШИБКА: Файлы сертификатов не найдены в директории /etc/nginx/sites-available/"
  echo "Убедитесь, что файлы fullchain.pem и privkey.pem существуют в этой директории."
  exit 1
fi

# Создание резервных копий текущих конфигураций
echo "Создание резервных копий текущих конфигураций..."
timestamp=$(date +"%Y%m%d%H%M%S")
cp /etc/nginx/sites-available/supermock.ru /etc/nginx/sites-available/supermock.ru.bak.$timestamp
echo "Резервная копия создана: /etc/nginx/sites-available/supermock.ru.bak.$timestamp"

# Обновление конфигурации NGINX
echo "Обновление конфигурации NGINX..."
cat > /etc/nginx/sites-available/supermock.ru << 'EOL'
# Конфигурация Nginx для сервера supermock.ru
# Разместите этот файл в /etc/nginx/sites-available/
# и создайте символическую ссылку в /etc/nginx/sites-enabled/

# Настройка логирования для отладки
error_log /var/log/nginx/supermock-error.log debug;
access_log /var/log/nginx/supermock-access.log;

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
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384';
    
    # Настройки безопасности
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options nosniff;
    add_header X-Frame-Options SAMEORIGIN;
    add_header X-XSS-Protection "1; mode=block";
    
    # Маршрутизация запросов к API на бэкенд
    location /api/ {
        # Добавляем заголовки для отладки
        add_header X-Debug-Path "api-path" always;
        add_header X-Original-URI $request_uri always;
        
        # Прокси к бэкенду
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Настройки для WebSocket
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 86400;
    }
    
    # Маршрутизация всех остальных запросов на фронтенд
    location / {
        # Добавляем заголовки для отладки
        add_header X-Debug-Path "frontend-path" always;
        add_header X-Original-URI $request_uri always;
        
        # Прокси к фронтенду
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Настройки для WebSocket
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 86400;
    }
}
EOL
echo "Конфигурация NGINX обновлена."

# Настройка прав доступа к сертификатам
echo "Настройка прав доступа к сертификатам..."
chown root:root /etc/nginx/sites-available/fullchain.pem
chown root:root /etc/nginx/sites-available/privkey.pem
chmod 644 /etc/nginx/sites-available/fullchain.pem
chmod 600 /etc/nginx/sites-available/privkey.pem

# Проверка, запущен ли NGINX от имени www-data
nginx_user=$(ps -ef | grep "nginx: master process" | grep -v grep | awk '{print $1}')
if [ "$nginx_user" == "www-data" ]; then
  echo "NGINX запущен от имени пользователя www-data. Добавление www-data в группу с доступом к сертификатам..."
  chown root:www-data /etc/nginx/sites-available/fullchain.pem
  chown root:www-data /etc/nginx/sites-available/privkey.pem
fi

# Проверка конфигурации NGINX
echo "Проверка конфигурации NGINX..."
nginx_test=$(nginx -t 2>&1)
if [ $? -ne 0 ]; then
  echo "ОШИБКА: Конфигурация NGINX содержит ошибки:"
  echo "$nginx_test"
  echo "Восстановление предыдущей конфигурации..."
  cp /etc/nginx/sites-available/supermock.ru.bak.$timestamp /etc/nginx/sites-available/supermock.ru
  echo "Предыдущая конфигурация восстановлена."
  exit 1
else
  echo "Конфигурация NGINX проверена успешно."
fi

# Перезапуск NGINX
echo "Перезапуск NGINX..."
systemctl restart nginx
if [ $? -ne 0 ]; then
  echo "ОШИБКА: Не удалось перезапустить NGINX."
  echo "Проверьте статус службы: systemctl status nginx"
  exit 1
else
  echo "NGINX успешно перезапущен."
fi

# Проверка доступности сайта
echo "Проверка доступности сайта..."
curl_result=$(curl -s -o /dev/null -w "%{http_code}" https://supermock.ru)
if [ "$curl_result" == "200" ] || [ "$curl_result" == "301" ] || [ "$curl_result" == "302" ]; then
  echo "Сайт доступен, код ответа: $curl_result"
else
  echo "ПРЕДУПРЕЖДЕНИЕ: Сайт может быть недоступен, код ответа: $curl_result"
  echo "Проверьте логи NGINX: tail -f /var/log/nginx/supermock-https-error.log"
fi

# Создание скрипта для автоматического обновления сертификатов
echo "Создание скрипта для автоматического обновления сертификатов..."
mkdir -p /etc/letsencrypt/renewal-hooks/post
cat > /etc/letsencrypt/renewal-hooks/post/copy-certs.sh << 'EOL'
#!/bin/bash

# Копирование обновленных сертификатов в нужную директорию
cp /etc/letsencrypt/live/supermock.ru/fullchain.pem /etc/nginx/sites-available/fullchain.pem
cp /etc/letsencrypt/live/supermock.ru/privkey.pem /etc/nginx/sites-available/privkey.pem

# Установка правильных прав доступа
chmod 644 /etc/nginx/sites-available/fullchain.pem
chmod 600 /etc/nginx/sites-available/privkey.pem

# Перезапуск NGINX для применения новых сертификатов
systemctl restart nginx
EOL
chmod +x /etc/letsencrypt/renewal-hooks/post/copy-certs.sh
echo "Скрипт для автоматического обновления сертификатов создан: /etc/letsencrypt/renewal-hooks/post/copy-certs.sh"

echo
echo "=== Обновление конфигурации NGINX завершено успешно ==="
echo "Для получения дополнительной информации см. NGINX_SSL_INSTRUCTIONS.md"