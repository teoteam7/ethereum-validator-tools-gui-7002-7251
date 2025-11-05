import { mkdir, readdir, copyFile, readFile, writeFile } from 'fs/promises';
import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

const srcDir = path.resolve('src/renderer');
const dstDir = path.resolve('dist/renderer');
const exts = new Set(['.html','.css','.js','.svg','.png','.ico','.json','.txt','.woff','.woff2']);

async function ensureDir(p) { await mkdir(p, { recursive: true }); }

async function copyTree(src, dst) {
  await ensureDir(dst);
  let copied = 0;
  const entries = await readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    const sp = path.join(src, entry.name);
    const dp = path.join(dst, entry.name);
    if (entry.isDirectory()) {
      copied += await copyTree(sp, dp);
    } else {
      const ext = path.extname(entry.name).toLowerCase();
      if (exts.has(ext)) {
        await ensureDir(path.dirname(dp));
        await copyFile(sp, dp);
        copied += 1;
      }
    }
  }
  return copied;
}

function resolveMotionEntrypoint() {
  try {
    const motionPkgPath = require.resolve('motion/package.json');
    const motionPkg = require(motionPkgPath);
    const baseDir = path.dirname(motionPkgPath);

    const exportsField = motionPkg.exports;
    if (exportsField) {
      let mainExport = exportsField['.'] ?? exportsField;
      if (typeof mainExport === 'string') {
        return path.resolve(baseDir, mainExport);
      } else if (typeof mainExport === 'object') {
        const importPath = mainExport.import || mainExport.module || mainExport.default;
        if (importPath) return path.resolve(baseDir, importPath);
      }
    }
    if (motionPkg.module) return path.resolve(baseDir, motionPkg.module);
    if (motionPkg.main) return path.resolve(baseDir, motionPkg.main);

    const candidates = [
      'dist/index.mjs', 'dist/index.js',
      'dist/motion.mjs', 'dist/motion.js',
      'index.mjs', 'index.js'
    ];
    for (const rel of candidates) {
      const p = path.resolve(baseDir, rel);
      try { require.resolve(p); return p; } catch {}
    }
  } catch {}
  return null;
}

async function vendorMotion() {
  const entry = resolveMotionEntrypoint();
  if (!entry) return null;
  const fname = path.basename(entry);
  const dst = path.join(dstDir, 'vendor', 'motion', fname);
  await ensureDir(path.dirname(dst));
  await copyFile(entry, dst);
  return { spec: 'motion', path: `./vendor/motion/${fname}` };
}

async function writeImportMap(mappings) {
  const mapPath = path.join(dstDir, 'importmap.json');
  const imports = {};
  for (const m of mappings) { if (m) imports[m.spec] = m.path; }
  await writeFile(mapPath, JSON.stringify({ imports }, null, 2), 'utf-8');

  const indexPath = path.join(dstDir, 'index.html');
  try {
    let html = await readFile(indexPath, 'utf-8');
    if (!html.includes('type="importmap"')) {
      html = html.replace('</head>', '  <script type="importmap" src="./importmap.json"></script>\n</head>');
      await writeFile(indexPath, html, 'utf-8');
    }
  } catch {}
}

(async () => {
  try {
    const copied = await copyTree(srcDir, dstDir);
    const m = await vendorMotion();
    await writeImportMap([m]);
    console.log(`[copyRenderer] Copied ${copied} files; importmap:`, m ? JSON.stringify(m) : '{}');
  } catch (err) {
    console.error('[copyRenderer] Failed:', err);
    process.exit(1);
  }
})();
