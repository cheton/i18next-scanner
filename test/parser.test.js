import fs from 'fs';
import path from 'path';
import sha1 from 'sha1';
import Parser from '../src/parser';

test('set merges defaults', () => {
  const parser = new Parser({
    ns: ['translation']
  });
  parser.set('key1', { defaultValue: 'Default text' });
  parser.set('key1');
  expect(parser.get('key1')).toEqual('Default text');

  parser.set('key2');
  parser.set('key2', { defaultValue: 'Default text' });
  expect(parser.get('key2')).toEqual('Default text');
});

test('set merges defaults (plural case)', () => {
  const parser = new Parser({
    ns: ['translation']
  });
  parser.set('key1', { defaultValue: 'Default text', defaultValue_plural: 'Default plural text', count: 2 });
  parser.set('key1');
  parser.set('key1_plural');
  expect(parser.get('key1')).toEqual('Default text');
  expect(parser.get('key1_plural')).toEqual('Default plural text');

  parser.set('key2');
  parser.set('key2_plural');
  parser.set('key2', { defaultValue: 'Default text', defaultValue_plural: 'Default plural text', count: 2 });
  expect(parser.get('key2')).toEqual('Default text');
  expect(parser.get('key2_plural')).toEqual('Default plural text');
});

test('set merges defaults (plural case without default plural value)', () => {
  const parser = new Parser({
    ns: ['translation']
  });
  parser.set('key2', { count: 2 });
  expect(parser.get('key2_plural')).toEqual('');
  parser.set('key2', { defaultValue: 'Default text', count: 2 });
  expect(parser.get('key2_plural')).toEqual('Default text');
});

test('set warns about conflicting defaults', () => {
  const parser = new Parser({
    ns: ['translation']
  });
  let logText;
  parser.log = (msg) => {
    logText = msg;
  };
  parser.set('key', { defaultValue: 'Default text' });
  parser.set('key', { defaultValue: 'Another text' });
  expect(parser.get('key')).toEqual('Default text');
  expect(logText).toMatch(/different default value/);
});

test('set warns about conflicting defaults (plural case)', () => {
  const parser = new Parser({
    ns: ['translation']
  });
  let logText;
  parser.log = (msg) => {
    logText = msg;
  };
  parser.set('key', { defaultValue: 'Default text', defaultValue_plural: 'Default plural text', count: 2 });
  parser.set('key', { defaultValue: 'Default text', defaultValue_plural: 'Another plural text', count: 2 });
  expect(parser.get('key')).toEqual('Default text');
  expect(parser.get('key_plural')).toEqual('Default plural text');
  expect(logText).toMatch(/different default value/);
});

describe('Namespace is undefined', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  test('Skip undefined namespace', () => {
    const parser = new Parser({
      ns: ['translation']
    });
    const content = `
      i18next.t('none:key2'); // "none" does not exist in the namespaces
      i18next.t('key1');
    `;
    const wanted = {
      en: {
        translation: {
          key1: ''
        }
      }
    };

    parser.parseFuncFromString(content);
    expect(parser.get()).toEqual(wanted);
  });
});

test('Parse translation function', () => {
  const parser = new Parser({
    lngs: ['en'],
    fallbackLng: 'en'
  });
  const customHandler = function(key) {
    const defaultValue = '__TRANSLATION__'; // optional default value
    parser.set(key, defaultValue);
  };

  // i18next.t('key');
  const content = fs.readFileSync(path.resolve(__dirname, 'fixtures/app.js'), 'utf-8');
  parser
    .parseFuncFromString(content, customHandler) // pass a custom handler
    .parseFuncFromString(content, { list: ['i18next.t'] }) // override `func.list`
    .parseFuncFromString(content, { list: ['i18next.t'] }, customHandler)
    .parseFuncFromString(content); // using default options and handler

  expect(parser.get()).toEqual({
    en: {
      translation: {
        'key2': '__TRANSLATION__',
        'key1': '__TRANSLATION__'
      }
    }
  });

  // Sort keys in alphabetical order
  expect(JSON.stringify(parser.get({ sort: true }))).toEqual(JSON.stringify({
    en: {
      translation: {
        'key1': '__TRANSLATION__',
        'key2': '__TRANSLATION__'
      }
    }
  }));

  expect(parser.get('key1', { lng: 'en' })).toBe('__TRANSLATION__');
  expect(parser.get('key1', { lng: 'de' })).toBe(undefined);
  expect(parser.get('nokey', { lng: 'en' })).toBe(undefined);
});

