import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, Wifi } from 'lucide-react';

const ConnectionStatus: React.FC = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showRestored, setShowRestored] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    let restoredTimer: ReturnType<typeof setTimeout>;

    const handleOffline = () => {
      setIsOnline(false);
      setShowRestored(false);
      setWasOffline(true);
      clearTimeout(restoredTimer);
    };

    const handleOnline = () => {
      setIsOnline(true);
      if (wasOffline) {
        setShowRestored(true);
        restoredTimer = setTimeout(() => {
          setShowRestored(false);
          setWasOffline(false);
        }, 3000);
      }
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
      clearTimeout(restoredTimer);
    };
  }, [wasOffline]);

  // Offline banner — persists while offline
  if (!isOnline) {
    return (
      <AnimatePresence>
        <motion.div
          key="offline"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="overflow-hidden"
        >
          <div className="flex items-center gap-2.5 px-4 py-2 bg-slate-800 text-white text-sm font-semibold">
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              <WifiOff size={14} className="text-red-400 flex-shrink-0" />
              <span className="text-slate-200">Sin conexión</span>
              <span className="text-slate-500 hidden sm:inline">— Los cambios se guardarán cuando vuelvas en línea</span>
            </div>
            <span className="flex h-2 w-2 relative flex-shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
            </span>
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  // "Restored" banner — auto-disappears after 3s
  if (showRestored) {
    return (
      <AnimatePresence>
        <motion.div
          key="restored"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="overflow-hidden"
        >
          <div className="flex items-center gap-2.5 px-4 py-2 bg-emerald-600 text-white text-sm font-semibold">
            <Wifi size={14} className="flex-shrink-0" />
            <span>¡Conexión restaurada!</span>
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  return null;
};

export default ConnectionStatus;
