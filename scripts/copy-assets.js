const fs = require('fs');
const path = require('path');

function ensureDirSync(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function copyFileSync(src, dest) {
  ensureDirSync(path.dirname(dest));
  fs.copyFileSync(src, dest);
  console.log(`Copied ${src} -> ${dest}`);
}

const projectRoot = process.cwd();
const srcIcon = path.join(projectRoot, 'src', 'snmp.svg');
const distRootIcon = path.join(projectRoot, 'dist', 'snmp.svg');
const distSnmpIcon = path.join(projectRoot, 'dist', 'nodes', 'Snmp', 'snmp.svg');
const distTrapIcon = path.join(projectRoot, 'dist', 'nodes', 'SnmpTrapTrigger', 'snmp.svg');

try {
  if (fs.existsSync(srcIcon)) {
    copyFileSync(srcIcon, distRootIcon);
    copyFileSync(srcIcon, distSnmpIcon);
    copyFileSync(srcIcon, distTrapIcon);
  } else {
    console.warn(`Icon not found at ${srcIcon}; skipping copy.`);
  }
} catch (err) {
  console.error('Error copying assets:', err);
  process.exit(1);
}


