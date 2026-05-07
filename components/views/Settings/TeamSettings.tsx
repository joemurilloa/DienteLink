import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../services/authService';
import { teamService } from '../../../services/teamService';
import { TeamInvitation, UserRole } from '../../../types';
import { sileo } from 'sileo';
import { Plus, Trash2, Mail, Loader2, Shield } from 'lucide-react';
import { getLocalISODate } from '../../../lib/utils';
import { useRoleAccess } from '../../RoleGuard';

const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Doctor (Admin)',
  receptionist: 'Recepcionista',
  assistant: 'Asistente Clínico',
};

const TeamSettings: React.FC = () => {
  const { profile, clinicId } = useAuth();
  const { isAdmin } = useRoleAccess();
  const [invitations, setInvitations] = useState<TeamInvitation[]>([]);
  const [loading, setLoading] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: '', role: 'receptionist' as UserRole });

  useEffect(() => {
    if (clinicId && isAdmin) {
      loadInvitations();
    }
  }, [clinicId, isAdmin]);

  const loadInvitations = async () => {
    if (!clinicId) return;
    try {
      const data = await teamService.getInvitations(clinicId);
      setInvitations(data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteForm.email || !clinicId) return;

    setLoading(true);
    try {
      await teamService.inviteMember(clinicId, inviteForm.email, inviteForm.role);
      sileo.success({ title: 'Invitación enviada', description: `Se ha invitado a ${inviteForm.email}` });
      setInviteForm({ email: '', role: 'receptionist' });
      loadInvitations();
    } catch (e: any) {
      console.error(e);
      sileo.error({ title: 'Error', description: 'No se pudo enviar la invitación o el correo ya fue invitado.' });
    }
    setLoading(false);
  };

  const handleRevoke = async (id: string) => {
    try {
      await teamService.revokeInvitation(id);
      sileo.success({ title: 'Invitación revocada' });
      loadInvitations();
    } catch (e) {
      sileo.error({ title: 'Error', description: 'No se pudo revocar la invitación.' });
    }
  };

  if (!isAdmin) {
    return (
      <div className="card-premium p-6 mt-5 bg-slate-50 border-slate-200">
        <h3 className="text-base font-bold text-slate-900 mb-2">Mi Equipo</h3>
        <p className="text-sm text-slate-500">Solo el administrador de la clínica puede gestionar el equipo.</p>
      </div>
    );
  }

  return (
    <div className="card-premium p-6 mt-5">
      <div className="flex items-center gap-2 mb-4">
        <Shield size={20} className="text-blue-600" />
        <h3 className="text-base font-bold text-slate-900">Gestión de Equipo</h3>
      </div>
      <p className="text-xs text-slate-400 mb-6">Invita a recepcionistas o asistentes a unirse a tu clínica. Al crear su cuenta con el correo invitado, se les asignará el rol correspondiente.</p>
      
      <form onSubmit={handleInvite} className="flex flex-col sm:flex-row gap-3 mb-8">
        <div className="flex-1 relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="email"
            required
            placeholder="correo@ejemplo.com"
            value={inviteForm.email}
            onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
          />
        </div>
        <select
          value={inviteForm.role}
          onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value as UserRole })}
          className="w-full sm:w-48 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-900 outline-none focus:border-blue-500 bg-white"
        >
          <option value="receptionist">Recepcionista</option>
          <option value="assistant">Asistente Clínico</option>
          <option value="admin">Doctor (Admin)</option>
        </select>
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2 whitespace-nowrap"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
          Invitar
        </button>
      </form>

      <div className="space-y-3">
        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Invitaciones Pendientes</h4>
        {invitations.length === 0 ? (
          <div className="text-center py-6 bg-slate-50 rounded-xl border border-slate-100 border-dashed">
            <p className="text-sm text-slate-400 font-medium">No hay invitaciones pendientes</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
            {invitations.map((inv) => (
              <div key={inv.id} className="p-4 flex items-center justify-between bg-white hover:bg-slate-50 transition-colors">
                <div>
                  <p className="text-sm font-bold text-slate-900">{inv.email}</p>
                  <p className="text-xs text-slate-500 mt-0.5">Rol: <span className="font-semibold text-blue-600">{ROLE_LABELS[inv.role]}</span> • Creada: {getLocalISODate(new Date(inv.created_at))}</p>
                </div>
                <button
                  onClick={() => handleRevoke(inv.id)}
                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Revocar invitación"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TeamSettings;