test('Parse Trans components', () => {
  const parser = new Parser({
    lngs: ['en'],
    ns: [
      'dev',
      'translation'
    ],
    trans: {
      fallbackKey: true
    },
    nsSeparator: false,
    keySeparator: '.', // Specify the keySeparator for this test to make sure the fallbackKey won't be separated
    fallbackLng: 'en'
  });

  const content = fs.readFileSync(path.resolve(__dirname, 'fixtures/trans.jsx'), 'utf-8');
  parser.parseTransFromString(content);
  expect(parser.get()).toEqual({
    en: {
      dev: {
        'Hello <strong>World</strong>, you have {{count}} unread message.': 'Hello <strong>World</strong>, you have {{count}} unread message.',
        'Hello <strong>World</strong>, you have {{count}} unread message._plural': 'Hello <strong>World</strong>, you have {{count}} unread message.'
      },
      translation: {
        // quote style
        'jsx-quotes-double': 'Use double quotes for the i18nKey attribute',
        'jsx-quotes-single': 'Use single quote for the i18nKey attribute',

        // HTML encoded tags like: `&lt; &amp; &gt;` should be unescaped, to become: `< & >`
        'html-encoded-tags': '< & >',

        // plural
        'plural': 'You have {{count}} apples',
        'plural_plural': 'You have {{count}} apples',

        // context
        'context': 'A boyfriend',
        'context_male': 'A boyfriend',

        // i18nKey
        'multiline-text-string': 'multiline text string',
        'string-literal': 'This is a <strong>test</strong>',
        'object-expression': 'This is a <1>{{test}}</1>',
        'object-expression-with-format': 'Interpolation + custom formatter Trans <1>{{test, currency(.00/w)}}</1>',
        'arithmetic-expression': '2 + 2 = {{result}}',
        'components': 'Go to <1>Administration > Tools</1> to download administrative tools.',

        "lorem-ipsum": "<p>Lorem Ipsum is simply dummy text of the printing and typesetting industry.</p>Lorem Ipsum is simply dummy text of the printing and typesetting industry.<p>Lorem Ipsum has been the industry's standard dummy text ever since the 1500s</p>",
        "lorem-ipsum-nested": "Lorem Ipsum is simply dummy text of the printing and typesetting industry.<1>Lorem Ipsum is simply dummy text of the printing and typesetting industry.<p>Lorem Ipsum is simply dummy text of the printing and typesetting industry.</p></1><p>Lorem Ipsum has been the industry's standard dummy text ever since the 1500s</p>",

        // fallback key
        'Hello, World!': 'Hello, World!',
        'multiline text string': 'multiline text string',
        'This is a <strong>test</strong>': 'This is a <strong>test</strong>',
        'This is a <1>{{test}}</1>': 'This is a <1>{{test}}</1>',
        '2 + 2 = {{result}}': '2 + 2 = {{result}}',
        'Go to <1>Administration > Tools</1> to download administrative tools.': 'Go to <1>Administration > Tools</1> to download administrative tools.',
        "<p>Lorem Ipsum is simply dummy text of the printing and typesetting industry.</p>Lorem Ipsum is simply dummy text of the printing and typesetting industry.<p>Lorem Ipsum has been the industry's standard dummy text ever since the 1500s</p>": "<p>Lorem Ipsum is simply dummy text of the printing and typesetting industry.</p>Lorem Ipsum is simply dummy text of the printing and typesetting industry.<p>Lorem Ipsum has been the industry's standard dummy text ever since the 1500s</p>",
        "Lorem Ipsum is simply dummy text of the printing and typesetting industry.<1>Lorem Ipsum is simply dummy text of the printing and typesetting industry.<p>Lorem Ipsum is simply dummy text of the printing and typesetting industry.</p></1><p>Lorem Ipsum has been the industry's standard dummy text ever since the 1500s</p>": "Lorem Ipsum is simply dummy text of the printing and typesetting industry.<1>Lorem Ipsum is simply dummy text of the printing and typesetting industry.<p>Lorem Ipsum is simply dummy text of the printing and typesetting industry.</p></1><p>Lorem Ipsum has been the industry's standard dummy text ever since the 1500s</p>",

        // defaults
        'The component might be self-closing': 'The component might be self-closing',
        'Some <0>{variable}</0>': 'Some <0>{variable}</0>',
        'Hello <1>{{planet}}</1>!': 'Hello <1>{{planet}}</1>!',

        // props
        'translation from props': 'translation from props',
        'translation from nested props': 'translation from nested props',
        'translation from deeply nested props': 'translation from deeply nested props',
        'tooltip1': 'Some tooltip text',
        'tooltip2': 'Some tooltip text'
      }
    }
  });
});

