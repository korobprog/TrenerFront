# Устранение неполадок с Next.js на сервере supermock.ru

## Проблема

Сайт https://supermock.ru/ не работал из-за следующих проблем:

1. Пакет Next.js был установлен некорректно (директория существовала, но была пуста)
2. Nginx не был настроен для проксирования запросов к приложению Next.js

## Диагностика

1. Проверка директории Next.js:

   ```bash
   ssh supermock "ls -la /root/supermock/app/node_modules/next/dist/bin/"
   ```

   Результат: директория не существует

2. Проверка установленных пакетов:

   ```bash
   ssh supermock "cd /root/supermock/app && npm list --depth=0"
   ```

   Результат: пакет next помечен как "invalid"

3. Проверка запущенных процессов:

   ```bash
   ssh supermock "pm2 list"
   ```

   Результат: нет запущенных процессов

4. Проверка конфигурации nginx:
   ```bash
   ssh supermock "cat /etc/nginx/sites-available/default"
   ```
   Результат: nginx настроен на обслуживание статических файлов из /var/www/html, а не на проксирование запросов к приложению Next.js

## Решение

### 1. Переустановка пакетов Next.js

1. Очистка npm-кэша:

   ```bash
   ssh supermock "cd /root/supermock/app && npm cache clean --force"
   ```

2. Удаление директории node_modules и package-lock.json:

   ```bash
   ssh supermock "cd /root/supermock/app && rm -rf node_modules package-lock.json"
   ```

3. Переустановка пакетов:

   ```bash
   ssh supermock "cd /root/supermock/app && npm install"
   ```

4. Проверка установки Next.js:
   ```bash
   ssh supermock "ls -la /root/supermock/app/node_modules/next/dist/bin"
   ```
   Результат: директория существует и содержит исполняемый файл next

### 2. Сборка и запуск приложения

1. Сборка приложения:

   ```bash
   ssh supermock "cd /root/supermock/app && npm run build"
   ```

2. Запуск приложения с помощью PM2:

   ```bash
   ssh supermock "cd /root/supermock/app && pm2 start ecosystem.config.js"
   ```

3. Проверка, что приложение запущено:
   ```bash
   ssh supermock "curl -I http://localhost:3000"
   ```
   Результат: HTTP/1.1 200 OK

### 3. Настройка Nginx

1. Создание новой конфигурации nginx:

   ```bash
   ssh supermock "cat > /tmp/supermock.conf << 'EOL'
   server {
       server_name supermock.ru www.supermock.ru;

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade \$http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host \$host;
           proxy_cache_bypass \$http_upgrade;
       }

       listen [::]:443 ssl ipv6only=on;
       listen 443 ssl;
       ssl_certificate /etc/letsencrypt/live/supermock.ru/fullchain.pem;
       ssl_certificate_key /etc/letsencrypt/live/supermock.ru/privkey.pem;
       include /etc/letsencrypt/options-ssl-nginx.conf;
       ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
   }

   server {
       if (\$host = www.supermock.ru) {
           return 301 https://\$host\$request_uri;
       }

       if (\$host = supermock.ru) {
           return 301 https://\$host\$request_uri;
       }

       listen 80;
       listen [::]:80;
       server_name supermock.ru www.supermock.ru;
       return 404;
   }
   EOL"
   ```

2. Применение новой конфигурации и перезапуск nginx:
   ```bash
   ssh supermock "sudo mv /tmp/supermock.conf /etc/nginx/sites-available/default && sudo nginx -t && sudo systemctl restart nginx"
   ```

## Результат

Сайт https://supermock.ru/ теперь работает корректно. Приложение Next.js запущено с помощью PM2 и доступно через nginx.

## Рекомендации на будущее

1. Регулярно обновлять пакеты npm для поддержания актуальности зависимостей
2. Настроить мониторинг для отслеживания состояния приложения
3. Настроить автоматический перезапуск приложения при перезагрузке сервера
