import { mkdir } from 'fs/promises';
import path from 'path';

const pkgs = [
  '@chainsafe/hashtree-darwin-arm64',
  '@chainsafe/hashtree-darwin-x64',
  '@chainsafe/hashtree-linux-x64-gnu',
  '@chainsafe/hashtree-linux-arm64-gnu',
  '@chainsafe/hashtree-win32-x64-msvc'
];

async function ensureDirs() {
  for (const p of pkgs) {
    const dir = path.join('node_modules', ...p.split('/'));
    try {
      await mkdir(dir, { recursive: true });
    } catch {}
  }
  console.log('[prepack] ensured dummy hashtree platform dirs:', pkgs.join(', '));
}

ensureDirs();
