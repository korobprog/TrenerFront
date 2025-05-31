# Тестирование системы авторизации TrenerFront

## 🎯 Цель

Комплексная проверка исправлений системы авторизации для обеспечения корректного доступа к админ-панели.

## ✅ Что проверяется

- ❌ **Обычные пользователи** (`user`) НЕ видят админ-панель
- ✅ **Админы** (`admin`) видят админ-панель
- ✅ **Супер админы** (`superadmin`) видят админ-панель
- ✅ **korobprog@gmail.com** имеет доступ к админ-функциям

## 🚀 Быстрый старт

```bash
# Запуск всех тестов
node run-auth-tests.js

# Только основные тесты
node run-auth-tests.js --basic

# Только HTTP тесты
node run-auth-tests.js --http
```

## 📁 Файлы тестирования

| Файл                                                         | Описание                                |
| ------------------------------------------------------------ | --------------------------------------- |
| [`run-auth-tests.js`](./run-auth-tests.js)                   | 🎮 Главный скрипт - запускает все тесты |
| [`test-auth-fixes.js`](./test-auth-fixes.js)                 | 🔧 Основные тесты middleware и ролей    |
| [`test-auth-api-requests.js`](./test-auth-api-requests.js)   | 🌐 HTTP тесты API endpoints             |
| [`docs/auth-testing-guide.md`](./docs/auth-testing-guide.md) | 📖 Подробная документация               |

## 🧪 Тестируемые компоненты

### Middleware

- [`lib/middleware/adminAuth.js`](./lib/middleware/adminAuth.js) - Проверка прав админа
- [`lib/middleware/superAdminAuth.js`](./lib/middleware/superAdminAuth.js) - Проверка прав супер-админа

### API Endpoints

- `/api/admin/statistics` - Статистика системы
- `/api/admin/users` - Управление пользователями
- `/api/admin/logs` - Логи администратора
- `/api/admin/interviews` - Управление собеседованиями

## 📊 Пример результата

```
=== ОТЧЕТ О ТЕСТИРОВАНИИ СИСТЕМЫ АВТОРИЗАЦИИ ===

ОБЩАЯ СТАТИСТИКА:
  Всего тестов: 24
  Пройдено: 24
  Провалено: 0
  Успешность: 100%

✅ user НЕ имеет доступа к админ API
✅ admin имеет доступ к админ API
✅ superadmin имеет доступ к админ API
✅ korobprog@gmail.com имеет доступ как superadmin
```

## ⚙️ Требования

```bash
# Установка зависимостей
npm install @prisma/client bcryptjs

# Переменные окружения
DATABASE_URL="postgresql://..."
NEXTAUTH_URL="http://localhost:3000"
```

## 🔧 Устранение проблем

### Пользователь 'user' имеет доступ к админ API

```javascript
// Проверить lib/middleware/adminAuth.js
if (user.role !== 'admin' && user.role !== 'superadmin') {
  return res.status(403).json({ message: 'Требуются права администратора' });
}
```

### korobprog@gmail.com не имеет доступа

```sql
-- Установить роль супер-админа
UPDATE "User" SET role = 'superadmin' WHERE email = 'korobprog@gmail.com';
```

### HTTP тесты не проходят

```bash
# Запустить сервер разработки
npm run dev

# Проверить доступность
curl http://localhost:3000/api/health
```

## 📈 Мониторинг

```bash
# Сохранить результаты с датой
node run-auth-tests.js > auth-test-$(date +%Y%m%d).log 2>&1

# Автоматическая проверка (crontab)
0 2 * * * cd /path/to/project && node run-auth-tests.js
```

## 🎨 Цветовая кодировка

- 🟢 **Зеленый** - Тест пройден успешно
- 🔴 **Красный** - Тест провален, требует внимания
- 🟡 **Желтый** - Предупреждение или рекомендация
- 🔵 **Синий** - Информационное сообщение

## 📞 Поддержка

1. Проверьте [подробную документацию](./docs/auth-testing-guide.md)
2. Убедитесь в корректности настроек окружения
3. Проверьте логи выполнения тестов
4. Проверьте состояние базы данных

---

**Создано:** 31.05.2025  
**Версия:** 1.0  
**Статус:** ✅ Готово к использованию
