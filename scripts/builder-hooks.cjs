// Neutralize optional @chainsafe/hashtree* platform packages.
// Some builder setups try to scandir missing folders.
// Create empty dirs before packing to avoid ENOENT.

const fs = require('fs');
const path = require('path');

const HASHTREE_PKGS = [
  '@chainsafe/hashtree-darwin-arm64',
  '@chainsafe/hashtree-darwin-x64',
  '@chainsafe/hashtree-linux-x64-gnu',
  '@chainsafe/hashtree-linux-arm64-gnu',
  '@chainsafe/hashtree-win32-x64-msvc'
];

function ensureEmptyDir(p) {
  try { fs.mkdirSync(p, { recursive: true }); } catch {}
}

exports.default = async function beforePack(context) {
  const appDir = context.appDir || process.cwd();
  const nm = path.join(appDir, 'node_modules');
  for (const name of HASHTREE_PKGS) {
    const dir = path.join(nm, ...name.split('/'));
    ensureEmptyDir(dir);
  }
  console.log('[beforePack] ensured dummy hashtree platform dirs inside app:', HASHTREE_PKGS.join(', '));
};