test('Parse Trans components with fallback key', () => {
  const parser = new Parser({
    lngs: ['en'],
    ns: [
      'dev',
      'translation'
    ],
    trans: {
      fallbackKey: (ns, value) => {
        return sha1(value); // return a sha1 as the key
      }
    },
    nsSeparator: false,
    keySeparator: '.', // Specify the keySeparator for this test to make sure the fallbackKey won't be separated
    fallbackLng: 'en'
  });

  const content = fs.readFileSync(path.resolve(__dirname, 'fixtures/trans.jsx'), 'utf-8');
  parser.parseTransFromString(content);
  expect(parser.get()).toEqual({
    en: {
      dev: {
        "2f9bdac18af14a38ed4c147f8076c70b740c2ca6": "Hello <strong>World</strong>, you have {{count}} unread message.",
        "2f9bdac18af14a38ed4c147f8076c70b740c2ca6_plural": "Hello <strong>World</strong>, you have {{count}} unread message.",
      },
      translation: {
        // quote style
        'jsx-quotes-double': 'Use double quotes for the i18nKey attribute',
        'jsx-quotes-single': 'Use single quote for the i18nKey attribute',

        // HTML encoded tags like: `&lt; &amp; &gt;` should be unescaped, to become: `< & >`
        'html-encoded-tags': '< & >',

        // plural
        'plural': 'You have {{count}} apples',
        'plural_plural': 'You have {{count}} apples',

        // context
        'context': 'A boyfriend',
        'context_male': 'A boyfriend',

        // i18nKey
        'multiline-text-string': 'multiline text string',
        "string-literal": "This is a <strong>test</strong>",
        "object-expression": "This is a <1>{{test}}</1>",
        "object-expression-with-format": "Interpolation + custom formatter Trans <1>{{test, currency(.00/w)}}</1>",
        'arithmetic-expression': '2 + 2 = {{result}}',
        'components': 'Go to <1>Administration > Tools</1> to download administrative tools.',
        "lorem-ipsum": "<p>Lorem Ipsum is simply dummy text of the printing and typesetting industry.</p>Lorem Ipsum is simply dummy text of the printing and typesetting industry.<p>Lorem Ipsum has been the industry's standard dummy text ever since the 1500s</p>",
        "lorem-ipsum-nested": "Lorem Ipsum is simply dummy text of the printing and typesetting industry.<1>Lorem Ipsum is simply dummy text of the printing and typesetting industry.<p>Lorem Ipsum is simply dummy text of the printing and typesetting industry.</p></1><p>Lorem Ipsum has been the industry's standard dummy text ever since the 1500s</p>",

        // fallback key
        '0a0a9f2a6772942557ab5355d76af442f8f65e01': 'Hello, World!',
        '32876cbad378f3153c900c297ed2efa06243e0e2': 'multiline text string',
        "e2eff612e7754fb3954034c9be7e600a0456b84b": "This is a <strong>test</strong>",
        "49794e6e13cb1be2987c790d7e6d21f724cc3d5b": "This is a <1>{{test}}</1>",
        'd9ad3431d982619e3b7bd34ed248205312e95bff': '2 + 2 = {{result}}',
        '083eac6b4f73ec317824caaaeea57fba3b83c1d9': 'Go to <1>Administration > Tools</1> to download administrative tools.',
        "11a5b6b7b39fc588da3a1a82d77051bc0e80ad71": "<p>Lorem Ipsum is simply dummy text of the printing and typesetting industry.</p>Lorem Ipsum is simply dummy text of the printing and typesetting industry.<p>Lorem Ipsum has been the industry's standard dummy text ever since the 1500s</p>",
        "5bdc93d2ec3db7b40698abcdfcd5dbd53ef3620b": "Lorem Ipsum is simply dummy text of the printing and typesetting industry.<1>Lorem Ipsum is simply dummy text of the printing and typesetting industry.<p>Lorem Ipsum is simply dummy text of the printing and typesetting industry.</p></1><p>Lorem Ipsum has been the industry's standard dummy text ever since the 1500s</p>",

        // defaults
        '7551746c2d33a1d0a24658c22821c8700fa58a0d': 'Hello <1>{{planet}}</1>!',
        '253344d83465052dd6573c8c0abcd76f02fc3a97': 'Some <0>{variable}</0>',
        '7e514af8f77b74e74f86dc22a2cb173680462e34': 'The component might be self-closing',

        // props
        'c38f91deba88fc3bb582cc73dc658210324b01ec': 'translation from props',
        '5bf216b4068991e3a2f5e55ae36c03add490a63f': 'translation from nested props',
        '6fadff01c49d0ebe862a3aa33688735c03728197': 'translation from deeply nested props',
        'tooltip1': 'Some tooltip text',
        'tooltip2': 'Some tooltip text'
      }
    }
  });
});

test('Parse wrapped Trans components', () => {
  const parser = new Parser({
    lngs: ['en'],
    ns: [
      'dev',
      'translation'
    ],
    trans: {
      component: 'I18n',
      i18nKey: '__t',
      fallbackKey: true
    },
    nsSeparator: false,
    keySeparator: '.', // Specify the keySeparator for this test to make sure the fallbackKey won't be separated
    fallbackLng: 'en',
  });

  const content = fs.readFileSync(path.resolve(__dirname, 'fixtures/trans.jsx'), 'utf-8');
  parser.parseTransFromString(content);
  expect(parser.get()).toEqual({
    en: {
      dev: {},
      translation: {
        'mykey': 'A wrapper component with key',
        'A wrapper component without key': 'A wrapper component without key'
      }
    }
  });
});

test('Parse Trans components with custom component', () => {
  const parser = new Parser({
    lngs: ['en'],
    trans: {
      component: /Trans$/,
    }
  });

  const content = fs.readFileSync(path.resolve(__dirname, 'fixtures/trans-component.jsx'), 'utf-8');
  parser.parseTransFromString(content);
  expect(parser.get()).toEqual({
    en: {
      translation: {
        default: 'Default Trans component',
        custom: 'Customized Trans component',
      }
    }
  });
});

test('Parse Trans components with modern acorn features', () => {
  const parser = new Parser({
    lngs: ['en'],
    trans: {
      fallbackKey: true
    },
    nsSeparator: false,
    keySeparator: '.', // Specify the keySeparator for this test to make sure the fallbackKey won't be separated
    fallbackLng: 'en'
  });

  const content = fs.readFileSync(path.resolve(__dirname, 'fixtures/trans-acorn.jsx'), 'utf-8');
  parser.parseTransFromString(content);
  expect(parser.get()).toEqual({
    en: {
      translation: {
        // Passing keys to <Trans> via object spread is not yet supported:
        'Spread i18nKey': 'Spread i18nKey',
        // 'spread': 'Spread i18nKey', // this would be expected.
        'simple': 'Simple i18nKey'
      }
    }
  });
});

