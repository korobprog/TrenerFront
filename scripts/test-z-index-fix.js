/**
 * Тест для проверки исправления проблемы с z-index
 * Проверяет, что модальное окно настроек пользователя отображается поверх элементов главной страницы
 */

// Функция для проверки z-index элементов
function checkZIndexHierarchy() {
  console.log('🔍 Проверка иерархии z-index...');

  // Проверяем CSS переменные
  const rootStyles = getComputedStyle(document.documentElement);
  const userModalZIndex = rootStyles.getPropertyValue('--z-user-modal').trim();
  const userModalHeaderZIndex = rootStyles
    .getPropertyValue('--z-user-modal-header')
    .trim();

  console.log('📊 CSS переменные z-index:');
  console.log(`  --z-user-modal: ${userModalZIndex || 'не найдена'}`);
  console.log(
    `  --z-user-modal-header: ${userModalHeaderZIndex || 'не найдена'}`
  );

  // Проверяем элементы главной страницы
  const mainGrid = document.querySelector('[class*="mainGrid"]');
  const heroTitle = document.querySelector('[class*="heroTitle"]');
  const heroSubtitle = document.querySelector('[class*="heroSubtitle"]');

  if (mainGrid) {
    const mainGridZIndex = getComputedStyle(mainGrid).zIndex;
    console.log(`📄 mainGrid z-index: ${mainGridZIndex}`);
  }

  if (heroTitle) {
    const heroTitleZIndex = getComputedStyle(heroTitle).zIndex;
    console.log(`🏷️ heroTitle z-index: ${heroTitleZIndex}`);
  }

  if (heroSubtitle) {
    const heroSubtitleZIndex = getComputedStyle(heroSubtitle).zIndex;
    console.log(`📝 heroSubtitle z-index: ${heroSubtitleZIndex}`);
  }

  // Проверяем модальное окно (если открыто)
  const modalOverlay = document.querySelector('[class*="overlay"]');
  const modalHeader = document.querySelector('[class*="header"]');

  if (modalOverlay) {
    const overlayZIndex = getComputedStyle(modalOverlay).zIndex;
    console.log(`🔲 Modal overlay z-index: ${overlayZIndex}`);
  }

  if (modalHeader) {
    const headerZIndex = getComputedStyle(modalHeader).zIndex;
    console.log(`📋 Modal header z-index: ${headerZIndex}`);
  }

  return {
    userModalZIndex,
    userModalHeaderZIndex,
    mainGridZIndex: mainGrid ? getComputedStyle(mainGrid).zIndex : 'не найден',
    modalOverlayZIndex: modalOverlay
      ? getComputedStyle(modalOverlay).zIndex
      : 'не найден',
  };
}

