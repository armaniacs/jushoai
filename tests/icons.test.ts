// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ICON_DIR = fileURLToPath(new URL('../public/icon', import.meta.url));
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const SIZES = [16, 32, 48, 128];

// PNG width/height live at fixed offsets in the IHDR chunk (big-endian)
function readPngSize(path: string): { width: number; height: number } {
  const buf = readFileSync(path);
  expect(buf.subarray(0, 8).equals(PNG_SIGNATURE)).toBe(true);
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

describe('toolbar icons', () => {
  it.each(SIZES)('provides %dpx png', (size) => {
    const path = `${ICON_DIR}/${size}.png`;
    expect(existsSync(path)).toBe(true);
    expect(readPngSize(path)).toEqual({ width: size, height: size });
  });
});
