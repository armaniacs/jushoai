import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';

// Widening any of these changes behavior on every site and must be mirrored in
// docs/store-listing.md and the privacy document before the list is updated.
const ALLOWED = {
  permissions: ['storage', 'contextMenus'],
  optional_permissions: undefined,
  host_permissions: undefined,
  optional_host_permissions: ['https://*/*', 'http://localhost/*', 'http://127.0.0.1/*'],
  content_scripts_matches: [['<all_urls>']],
  web_accessible_resources: undefined,
  externally_connectable: undefined,
};

// Entries are { file (relative to dist/<dir>), context substring }, each with a reason.
const DYNAMIC_CODE_ALLOWLIST: { file: string; context: string; reason: string }[] = [];

const DIRS = ['chrome-mv3', 'firefox-mv3'];
const read = (dir: string) => JSON.parse(readFileSync(`dist/${dir}/manifest.json`, 'utf8'));

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });

describe.each(DIRS)('manifest guard (%s)', (dir) => {
  const m = read(dir);

  it('matches the permission allowlist exactly', () => {
    expect(m.permissions).toEqual(ALLOWED.permissions);
    expect(m.optional_permissions).toEqual(ALLOWED.optional_permissions);
    expect(m.host_permissions).toEqual(ALLOWED.host_permissions);
    expect(m.optional_host_permissions).toEqual(ALLOWED.optional_host_permissions);
    expect((m.content_scripts ?? []).map((c: { matches: string[] }) => c.matches)).toEqual(
      ALLOWED.content_scripts_matches,
    );
    expect(m.web_accessible_resources).toEqual(ALLOWED.web_accessible_resources);
    expect(m.externally_connectable).toEqual(ALLOWED.externally_connectable);
  });

  // The CSP is left to the browser default: an explicit override can drop
  // defaults such as Firefox's upgrade-insecure-requests. Only regressions are blocked.
  it('does not weaken the extension_pages CSP', () => {
    const csp = m.content_security_policy?.extension_pages as string | undefined;
    if (csp === undefined) return;
    expect(csp).not.toMatch(/unsafe-eval|unsafe-inline|wasm-unsafe-eval|https?:/);
  });

  it('ships no dynamic code execution in bundled JS', () => {
    const hits: string[] = [];
    for (const file of walk(`dist/${dir}`).filter((f) => f.endsWith('.js'))) {
      const rel = file.slice(`dist/${dir}/`.length);
      const src = readFileSync(file, 'utf8');
      for (const re of [/\beval\s*\(/g, /new\s+Function\s*\(/g]) {
        for (const match of src.matchAll(re)) {
          const ctx = src.slice(Math.max(0, match.index - 40), match.index + 60);
          const allowed = DYNAMIC_CODE_ALLOWLIST.some(
            (a) => a.file === rel && ctx.includes(a.context),
          );
          if (!allowed) hits.push(`${rel}: ...${ctx.replace(/\s+/g, ' ')}...`);
        }
      }
    }
    expect(hits).toEqual([]);
  });
});