describe('Parse HTML attribute', () => {
  test('parseAttrFromString(content)', () => {
    const parser = new Parser({
      lngs: ['en'],
      fallbackLng: 'en'
    });

    const content = fs.readFileSync(path.resolve(__dirname, 'fixtures/app.html'), 'utf-8');
    parser.parseAttrFromString(content);

    expect(parser.get()).toEqual({
      en: {
        translation: {
          'key1': '',
          'key2': '',
          'key3': '',
          'key4': ''
        }
      }
    });
  });

  test('parseAttrFromString(content, { list: ["data-i18n"] })', () => {
    const parser = new Parser({
      lngs: ['en'],
      fallbackLng: 'en'
    });

    // <div data-i18n="key"></div>
    const content = fs.readFileSync(path.resolve(__dirname, 'fixtures/app.html'), 'utf-8');
    parser.parseAttrFromString(content, { list: ['data-i18n'] });

    expect(parser.get()).toEqual({
      en: {
        translation: {
          'key1': '',
          'key2': '',
          'key3': '',
          'key4': ''
        }
      }
    });
  });

  test('parseAttrFromString(content, customHandler)', () => {
    const parser = new Parser({
      lngs: ['en'],
      fallbackLng: 'en'
    });
    const customHandler = function(key) {
      const defaultValue = '__TRANSLATION__'; // optional default value
      parser.set(key, defaultValue);
    };

    const content = fs.readFileSync(path.resolve(__dirname, 'fixtures/app.html'), 'utf-8');
    parser.parseAttrFromString(content, customHandler);

    expect(parser.get()).toEqual({
      en: {
        translation: {
          'key4': '__TRANSLATION__',
          'key3': '__TRANSLATION__',
          'key2': '__TRANSLATION__',
          'key1': '__TRANSLATION__'
        }
      }
    });

    // Sort keys in alphabetical order
    expect(JSON.stringify(parser.get({ sort: true }))).toEqual(JSON.stringify({
      en: {
        translation: {
          'key1': '__TRANSLATION__',
          'key2': '__TRANSLATION__',
          'key3': '__TRANSLATION__',
          'key4': '__TRANSLATION__'
        }
      }
    }));

    expect(parser.get('key1', { lng: 'en' })).toBe('__TRANSLATION__');
    expect(parser.get('key1', { lng: 'de' })).toBe(undefined);
    expect(parser.get('nokey', { lng: 'en' })).toBe(undefined);
  });

  test('parseAttrFromString(content, { list: ["data-i18n"] }, customHandler)', () => {
    const parser = new Parser({
      lngs: ['en'],
      fallbackLng: 'en'
    });
    const customHandler = function(key) {
      const defaultValue = '__TRANSLATION__'; // optional default value
      parser.set(key, defaultValue);
    };

    const content = fs.readFileSync(path.resolve(__dirname, 'fixtures/app.html'), 'utf-8');
    parser.parseAttrFromString(content, { list: ['data-i18n'] }, customHandler);

    expect(parser.get()).toEqual({
      en: {
        translation: {
          'key4': '__TRANSLATION__',
          'key3': '__TRANSLATION__',
          'key2': '__TRANSLATION__',
          'key1': '__TRANSLATION__'
        }
      }
    });

    // Sort keys in alphabetical order
    expect(JSON.stringify(parser.get({ sort: true }))).toEqual(JSON.stringify({
      en: {
        translation: {
          'key1': '__TRANSLATION__',
          'key2': '__TRANSLATION__',
          'key3': '__TRANSLATION__',
          'key4': '__TRANSLATION__'
        }
      }
    }));

    expect(parser.get('key1', { lng: 'en' })).toBe('__TRANSLATION__');
    expect(parser.get('key1', { lng: 'de' })).toBe(undefined);
    expect(parser.get('nokey', { lng: 'en' })).toBe(undefined);
  });
});

test('Gettext style i18n', () => {
  const parser = new Parser({
    defaultValue: (lng, ns, key) => {
      return key;
    },
    keySeparator: false,
    nsSeparator: false
  });

  // Parse Translation Function
  const content = fs.readFileSync(path.resolve(__dirname, 'fixtures/modules/index.js'), 'utf8');

  parser.parseFuncFromString(content, { list: ['_t'] });

  const resStore = parser.get();
  expect(resStore).toEqual({
    en: {
      translation: {
        'Loading...': 'Loading...',
        'This value does not exist.': 'This value does not exist.',
        'YouTube has more than {{count}} billion users.': 'YouTube has more than {{count}} billion users.',
        'YouTube has more than {{count}} billion users._plural': 'YouTube has more than {{count}} billion users.',
        'You have {{count}} messages.': 'You have {{count}} messages.',
        'You have {{count}} messages._plural': 'You have {{count}} messages.'
      }
    }
  });
});

