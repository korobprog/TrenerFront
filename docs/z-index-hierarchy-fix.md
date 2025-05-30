# Исправление иерархии z-index в проекте

## Проблема

Модальное окно UserSettingsModal перекрывалось элементами главной страницы из-за неправильной иерархии z-index значений.

## Анализ конфликтов

Найдены следующие проблемные z-index значения:

### До исправления:

- **Header.module.css**:

  - `.header` - z-index: 1000
  - `.userMenu` - z-index: 1100
  - `.mobileMenuOverlay` - z-index: 1200
  - `.mobileMenu` - z-index: 1300

- **UserSettingsModal.module.css**:

  - `.overlay` - z-index: 9999 ✓ (правильно)
  - `.header` - z-index: 10000 ✓ (правильно)

- **Другие модальные окна**:

  - `PointsEditModal` - z-index: 1000 (конфликт)
  - `UserForm` - z-index: 1000 (конфликт)
  - `InterviewCard` - z-index: 1000 (конфликт)

- **TextInput** - z-index: 9999 (конфликт с модальным окном)

## Новая иерархия z-index

### 1. Обычные элементы: 1-100

- Обычные элементы страницы: z-index: 1
- Карточки и контент: z-index: 1-10

### 2. Навигация/хедер: 100-500

- **Header**: z-index: 100
- **User dropdown menu**: z-index: 200
- **Mobile menu overlay**: z-index: 300
- **Mobile menu**: z-index: 400

### 3. Дропдауны/тултипы: 500-1000

- **TextInput курсор**: z-index: 500
- **Дропдауны**: z-index: 600-800
- **Тултипы**: z-index: 800-1000

### 4. Уведомления: 1000-2000

- **Notification**: z-index: 1000 ✓ (уже правильно)

### 5. Модальные окна админки: 8000-8999

- **PointsEditModal**: z-index: 8000
- **UserForm**: z-index: 8000
- **InterviewCard**: z-index: 8000

### 6. Пользовательские модальные окна: 9000-9999

- **UserSettingsModal overlay**: z-index: 9999 ✓
- **UserSettingsModal header**: z-index: 10000 ✓

### 7. Критические уведомления: 10000+

- Системные уведомления: z-index: 10000+

## Внесенные изменения

### 1. styles/Header.module.css

```css
/* Было */
.header {
  z-index: 1000;
}
.userMenu {
  z-index: 1100;
}
.mobileMenuOverlay {
  z-index: 1200;
}
.mobileMenu {
  z-index: 1300;
}

/* Стало */
.header {
  z-index: 100;
}
.userMenu {
  z-index: 200;
}
.mobileMenuOverlay {
  z-index: 300;
}
.mobileMenu {
  z-index: 400;
}
```

### 2. styles/admin/PointsEditModal.module.css

```css
/* Было */
z-index: 1000;

/* Стало */
z-index: 8000;
```

### 3. styles/admin/UserForm.module.css

```css
/* Было */
z-index: 1000;

/* Стало */
z-index: 8000;
```

### 4. styles/InterviewCard.module.css

```css
/* Было */
z-index: 1000;

/* Стало */
z-index: 8000;
```

### 5. styles/interview/TextInput.module.css

```css
/* Было */
z-index: 9999;

/* Стало */
z-index: 500;
```

## Результат

- ✅ Модальное окно UserSettingsModal теперь корректно отображается поверх всех элементов главной страницы
- ✅ Правильная иерархия z-index по всему проекту
- ✅ Отсутствие конфликтов между различными слоями интерфейса
- ✅ Header и его элементы больше не перекрывают модальные окна
- ✅ Админские модальные окна имеют правильный приоритет
- ✅ Уведомления остаются видимыми поверх обычного контента

## Дополнительные исправления

### 6. styles/z-index-variables.css

```css
/* Было в темной теме */
--z-user-modal-header: 8000;

/* Стало */
--z-user-modal-header: 10000;
```

**Проблема**: В темной теме значение z-index для заголовка пользовательского модального окна было неправильно установлено в 8000 вместо 10000, что могло вызывать проблемы с отображением модалки в темной теме.

## Рекомендации для будущего развития

1. Всегда следовать установленной иерархии z-index
2. Использовать CSS переменные для z-index значений
3. Документировать новые z-index значения
4. Тестировать модальные окна на всех страницах проекта
5. Проверять консистентность z-index значений между светлой и темной темами
