import { useState } from 'react';
import styles from '../../styles/user/ApiSettings.module.css';

/**
 * Компонент формы настроек API
 * @param {Object} props - Свойства компонента
 * @param {Object} props.settings - Текущие настройки API
 * @param {Function} props.onSettingsChange - Функция для обновления настроек
 * @param {Function} props.onSubmit - Функция для отправки формы
 * @param {boolean} props.saving - Флаг, указывающий на процесс сохранения
 * @returns {JSX.Element} Форма настроек API
 */
export default function ApiSettingsForm({
  settings,
  onSettingsChange,
  onSubmit,
  saving,
}) {
  const [showApiKey, setShowApiKey] = useState(false);
  const [showLangdockApiKey, setShowLangdockApiKey] = useState(false);
  const [showGeminiApiKey, setShowGeminiApiKey] = useState(false);
  const [showHuggingfaceApiKey, setShowHuggingfaceApiKey] = useState(false);
  const [showOpenRouterApiKey, setShowOpenRouterApiKey] = useState(false);

  // Обработчик изменения полей формы
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (type === 'checkbox') {
      onSettingsChange({
        ...settings,
        [name]: checked,
      });
    } else if (name === 'apiType') {
      // При изменении типа API обновляем несколько полей
      onSettingsChange({
        ...settings,
        apiType: value,
      });
    } else {
      onSettingsChange({
        ...settings,
        [name]: value,
      });
    }
  };

  return (
    <form onSubmit={onSubmit} className={styles.settingsForm}>
      <div className={styles.formGroup}>
        <div className={styles.checkboxContainer}>
          <input
            type="checkbox"
            id="usePersonalSettings"
            name="usePersonalSettings"
            checked={settings.usePersonalSettings}
            onChange={handleChange}
            className={styles.formCheckbox}
          />
          <label htmlFor="usePersonalSettings" className={styles.checkboxLabel}>
            Использовать персональные настройки API
          </label>
        </div>
        <p className={styles.formHelp}>
          Если включено, будут использоваться ваши персональные настройки API
          вместо общих настроек сервиса
        </p>
      </div>

      {settings.usePersonalSettings && (
        <div className={styles.formGroup}>
          <label htmlFor="apiType" className={styles.formLabel}>
            Тип API
          </label>
          <div className={styles.radioGroup}>
            <div className={styles.radioOption}>
              <input
                type="radio"
                id="apiTypeOpenRouter"
                name="apiType"
                value="openrouter"
                checked={settings.apiType === 'openrouter'}
                onChange={handleChange}
                className={styles.radioInput}
              />
              <label htmlFor="apiTypeOpenRouter" className={styles.radioLabel}>
                OpenRouter API
              </label>
            </div>
          </div>
          <p className={styles.formHelp}>
            Выберите тип API, который вы хотите использовать
          </p>
        </div>
      )}

      {settings.usePersonalSettings && settings.apiType === 'anthropic' && (
        <>
          <div className={styles.formGroup}>
            <label htmlFor="apiKey" className={styles.formLabel}>
              API ключ Anthropic
            </label>
            <div className={styles.apiKeyContainer}>
              <input
                type={showApiKey ? 'text' : 'password'}
                id="apiKey"
                name="apiKey"
                value={settings.apiKey}
                onChange={handleChange}
                className={styles.formInput}
                placeholder="Введите ваш API ключ Anthropic"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className={styles.toggleButton}
              >
                {showApiKey ? '🙈 Скрыть' : '👁️ Показать'}
              </button>
            </div>
            <p className={styles.formHelp}>
              <span className={styles.warningText}>
                Внимание: API ключ является конфиденциальной информацией. Не
                передавайте его третьим лицам.
              </span>
            </p>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="baseUrl" className={styles.formLabel}>
              Базовый URL
            </label>
            <input
              type="url"
              id="baseUrl"
              name="baseUrl"
              value={settings.baseUrl}
              onChange={handleChange}
              className={styles.formInput}
              placeholder="https://api.anthropic.com"
            />
            <p className={styles.formHelp}>
              Базовый URL для API запросов. Оставьте пустым для использования
              URL по умолчанию.
            </p>
          </div>
        </>
      )}

      {settings.usePersonalSettings && settings.apiType === 'langdock' && (
        <>
          <div className={styles.formGroup}>
            <label htmlFor="langdockApiKey" className={styles.formLabel}>
              API ключ LangDock
            </label>
            <div className={styles.apiKeyContainer}>
              <input
                type={showLangdockApiKey ? 'text' : 'password'}
                id="langdockApiKey"
                name="langdockApiKey"
                value={settings.langdockApiKey || ''}
                onChange={handleChange}
                className={styles.formInput}
                placeholder="Введите ваш API ключ LangDock"
              />
              <button
                type="button"
                onClick={() => setShowLangdockApiKey(!showLangdockApiKey)}
                className={styles.toggleButton}
              >
                {showLangdockApiKey ? '🙈 Скрыть' : '👁️ Показать'}
              </button>
            </div>
            <p className={styles.formHelp}>
              <span className={styles.warningText}>
                Внимание: API ключ является конфиденциальной информацией. Не
                передавайте его третьим лицам.
              </span>
            </p>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="langdockAssistantId" className={styles.formLabel}>
              ID ассистента LangDock (опционально)
            </label>
            <input
              type="text"
              id="langdockAssistantId"
              name="langdockAssistantId"
              value={settings.langdockAssistantId || ''}
              onChange={handleChange}
              className={styles.formInput}
              placeholder="Введите ID ассистента LangDock"
            />
            <p className={styles.formHelp}>
              ID ассистента LangDock для использования в запросах. Оставьте
              пустым, чтобы использовать ID ассистента по умолчанию.
            </p>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="langdockBaseUrl" className={styles.formLabel}>
              Базовый URL LangDock
            </label>
            <input
              type="url"
              id="langdockBaseUrl"
              name="langdockBaseUrl"
              value={settings.langdockBaseUrl || ''}
              onChange={handleChange}
              className={styles.formInput}
              placeholder="https://api.langdock.com/assistant/v1/chat/completions"
            />
            <p className={styles.formHelp}>
              Базовый URL для API запросов LangDock. Оставьте пустым для
              использования URL по умолчанию.
            </p>
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="langdockRegion" className={styles.formLabel}>
              Регион LangDock
            </label>
            <select
              id="langdockRegion"
              name="langdockRegion"
              value={settings.langdockRegion || 'eu'}
              onChange={handleChange}
              className={styles.formInput}
            >
              <option value="eu">Европа (EU)</option>
              <option value="us">США (US)</option>
            </select>
            <p className={styles.formHelp}>
              Выберите регион для API запросов LangDock. Влияет на формирование
              базового URL.
            </p>
          </div>
        </>
      )}

      {settings.usePersonalSettings && settings.apiType === 'gemini' && (
        <>
          <div className={styles.formGroup}>
            <label htmlFor="geminiApiKey" className={styles.formLabel}>
              API ключ Google Gemini
            </label>
            <div className={styles.apiKeyContainer}>
              <input
                type={showGeminiApiKey ? 'text' : 'password'}
                id="geminiApiKey"
                name="geminiApiKey"
                value={settings.geminiApiKey || ''}
                onChange={handleChange}
                className={styles.formInput}
                placeholder="Введите ваш API ключ Google Gemini"
              />
              <button
                type="button"
                onClick={() => setShowGeminiApiKey(!showGeminiApiKey)}
                className={styles.toggleButton}
              >
                {showGeminiApiKey ? '🙈 Скрыть' : '👁️ Показать'}
              </button>
            </div>
            <p className={styles.formHelp}>
              <span className={styles.warningText}>
                Внимание: API ключ является конфиденциальной информацией. Не
                передавайте его третьим лицам.
              </span>
            </p>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="geminiModel" className={styles.formLabel}>
              Модель Gemini
            </label>
            <select
              id="geminiModel"
              name="geminiModel"
              value={settings.geminiModel || 'gemini-1.5-flash'}
              onChange={handleChange}
              className={styles.formInput}
            >
              <option value="gemini-1.5-flash">
                gemini-1.5-flash (бесплатная)
              </option>
              <option value="gemini-1.5-pro">gemini-1.5-pro</option>
              <option value="gemini-1.0-pro">gemini-1.0-pro</option>
              <option value="gemini-pro">gemini-pro</option>
              <option value="gemini-pro-vision">gemini-pro-vision</option>
            </select>
            <p className={styles.formHelp}>
              Выберите модель Gemini для использования в запросах.
            </p>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="geminiBaseUrl" className={styles.formLabel}>
              Базовый URL Gemini API
            </label>
            <input
              type="url"
              id="geminiBaseUrl"
              name="geminiBaseUrl"
              value={settings.geminiBaseUrl || ''}
              onChange={handleChange}
              className={styles.formInput}
              placeholder="https://generativelanguage.googleapis.com"
            />
            <p className={styles.formHelp}>
              Базовый URL для API запросов Gemini. Оставьте пустым для
              использования URL по умолчанию.
            </p>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="geminiTemperature" className={styles.formLabel}>
              Температура генерации ({settings.geminiTemperature || 0.7})
            </label>
            <input
              type="range"
              id="geminiTemperature"
              name="geminiTemperature"
              min="0"
              max="1"
              step="0.1"
              value={settings.geminiTemperature || 0.7}
              onChange={handleChange}
              className={styles.formInput}
            />
            <p className={styles.formHelp}>
              Температура влияет на случайность генерации. Низкие значения
              делают ответы более предсказуемыми, высокие - более творческими.
            </p>
          </div>
        </>
      )}

      {settings.usePersonalSettings && settings.apiType === 'huggingface' && (
        <>
          <div className={styles.formGroup}>
            <label htmlFor="huggingfaceApiKey" className={styles.formLabel}>
              API ключ Hugging Face
            </label>
            <div className={styles.apiKeyContainer}>
              <input
                type={showHuggingfaceApiKey ? 'text' : 'password'}
                id="huggingfaceApiKey"
                name="huggingfaceApiKey"
                value={settings.huggingfaceApiKey || ''}
                onChange={handleChange}
                className={styles.formInput}
                placeholder="Введите ваш API ключ Hugging Face"
              />
              <button
                type="button"
                onClick={() => setShowHuggingfaceApiKey(!showHuggingfaceApiKey)}
                className={styles.toggleButton}
              >
                {showHuggingfaceApiKey ? '🙈 Скрыть' : '👁️ Показать'}
              </button>
            </div>
            <p className={styles.formHelp}>
              <span className={styles.warningText}>
                Внимание: API ключ является конфиденциальной информацией. Не
                передавайте его третьим лицам.
              </span>
            </p>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="huggingfaceModel" className={styles.formLabel}>
              Модель Hugging Face
            </label>
            <select
              id="huggingfaceModel"
              name="huggingfaceModel"
              value={settings.huggingfaceModel || 'bigcode/starcoder2-7b'}
              onChange={handleChange}
              className={styles.formInput}
            >
              <option value="bigcode/starcoder2-7b">
                bigcode/starcoder2-7b (для программирования, поддерживает
                русский)
              </option>
              <option value="meta-llama/Meta-Llama-3-8B-Instruct">
                meta-llama/Meta-Llama-3-8B-Instruct
              </option>
              <option value="mistralai/Mistral-7B-Instruct-v0.2">
                mistralai/Mistral-7B-Instruct-v0.2
              </option>
              <option value="meta-llama/Llama-2-7b-chat-hf">
                meta-llama/Llama-2-7b-chat-hf (универсальная)
              </option>
              <option value="gpt2">gpt2</option>
              <option value="distilgpt2">distilgpt2</option>
              <option value="facebook/bart-base">facebook/bart-base</option>
              <option value="google/flan-t5-small">google/flan-t5-small</option>
              <option value="gpt2-medium">gpt2-medium</option>
              <option value="EleutherAI/gpt-neo-125M">
                EleutherAI/gpt-neo-125M
              </option>
              <option value="microsoft/DialoGPT-small">
                microsoft/DialoGPT-small
              </option>
            </select>
            <p className={styles.formHelp}>
              Выберите модель Hugging Face для использования в запросах.
            </p>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="huggingfaceBaseUrl" className={styles.formLabel}>
              Базовый URL Hugging Face API
            </label>
            <input
              type="url"
              id="huggingfaceBaseUrl"
              name="huggingfaceBaseUrl"
              value={settings.huggingfaceBaseUrl || ''}
              onChange={handleChange}
              className={styles.formInput}
              placeholder="https://api-inference.huggingface.co/models"
            />
            <p className={styles.formHelp}>
              Базовый URL для API запросов Hugging Face. Оставьте пустым для
              использования URL по умолчанию.
            </p>
          </div>

          <div className={styles.formGroup}>
            <label
              htmlFor="huggingfaceTemperature"
              className={styles.formLabel}
            >
              Температура генерации ({settings.huggingfaceTemperature || 0.7})
            </label>
            <input
              type="range"
              id="huggingfaceTemperature"
              name="huggingfaceTemperature"
              min="0"
              max="1"
              step="0.1"
              value={settings.huggingfaceTemperature || 0.7}
              onChange={handleChange}
              className={styles.formInput}
            />
            <p className={styles.formHelp}>
              Температура влияет на случайность генерации. Низкие значения
              делают ответы более предсказуемыми, высокие - более творческими.
            </p>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="huggingfaceMaxTokens" className={styles.formLabel}>
              Максимальное количество токенов
            </label>
            <input
              type="number"
              id="huggingfaceMaxTokens"
              name="huggingfaceMaxTokens"
              min="1"
              max="8000"
              value={settings.huggingfaceMaxTokens || 4000}
              onChange={handleChange}
              className={styles.formInput}
            />
            <p className={styles.formHelp}>
              Максимальное количество токенов для генерации ответа.
            </p>
          </div>
        </>
      )}

      {settings.usePersonalSettings && settings.apiType === 'openrouter' && (
        <>
          <div className={styles.formGroup}>
            <label htmlFor="openRouterApiKey" className={styles.formLabel}>
              API ключ OpenRouter
            </label>
            <div className={styles.apiKeyContainer}>
              <input
                type={showOpenRouterApiKey ? 'text' : 'password'}
                id="openRouterApiKey"
                name="openRouterApiKey"
                value={settings.openRouterApiKey || ''}
                onChange={handleChange}
                className={styles.formInput}
                placeholder="Введите ваш API ключ OpenRouter"
              />
              <button
                type="button"
                onClick={() => setShowOpenRouterApiKey(!showOpenRouterApiKey)}
                className={styles.toggleButton}
              >
                {showOpenRouterApiKey ? '🙈 Скрыть' : '👁️ Показать'}
              </button>
            </div>
            <p className={styles.formHelp}>
              <span className={styles.warningText}>
                Внимание: API ключ является конфиденциальной информацией. Не
                передавайте его третьим лицам.
              </span>
            </p>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="openRouterModel" className={styles.formLabel}>
              Модель OpenRouter
            </label>
            <select
              id="openRouterModel"
              name="openRouterModel"
              value={settings.openRouterModel || 'google/gemma-3-12b-it:free'}
              onChange={handleChange}
              className={styles.formInput}
            >
              <option value="google/gemma-3-12b-it:free">
                google/gemma-3-12b-it:free (бесплатная)
              </option>
              <option value="anthropic/claude-3-opus:beta">
                anthropic/claude-3-opus:beta
              </option>
              <option value="anthropic/claude-3-sonnet:beta">
                anthropic/claude-3-sonnet:beta
              </option>
              <option value="anthropic/claude-3-haiku:beta">
                anthropic/claude-3-haiku:beta
              </option>
              <option value="meta-llama/llama-3-70b-instruct:free">
                meta-llama/llama-3-70b-instruct:free
              </option>
              <option value="meta-llama/llama-3-8b-instruct:free">
                meta-llama/llama-3-8b-instruct:free
              </option>
            </select>
            <p className={styles.formHelp}>
              Выберите модель OpenRouter для использования в запросах.
            </p>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="openRouterBaseUrl" className={styles.formLabel}>
              Базовый URL OpenRouter API
            </label>
            <input
              type="url"
              id="openRouterBaseUrl"
              name="openRouterBaseUrl"
              value={settings.openRouterBaseUrl || ''}
              onChange={handleChange}
              className={styles.formInput}
              placeholder="https://openrouter.ai/api/v1"
            />
            <p className={styles.formHelp}>
              Базовый URL для API запросов OpenRouter. Оставьте пустым для
              использования URL по умолчанию.
            </p>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="openRouterTemperature" className={styles.formLabel}>
              Температура генерации ({settings.openRouterTemperature || 0.7})
            </label>
            <input
              type="range"
              id="openRouterTemperature"
              name="openRouterTemperature"
              min="0"
              max="1"
              step="0.1"
              value={settings.openRouterTemperature || 0.7}
              onChange={handleChange}
              className={styles.formInput}
            />
            <p className={styles.formHelp}>
              Температура влияет на случайность генерации. Низкие значения
              делают ответы более предсказуемыми, высокие - более творческими.
            </p>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="openRouterMaxTokens" className={styles.formLabel}>
              Максимальное количество токенов
            </label>
            <input
              type="number"
              id="openRouterMaxTokens"
              name="openRouterMaxTokens"
              min="1"
              max="8000"
              value={settings.openRouterMaxTokens || 4000}
              onChange={handleChange}
              className={styles.formInput}
            />
            <p className={styles.formHelp}>
              Максимальное количество токенов для генерации ответа.
            </p>
          </div>
        </>
      )}

      <div className={styles.infoBlock}>
        <h3 className={styles.infoTitle}>Как получить API ключ</h3>
        {settings.apiType === 'gemini' ? (
          <ol className={styles.infoList}>
            <li>Зарегистрируйтесь на сайте Google AI Studio (ai.google.dev)</li>
            <li>Перейдите в раздел "API Keys" в личном кабинете</li>
            <li>Нажмите кнопку "Create API key"</li>
            <li>Скопируйте сгенерированный ключ и вставьте его в поле выше</li>
            <li>
              Убедитесь, что у вас активирован доступ к выбранной модели Gemini
            </li>
          </ol>
        ) : settings.apiType === 'openrouter' ? (
          <ol className={styles.infoList}>
            <li>Зарегистрируйтесь на сайте OpenRouter (openrouter.ai)</li>
            <li>Перейдите в раздел "API Keys" в личном кабинете</li>
            <li>Нажмите кнопку "Create API key"</li>
            <li>Скопируйте сгенерированный ключ и вставьте его в поле выше</li>
            <li>
              Модель google/gemma-3-12b-it:free доступна бесплатно без
              необходимости привязки кредитной карты
            </li>
          </ol>
        ) : settings.apiType === 'langdock' ? (
          <ol className={styles.infoList}>
            <li>Зарегистрируйтесь на сайте LangDock</li>
            <li>Перейдите в раздел "API Keys" в личном кабинете</li>
            <li>Нажмите кнопку "Create new API key"</li>
            <li>Скопируйте сгенерированный ключ и вставьте его в поле выше</li>
            <li>
              Для получения ID ассистента создайте нового ассистента в разделе
              "Assistants"
            </li>
          </ol>
        ) : settings.apiType === 'huggingface' ? (
          <ol className={styles.infoList}>
            <li>Зарегистрируйтесь на сайте Hugging Face (huggingface.co)</li>
            <li>
              Перейдите в раздел "Settings" → "Access Tokens" в личном кабинете
            </li>
            <li>Нажмите кнопку "New token"</li>
            <li>Введите название токена и выберите роль "Read"</li>
            <li>Скопируйте сгенерированный токен и вставьте его в поле выше</li>
            <li>
              Для использования моделей Llama-2 вам может потребоваться
              запросить доступ на странице модели
            </li>
          </ol>
        ) : (
          <ol className={styles.infoList}>
            <li>Зарегистрируйтесь на сайте Anthropic</li>
            <li>Перейдите в раздел "API Keys" в личном кабинете</li>
            <li>Нажмите кнопку "Create new API key"</li>
            <li>Скопируйте сгенерированный ключ и вставьте его в поле выше</li>
          </ol>
        )}
        <p className={styles.infoText}>
          Подробную информацию о работе с API вы можете найти в{' '}
          <a
            href={
              settings.apiType === 'gemini'
                ? 'https://ai.google.dev/docs'
                : settings.apiType === 'langdock'
                ? 'https://docs.langdock.com'
                : settings.apiType === 'huggingface'
                ? 'https://huggingface.co/docs/api-inference/index'
                : settings.apiType === 'openrouter'
                ? 'https://openrouter.ai/docs'
                : 'https://docs.anthropic.com'
            }
            target="_blank"
            rel="noopener noreferrer"
            className={styles.externalLink}
          >
            документации
          </a>
        </p>
      </div>

      <div className={styles.formActions}>
        <button
          type="submit"
          className={styles.saveButton}
          disabled={saving || !settings.usePersonalSettings}
        >
          {saving ? 'Сохранение...' : 'Сохранить настройки'}
        </button>
      </div>
    </form>
  );
}