test('Quotes', () => {
  const parser = new Parser({
    defaultValue: function(lng, ns, key) {
      if (lng === 'en') {
        return key;
      }
      return '__NOT_TRANSLATED__';
    },
    keySeparator: false,
    nsSeparator: false
  });
  const content = fs.readFileSync(path.resolve(__dirname, 'fixtures/quotes.js'), 'utf8');
  const wanted = {
    'en': {
      'translation': {
        'Primary \'email\' activation': 'Primary \'email\' activation',
        'Primary "email" activation': 'Primary "email" activation',
        'name=\'email\' value=\'{{email}}\'': 'name=\'email\' value=\'{{email}}\'',
        'name="email" value="{{email}}"': 'name="email" value="{{email}}"',
        'name="email" value=\'{{email}}\'': 'name="email" value=\'{{email}}\'',
        'name=\'email\' value="{{email}}"': 'name=\'email\' value="{{email}}"',
      }
    }
  };

  parser.parseFuncFromString(content);
  expect(parser.get()).toEqual(wanted);
});

test('Disable nsSeparator', () => {
  const parser = new Parser({
    defaultValue: '__NOT_TRANSLATED__',
    nsSeparator: false,
    keySeparator: '.'
  });
  parser.set('foo:bar');

  const resStore = parser.get();

  expect(resStore).toEqual({
    en: {
      translation: {
        'foo:bar': '__NOT_TRANSLATED__'
      }
    }
  });
});

test('Disable keySeparator', () => {
  const parser = new Parser({
    defaultValue: '__NOT_TRANSLATED__',
    nsSeparator: ':',
    keySeparator: false
  });
  parser.set('Creating...');

  const resStore = parser.get();

  expect(resStore).toEqual({
    en: {
      translation: {
        'Creating...': '__NOT_TRANSLATED__'
      }
    }
  });
});

test('Default nsSeparator', () => {
  const parser = new Parser({
    defaultValue: '__NOT_TRANSLATED__',
    nsSeparator: ':',
    keySeparator: '.'
  });
  parser.set('translation:key1.key2');

  const resStore = parser.get();

  expect(resStore).toEqual({
    en: {
      translation: {
        'key1': {
          'key2': '__NOT_TRANSLATED__'
        }
      }
    }
  });
});

test('Default keySeparator', () => {
  const parser = new Parser({
    defaultValue: '__NOT_TRANSLATED__',
    nsSeparator: ':',
    keySeparator: '.'
  });
  parser.set('key1.key2');

  const resStore = parser.get();

  expect(resStore).toEqual({
    en: {
      translation: {
        'key1': {
          'key2': '__NOT_TRANSLATED__'
        }
      }
    }
  });
});

test('Override nsSeparator with a false value', () => {
  const parser = new Parser({
    defaultValue: '__NOT_TRANSLATED__',
    nsSeparator: ':',
    keySeparator: '.'
  });
  parser.set('translation:key1.key2', {
    nsSeparator: false
  });

  const resStore = parser.get();

  expect(resStore).toEqual({
    en: {
      translation: {
        'translation:key1': {
          'key2': '__NOT_TRANSLATED__'
        }
      }
    }
  });
});

test('Override keySeparator with a false value', () => {
  const parser = new Parser({
    defaultValue: '__NOT_TRANSLATED__',
    nsSeparator: ':',
    keySeparator: '.'
  });
  parser.set('translation:key1.key2', {
    keySeparator: false
  });

  const resStore = parser.get();

  expect(resStore).toEqual({
    en: {
      translation: {
        'key1.key2': '__NOT_TRANSLATED__'
      }
    }
  });
});

test('Multiline (Line Endings: LF)', () => {
  const parser = new Parser({
    nsSeparator: false
  });
  const content = fs.readFileSync(path.resolve(__dirname, 'fixtures/multiline-unix.js'), 'utf-8');
  parser.parseFuncFromString(content);
  expect(parser.get()).toEqual({
    en: {
      translation: {
        'this is a multiline string': '',
        'this is another multiline string': ''
      }
    }
  });
});

test('Multiline (Line Endings: CRLF)', () => {
  const parser = new Parser({
    nsSeparator: false
  });
  const content = fs.readFileSync(path.resolve(__dirname, 'fixtures/multiline-dos.js'), 'utf-8');
  parser.parseFuncFromString(content);
  expect(parser.get()).toEqual({
    en: {
      translation: {
        'this is a multiline string': '',
        'this is another multiline string': ''
      }
    }
  });
});

