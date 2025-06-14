# Исправление Z-Index модального окна пользователя

## Проблема

Модальное окно настроек пользователя перекрывалось основным контентом сайта, несмотря на настроенные CSS стили. Пользователи не могли взаимодействовать с модальным окном, так как оно отображалось под другими элементами страницы.

## Диагностика

### Выявленные источники проблемы:

1. **Конфликт z-index с другими элементами**

   - Админские модальные окна: z-index 8000+
   - Header dropdown: z-index 200
   - Мобильное меню: z-index 400

2. **Неправильная иерархия z-index**

   - Модальное окно пользователя: z-index 9999
   - Header модального окна: z-index 10000
   - Критические элементы: z-index 10000

3. **Проблемы с stacking context**

   - Отсутствие `isolation: isolate`
   - Отсутствие `transform: translateZ(0)`

4. **Недостаточно высокий z-index**
   - Значение 9999 могло конфликтовать с другими элементами

## Решение

### 1. Обновление CSS переменных z-index

**Файл:** `styles/z-index-variables.css`

```css
/* ДО */
--z-user-modal: 9999;
--z-user-modal-header: 10000;
--z-critical: 10000;

/* ПОСЛЕ */
--z-user-modal: 50000;
--z-user-modal-header: 50001;
--z-critical: 60000;
```

### 2. Улучшение CSS модального окна

**Файл:** `styles/user/UserSettingsModal.module.css`

#### Изменения в `.overlay`:

```css
.overlay {
  /* Увеличен z-index с принудительным приоритетом */
  z-index: var(--z-user-modal, 50000) !important;

  /* Добавлены правила для создания нового stacking context */
  isolation: isolate;
  transform: translateZ(0);
  will-change: transform;
}
```

#### Изменения в `.modal`:

```css
.modal {
  /* Добавлен относительный z-index */
  z-index: 1;

  /* Добавлены правила для изоляции */
  isolation: isolate;
  transform: translateZ(0);
}
```

#### Изменения в `.header`:

```css
.header {
  /* Обновлен z-index для соответствия новой иерархии */
  z-index: var(--z-user-modal-header, 50001);
}
```

### 3. Новая иерархия z-index

```
99999 - Emergency (критические системные элементы)
60000 - Critical (критические элементы)
50001 - User Modal Header (заголовок модального окна пользователя)
50000 - User Modal (модальное окно пользователя)
 8100 - Admin Modal Header (заголовок админского модального окна)
 8000 - Admin Modal (админское модальное окно)
 1500 - Toast (всплывающие уведомления)
 1000 - Notification (уведомления)
  800 - Popover (всплывающие элементы)
  600 - Dropdown (выпадающие меню)
  500 - Tooltip (подсказки)
  400 - Mobile Menu (мобильное меню)
  300 - Mobile Overlay (мобильный оверлей)
  200 - Header Dropdown (выпадающее меню в шапке)
  100 - Header (шапка сайта)
   10 - Content (основной контент)
    1 - Base (базовые элементы)
```

## Тестирование

### Создан тестовый файл для диагностики

**Файл:** `test-user-settings-modal-z-index.js`

Функции для тестирования:

- `checkZIndexHierarchy()` - проверка иерархии z-index
- `checkZIndexConflicts()` - поиск конфликтующих элементов
- `applyZIndexFix()` - применение исправления в реальном времени
- `monitorModalChanges()` - мониторинг изменений модального окна

### Использование в браузере:

```javascript
// Запуск полной диагностики
userModalDiagnostics.runDiagnostics();

// Проверка конфликтов
userModalDiagnostics.checkZIndexConflicts();

// Применение исправления
userModalDiagnostics.applyZIndexFix();
```

## Результат

После применения исправлений:

1. ✅ Модальное окно пользователя отображается поверх всех элементов сайта
2. ✅ Z-index иерархия упорядочена и документирована
3. ✅ Добавлены дополнительные CSS правила для предотвращения конфликтов
4. ✅ Создан инструмент для диагностики подобных проблем в будущем

## Проверка исправления

1. Откройте сайт в браузере
2. Войдите в систему
3. Нажмите на аватар пользователя в правом верхнем углу
4. Выберите "Настройки"
5. Убедитесь, что модальное окно отображается поверх всего контента
6. Проверьте работу всех вкладок модального окна

## Дополнительные меры

### CSS правила для предотвращения будущих конфликтов:

1. **Isolation**: Создание нового stacking context
2. **Transform**: Принудительное создание композитного слоя
3. **Will-change**: Оптимизация для анимаций
4. **!important**: Принудительный приоритет для критических стилей

### Рекомендации:

1. Всегда используйте CSS переменные для z-index
2. Документируйте иерархию z-index
3. Тестируйте модальные окна на разных устройствах
4. Используйте инструменты диагностики при возникновении проблем

## Файлы, затронутые исправлением

- `styles/z-index-variables.css` - обновлены CSS переменные
- `styles/user/UserSettingsModal.module.css` - улучшены стили модального окна
- `test-user-settings-modal-z-index.js` - создан инструмент диагностики
- `docs/user-modal-z-index-fix.md` - документация исправления
