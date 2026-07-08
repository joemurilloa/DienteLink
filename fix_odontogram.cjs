const fs = require('fs');

let content = fs.readFileSync('components/Odontogram.tsx', 'utf8');

content = content.replace(/import\s+\{\s*motion,\s*AnimatePresence\s*\}\s*from\s*'framer-motion';\r?\n/, '');

// Panel 1: mobileOpen
content = content.replace('<AnimatePresence>\r\n          {mobileOpen && (\r\n            <>\r\n              {/* Backdrop */}\r\n              <motion.div\r\n                initial={{ opacity: 0 }}\r\n                animate={{ opacity: 1 }}\r\n                exit={{ opacity: 0 }}\r\n                className="fixed inset-0 bg-black/20 z-[-1]"\r\n                onClick={() => setMobileOpen(false)}\r\n              />\r\n              <motion.div\r\n                initial={{ height: 0 }}\r\n                animate={{ height: \'auto\' }}\r\n                exit={{ height: 0 }}\r\n                className="overflow-hidden bg-white border-t border-slate-300"\r\n              >', '{mobileOpen && (\r\n            <>\r\n              {/* Backdrop */}\r\n              <div\r\n                className="fixed inset-0 bg-black/20 z-[-1] animate-in fade-in duration-200"\r\n                onClick={() => setMobileOpen(false)}\r\n              />\r\n              <div\r\n                className="overflow-hidden bg-white border-t border-slate-300 animate-in slide-in-from-bottom-2 duration-300"\r\n              >');

content = content.replace('              </motion.div>\r\n            </>\r\n          )}\r\n        </AnimatePresence>', '              </div>\r\n            </>\r\n          )}');

// Panel 2: expanded
content = content.replace('<AnimatePresence>\r\n        {expanded && (\r\n          <motion.div\r\n            initial={{ height: 0, opacity: 0 }}\r\n            animate={{ height: \'auto\', opacity: 1 }}\r\n            exit={{ height: 0, opacity: 0 }}\r\n            transition={{ duration: 0.3 }}\r\n            className="border-t border-slate-300 overflow-hidden"\r\n          >', '{expanded && (\r\n          <div\r\n            className="border-t border-slate-300 overflow-hidden animate-in slide-in-from-top-2 duration-300"\r\n          >');

content = content.replace('<motion.div\r\n                      className="h-full rounded-full"\r\n                      style={{ backgroundColor: stats.integrity > 70 ? \'#3b82f6\' : stats.integrity > 40 ? \'#F59E0B\' : \'#EF4444\' }}\r\n                      initial={{ width: 0 }}\r\n                      animate={{ width: `${stats.integrity}%` }}\r\n                      transition={{ duration: 0.8, ease: \'easeOut\' }}\r\n                    />', '<div\r\n                      className="h-full rounded-full transition-all duration-700 ease-out"\r\n                      style={{ \r\n                        backgroundColor: stats.integrity > 70 ? \'#3b82f6\' : stats.integrity > 40 ? \'#F59E0B\' : \'#EF4444\',\r\n                        width: `${stats.integrity}%` \r\n                      }}\r\n                    />');

content = content.replace('          </motion.div>\r\n        )}\r\n      </AnimatePresence>', '          </div>\r\n        )}');


// Panel 3: compareMode
content = content.replace('<AnimatePresence>\r\n        {compareMode && (\r\n          <motion.div\r\n            initial={{ height: 0, opacity: 0 }}\r\n            animate={{ height: \'auto\', opacity: 1 }}\r\n            exit={{ height: 0, opacity: 0 }}\r\n            className="border-t border-slate-300 overflow-hidden"\r\n          >', '{compareMode && (\r\n          <div\r\n            className="border-t border-slate-300 overflow-hidden animate-in slide-in-from-top-2 duration-300"\r\n          >');

content = content.replace('          </motion.div>\r\n        )}\r\n      </AnimatePresence>', '          </div>\r\n        )}');

// Panel 4: listExpanded
content = content.replace('<AnimatePresence>\r\n        {listExpanded && snapshots.length > 0 && (\r\n          <motion.div\r\n            initial={{ height: 0, opacity: 0 }}\r\n            animate={{ height: \'auto\', opacity: 1 }}\r\n            exit={{ height: 0, opacity: 0 }}\r\n            transition={{ duration: 0.3 }}\r\n            className="border-t border-slate-300 overflow-hidden"\r\n          >', '{listExpanded && snapshots.length > 0 && (\r\n          <div\r\n            className="border-t border-slate-300 overflow-hidden animate-in slide-in-from-top-2 duration-300"\r\n          >');

content = content.replace('          </motion.div>\r\n        )}\r\n      </AnimatePresence>', '          </div>\r\n        )}');

// Fix windows line endings if necessary in the replace, so I'll also do a global replace just in case:
content = content.replace(/<\/motion\.div>/g, '</div>');
content = content.replace(/<AnimatePresence[^>]*>/g, '');
content = content.replace(/<\/AnimatePresence>/g, '');

fs.writeFileSync('components/Odontogram.tsx', content);
