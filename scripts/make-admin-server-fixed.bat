@echo off
echo Копирование исправленного скрипта make-admin-server-fixed.js на сервер...
scp scripts/make-admin-server-fixed.js root@217.198.6.238:/root/supermock/TrenerFront/scripts/make-admin-server.js
if %ERRORLEVEL% EQU 0 (
    echo Скрипт успешно скопирован на сервер.
    echo Теперь вы можете подключиться к серверу и выполнить скрипт командой:
    echo node /root/supermock/TrenerFront/scripts/make-admin-server.js
) else (
    echo Ошибка при копировании скрипта на сервер.
)
pause