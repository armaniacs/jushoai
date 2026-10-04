// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { parseFrontMatter } from '../../site/lib/frontmatter.ts';

describe('parseFrontMatter', () => {
  it('reads key: value pairs and returns the body', () => {
    const r = parseFrontMatter('---\ntitle: はじめに\norder: 1\n---\n# 見出し\n本文');
    expect(r.data).toEqual({ title: 'はじめに', order: '1' });
    expect(r.body).toBe('# 見出し\n本文');
  });

  it('strips matching quotes and keeps colons inside values', () => {
    const r = parseFrontMatter('---\ndescription: "A: B"\ntitle: \'T\'\n---\nbody');
    expect(r.data).toEqual({ description: 'A: B', title: 'T' });
  });

  it('returns the whole source when there is no front matter', () => {
    expect(parseFrontMatter('# x')).toEqual({ data: {}, body: '# x' });
  });

  it('ignores lines without a colon and empty keys', () => {
    const r = parseFrontMatter('---\nnonsense\n: v\nk: v\n---\n');
    expect(r.data).toEqual({ k: 'v' });
  });
});
