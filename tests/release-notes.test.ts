// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { extractNotes } from '../scripts/release-notes.mjs';

const changelog = '# Changelog\n\n## [Unreleased]\n\n- x\n\n## [0.1.7] - 2026-10-06\n\n### Added\n\n- a\n\n## [0.1.6] - 2026-10-06\n\n- b\n\n[0.1.6]: https://example.com\n';

describe('extractNotes', () => {
  it('returns only the requested section, with or without a v prefix', () => {
    expect(extractNotes(changelog, '0.1.7')).toBe('### Added\n\n- a');
    expect(extractNotes(changelog, 'v0.1.6')).toBe('- b');
  });

  it('throws when the version has no section', () => {
    expect(() => extractNotes(changelog, '9.9.9')).toThrow('no section');
  });
});
