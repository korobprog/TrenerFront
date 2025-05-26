#!/bin/bash

# Скрипт для решения проблемы с подключением к серверу supermock
# Автор: Roo
# Дата: 17.05.2025

echo "=== Диагностика и решение проблемы с подключением к серверу supermock ==="
echo

# Функция для проверки доступности хоста
check_host() {
    local host=$1
    ping -c 1 $host > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        echo "✅ Хост $host доступен"
        return 0
    else
        echo "❌ Хост $host недоступен"
        return 1
    fi
}

# Функция для получения IP-адреса по имени хоста
get_ip_by_hostname() {
    local hostname=$1
    local ip=$(dig +short $hostname)
    echo $ip
}

# Проверка текущего состояния
echo "1. Проверка текущего состояния подключения..."
echo

# Проверка наличия записи в /etc/hosts
if grep -q "supermock" /etc/hosts; then
    echo "✅ Запись для supermock найдена в файле /etc/hosts:"
    grep "supermock" /etc/hosts
else
    echo "❌ Запись для supermock не найдена в файле /etc/hosts"
fi

echo

# Проверка наличия записи в ~/.ssh/config
if [ -f ~/.ssh/config ] && grep -q "Host supermock" ~/.ssh/config; then
    echo "✅ Конфигурация SSH для supermock найдена в файле ~/.ssh/config:"
    sed -n '/Host supermock/,/Host /p' ~/.ssh/config | grep -v "Host $" | grep -v "^$"
else
    echo "❌ Конфигурация SSH для supermock не найдена в файле ~/.ssh/config"
fi

echo

# Проверка DNS-разрешения
echo "2. Проверка DNS-разрешения имени supermock..."
echo

# Попытка разрешить имя supermock через DNS
supermock_ip=$(dig +short supermock)
if [ -n "$supermock_ip" ]; then
    echo "✅ DNS-разрешение имени supermock успешно: $supermock_ip"
else
    echo "❌ DNS-разрешение имени supermock не удалось"
fi

echo

# Попытка разрешить имя supermock.ru через DNS
supermock_ru_ip=$(dig +short supermock.ru)
if [ -n "$supermock_ru_ip" ]; then
    echo "✅ DNS-разрешение имени supermock.ru успешно: $supermock_ru_ip"
    
    # Проверка доступности хоста по IP
    if check_host $supermock_ru_ip; then
        echo "✅ Сервер supermock.ru ($supermock_ru_ip) доступен"
    else
        echo "❌ Сервер supermock.ru ($supermock_ru_ip) недоступен"
    fi
else
    echo "❌ DNS-разрешение имени supermock.ru не удалось"
fi

echo

# Предложение решений
echo "3. Предлагаемые решения проблемы с подключением..."
echo

# Решение 1: Использование IP-адреса вместо имени хоста
echo "Решение 1: Использование IP-адреса вместо имени хоста"
echo "--------------------------------------------------------------------------------"
if [ -n "$supermock_ru_ip" ]; then
    echo "Вы можете подключиться к серверу, используя IP-адрес вместо имени хоста:"
    echo "ssh user@$supermock_ru_ip"
    echo
    echo "Замените 'user' на ваше имя пользователя на сервере."
else
    echo "Не удалось определить IP-адрес сервера supermock.ru."
    echo "Вам необходимо узнать IP-адрес сервера у администратора или хостинг-провайдера."
    echo "После получения IP-адреса вы можете подключиться командой:"
    echo "ssh user@IP_ADDRESS"
    echo
    echo "Замените 'user' на ваше имя пользователя на сервере, а IP_ADDRESS на полученный IP-адрес."
fi
echo "--------------------------------------------------------------------------------"
echo

# Решение 2: Настройка файла /etc/hosts
echo "Решение 2: Настройка файла /etc/hosts"
echo "--------------------------------------------------------------------------------"
if [ -n "$supermock_ru_ip" ]; then
    echo "Вы можете добавить запись в файл /etc/hosts для разрешения имени supermock:"
    echo "sudo sh -c 'echo \"$supermock_ru_ip supermock\" >> /etc/hosts'"
    echo
    echo "После этого вы сможете подключаться командой:"
    echo "ssh user@supermock"
    echo
    echo "Замените 'user' на ваше имя пользователя на сервере."
else
    echo "Не удалось определить IP-адрес сервера supermock.ru."
    echo "После получения IP-адреса вы можете добавить запись в файл /etc/hosts:"
    echo "sudo sh -c 'echo \"IP_ADDRESS supermock\" >> /etc/hosts'"
    echo
    echo "Замените IP_ADDRESS на полученный IP-адрес."
fi
echo "--------------------------------------------------------------------------------"
echo

# Решение 3: Настройка файла ~/.ssh/config
echo "Решение 3: Настройка файла ~/.ssh/config"
echo "--------------------------------------------------------------------------------"
if [ -n "$supermock_ru_ip" ]; then
    echo "Вы можете создать конфигурацию SSH для хоста supermock:"
    echo "mkdir -p ~/.ssh"
    echo "chmod 700 ~/.ssh"
    echo "cat >> ~/.ssh/config << EOF"
    echo "Host supermock"
    echo "    HostName $supermock_ru_ip"
    echo "    User your_username"
    echo "    Port 22"
    echo "    IdentityFile ~/.ssh/id_rsa"
    echo "EOF"
    echo "chmod 600 ~/.ssh/config"
    echo
    echo "Замените 'your_username' на ваше имя пользователя на сервере."
    echo "Замените '~/.ssh/id_rsa' на путь к вашему приватному ключу, если он отличается."
    echo
    echo "После этого вы сможете подключаться просто командой:"
    echo "ssh supermock"
else
    echo "Не удалось определить IP-адрес сервера supermock.ru."
    echo "После получения IP-адреса вы можете создать конфигурацию SSH:"
    echo "mkdir -p ~/.ssh"
    echo "chmod 700 ~/.ssh"
    echo "cat >> ~/.ssh/config << EOF"
    echo "Host supermock"
    echo "    HostName IP_ADDRESS"
    echo "    User your_username"
    echo "    Port 22"
    echo "    IdentityFile ~/.ssh/id_rsa"
    echo "EOF"
    echo "chmod 600 ~/.ssh/config"
    echo
    echo "Замените 'IP_ADDRESS' на полученный IP-адрес."
    echo "Замените 'your_username' на ваше имя пользователя на сервере."
    echo "Замените '~/.ssh/id_rsa' на путь к вашему приватному ключу, если он отличается."
fi
echo "--------------------------------------------------------------------------------"
echo

echo "=== Диагностика и предложение решений завершены ==="
echo "После настройки подключения к серверу выполните скрипт update_nginx_ssl.sh для настройки NGINX."