describe('Plural', () => {
  test('Default options', () => {
    const parser = new Parser();
    const content = fs.readFileSync(path.resolve(__dirname, 'fixtures/plural.js'), 'utf-8');
    parser.parseFuncFromString(content, { propsFilter: props => props });
    expect(parser.get()).toEqual({
      en: {
        translation: {
          'key': '',
          'key_plural': '',
          'keyWithCountAndDefaultValues': '{{count}} item',
          'keyWithCountAndDefaultValues_plural': '{{count}} items',
          'keyWithCount': '',
          'keyWithCount_plural': '',
          'keyWithDefaultValueAndCount': '{{count}} item',
          'keyWithDefaultValueAndCount_plural': '{{count}} item',
          'keyWithVariable': '',
          'keyWithVariable_plural': '',
          'keyWithDefaultValueAndVariable': '{{count}} item',
          'keyWithDefaultValueAndVariable_plural': '{{count}} item'
        }
      }
    });
  });

  test('Languages with multiple plurals', () => {
    const parser = new Parser({ lngs: ['ru'] });
    const content = fs.readFileSync(path.resolve(__dirname, 'fixtures/plural.js'), 'utf-8');
    parser.parseFuncFromString(content, { propsFilter: props => props });
    expect(parser.get()).toEqual({
      ru: {
        translation: {
          'key_0': '',
          'key_1': '',
          'key_2': '',
          'keyWithCount_0': '',
          'keyWithCount_1': '',
          'keyWithCount_2': '',
          'keyWithVariable_0': '',
          'keyWithVariable_1': '',
          'keyWithVariable_2': '',
          'keyWithCountAndDefaultValues_0': '{{count}} item',
          'keyWithCountAndDefaultValues_1': '{{count}} item',
          'keyWithCountAndDefaultValues_2': '{{count}} item',
          'keyWithDefaultValueAndCount_0': '{{count}} item',
          'keyWithDefaultValueAndCount_1': '{{count}} item',
          'keyWithDefaultValueAndCount_2': '{{count}} item',
          'keyWithDefaultValueAndVariable_0': '{{count}} item',
          'keyWithDefaultValueAndVariable_1': '{{count}} item',
          'keyWithDefaultValueAndVariable_2': '{{count}} item'
        }
      }
    });
  });

  test('Languages with multiple plurals: non existing language', () => {
    const parser = new Parser({ lngs: ['zz'] });
    const content = fs.readFileSync(path.resolve(__dirname, 'fixtures/plural.js'), 'utf-8');
    parser.parseFuncFromString(content, { propsFilter: props => props });
    expect(parser.get()).toEqual({
      zz: {
        translation: {}
      }
    });
  });

  test('Languages with multiple plurals: languages with single rule', () => {
    const parser = new Parser({ lngs: ['ko'] });
    const content = fs.readFileSync(path.resolve(__dirname, 'fixtures/plural.js'), 'utf-8');
    parser.parseFuncFromString(content, { propsFilter: props => props });
    expect(parser.get()).toEqual({
      ko: {
        translation: {
          'key_0': '',
          'keyWithCount_0': '',
          'keyWithVariable_0': '',
          'keyWithCountAndDefaultValues_0': '{{count}} item',
          'keyWithDefaultValueAndCount_0': '{{count}} item',
          'keyWithDefaultValueAndVariable_0': '{{count}} item',
        }
      }
    });
  });

  test('compatibilityJSON', () => {
    const parser = new Parser({
      compatibilityJSON: 'v4',
      lngs: ['en'],
    });
    const content = fs.readFileSync(path.resolve(__dirname, 'fixtures/plural.js'), 'utf-8');
    parser.parseFuncFromString(content, { propsFilter: props => props });
    expect(parser.get()).toEqual({
      en: {
        translation: {
          'key_one': '',
          'key_other': '',
          'keyWithCount_one': '',
          'keyWithCount_other': '',
          'keyWithVariable_one': '',
          'keyWithVariable_other': '',
          'keyWithCountAndDefaultValues_one': '{{count}} item',
          'keyWithCountAndDefaultValues_other': '{{count}} item',
          'keyWithDefaultValueAndCount_one': '{{count}} item',
          'keyWithDefaultValueAndCount_other': '{{count}} item',
          'keyWithDefaultValueAndVariable_one': '{{count}} item',
          'keyWithDefaultValueAndVariable_other': '{{count}} item',
        }
      }
    });
  });

  test('User defined function', () => {
    const parser = new Parser({
      plural: (lng, ns, key, options) => {
        if (key === 'key') {
          return false;
        }
        if (key === 'keyWithCount') {
          return true;
        }
        if (key === 'keyWithVariable') {
          return true;
        }
        return true;
      }
    });
    const content = fs.readFileSync(path.resolve(__dirname, 'fixtures/plural.js'), 'utf-8');
    parser.parseFuncFromString(content, { propsFilter: props => props });
    expect(parser.get()).toEqual({
      en: {
        translation: {
          'key': '',
          'keyWithCount': '',
          'keyWithCountAndDefaultValues': '{{count}} item',
          'keyWithCountAndDefaultValues_plural': '{{count}} items',
          'keyWithCount_plural': '',
          'keyWithDefaultValueAndCount': '{{count}} item',
          'keyWithDefaultValueAndCount_plural': '{{count}} item',
          'keyWithVariable': '',
          'keyWithVariable_plural': '',
          'keyWithDefaultValueAndVariable': '{{count}} item',
          'keyWithDefaultValueAndVariable_plural': '{{count}} item'
        }
      }
    });
  });
});

test('Namespace', () => {
  const parser = new Parser({
    ns: ['translation', 'othernamespace']
  });
  const content = fs.readFileSync(path.resolve(__dirname, 'fixtures/namespace.js'), 'utf-8');
  parser.parseFuncFromString(content);
  expect(parser.get()).toEqual({
    en: {
      othernamespace: {
        'friend': ''
      },
      translation: {}
    }
  });
});

