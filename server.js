import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const port = process.env.PORT || 3000;

const mime = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.ico': 'image/x-icon',
    '.webp': 'image/webp'
};

createServer(async (req, res) => {
    let url;
    try {
        url = decodeURIComponent((req.url || '/').split('?')[0]);
    } catch {
        url = (req.url || '/').split('?')[0];
    }
    let rel = normalize(url).replace(/^(\.\.[/\\])+/, '').replace(/^\//, '');
    if (rel === '' || url.endsWith('/')) rel = 'index.html';
    try {
        const body = await readFile(join(process.cwd(), rel));
        res.writeHead(200, { 'content-type': mime[extname(rel)] || 'application/octet-stream' });
        res.end(body);
    } catch {
        try {
            const html = await readFile(join(process.cwd(), 'index.html'));
            res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
            res.end(html);
        } catch {
            res.writeHead(404);
            res.end('Not found');
        }
    }
}).listen(port, '0.0.0.0', () => {
    console.log('serving on ' + port);
});
