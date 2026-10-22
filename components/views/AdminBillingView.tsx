import React, { useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { sileo } from 'sileo';
import { useAuth } from '../../services/authService';
import { BILLING, daysRemaining, isPlatformAdmin, planDaysLabel, type PlanDays } from '../../lib/billing';
import { useAdminBilling, type AdminClinic, type AdminReceipt } from '../../hooks/useAdminBilling';
import ConfirmModal from '../ConfirmModal';

const receiptStatusLabel: Record<string, string> = {
  pending: 'Pendiente',
  approved: 'Aprobado',
  rejected: 'Rechazado',
};

function formatWhen(value: string | null | undefined) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('es-HN', { dateStyle: 'medium', timeStyle: 'short' });
}

const ReceiptRow: React.FC<{ receipt: AdminReceipt }> = ({ receipt }) => {
  const isImage = !!receipt.image_url && !receipt.image_url.toLowerCase().includes('.pdf');
  return (
    <div className="flex gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
      {isImage ? (
        <a href={receipt.image_url!} target="_blank" rel="noreferrer" className="shrink-0">
          <img src={receipt.image_url!} alt="Comprobante" className="w-16 h-16 object-cover rounded-lg border border-slate-200" />
        </a>
      ) : (
        <div className="w-16 h-16 shrink-0 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-center text-[10px] font-bold leading-tight text-slate-400 px-1">
          {receipt.image_url ? 'PDF' : '📧 Gmail'}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
            receipt.status === 'pending' ? 'bg-amber-100 text-amber-800'
              : receipt.status === 'approved' ? 'bg-green-100 text-green-700'
              : 'bg-slate-200 text-slate-600'
          }`}>
            {receiptStatusLabel[receipt.status] || receipt.status}
          </span>
          <span className="text-xs text-slate-500">{formatWhen(receipt.created_at)}</span>
        </div>
        {receipt.notes && <p className="text-xs text-slate-600 mt-1 truncate">{receipt.notes}</p>}
        {receipt.email_referencia && (
          <p className="text-xs text-slate-500 mt-0.5 truncate">Ref: {receipt.email_referencia}</p>
        )}
        {receipt.image_url ? (
          <a href={receipt.image_url} target="_blank" rel="noreferrer" className="text-xs font-semibold text-blue-600 hover:underline">
            Abrir comprobante
          </a>
        ) : (
          <p className="text-[11px] text-slate-500 mt-1 leading-snug">
            La captura está en el correo a {BILLING.adminEmail} (asunto “Por revisar…”). Aquí no se guarda la imagen para no usar Storage.
          </p>
        )}
      </div>
    </div>
  );
};

const AdminBillingView: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const allowed = isPlatformAdmin(user?.email);
  const { clinics, loading, error, refresh, extend, rejectPending, extendingId, now } = useAdminBilling(allowed);
  const [query, setQuery] = useState('');
  const [openReceipts, setOpenReceipts] = useState<Record<string, boolean>>({});
  const [pending, setPending] = useState<{ clinic: AdminClinic; days: PlanDays } | null>(null);
  const [rejectClinic, setRejectClinic] = useState<AdminClinic | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return clinics;
    return clinics.filter((c) =>
      [c.full_name, c.clinic_name, c.email].some((v) => (v || '').toLowerCase().includes(q))
    );
  }, [clinics, query]);

  if (!allowed) return <Navigate to="/" replace />;

  const confirmExtend = async () => {
    if (!pending || !isPlatformAdmin(user?.email)) return;
    const { clinic, days } = pending;
    try {
      const result = await extend(clinic.clinic_id, days);
      sileo.success({
        title: `Activado ${planDaysLabel(days)}`,
        description: `${clinic.full_name} queda con ${result.days_left} día${result.days_left === 1 ? '' : 's'}.`,
      });
    } catch (err) {
      sileo.error({
        title: 'No se pudo activar',
        description: err instanceof Error ? err.message : 'Intenta de nuevo',
      });
    }
  };

  const confirmReject = async () => {
    if (!rejectClinic || !isPlatformAdmin(user?.email)) return;
    try {
      const result = await rejectPending(rejectClinic.clinic_id);
      sileo.success({
        title: 'Comprobante rechazado',
        description: result.rejected_count
          ? `${rejectClinic.full_name}: pendiente liberado. Puede enviar otro.`
          : 'No había pendientes.',
      });
    } catch (err) {
      sileo.error({
        title: 'No se pudo rechazar',
        description: err instanceof Error ? err.message : 'Intenta de nuevo',
      });
    }
  };

  return (
    <div className="flex-1 h-full overflow-y-auto p-5 lg:p-8 pb-32 page-transition main-scroll">
      <header className="mb-6">
        <button onClick={() => navigate('/settings')} className="text-sm font-semibold text-slate-500 hover:text-slate-800 mb-3">
          ← Ajustes
        </button>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Panel interno de cobros</h2>
        <p className="text-xs font-semibold text-emerald-700 mt-2 px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-100">
          Solo usable por {BILLING.adminEmail}. Flujo: 1) revisa el comprobante en Gmail → 2) verifica cuenta BAC {BILLING.bank.account} → 3) activa días aquí.
        </p>
        <p className="text-xs text-slate-500 mt-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200">
          La imagen no se guarda en Supabase (ahorra Storage). Si el correo no llegó, pide al doctor que reenvíe desde Suscripción.
        </p>
      </header>

      <div className="max-w-3xl space-y-4">
        <div className="flex gap-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por doctor, clínica o email"
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
          />
          <button
            onClick={() => refresh()}
            className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-sm font-semibold hover:bg-slate-200"
          >
            Actualizar
          </button>
        </div>

        {error && (
          <div className="card-premium p-4 border border-amber-200 bg-amber-50 text-sm text-amber-800">
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-sm text-slate-400">Cargando clínicas...</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-slate-400">No hay clínicas para mostrar.</p>
        ) : (
          filtered.map((clinic) => {
            const liveDays = daysRemaining(clinic.period_end ? new Date(clinic.period_end) : null, new Date(now));
            const courtesyUntil = clinic.receipts
              .filter((receipt) => receipt.status === 'pending' && receipt.provisional_access_until)
              .map((receipt) => new Date(receipt.provisional_access_until!))
              .filter((date) => !Number.isNaN(date.getTime()) && date.getTime() > now)
              .sort((a, b) => b.getTime() - a.getTime())[0] ?? null;
            const courtesyDays = daysRemaining(courtesyUntil, new Date(now));
            const expired = liveDays <= 0 && courtesyDays <= 0;
            const pendingPay = clinic.pending_receipts > 0;
            const isMine = clinic.clinic_id === user?.id;
            const receiptsOpen = !!openReceipts[clinic.clinic_id];
            return (
              <div key={clinic.clinic_id} className={`card-premium p-5 ${pendingPay ? 'ring-2 ring-amber-300' : ''}`}>
                <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                  <div>
                    <p className="font-bold text-slate-900">
                      {clinic.full_name || 'Sin nombre'}
                      {isMine && <span className="ml-2 text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">Tu tester</span>}
                    </p>
                    <p className="text-sm text-slate-500">{clinic.clinic_name || 'Sin clínica'} · {clinic.email || 'Sin email'}</p>
                    <p className="text-sm font-semibold text-slate-800 mt-1">
                      {courtesyDays > 0
                        ? `${courtesyDays} día${courtesyDays === 1 ? '' : 's'} de cortesía · el pago aún no suma`
                        : expired
                        ? '0 días · sin acceso'
                        : `Quedan ${liveDays} día${liveDays === 1 ? '' : 's'}`}
                      {courtesyUntil ? (
                        <span className="text-slate-400 font-medium"> · cortesía hasta {formatWhen(courtesyUntil.toISOString())}</span>
                      ) : clinic.period_end && liveDays > 0 ? (
                        <span className="text-slate-400 font-medium"> · vence {formatWhen(clinic.period_end)}</span>
                      ) : null}
                    </p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                    pendingPay ? 'bg-amber-100 text-amber-800'
                      : expired ? 'bg-red-100 text-red-700'
                      : clinic.is_trial ? 'bg-blue-100 text-blue-700'
                      : 'bg-green-100 text-green-700'
                  }`}>
                    {pendingPay ? `${clinic.pending_receipts} por revisar`
                      : expired ? 'Sin acceso'
                      : clinic.is_trial ? 'Trial'
                      : 'Activa'}
                  </span>
                </div>

                {clinic.receipts.length > 0 && (
                  <div className="mb-3">
                    <button
                      type="button"
                      onClick={() => setOpenReceipts((prev) => ({ ...prev, [clinic.clinic_id]: !receiptsOpen }))}
                      className="text-sm font-semibold text-blue-600 hover:underline"
                    >
                      {receiptsOpen ? 'Ocultar comprobantes' : `Ver ${clinic.receipts.length} comprobante${clinic.receipts.length === 1 ? '' : 's'}`}
                    </button>
                    {receiptsOpen && (
                      <div className="mt-2 space-y-2">
                        {clinic.receipts.map((receipt) => (
                          <ReceiptRow key={receipt.id} receipt={receipt} />
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  {([30, 60, 90, 365] as PlanDays[]).map((days) => (
                    <button
                      key={days}
                      disabled={extendingId === clinic.clinic_id}
                      onClick={() => setPending({ clinic, days })}
                      className="px-3 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 disabled:opacity-50"
                    >
                      {planDaysLabel(days)}
                    </button>
                  ))}
                  {pendingPay && (
                    <button
                      type="button"
                      disabled={extendingId === clinic.clinic_id}
                      onClick={() => setRejectClinic(clinic)}
                      className="px-3 py-2 rounded-xl bg-white text-red-700 border border-red-200 text-xs font-bold hover:bg-red-50 disabled:opacity-50"
                    >
                      Rechazar pendiente
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <ConfirmModal
        isOpen={!!pending}
        onClose={() => setPending(null)}
        onConfirm={confirmExtend}
        variant="info"
        title={`Activar ${pending ? planDaysLabel(pending.days) : ''}`}
        description={
          pending
            ? `¿Ya revisaste el comprobante en Gmail (${BILLING.adminEmail}) y que la transferencia sea a ${BILLING.bank.holder} · ${BILLING.bank.account}? Se suman ${pending.days === 365 ? '365 días (1 año)' : `${pending.days} días`} a ${pending.clinic.full_name}.`
            : ''
        }
        confirmLabel="Sí, activar acceso"
      />

      <ConfirmModal
        isOpen={!!rejectClinic}
        onClose={() => setRejectClinic(null)}
        onConfirm={confirmReject}
        variant="danger"
        title="Rechazar comprobante pendiente"
        description={
          rejectClinic
            ? `Se marca como rechazado para ${rejectClinic.full_name}. No se suman días. El doctor podrá enviar otro comprobante.`
            : ''
        }
        confirmLabel="Rechazar"
      />
    </div>
  );
};

export default AdminBillingView;
