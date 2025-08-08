const fs = require('fs');
const path = require('path');

function ensureDirSync(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function rimrafSync(targetPath) {
  if (!fs.existsSync(targetPath)) return;
  for (const entry of fs.readdirSync(targetPath)) {
    const full = path.join(targetPath, entry);
    const stat = fs.lstatSync(full);
    if (stat.isDirectory()) {
      rimrafSync(full);
    } else {
      fs.unlinkSync(full);
    }
  }
  fs.rmdirSync(targetPath);
}

function copyRecursive(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    ensureDirSync(dest);
    for (const entry of fs.readdirSync(src)) {
      copyRecursive(path.join(src, entry), path.join(dest, entry));
    }
  } else {
    ensureDirSync(path.dirname(dest));
    fs.copyFileSync(src, dest);
  }
}

const projectRoot = process.cwd();
// Derive default target folder from package name so folder matches package.json name
let packageName = 'oidyssey';
try {
  // scripts/.. -> package.json
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const pkg = require(path.join(projectRoot, 'package.json'));
  if (pkg && typeof pkg.name === 'string' && pkg.name.trim()) {
    packageName = pkg.name.trim();
  }
} catch {}

const defaultTarget = path.join(projectRoot, 'n8n_file_structure', packageName);
const targetDir = process.env.N8N_NODE_TARGET || defaultTarget;

const srcDist = path.join(projectRoot, 'dist');
const filesToCopy = ['package.json', 'index.js', 'LICENSE', 'README.md'];

if (!fs.existsSync(srcDist)) {
  console.error('dist/ not found. Run `npm run build` first.');
  process.exit(1);
}

ensureDirSync(targetDir);

// Clean target except node_modules
for (const entry of fs.readdirSync(targetDir)) {
  if (entry === 'node_modules') continue;
  const full = path.join(targetDir, entry);
  const stat = fs.lstatSync(full);
  if (stat.isDirectory()) {
    rimrafSync(full);
  } else {
    fs.unlinkSync(full);
  }
}

// Copy dist
copyRecursive(srcDist, path.join(targetDir, 'dist'));

// Copy top-level files
for (const f of filesToCopy) {
  const src = path.join(projectRoot, f);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, path.join(targetDir, f));
  }
}

console.log(`Synced build to ${targetDir}`);


