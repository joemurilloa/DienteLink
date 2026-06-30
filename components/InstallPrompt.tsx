import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, Share, Plus } from 'lucide-react';

// Detectar si ya está instalada como PWA standalone
const isStandalone = (): boolean =>
  window.matchMedia('(display-mode: standalone)').matches ||
  (window.navigator as any).standalone === true;

// Detectar iOS Safari
const isIOS = (): boolean =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) && !(window as any).MSStream;

// Detectar si el navegador soporta el install prompt (Chrome/Edge en Android)
const STORAGE_KEY = 'dientelink_install_dismissed';
const DISMISS_DAYS = 7;

const isDismissed = (): boolean => {
  const ts = localStorage.getItem(STORAGE_KEY);
  if (!ts) return false;
  const diff = Date.now() - parseInt(ts, 10);
  return diff < DISMISS_DAYS * 24 * 60 * 60 * 1000;
};

// ── iOS Install Instructions Modal ──────────────────────────────────────────

const IOSInstructions: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 z-[300] flex items-end justify-center bg-black/40 backdrop-blur-sm p-4"
    onClick={onClose}
  >
    <motion.div
      initial={{ y: 60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 60, opacity: 0 }}
      transition={{ type: 'spring', damping: 26, stiffness: 320 }}
      className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl mb-2"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-2xl shadow-lg shadow-blue-500/30">
            🦷
          </div>
          <div>
            <p className="font-bold text-slate-900 text-[15px]">Instalar DienteLink</p>
            <p className="text-slate-500 text-sm font-medium">En tu pantalla de inicio</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-11 h-11 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      {/* Steps */}
      <div className="space-y-3">
        {[
          {
            step: 1,
            icon: <Share size={16} className="text-blue-600" />,
            label: 'Toca el botón',
            detail: 'Compartir / Share',
            bg: 'bg-blue-50',
          },
          {
            step: 2,
            icon: <Plus size={16} className="text-emerald-600" />,
            label: 'Selecciona',
            detail: '"Agregar a pantalla de inicio"',
            bg: 'bg-emerald-50',
          },
          {
            step: 3,
            icon: <span className="text-[14px]">✅</span>,
            label: 'Toca',
            detail: '"Agregar" para confirmar',
            bg: 'bg-violet-50',
          },
        ].map(({ step, icon, label, detail, bg }) => (
          <div key={step} className={`flex items-center gap-3 ${bg} rounded-2xl p-3.5`}>
            <div className="w-11 h-11 flex items-center justify-center rounded-xl bg-white shadow-sm flex-shrink-0">
              {icon}
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-500">Paso {step}: {label}</p>
              <p className="text-[13px] font-bold text-slate-900">{detail}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Arrow pointing down (towards Safari share button) */}
      <div className="mt-5 flex flex-col items-center gap-2">
        <p className="text-sm text-slate-500 font-medium text-center">
          Busca el botón de compartir en la barra de Safari
        </p>
        <div className="text-2xl animate-bounce">↓</div>
      </div>
    </motion.div>
  </motion.div>
);

// ── Main Component ───────────────────────────────────────────────────────────

const InstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [platform, setPlatform] = useState<'android' | 'ios' | null>(null);

  useEffect(() => {
    // Ya instalada o ya descartada → no hacer nada
    if (isStandalone() || isDismissed()) return;

    if (isIOS()) {
      setPlatform('ios');
      setShowBanner(true);
      return;
    }

    // Android/Chrome: esperar el evento nativo
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setPlatform('android');
      setShowBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem(STORAGE_KEY, String(Date.now()));
  };

  const handleInstallAndroid = async () => {
    if (!deferredPrompt) return;
    setIsInstalling(true);
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setIsInstalling(false);
    if (outcome === 'accepted') {
      setShowBanner(false);
    }
    setDeferredPrompt(null);
  };

  const handleInstallIOS = () => {
    setShowBanner(false);
    setShowIOSModal(true);
  };

  return (
    <>
      {/* Top banner */}
      <AnimatePresence>
        {showBanner && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-3 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-medium">
              {/* App icon */}
              <div className="w-11 h-11 bg-white/20 rounded-xl flex items-center justify-center text-lg flex-shrink-0">
                🦷
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-bold text-[13px] leading-tight">Instala DienteLink</p>
                <p className="text-white/75 text-xs leading-tight hidden sm:block">
                  {platform === 'ios'
                    ? 'Agrégala a tu pantalla de inicio para acceso rápido'
                    : 'Funciona sin internet · Acceso en 1 tap'}
                </p>
              </div>

              {/* CTA */}
              <button
                onClick={platform === 'ios' ? handleInstallIOS : handleInstallAndroid}
                disabled={isInstalling}
                className="flex items-center gap-1.5 px-4 py-2 bg-white text-blue-700 rounded-xl text-sm font-bold hover:bg-blue-50 transition-colors shadow-sm flex-shrink-0 disabled:opacity-60"
              >
                <Download size={13} />
                {isInstalling ? 'Instalando...' : 'Instalar'}
              </button>

              {/* Dismiss */}
              <button
                onClick={handleDismiss}
                className="p-1.5 rounded-lg hover:bg-white/20 transition-colors flex-shrink-0"
                aria-label="Cerrar"
              >
                <X size={14} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* iOS instruction modal */}
      <AnimatePresence>
        {showIOSModal && (
          <IOSInstructions onClose={() => setShowIOSModal(false)} />
        )}
      </AnimatePresence>
    </>
  );
};

export default InstallPrompt;
