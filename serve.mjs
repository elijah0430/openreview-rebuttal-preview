import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve('docs');
const mime = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.woff':'font/woff','.woff2':'font/woff2','.zip':'application/zip','.md':'text/plain; charset=utf-8'};
const server = http.createServer((req,res) => { const name = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); const file = path.resolve(root, '.' + (name === '/' ? '/index.html' : name)); if (!file.startsWith(root + path.sep)) { res.writeHead(403); return res.end(); } fs.readFile(file,(e,data) => { if (e) { res.writeHead(404); return res.end('Not found'); } res.setHeader('Content-Type',mime[path.extname(file)] || 'application/octet-stream'); res.setHeader('Cache-Control','no-store'); res.end(data); }); });
server.listen(4381,'127.0.0.1',() => console.log('Local: http://127.0.0.1:4381'));
