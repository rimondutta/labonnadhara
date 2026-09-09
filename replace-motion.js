const fs = require('fs');
const path = require('path');

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let changed = false;

      // Replace import { motion, ... } with import { m, ... }
      if (content.match(/import\s*{[^}]*\bmotion\b[^}]*}\s*from\s*['"]framer-motion['"]/)) {
        content = content.replace(/(import\s*{[^}]*)\bmotion\b([^}]*}\s*from\s*['"]framer-motion['"])/g, '$1m$2');
        changed = true;
      }

      // Replace <motion.div to <m.div
      if (content.includes('<motion.')) {
        content = content.replace(/<motion\./g, '<m.');
        changed = true;
      }
      // Replace </motion.div> to </m.div>
      if (content.includes('</motion.')) {
        content = content.replace(/<\/motion\./g, '</m.');
        changed = true;
      }

      // Replace motion(Component) to m(Component)
      if (content.match(/\bmotion\(/)) {
        content = content.replace(/\bmotion\(/g, 'm(');
        changed = true;
      }

      if (changed) {
        fs.writeFileSync(fullPath, content);
        console.log(`Updated ${fullPath}`);
      }
    }
  }
}

processDir(path.join(__dirname, 'src'));
