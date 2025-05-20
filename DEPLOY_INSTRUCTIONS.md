# Инструкция по деплою приложения на VPS сервер

## Предварительные требования

На VPS сервере должны быть установлены:

1. Node.js (версия 16.x или выше)
2. npm (версия 8.x или выше)
3. PostgreSQL (версия 14.x)
4. Nginx
5. PM2 (`npm install -g pm2`)
6. Certbot (для SSL сертификатов)

## Шаги по деплою

### 1. Подготовка сервера

```bash
# Подключение к серверу
ssh supermock

# Создание директории для проекта
mkdir -p /root/supermock
mkdir -p /root/supermock/logs

# Установка PM2 глобально, если еще не установлен
npm install -g pm2
```

### 2. Настройка базы данных

```bash
# Создание пользователя и базы данных PostgreSQL
sudo -u postgres psql -c "CREATE USER user WITH PASSWORD 'password';"
sudo -u postgres psql -c "CREATE DATABASE interview_prep;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE interview_prep TO user;"
```

### 3. Настройка Nginx

1. Скопируйте файл `nginx.conf` в директорию `/etc/nginx/sites-available/`:

```bash
sudo cp nginx.conf /etc/nginx/sites-available/supermock
```

2. Создайте символическую ссылку в директории `sites-enabled`:

```bash
sudo ln -s /etc/nginx/sites-available/supermock /etc/nginx/sites-enabled/
```

3. Проверьте конфигурацию Nginx:

```bash
sudo nginx -t
```

4. Перезапустите Nginx:

```bash
sudo systemctl restart nginx
```

### 4. Настройка SSL с помощью Certbot

```bash
# Установка Certbot (если еще не установлен)
sudo apt-get update
sudo apt-get install certbot python3-certbot-nginx

# Получение SSL сертификата
sudo certbot --nginx -d supermock.example.com
```

### 5. Копирование файлов проекта

Есть несколько способов скопировать файлы проекта на сервер:

#### Вариант 1: Использование Git

```bash
# На сервере
cd /root/supermock
git clone https://github.com/your-username/TrenerFront.git .
```

#### Вариант 2: Использование SCP

```bash
# На локальной машине
scp -r ./* supermock:/root/supermock/
```

### 6. Настройка переменных окружения

```bash
# На сервере
cd /root/supermock
cp .env.production .env
```

Отредактируйте файл `.env`, чтобы установить правильные значения для продакшена.

### 7. Установка зависимостей и сборка приложения

```bash
# На сервере
cd /root/supermock
npm ci
npx prisma migrate deploy
npm run build
```

### 8. Запуск приложения с помощью PM2

```bash
# На сервере
cd /root/supermock
pm2 start ecosystem.config.js
pm2 save
```

### 9. Настройка автозапуска PM2 при перезагрузке сервера

```bash
# На сервере
pm2 startup
# Выполните команду, которую выдаст предыдущая команда
```

## Автоматический деплой

Для автоматического деплоя можно использовать скрипт `deploy.sh`:

```bash
# На локальной машине
./deploy.sh
```

## Проверка работоспособности

После деплоя проверьте, что приложение работает корректно:

1. Откройте в браузере https://supermock.example.com
2. Проверьте логи приложения:
   ```bash
   pm2 logs supermock
   ```

## Решение проблем

### Проблемы с базой данных

Проверьте подключение к базе данных:

```bash
psql -U user -d interview_prep -h localhost
```

### Проблемы с Nginx

Проверьте логи Nginx:

```bash
sudo tail -f /var/log/nginx/supermock.error.log
```

### Проблемы с приложением

Проверьте логи приложения:

```bash
pm2 logs supermock
```

## Обновление приложения

Для обновления приложения выполните следующие команды:

```bash
cd /root/supermock
git pull  # если используется Git
npm ci
npx prisma migrate deploy
npm run build
pm2 reload supermock
```

Или просто запустите скрипт `deploy.sh` с локальной машины.
