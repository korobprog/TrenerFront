# Инструкция по настройке NGINX с нестандартным расположением SSL-сертификатов

## Обновление путей к сертификатам

В стандартной конфигурации NGINX для сайта supermock.ru пути к SSL-сертификатам указаны следующим образом:

```nginx
ssl_certificate /etc/letsencrypt/live/supermock.ru/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/supermock.ru/privkey.pem;
```

Поскольку сертификаты были сохранены в нестандартной директории `/etc/nginx/sites-available/`, необходимо обновить пути в конфигурации:

```nginx
ssl_certificate /etc/nginx/sites-available/fullchain.pem;
ssl_certificate_key /etc/nginx/sites-available/privkey.pem;
```

Эти изменения уже внесены в файл `nginx_new.conf`.

## Настройка прав доступа к сертификатам

Для корректной работы NGINX с SSL-сертификатами необходимо настроить правильные права доступа:

1. Проверьте текущие права доступа к файлам сертификатов:

```bash
ls -la /etc/nginx/sites-available/fullchain.pem
ls -la /etc/nginx/sites-available/privkey.pem
```

2. Установите правильные права доступа:

```bash
# Установка владельца файлов
sudo chown root:root /etc/nginx/sites-available/fullchain.pem
sudo chown root:root /etc/nginx/sites-available/privkey.pem

# Установка прав доступа
sudo chmod 644 /etc/nginx/sites-available/fullchain.pem
sudo chmod 600 /etc/nginx/sites-available/privkey.pem
```

3. Убедитесь, что пользователь, от имени которого запускается NGINX (обычно `www-data`), имеет права на чтение файлов сертификатов:

```bash
# Добавление пользователя www-data в группу, имеющую доступ к сертификатам
sudo usermod -a -G root www-data

# Или альтернативный вариант - изменение владельца файлов
sudo chown root:www-data /etc/nginx/sites-available/fullchain.pem
sudo chown root:www-data /etc/nginx/sites-available/privkey.pem
```

## Обновление сертификатов в нестандартной директории

Если сертификаты находятся не в стандартной директории Let's Encrypt, процесс их обновления будет отличаться:

1. При ручном обновлении сертификатов:

```bash
# Создание резервных копий текущих сертификатов
sudo cp /etc/nginx/sites-available/fullchain.pem /etc/nginx/sites-available/fullchain.pem.bak
sudo cp /etc/nginx/sites-available/privkey.pem /etc/nginx/sites-available/privkey.pem.bak

# Копирование новых сертификатов в нужную директорию
sudo cp /path/to/new/fullchain.pem /etc/nginx/sites-available/fullchain.pem
sudo cp /path/to/new/privkey.pem /etc/nginx/sites-available/privkey.pem

# Установка правильных прав доступа
sudo chmod 644 /etc/nginx/sites-available/fullchain.pem
sudo chmod 600 /etc/nginx/sites-available/privkey.pem
```

2. При использовании Certbot для автоматического обновления:

```bash
# Настройка хука для копирования сертификатов после обновления
sudo mkdir -p /etc/letsencrypt/renewal-hooks/post

# Создание скрипта для копирования сертификатов
sudo nano /etc/letsencrypt/renewal-hooks/post/copy-certs.sh
```

Содержимое скрипта `copy-certs.sh`:

```bash
#!/bin/bash

# Копирование обновленных сертификатов в нужную директорию
cp /etc/letsencrypt/live/supermock.ru/fullchain.pem /etc/nginx/sites-available/fullchain.pem
cp /etc/letsencrypt/live/supermock.ru/privkey.pem /etc/nginx/sites-available/privkey.pem

# Установка правильных прав доступа
chmod 644 /etc/nginx/sites-available/fullchain.pem
chmod 600 /etc/nginx/sites-available/privkey.pem

# Перезапуск NGINX для применения новых сертификатов
systemctl restart nginx
```

Установка прав на выполнение скрипта:

```bash
sudo chmod +x /etc/letsencrypt/renewal-hooks/post/copy-certs.sh
```

## Проверка конфигурации и перезапуск NGINX

1. Проверка синтаксиса конфигурации NGINX:

```bash
sudo nginx -t
```

2. Если проверка прошла успешно, перезапустите NGINX:

```bash
sudo systemctl restart nginx
```

3. Проверка статуса NGINX после перезапуска:

```bash
sudo systemctl status nginx
```

4. Проверка доступности сайта по HTTPS:

```bash
curl -I https://supermock.ru
```

## Диагностика ошибок

Если после обновления конфигурации возникают ошибки:

1. Проверьте логи NGINX:

```bash
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/supermock-https-error.log
```

2. Убедитесь, что файлы сертификатов существуют и доступны для чтения:

```bash
sudo ls -la /etc/nginx/sites-available/fullchain.pem
sudo ls -la /etc/nginx/sites-available/privkey.pem
```

3. Проверьте права доступа к директории с сертификатами:

```bash
sudo ls -la /etc/nginx/sites-available/
```

4. Если NGINX не может прочитать файлы сертификатов, временно измените права доступа для диагностики:

```bash
sudo chmod 644 /etc/nginx/sites-available/privkey.pem
```

После успешной диагностики не забудьте вернуть безопасные права доступа:

```bash
sudo chmod 600 /etc/nginx/sites-available/privkey.pem
```

## Дополнительные рекомендации по безопасности

1. Регулярно проверяйте срок действия сертификатов:

```bash
openssl x509 -in /etc/nginx/sites-available/fullchain.pem -text -noout | grep "Not After"
```

2. Настройте мониторинг срока действия сертификатов:

```bash
# Установка утилиты для мониторинга
sudo apt-get install ssl-cert-check

# Проверка срока действия
ssl-cert-check -c /etc/nginx/sites-available/fullchain.pem -w 30
```

3. Ограничьте доступ к директории с сертификатами:

```bash
sudo chmod 750 /etc/nginx/sites-available/
```

4. Создайте резервные копии сертификатов в безопасном месте:

```bash
sudo cp /etc/nginx/sites-available/fullchain.pem /root/ssl-backups/
sudo cp /etc/nginx/sites-available/privkey.pem /root/ssl-backups/
sudo chmod 600 /root/ssl-backups/privkey.pem
```
