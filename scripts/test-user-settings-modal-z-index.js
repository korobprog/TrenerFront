/**
 * Тест для проверки z-index модального окна настроек пользователя
 * Этот тест поможет диагностировать проблему с перекрытием модального окна
 */

console.log('🔍 Начинаем диагностику z-index модального окна пользователя...');

// Функция для проверки z-index элементов
function checkZIndexHierarchy() {
  console.log('\n📊 Анализ z-index иерархии:');

  // Проверяем CSS переменные
  const rootStyles = getComputedStyle(document.documentElement);
  const userModalZIndex = rootStyles.getPropertyValue('--z-user-modal').trim();
  const userModalHeaderZIndex = rootStyles
    .getPropertyValue('--z-user-modal-header')
    .trim();

  console.log('🎯 CSS переменные z-index:');
  console.log(`  --z-user-modal: ${userModalZIndex || 'НЕ НАЙДЕНО'}`);
  console.log(
    `  --z-user-modal-header: ${userModalHeaderZIndex || 'НЕ НАЙДЕНО'}`
  );

  // Ищем модальное окно пользователя
  const userModal = document.querySelector(
    '[class*="UserSettingsModal_overlay"]'
  );
  if (userModal) {
    const modalStyles = getComputedStyle(userModal);
    const actualZIndex = modalStyles.zIndex;
    const position = modalStyles.position;

    console.log('\n🎭 Модальное окно пользователя найдено:');
    console.log(`  Фактический z-index: ${actualZIndex}`);
    console.log(`  Position: ${position}`);
    console.log(`  Видимость: ${modalStyles.visibility}`);
    console.log(`  Display: ${modalStyles.display}`);
  } else {
    console.log('\n❌ Модальное окно пользователя не найдено');
  }

  // Проверяем все элементы с высоким z-index
  const allElements = document.querySelectorAll('*');
  const highZIndexElements = [];

  allElements.forEach((element) => {
    const styles = getComputedStyle(element);
    const zIndex = parseInt(styles.zIndex);

    if (!isNaN(zIndex) && zIndex > 1000) {
      highZIndexElements.push({
        element,
        zIndex,
        className: element.className,
        tagName: element.tagName,
        position: styles.position,
      });
    }
  });

  // Сортируем по z-index
  highZIndexElements.sort((a, b) => b.zIndex - a.zIndex);

  console.log('\n🏔️ Элементы с высоким z-index (>1000):');
  highZIndexElements.forEach((item) => {
    console.log(
      `  ${item.tagName}.${item.className} - z-index: ${item.zIndex}, position: ${item.position}`
    );
  });

  return {
    userModalZIndex,
    userModalHeaderZIndex,
    userModal,
    highZIndexElements,
  };
}

// Функция для проверки конфликтов z-index
function checkZIndexConflicts() {
  console.log('\n⚠️ Проверка конфликтов z-index:');

  const analysis = checkZIndexHierarchy();

  // Проверяем, есть ли элементы с z-index выше модального окна
  const userModalZIndex = parseInt(analysis.userModalZIndex) || 9999;
  const conflictingElements = analysis.highZIndexElements.filter(
    (item) =>
      item.zIndex >= userModalZIndex &&
      !item.className.includes('UserSettingsModal')
  );

  if (conflictingElements.length > 0) {
    console.log('🚨 НАЙДЕНЫ КОНФЛИКТУЮЩИЕ ЭЛЕМЕНТЫ:');
    conflictingElements.forEach((item) => {
      console.log(
        `  ❌ ${item.tagName}.${item.className} - z-index: ${item.zIndex} (>= ${userModalZIndex})`
      );
    });
  } else {
    console.log('✅ Конфликтующих элементов не найдено');
  }

  return conflictingElements;
}

// Функция для применения исправления z-index
function applyZIndexFix() {
  console.log('\n🔧 Применяем исправление z-index...');

  // Находим модальное окно
  const userModal = document.querySelector(
    '[class*="UserSettingsModal_overlay"]'
  );
  if (!userModal) {
    console.log('❌ Модальное окно не найдено для исправления');
    return false;
  }

  // Устанавливаем очень высокий z-index
  const newZIndex = 99999;
  userModal.style.zIndex = newZIndex;

  // Также проверяем внутренние элементы модального окна
  const modalContent = userModal.querySelector(
    '[class*="UserSettingsModal_modal"]'
  );
  if (modalContent) {
    modalContent.style.zIndex = newZIndex + 1;
  }

  const modalHeader = userModal.querySelector(
    '[class*="UserSettingsModal_header"]'
  );
  if (modalHeader) {
    modalHeader.style.zIndex = newZIndex + 2;
  }

  console.log(`✅ Установлен z-index: ${newZIndex} для модального окна`);

  // Проверяем результат
  setTimeout(() => {
    const updatedStyles = getComputedStyle(userModal);
    console.log(`🔍 Проверка: новый z-index = ${updatedStyles.zIndex}`);
  }, 100);

  return true;
}

// Функция для мониторинга изменений DOM
function monitorModalChanges() {
  console.log('\n👀 Запускаем мониторинг модального окна...');

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach((node) => {
          if (
            node.nodeType === 1 &&
            node.className &&
            node.className.includes('UserSettingsModal_overlay')
          ) {
            console.log('🎭 Обнаружено появление модального окна пользователя');
            setTimeout(() => {
              checkZIndexConflicts();
              applyZIndexFix();
            }, 100);
          }
        });
      }
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  console.log('✅ Мониторинг активирован');
  return observer;
}

// Основная функция диагностики
function runDiagnostics() {
  console.log('🚀 Запуск полной диагностики...');

  // 1. Проверяем текущее состояние
  const analysis = checkZIndexHierarchy();

  // 2. Ищем конфликты
  const conflicts = checkZIndexConflicts();

  // 3. Если есть модальное окно, применяем исправление
  if (analysis.userModal) {
    applyZIndexFix();
  }

  // 4. Запускаем мониторинг
  const observer = monitorModalChanges();

  console.log('\n📋 РЕЗЮМЕ ДИАГНОСТИКИ:');
  console.log(`  Модальное окно найдено: ${analysis.userModal ? '✅' : '❌'}`);
  console.log(
    `  CSS переменные загружены: ${analysis.userModalZIndex ? '✅' : '❌'}`
  );
  console.log(`  Конфликтующих элементов: ${conflicts.length}`);
  console.log(`  Мониторинг активен: ✅`);

  return {
    analysis,
    conflicts,
    observer,
  };
}

// Экспортируем функции для использования в консоли
window.userModalDiagnostics = {
  checkZIndexHierarchy,
  checkZIndexConflicts,
  applyZIndexFix,
  monitorModalChanges,
  runDiagnostics,
};

// Автоматически запускаем диагностику при загрузке
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', runDiagnostics);
} else {
  runDiagnostics();
}

console.log('\n💡 Доступные команды в консоли:');
console.log('  userModalDiagnostics.runDiagnostics() - полная диагностика');
console.log(
  '  userModalDiagnostics.checkZIndexConflicts() - проверка конфликтов'
);
console.log('  userModalDiagnostics.applyZIndexFix() - применить исправление');
