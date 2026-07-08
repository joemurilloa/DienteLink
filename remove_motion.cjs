const fs = require('fs');

function removeMotion(filePath) {
  let c = fs.readFileSync(filePath, 'utf8');
  c = c.replace(/import\s+\{[^}]*motion[^}]*\}\s+from\s+'framer-motion';\r?\n?/g, '');
  c = c.replace(/<motion\.(\w+)(\s)/g, '<$1$2');
  c = c.replace(/<motion\.(\w+)>/g, '<$1>');
  c = c.replace(/<\/motion\.(\w+)>/g, '</$1>');
  c = c.replace(/<AnimatePresence[^>]*>\r?\n?/g, '');
  c = c.replace(/<\/AnimatePresence>\r?\n?/g, '');
  c = c.replace(/\s+initial=\{\{[^}]*\}\}/g, '');
  c = c.replace(/\s+animate=\{\{[^}]*\}\}/g, '');
  c = c.replace(/\s+exit=\{\{[^}]*\}\}/g, '');
  c = c.replace(/\s+transition=\{\{[^}]*\}\}/g, '');
  c = c.replace(/\s+whileHover=\{\{[^}]*\}\}/g, '');
  c = c.replace(/\s+whileTap=\{\{[^}]*\}\}/g, '');
  c = c.replace(/\s+variants=\{\{[^}]*\}\}/g, '');
  fs.writeFileSync(filePath, c);
  console.log('Done: ' + filePath);
}

removeMotion('components/NotificationCenter.tsx');
removeMotion('components/ConnectionStatus.tsx');
removeMotion('components/BookingConfiguration.tsx');
