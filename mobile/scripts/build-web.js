import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import esbuild from 'esbuild';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const www = path.join(root, 'www');

fs.mkdirSync(path.join(www, 'js'), { recursive: true });

esbuild.buildSync({
  entryPoints: [path.join(root, 'src', 'app.js')],
  bundle: true,
  format: 'esm',
  outfile: path.join(www, 'js', 'app.js'),
  sourcemap: true,
  target: ['es2020'],
});

// Keep protocol/wearable as separate modules for debugging (also bundled into app.js).
for (const name of ['protocol.js', 'ble-hub.js', 'mqtt-hub.js', 'wearable-input.js']) {
  esbuild.buildSync({
    entryPoints: [path.join(root, 'src', name)],
    bundle: true,
    format: 'esm',
    outfile: path.join(www, 'js', name),
    sourcemap: true,
    target: ['es2020'],
  });
}

fs.copyFileSync(path.join(root, 'index.html'), path.join(www, 'index.html'));
console.log('Built chipnest-hub → www/');
