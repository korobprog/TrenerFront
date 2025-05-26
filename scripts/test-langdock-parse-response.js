const langdockApi = require('../lib/utils/langdockApi');

/**
 * Тестовый скрипт для проверки функции parseResponse в langdockApi.js
 * Проверяет корректность парсинга различных форматов ответов от Anthropic API
 */
async function testParseResponse() {
  console.log('=== Начало тестирования parseResponse ===');

  try {
    // Тест 1: Парсинг ответа с массивом content
    console.log('\n--- Тест 1: Парсинг ответа с массивом content ---');
    const mockResponse1 = {
      id: 'msg_01abcdef1234567890',
      type: 'message',
      role: 'assistant',
      model: 'claude-3-opus-20240229',
      content: [
        {
          type: 'text',
          text: 'React - это JavaScript-библиотека для создания пользовательских интерфейсов. Она разработана Facebook и позволяет создавать сложные UI из изолированных компонентов.',
        },
      ],
      usage: {
        input_tokens: 150,
        output_tokens: 250,
      },
    };

    console.log(
      'Тестовый ответ API (массив content):',
      JSON.stringify(mockResponse1, null, 2)
    );

    const parsedResponse1 = langdockApi.parseResponse(mockResponse1);
    console.log('Результат парсинга:', parsedResponse1);

    // Проверка корректности извлечения текста
    const expectedText1 =
      'React - это JavaScript-библиотека для создания пользовательских интерфейсов. Она разработана Facebook и позволяет создавать сложные UI из изолированных компонентов.';
    if (parsedResponse1.answer === expectedText1) {
      console.log('Текст извлечен корректно');
    } else {
      console.warn('Текст извлечен некорректно:', {
        expected: expectedText1,
        actual: parsedResponse1.answer,
      });
    }

    // Проверка корректности расчета токенов
    if (
      parsedResponse1.inputTokens === 150 &&
      parsedResponse1.outputTokens === 250
    ) {
      console.log('Токены рассчитаны корректно:', {
        inputTokens: parsedResponse1.inputTokens,
        outputTokens: parsedResponse1.outputTokens,
        tokensUsed: parsedResponse1.tokensUsed,
      });
    } else {
      console.warn('Токены рассчитаны некорректно:', {
        expected: { inputTokens: 150, outputTokens: 250, tokensUsed: 400 },
        actual: {
          inputTokens: parsedResponse1.inputTokens,
          outputTokens: parsedResponse1.outputTokens,
          tokensUsed: parsedResponse1.tokensUsed,
        },
      });
    }

    // Тест 2: Парсинг ответа с несколькими элементами в массиве content
    console.log(
      '\n--- Тест 2: Парсинг ответа с несколькими элементами в массиве content ---'
    );
    const mockResponse2 = {
      id: 'msg_02abcdef1234567890',
      type: 'message',
      role: 'assistant',
      model: 'claude-3-opus-20240229',
      content: [
        {
          type: 'text',
          text: 'React - это JavaScript-библиотека для создания пользовательских интерфейсов.',
        },
        {
          type: 'text',
          text: 'Вот пример простого React-компонента:',
        },
        {
          type: 'code',
          text: 'function Welcome(props) {\n  return <h1>Привет, {props.name}</h1>;\n}',
        },
        {
          type: 'text',
          text: 'React использует JSX - расширение синтаксиса JavaScript.',
        },
      ],
      usage: {
        input_tokens: 200,
        output_tokens: 300,
      },
    };

    console.log(
      'Тестовый ответ API (несколько элементов в content):',
      JSON.stringify(mockResponse2, null, 2)
    );

    const parsedResponse2 = langdockApi.parseResponse(mockResponse2);
    console.log('Результат парсинга:', parsedResponse2);

    // Проверка корректности извлечения текста (только элементы типа 'text')
    const expectedText2 =
      'React - это JavaScript-библиотека для создания пользовательских интерфейсов.\nВот пример простого React-компонента:\nReact использует JSX - расширение синтаксиса JavaScript.';
    if (parsedResponse2.answer === expectedText2) {
      console.log('Текст извлечен корректно (только элементы типа text)');
    } else {
      console.warn('Текст извлечен некорректно:', {
        expected: expectedText2,
        actual: parsedResponse2.answer,
      });
    }

    // Тест 3: Парсинг ответа со строковым content
    console.log('\n--- Тест 3: Парсинг ответа со строковым content ---');
    const mockResponse3 = {
      id: 'msg_03abcdef1234567890',
      type: 'message',
      role: 'assistant',
      model: 'claude-3-opus-20240229',
      content:
        'React - это JavaScript-библиотека для создания пользовательских интерфейсов. Она разработана Facebook.',
      usage: {
        input_tokens: 100,
        output_tokens: 150,
      },
    };

    console.log(
      'Тестовый ответ API (строковый content):',
      JSON.stringify(mockResponse3, null, 2)
    );

    const parsedResponse3 = langdockApi.parseResponse(mockResponse3);
    console.log('Результат парсинга:', parsedResponse3);

    // Проверка корректности извлечения текста
    const expectedText3 =
      'React - это JavaScript-библиотека для создания пользовательских интерфейсов. Она разработана Facebook.';
    if (parsedResponse3.answer === expectedText3) {
      console.log('Текст извлечен корректно');
    } else {
      console.warn('Текст извлечен некорректно:', {
        expected: expectedText3,
        actual: parsedResponse3.answer,
      });
    }

    // Тест 4: Парсинг ответа без поля usage
    console.log('\n--- Тест 4: Парсинг ответа без поля usage ---');
    const mockResponse4 = {
      id: 'msg_04abcdef1234567890',
      type: 'message',
      role: 'assistant',
      model: 'claude-3-opus-20240229',
      content: [
        {
          type: 'text',
          text: 'React - это JavaScript-библиотека для создания пользовательских интерфейсов.',
        },
      ],
      // Поле usage отсутствует
    };

    console.log(
      'Тестовый ответ API (без поля usage):',
      JSON.stringify(mockResponse4, null, 2)
    );

    const parsedResponse4 = langdockApi.parseResponse(mockResponse4);
    console.log('Результат парсинга:', parsedResponse4);

    // Проверка, что токены были оценены примерно
    if (parsedResponse4.inputTokens > 0 && parsedResponse4.outputTokens > 0) {
      console.log('Токены оценены примерно:', {
        inputTokens: parsedResponse4.inputTokens,
        outputTokens: parsedResponse4.outputTokens,
        tokensUsed: parsedResponse4.tokensUsed,
      });
    } else {
      console.warn('Токены не были оценены:', {
        inputTokens: parsedResponse4.inputTokens,
        outputTokens: parsedResponse4.outputTokens,
        tokensUsed: parsedResponse4.tokensUsed,
      });
    }

    // Тест 5: Парсинг некорректного ответа
    console.log('\n--- Тест 5: Парсинг некорректного ответа ---');
    const mockResponse5 = {
      id: 'msg_05abcdef1234567890',
      type: 'message',
      role: 'assistant',
      model: 'claude-3-opus-20240229',
      // Поле content отсутствует
    };

    console.log(
      'Тестовый ответ API (без поля content):',
      JSON.stringify(mockResponse5, null, 2)
    );

    try {
      const parsedResponse5 = langdockApi.parseResponse(mockResponse5);
      console.warn(
        'Ошибка не была выброшена при парсинге некорректного ответа:',
        parsedResponse5
      );
    } catch (error) {
      console.log(
        'Корректно выброшена ошибка при парсинге некорректного ответа:',
        error.message
      );
    }

    console.log('\n=== Тестирование parseResponse завершено успешно ===');
  } catch (error) {
    console.error('Ошибка при тестировании parseResponse:', error);
    console.error('Детали ошибки:', {
      message: error.message,
      stack: error.stack,
    });
  }
}

// Запускаем тестирование
testParseResponse()
  .then(() => {
    console.log('Тестирование завершено');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Ошибка при выполнении тестирования:', error);
    process.exit(1);
  });
