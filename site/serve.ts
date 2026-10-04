import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { dirname, extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizeBase } from './lib/site.ts';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'site-dist');
const base = normalizeBase(process.env.SITE_BASE);
const port = Number(process.env.PORT ?? 4173);

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json',
};

createServer(async (req, res) => {
  try {
    const url = decodeURIComponent((req.url ?? '/').split('?')[0] ?? '/');
    if (!url.startsWith(base)) {
      res.writeHead(302, { location: base }).end();
      return;
    }
    let file = resolve(root, `.${url.slice(base.length - 1)}`);
    // Resolve first, then refuse anything that escaped the output directory.
    if (file !== root && !file.startsWith(root + sep)) {
      res.writeHead(403).end('forbidden');
      return;
    }
    if ((await stat(file).catch(() => null))?.isDirectory()) file = join(file, 'index.html');
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' }).end(body);
  } catch {
    const notFound = await readFile(join(root, '404.html')).catch(() => Buffer.from('not found'));
    res.writeHead(404, { 'content-type': 'text/html; charset=utf-8' }).end(notFound);
  }
}).listen(port, '127.0.0.1', () => {
  console.log(`serving ${root} at http://127.0.0.1:${port}${base}`);
});
