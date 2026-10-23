import { cp, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

// Eve owns API/workflow functions; Vite supplies the public frontend.
if (process.env.VERCEL === '1') {
  const output = '.vercel/output';
  const html = await readFile('dist/index.html', 'utf8');
  if (!html.includes('/assets/') || html.includes('/src/main.tsx')) throw new Error('Build the Vite frontend before packaging it.');
  const configPath = join(output, 'config.json');
  const config = JSON.parse(await readFile(configPath, 'utf8'));
  if (config.version !== 3 || !Array.isArray(config.routes)) throw new Error('Unexpected Eve build output.');
  await cp('dist', join(output, 'static'), { recursive: true });
  // Override only the root page; retain every Eve/API/workflow route.
  config.routes = config.routes.filter(route => route.src !== '/' && route.src !== '^/$');
  config.routes.unshift({ src: '^/$', dest: '/index.html' });
  await writeFile(configPath, JSON.stringify(config, null, 2) + '\n');
  console.log('Packaged OpenCancer frontend alongside Eve in Vercel build output.');
}