describe('Context', () => {
  test('Default options', () => {
    const parser = new Parser();
    const content = fs.readFileSync(path.resolve(__dirname, 'fixtures/context.js'), 'utf-8');
    parser.parseFuncFromString(content, { propsFilter: props => props });
    expect(parser.get()).toEqual({
      en: {
        translation: {
          'friend': '',
          'friend_male': '',
          'friend_female': '',
          'friendDynamic': '',
        }
      }
    });
  });

  test('User defined function', () => {
    const parser = new Parser({
      context: (lng, ns, key, options) => {
        if (options.context === 'male') {
          return true;
        }
        if (options.context === 'female') {
          return false;
        }
        return true;
      }
    });
    const content = fs.readFileSync(path.resolve(__dirname, 'fixtures/context.js'), 'utf-8');
    parser.parseFuncFromString(content, { propsFilter: props => props });
    expect(parser.get()).toEqual({
      en: {
        translation: {
          'friend': '',
          'friend_male': '',
          'friendDynamic': '',
        }
      }
    });
  });
});

describe('Context with plural combined', () => {
  const content = fs.readFileSync(path.resolve(__dirname, 'fixtures/context-plural.js'), 'utf-8');

  test('Default options', () => {
    const parser = new Parser({
      contextDefaultValues: ['male', 'female'],
    });
    parser.parseFuncFromString(content);
    expect(parser.get()).toEqual({
      en: {
        translation: {
          'friend': '',
          'friend_plural': '',
          'friend_male': '',
          'friend_male_plural': '',
          'friend_female': '',
          'friend_female_plural': '',
          'friendWithDefaultValue': '{{count}} boyfriend',
          'friendWithDefaultValue_plural': '{{count}} boyfriend',
          'friendWithDefaultValue_male': '{{count}} boyfriend',
          'friendWithDefaultValue_male_plural': '{{count}} boyfriend',
          'friendWithDefaultValue_female': '{{count}} girlfriend',
          'friendWithDefaultValue_female_plural': '{{count}} girlfriend',
          'friendDynamic': '',
          'friendDynamic_plural': '',
          'friendDynamic_male': '',
          'friendDynamic_male_plural': '',
          'friendDynamic_female': '',
          'friendDynamic_female_plural': '',
        }
      }
    });
  });

  test('Context form only', () => {
    const parser = new Parser({
      context: true,
      plural: false
    });
    parser.parseFuncFromString(content);
    expect(parser.get()).toEqual({
      en: {
        translation: {
          'friend': '',
          'friend_male': '',
          'friend_female': '',
          'friendWithDefaultValue': '{{count}} boyfriend',
          'friendWithDefaultValue_male': '{{count}} boyfriend',
          'friendWithDefaultValue_female': '{{count}} girlfriend',
          'friendDynamic': '',
        }
      }
    });
  });

  test('No context fallback', () => {
    const parser = new Parser({
      context: true,
      contextFallback: false,
      contextDefaultValues: ['male', 'female'],
      plural: false
    });
    parser.parseFuncFromString(content);
    expect(parser.get()).toEqual({
      en: {
        translation: {
          'friend_male': '',
          'friend_female': '',
          'friendWithDefaultValue_male': '{{count}} boyfriend',
          'friendWithDefaultValue_female': '{{count}} girlfriend',
          'friendDynamic_male': '',
          'friendDynamic_female': '',
        }
      }
    });
  });

  test('Plural form only', () => {
    const parser = new Parser({
      context: false,
      plural: true
    });
    parser.parseFuncFromString(content);
    expect(parser.get()).toEqual({
      en: {
        translation: {
          'friend': '',
          'friend_plural': '',
          'friendWithDefaultValue': '{{count}} boyfriend',
          'friendWithDefaultValue_plural': '{{count}} boyfriend',
          'friendDynamic': '',
          'friendDynamic_plural': '',
        }
      }
    });
  });

  test('No plural fallback', () => {
    const parser = new Parser({
      context: false,
      plural: true,
      pluralFallback: false
    });
    parser.parseFuncFromString(content);
    expect(parser.get()).toEqual({
      en: {
        translation: {
          'friend_plural': '',
          'friendWithDefaultValue_plural': '{{count}} boyfriend',
          'friendDynamic_plural': '',
        }
      }
    });
  });
});

test('parser.toJSON()', () => {
  const parser = new Parser();
  const content = fs.readFileSync(path.resolve(__dirname, 'fixtures/app.js'), 'utf-8');

  parser.parseFuncFromString(content);

  expect(parser.toJSON()).toEqual('{"en":{"translation":{"key2":"","key1":""}}}');
});

test('parser.toJSON({ sort: true })', () => {
  const parser = new Parser();
  const content = fs.readFileSync(path.resolve(__dirname, 'fixtures/app.js'), 'utf-8');

  parser.parseFuncFromString(content);

  expect(parser.toJSON({ sort: true })).toEqual('{"en":{"translation":{"key1":"","key2":""}}}');
});

test('parser.toJSON({ sort: true, space: 2 })', () => {
  const parser = new Parser();
  const content = fs.readFileSync(path.resolve(__dirname, 'fixtures/app.js'), 'utf-8');
  const wanted = JSON.stringify({
    en: {
      translation: {
        key1: '',
        key2: ''
      }
    }
  }, null, 2);

  parser.parseFuncFromString(content);
  expect(parser.toJSON({ sort: true, space: 2 })).toEqual(wanted);
});

