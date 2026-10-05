import { describe, it, expect } from 'vitest';
import {
  fixtureNameFromUrl, varNameFromFile,
  insertImport, insertSampleEntry, insertTestCase,
} from '../../scripts/add-fixture.mjs';

const source = `import a from '../../samples/a.html?raw';
import b from '../../samples/b.html?raw';

const SAMPLES: Record<string, string> = {
  'a.html': a,
};

describe('x', () => {
  it('a case', async () => {
  });
});
`;

describe('add-fixture', () => {
  it('derives a file name from the URL path', () => {
    expect(fixtureNameFromUrl('https://pro.form-mailer.jp/lp/f3553ff3175246')).toBe('f3553ff3175246.html');
    expect(fixtureNameFromUrl('not a url')).toBe('form.html');
  });

  it('derives a camelCase variable from the file name', () => {
    expect(varNameFromFile('formmailer-anketo-gender.html')).toBe('formmailerAnketoGender');
  });

  it('inserts the import, sample entry, and test case exactly once', () => {
    const withImport = insertImport(source, 'c', 'c.html');
    expect(withImport).toContain(`import c from '../../samples/c.html?raw';\n`);
    expect(insertImport(withImport, 'c', 'c.html')).toBe(withImport);
    const withEntry = insertSampleEntry(withImport, 'c.html', 'c');
    expect(withEntry).toContain(`  'c.html': c,\n};`);
    expect(insertSampleEntry(withEntry, 'c.html', 'c')).toBe(withEntry);
    const stub = `  it('c.html fills the in-scope fields', async () => {\n  });\n`;
    const withCase = insertTestCase(withEntry, stub);
    expect(withCase).toContain(`it('c.html fills the in-scope fields'`);
    expect(withCase.trimEnd().endsWith('});')).toBe(true);
    expect(insertTestCase(withCase, stub)).toBe(withCase);
  });
});