// Функция для симуляции открытия модального окна
function simulateModalOpen() {
  console.log('🎭 Симуляция открытия модального окна...');

  // Создаем тестовое модальное окно
  const overlay = document.createElement('div');
  overlay.className = 'test-modal-overlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.6);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: var(--z-user-modal, 9999);
    backdrop-filter: blur(4px);
  `;

  const modal = document.createElement('div');
  modal.className = 'test-modal';
  modal.style.cssText = `
    background: white;
    border-radius: 16px;
    padding: 2rem;
    max-width: 500px;
    width: 90%;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
    position: relative;
  `;

  const header = document.createElement('div');
  header.className = 'test-modal-header';
  header.style.cssText = `
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
    z-index: var(--z-user-modal-header, 10000);
    position: relative;
  `;

  const title = document.createElement('h2');
  title.textContent = 'Тестовое модальное окно';
  title.style.cssText = `
    margin: 0;
    color: #2d3748;
    font-size: 1.5rem;
  `;

  const closeButton = document.createElement('button');
  closeButton.textContent = '✕';
  closeButton.style.cssText = `
    background: none;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    padding: 0.5rem;
    border-radius: 4px;
  `;

  const content = document.createElement('div');
  content.innerHTML = `
    <p style="margin: 0; color: #4a5568; line-height: 1.6;">
      Это тестовое модальное окно для проверки z-index. 
      Оно должно отображаться поверх всех элементов главной страницы, 
      включая заголовок "SuperMock" и описание.
    </p>
    <div style="margin-top: 1rem; padding: 1rem; background: #f7fafc; border-radius: 8px;">
      <strong>Проверьте:</strong>
      <ul style="margin: 0.5rem 0 0 1rem; color: #4a5568;">
        <li>Модальное окно видно полностью</li>
        <li>Заголовок "SuperMock" не перекрывает модальное окно</li>
        <li>Описание не перекрывает модальное окно</li>
        <li>Фон размыт и затемнен</li>
      </ul>
    </div>
  `;

  // Собираем модальное окно
  header.appendChild(title);
  header.appendChild(closeButton);
  modal.appendChild(header);
  modal.appendChild(content);
  overlay.appendChild(modal);

  // Добавляем обработчик закрытия
  closeButton.addEventListener('click', () => {
    document.body.removeChild(overlay);
    console.log('✅ Тестовое модальное окно закрыто');
  });

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      document.body.removeChild(overlay);
      console.log('✅ Тестовое модальное окно закрыто (клик по overlay)');
    }
  });

  // Добавляем на страницу
  document.body.appendChild(overlay);

  // Проверяем z-index после добавления
  setTimeout(() => {
    const overlayZIndex = getComputedStyle(overlay).zIndex;
    const headerZIndex = getComputedStyle(header).zIndex;

    console.log('📊 Z-index тестового модального окна:');
    console.log(`  Overlay: ${overlayZIndex}`);
    console.log(`  Header: ${headerZIndex}`);

    // Проверяем, что модальное окно выше элементов главной страницы
    const mainGrid = document.querySelector('[class*="mainGrid"]');
    if (mainGrid) {
      const mainGridZIndex = getComputedStyle(mainGrid).zIndex;
      const isAbove = parseInt(overlayZIndex) > parseInt(mainGridZIndex);
      console.log(
        `🔍 Модальное окно выше mainGrid: ${isAbove ? '✅ Да' : '❌ Нет'}`
      );
    }
  }, 100);

  console.log('✅ Тестовое модальное окно создано и добавлено на страницу');
}

// Функция для проверки CSS переменных
function checkCSSVariables() {
  console.log('🎨 Проверка CSS переменных...');

  const rootStyles = getComputedStyle(document.documentElement);
  const variables = [
    '--z-base',
    '--z-content',
    '--z-header',
    '--z-user-modal',
    '--z-user-modal-header',
    '--z-critical',
    '--z-emergency',
  ];

  variables.forEach((variable) => {
    const value = rootStyles.getPropertyValue(variable).trim();
    console.log(`  ${variable}: ${value || 'не найдена'}`);
  });
}

// Основная функция тестирования
function runZIndexTest() {
  console.log('🚀 Запуск теста z-index исправления...');
  console.log('=====================================');

  // Проверяем CSS переменные
  checkCSSVariables();
  console.log('');

  // Проверяем текущую иерархию
  const hierarchy = checkZIndexHierarchy();
  console.log('');

  // Создаем кнопку для тестирования модального окна
  const testButton = document.createElement('button');
  testButton.textContent = '🧪 Открыть тестовое модальное окно';
  testButton.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    padding: 1rem 1.5rem;
    border-radius: 8px;
    font-weight: 600;
    cursor: pointer;
    z-index: 1000;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    transition: all 0.2s ease;
  `;

  testButton.addEventListener('click', simulateModalOpen);
  testButton.addEventListener('mouseenter', () => {
    testButton.style.transform = 'translateY(-2px)';
    testButton.style.boxShadow = '0 8px 20px rgba(0, 0, 0, 0.2)';
  });
  testButton.addEventListener('mouseleave', () => {
    testButton.style.transform = 'translateY(0)';
    testButton.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
  });

  document.body.appendChild(testButton);

  console.log(
    '✅ Тест завершен. Используйте кнопку в правом верхнем углу для тестирования модального окна.'
  );

  return hierarchy;
}

// Запускаем тест при загрузке страницы
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', runZIndexTest);
} else {
  runZIndexTest();
}

// Экспортируем функции для ручного тестирования
window.zIndexTest = {
  run: runZIndexTest,
  checkHierarchy: checkZIndexHierarchy,
  simulateModal: simulateModalOpen,
  checkVariables: checkCSSVariables,
};

console.log('📋 Доступные команды:');
console.log('  zIndexTest.run() - запустить полный тест');
console.log('  zIndexTest.checkHierarchy() - проверить иерархию z-index');
console.log('  zIndexTest.simulateModal() - открыть тестовое модальное окно');
console.log('  zIndexTest.checkVariables() - проверить CSS переменные');