test('Extract properties from optional chaining', () => {
  const parser = new Parser({
    defaultValue: function(lng, ns, key) {
      if (lng === 'en') {
        return key;
      }
      return '__NOT_TRANSLATED__';
    },
    keySeparator: false,
    nsSeparator: false
  });
  const content = fs.readFileSync(path.resolve(__dirname, 'fixtures/optional-chaining.js'), 'utf8');
  const wanted = {
    'en': {
      'translation': {
        'optional chaining: {{value}}': 'optional chaining: {{value}}',
      }
    }
  };

  parser.parseFuncFromString(content);
  expect(parser.get()).toEqual(wanted);
});

test('Extract properties from template literals', () => {
  const parser = new Parser({
    defaultValue: function(lng, ns, key) {
      if (lng === 'en') {
        return key.replace(/\r\n/g, '\n');
      }
      return '__NOT_TRANSLATED__';
    },
    keySeparator: false,
    nsSeparator: false,
    allowDynamicKeys: false
  });
  const content = fs.readFileSync(path.resolve(__dirname, 'fixtures/template-literals.js'), 'utf8').replace(/\r\n/g, '\n');
  const wanted = {
    'en': {
      'translation': {
        'property in template literals': 'property in template literals',
        'added {{foo}}\n and {{bar}}': 'added {{foo}}\n and {{bar}}'
      }
    }
  };

  parser.parseFuncFromString(content);
  expect(parser.get()).toEqual(wanted);
});

test('Custom keySeparator and nsSeparator', () => {
  const parser = new Parser({
    ns: ['translation', 'myNamespace'],
    defaultValue: function(lng, ns, key) {
      if (lng === 'en') {
        return key;
      }
      return '__NOT_TRANSLATED__';
    },
    keySeparator: false,
    nsSeparator: false
  });
  const content = fs.readFileSync(path.resolve(__dirname, 'fixtures/custom-separators.js'), 'utf8');
  const wanted = {
    'en': {
      'translation': {
        'myNamespace|firstKey>secondKey>without custom separators': 'myNamespace|firstKey>secondKey>without custom separators',
        'myNamespace:firstKey.secondKey.without custom separators 2': 'myNamespace:firstKey.secondKey.without custom separators 2'
      },
      'myNamespace': {
        'firstKey': {
          'secondKey': {
            'with custom separators': 'with custom separators',
            'with custom separators 2': 'with custom separators 2',
          }
        }
      }
    }
  };

  parser.parseFuncFromString(content);
  expect(parser.get()).toEqual(wanted);
});

test('Should accept trailing comma in functions', () => {
  const content = `
        i18next.t(
            'friend',
        )
    `;
  class ParserMock extends Parser {
    log(msg) {
      if (msg.startsWith('i18next-scanner: Unable to parse code')) {
        Parser.prototype.log = originalLog; // eslint-disable-line no-undef
        throw new Error('Should not run into catch');
      }
    }
  }
  const parser = new ParserMock({ debug: true });
  parser.parseFuncFromString(content, {});
  expect(parser.get()).toEqual({
    en: {
      translation: {
        'friend': ''
      }
    }
  });
});

test('Default values test', () => {
  const parser = new Parser();
  const content = fs.readFileSync(path.resolve(__dirname, 'fixtures/default-values.js'), 'utf8');
  const wanted = {
    'en': {
      'translation': {
        'product': {
          'bread': 'Bread',
          'milk': 'Milk',
          'boiledEgg': 'Boiled Egg',
          'cheese': 'Cheese',
          'potato': '{{color}} potato',
          'carrot': '{{size}} carrot',
        }
      }
    }
  };

  parser.parseFuncFromString(content);
  expect(parser.get()).toEqual(wanted);
});

test('metadata', () => {
  const parser = new Parser();
  const content = fs.readFileSync(path.resolve(__dirname, 'fixtures/metadata.js'), 'utf-8');
  const customHandler = function(key, options) {
    parser.set(key, options);
    expect(options).toEqual({
      'metadata': {
        'tags': [
          'tag1',
          'tag2',
        ],
      },
    });
  };
  parser.parseFuncFromString(content, customHandler);
  expect(parser.get()).toEqual({
    en: {
      translation: {
        'friend': '',
      }
    }
  });
});

test('allowDynamicKeys', () => {
  const parser = new Parser({
    allowDynamicKeys: true
  });
  const content = fs.readFileSync(path.resolve(__dirname, 'fixtures/dynamic-keys.js'), 'utf-8');
  const customHandler = function(key, options) {
    parser.set(key, options);
    expect(options).toEqual({
      'metadata': {
        'keys': [
          'Hard',
          'Normal',
        ],
      },
    });
  };
  parser.parseFuncFromString(content, customHandler);
  expect(parser.get()).toEqual({
    en: {
      translation: {
        'Activities': {
          '': '',
        },
        'LoadoutBuilder': {
          'Select': ''
        }
      }
    }
  });
});

test('Should support fallback keys', () => {
  const parser = new Parser();
  const content = fs.readFileSync(path.resolve(__dirname, 'fixtures/fallback.js'), 'utf-8');
  parser.parseFuncFromString(content, {});
  expect(parser.get()).toEqual({
    en: {
      translation: {
        'error': {
          'unspecific': '', // Something wen wrong.
          '404': '', // The page was not found.
        },
      }
    }
  });
});
