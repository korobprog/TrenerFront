/**
 * Диагностика и исправление проблемы с z-index модального окна пользователя
 * Запустите этот файл в консоли браузера для диагностики и исправления
 */

const modalZIndexDiagnostics = {
  // Проверка CSS переменных z-index
  checkZIndexVariables() {
    console.log('🔍 Проверка CSS переменных z-index...');

    const rootStyles = getComputedStyle(document.documentElement);
    const userModalZIndex = rootStyles
      .getPropertyValue('--z-user-modal')
      .trim();
    const userModalHeaderZIndex = rootStyles
      .getPropertyValue('--z-user-modal-header')
      .trim();
    const criticalZIndex = rootStyles.getPropertyValue('--z-critical').trim();
    const emergencyZIndex = rootStyles.getPropertyValue('--z-emergency').trim();

    console.log('📊 CSS переменные z-index:');
    console.log(`  --z-user-modal: ${userModalZIndex || 'НЕ НАЙДЕНО'}`);
    console.log(
      `  --z-user-modal-header: ${userModalHeaderZIndex || 'НЕ НАЙДЕНО'}`
    );
    console.log(`  --z-critical: ${criticalZIndex || 'НЕ НАЙДЕНО'}`);
    console.log(`  --z-emergency: ${emergencyZIndex || 'НЕ НАЙДЕНО'}`);

    return {
      userModal: userModalZIndex,
      userModalHeader: userModalHeaderZIndex,
      critical: criticalZIndex,
      emergency: emergencyZIndex,
    };
  },

  // Поиск модального окна пользователя
  findUserModal() {
    console.log('🔍 Поиск модального окна пользователя...');

    const modalSelectors = [
      '[class*="UserSettingsModal_overlay"]',
      '[class*="userSettingsModal_overlay"]',
      '.modal-overlay',
      '[data-modal="user-settings"]',
    ];

    let modal = null;
    for (const selector of modalSelectors) {
      modal = document.querySelector(selector);
      if (modal) {
        console.log(`✅ Модальное окно найдено: ${selector}`);
        break;
      }
    }

    if (!modal) {
      console.log('❌ Модальное окно не найдено. Возможные причины:');
      console.log('   - Модальное окно не открыто');
      console.log('   - Изменились CSS классы');
      console.log('   - Модальное окно находится в другом контейнере');
    }

    return modal;
  },

  // Анализ текущего z-index модального окна
  analyzeModalZIndex(modal) {
    if (!modal) return null;

    console.log('📊 Анализ z-index модального окна...');

    const computedStyle = getComputedStyle(modal);
    const currentZIndex = computedStyle.zIndex;
    const position = computedStyle.position;

    console.log(`  Текущий z-index: ${currentZIndex}`);
    console.log(`  Position: ${position}`);
    console.log(`  CSS класс: ${modal.className}`);

    // Проверяем дочерние элементы
    const modalContent = modal.querySelector('[class*="modal"]');
    const modalHeader = modal.querySelector('[class*="header"]');

    if (modalContent) {
      const contentZIndex = getComputedStyle(modalContent).zIndex;
      console.log(`  Контент z-index: ${contentZIndex}`);
    }

    if (modalHeader) {
      const headerZIndex = getComputedStyle(modalHeader).zIndex;
      console.log(`  Заголовок z-index: ${headerZIndex}`);
    }

    return {
      overlay: currentZIndex,
      content: modalContent ? getComputedStyle(modalContent).zIndex : null,
      header: modalHeader ? getComputedStyle(modalHeader).zIndex : null,
    };
  },

  // Поиск конфликтующих элементов
  findConflictingElements() {
    console.log('🔍 Поиск элементов с высоким z-index...');

    const allElements = document.querySelectorAll('*');
    const highZIndexElements = [];

    allElements.forEach((element) => {
      const style = getComputedStyle(element);
      const zIndex = parseInt(style.zIndex);

      if (!isNaN(zIndex) && zIndex > 1000) {
        highZIndexElements.push({
          element,
          zIndex,
          className: element.className,
          tagName: element.tagName,
          id: element.id,
        });
      }
    });

    // Сортируем по убыванию z-index
    highZIndexElements.sort((a, b) => b.zIndex - a.zIndex);

    console.log('📊 Элементы с высоким z-index:');
    highZIndexElements.slice(0, 10).forEach((item) => {
      console.log(
        `  ${item.tagName}${item.id ? '#' + item.id : ''}${
          item.className ? '.' + item.className.split(' ')[0] : ''
        }: ${item.zIndex}`
      );
    });

    return highZIndexElements;
  },

  // Применение исправления z-index
  applyZIndexFix() {
    console.log('🔧 Применение исправления z-index...');

    const modal = this.findUserModal();
    if (!modal) {
      console.log('❌ Не удалось найти модальное окно для исправления');
      return false;
    }

    // Применяем критически высокий z-index
    const emergencyZIndex = 99999;

    console.log(`🚀 Применяем z-index: ${emergencyZIndex}`);

    // Применяем стили к overlay
    modal.style.zIndex = emergencyZIndex + '!important';
    modal.style.position = 'fixed';
    modal.style.isolation = 'isolate';
    modal.style.transform = 'translateZ(0)';
    modal.style.willChange = 'transform';

    // Применяем стили к контенту модального окна
    const modalContent = modal.querySelector('[class*="modal"]');
    if (modalContent) {
      modalContent.style.zIndex = '1';
      modalContent.style.position = 'relative';
      modalContent.style.isolation = 'isolate';
      modalContent.style.transform = 'translateZ(0)';
    }

    // Применяем стили к заголовку
    const modalHeader = modal.querySelector('[class*="header"]');
    if (modalHeader) {
      modalHeader.style.zIndex = '2';
      modalHeader.style.position = 'sticky';
    }

    console.log('✅ Исправление применено!');
    console.log(
      '📝 Проверьте, отображается ли модальное окно поверх всех элементов'
    );

    return true;
  },

  // Создание CSS правил для постоянного исправления
  createPermanentFix() {
    console.log('🔧 Создание постоянного исправления...');

    const css = `
      /* Критическое исправление z-index для модального окна пользователя */
      [class*="UserSettingsModal_overlay"],
      [class*="userSettingsModal_overlay"] {
        z-index: 99999 !important;
        position: fixed !important;
        isolation: isolate !important;
        transform: translateZ(0) !important;
        will-change: transform !important;
      }
      
      [class*="UserSettingsModal_modal"],
      [class*="userSettingsModal_modal"] {
        z-index: 1 !important;
        position: relative !important;
        isolation: isolate !important;
        transform: translateZ(0) !important;
      }
      
      [class*="UserSettingsModal_header"],
      [class*="userSettingsModal_header"] {
        z-index: 2 !important;
        position: sticky !important;
      }
    `;

    const style = document.createElement('style');
    style.textContent = css;
    style.id = 'user-modal-z-index-fix';

    // Удаляем предыдущее исправление если есть
    const existingFix = document.getElementById('user-modal-z-index-fix');
    if (existingFix) {
      existingFix.remove();
    }

    document.head.appendChild(style);

    console.log('✅ Постоянное исправление создано!');
    console.log('📝 CSS правила добавлены в <head>');

    return style;
  },

  // Мониторинг изменений модального окна
  monitorModalChanges() {
    console.log('👀 Запуск мониторинга модального окна...');

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (
              node.nodeType === 1 &&
              node.className &&
              node.className.includes('UserSettingsModal_overlay')
            ) {
              console.log('🔔 Обнаружено новое модальное окно!');
              setTimeout(() => {
                this.applyZIndexFix();
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

    console.log('✅ Мониторинг активен');
    return observer;
  },

  // Полная диагностика
  runFullDiagnostics() {
    console.log('🚀 Запуск полной диагностики модального окна...\n');

    // 1. Проверяем CSS переменные
    const variables = this.checkZIndexVariables();
    console.log('');

    // 2. Ищем модальное окно
    const modal = this.findUserModal();
    console.log('');

    // 3. Анализируем z-index если модальное окно найдено
    if (modal) {
      const zIndexInfo = this.analyzeModalZIndex(modal);
      console.log('');
    }

    // 4. Ищем конфликтующие элементы
    const conflicts = this.findConflictingElements();
    console.log('');

    // 5. Применяем исправление
    const fixed = this.applyZIndexFix();
    console.log('');

    // 6. Создаем постоянное исправление
    this.createPermanentFix();
    console.log('');

    // 7. Запускаем мониторинг
    this.monitorModalChanges();

    console.log('🎉 Диагностика завершена!');
    console.log('📋 Резюме:');
    console.log(`   - CSS переменные: ${variables.userModal ? '✅' : '❌'}`);
    console.log(`   - Модальное окно: ${modal ? '✅' : '❌'}`);
    console.log(`   - Исправление: ${fixed ? '✅' : '❌'}`);
    console.log(`   - Конфликтов найдено: ${conflicts.length}`);
  },
};

// Экспорт для использования в консоли
if (typeof window !== 'undefined') {
  window.modalZIndexDiagnostics = modalZIndexDiagnostics;

  console.log('🔧 Инструмент диагностики модального окна загружен!');
  console.log('📖 Доступные команды:');
  console.log(
    '   modalZIndexDiagnostics.runFullDiagnostics() - полная диагностика'
  );
  console.log(
    '   modalZIndexDiagnostics.applyZIndexFix() - быстрое исправление'
  );
  console.log(
    '   modalZIndexDiagnostics.findUserModal() - найти модальное окно'
  );
  console.log(
    '   modalZIndexDiagnostics.checkZIndexVariables() - проверить переменные'
  );
}

// Автоматический запуск при загрузке
if (typeof window !== 'undefined' && document.readyState === 'complete') {
  console.log('🚀 Автоматический запуск диагностики...');
  modalZIndexDiagnostics.runFullDiagnostics();
}

export default modalZIndexDiagnostics;
