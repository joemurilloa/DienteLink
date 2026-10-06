import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { useWhatsAppSend } from '../hooks/useWhatsAppSend';

const WhatsAppIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
    <path d="M12 0C5.373 0 0 5.373 0 12c0 2.136.561 4.14 1.535 5.875L0 24l6.322-1.505A11.954 11.954 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 0 1-5.006-1.37l-.36-.213-3.722.886.93-3.618-.234-.372A9.818 9.818 0 0 1 12 2.182c5.42 0 9.818 4.398 9.818 9.818s-4.398 9.818-9.818 9.818z"/>
  </svg>
);

interface Props {
  send: () => { success: boolean; error?: string };
  storageKey: string;
  initiallySent?: boolean;
  persistLocal?: boolean;
  onSent?: () => void;
  label: string;
  sentLabel?: string;
  /** icon = solo el círculo verde; pill = botón con texto; row = botón ancho */
  variant?: 'icon' | 'pill' | 'row';
  title?: string;
}

const ConfirmBar: React.FC<{
  onConfirm: (yes: boolean) => void;
  variant: 'icon' | 'pill' | 'row';
}> = ({ onConfirm, variant }) => (
  <div
    className={cn(
      'flex items-center gap-1.5 flex-shrink-0 animate-in fade-in duration-200',
      variant === 'row' && 'w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200',
    )}
    onClick={e => e.stopPropagation()}
  >
    <span className={cn(
      'font-semibold text-slate-600',
      variant === 'icon' ? 'hidden sm:block text-[11px] leading-tight text-right' : 'flex-1 text-sm pl-1',
    )}>
      {variant === 'icon' ? <>¿Lo<br />enviaste?</> : '¿Ya enviaste el mensaje?'}
    </span>
    <button
      type="button"
      onClick={e => { e.stopPropagation(); onConfirm(true); }}
      className="h-10 px-3 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 active:scale-95 transition-all flex items-center gap-1"
    >
      <CheckCircle2 size={15} /> Sí
    </button>
    <button
      type="button"
      onClick={e => { e.stopPropagation(); onConfirm(false); }}
      className="h-10 px-3 rounded-xl bg-slate-100 text-slate-600 text-xs font-bold hover:bg-slate-200 active:scale-95 transition-all"
    >
      No
    </button>
  </div>
);

const WhatsAppAction: React.FC<Props> = ({
  send,
  storageKey,
  initiallySent,
  persistLocal = true,
  onSent,
  label,
  sentLabel = 'Enviado',
  variant = 'pill',
  title,
}) => {
  const { sent, pending, open, confirm } = useWhatsAppSend({
    key: storageKey,
    initiallySent,
    persistLocal,
    onSent,
  });

  if (pending) return <ConfirmBar onConfirm={confirm} variant={variant} />;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    open(send());
  };

  if (variant === 'icon') {
    return (
      <button
        type="button"
        onClick={handleClick}
        title={sent ? `${sentLabel}. Clic para volver a enviar.` : title || label}
        aria-label={label}
        className={cn(
          'w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-200 cursor-pointer active:scale-95',
          sent
            ? 'bg-slate-100 text-slate-500 hover:bg-slate-200 border border-slate-200'
            : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-800 border border-slate-200',
        )}
      >
        <span className="relative flex items-center justify-center">
          <WhatsAppIcon size={sent ? 18 : 19} />
          {sent && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-slate-600 rounded-full border-2 border-white" />}
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      title={title || label}
      className={cn(
        'flex items-center justify-center gap-1.5 font-semibold transition-all active:scale-95 cursor-pointer',
        variant === 'row'
          ? 'w-full py-3 rounded-xl text-sm font-bold'
          : 'px-3.5 py-2 rounded-xl text-xs sm:text-sm',
        sent
          ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
          : variant === 'row'
            ? 'bg-[#25D366] hover:bg-[#20ba5a] text-white shadow-md shadow-emerald-500/20'
            : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200',
      )}
    >
      {sent ? <CheckCircle2 size={15} /> : <WhatsAppIcon size={16} />}
      {sent ? sentLabel : label}
    </button>
  );
};

export default WhatsAppAction;
