import http from 'node:http';
import { createReadStream, statSync, existsSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = resolve(__dirname, '..', '..'); // project root
const PORT = 4178;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'text/javascript; charset=utf-8',
  '.mjs':  'text/javascript; charset=utf-8',
  '.map':  'application/json; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.wasm': 'application/wasm',
  '.ico':  'image/x-icon',
  '.txt':  'text/plain; charset=utf-8',
};

const server = http.createServer((req, res) => {
  try {
    let urlPath = decodeURIComponent(req.url || '/');
    if (urlPath === '/') urlPath = '/tests/e2e/fixtures/umd-basic.html';

    const fsPath = join(ROOT, urlPath);
    if (!existsSync(fsPath)) {
      res.writeHead(404, { 'content-type': 'text/plain' });
      res.end('Not found: ' + urlPath);
      return;
    }

    const stat = statSync(fsPath);
    if (stat.isDirectory()) {
      res.writeHead(403, { 'content-type': 'text/plain' });
      res.end('Directory listing disabled');
      return;
    }

    const type = MIME[extname(fsPath)] || 'application/octet-stream';
    res.writeHead(200, { 'content-type': type, 'cache-control': 'no-store' });
    createReadStream(fsPath).pipe(res);
  } catch (err) {
    res.writeHead(500, { 'content-type': 'text/plain' });
    res.end('Internal error: ' + String(err?.message || err));
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`e2e server listening on http://127.0.0.1:${PORT}`);
  console.log(`root=${ROOT}`);
});
