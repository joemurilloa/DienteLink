import React, { useState } from 'react';
import { useTeam } from '../../../hooks/useTeam';
import { useRoleAccess } from '../../RoleGuard';
import { UserRole } from '../../../types';
import { Users, Mail, Shield, UserMinus, X, Plus, Crown, Stethoscope, Phone, ChevronDown } from 'lucide-react';

const ROLE_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  owner:       { label: 'Propietario',      color: 'text-indigo-700', bg: 'bg-indigo-100',   icon: <Crown size={12} /> },
  admin:       { label: 'Administrador',    color: 'text-violet-700', bg: 'bg-violet-100',   icon: <Shield size={12} /> },
  assistant:   { label: 'Asistente Clínico',color: 'text-emerald-700',bg: 'bg-emerald-100',  icon: <Stethoscope size={12} /> },
  receptionist:{ label: 'Recepcionista',    color: 'text-sky-700',    bg: 'bg-sky-100',      icon: <Phone size={12} /> },
};

const PERMISSIONS_INFO: Record<string, string[]> = {
  owner:       ['Acceso total', 'Gestión de equipo', 'Facturación', 'Configuración'],
  admin:       ['Acceso clínico completo', 'Gestión de equipo', 'Ver finanzas'],
  assistant:   ['Ver y editar expedientes', 'Odontograma y Perio', 'Recetas y Consentimientos', 'Sin acceso financiero'],
  receptionist:['Solo calendario y citas', 'Solicitudes de reserva', 'Sin expediente clínico', 'Sin datos financieros'],
};

const RoleBadge: React.FC<{ role: string }> = ({ role }) => {
  const cfg = ROLE_CONFIG[role] || { label: role, color: 'text-slate-600', bg: 'bg-slate-100', icon: null };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${cfg.bg} ${cfg.color}`}>
      {cfg.icon}
      {cfg.label}
    </span>
  );
};

const TeamSettings: React.FC = () => {
  const { teamMembers, invitations, loading, inviteMember, isInviting, cancelInvitation, removeMember, updateMemberRole, isUpdatingRole } = useTeam();
  const { isAdmin, role: currentUserRole } = useRoleAccess();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('receptionist');
  const [error, setError] = useState('');
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [editingRole, setEditingRole] = useState<UserRole>('receptionist');
  const [expandedPermissions, setExpandedPermissions] = useState<string | null>(null);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.trim() || !email.includes('@')) {
      setError('Ingresa un correo electrónico válido');
      return;
    }
    try {
      await inviteMember({ email: email.trim(), role });
      setEmail('');
    } catch (err: any) {
      setError(err.message || 'Error al crear invitación');
    }
  };

  const handleUpdateRole = async (memberId: string) => {
    try {
      await updateMemberRole({ memberId, role: editingRole });
      setEditingMemberId(null);
    } catch {}
  };

  if (!isAdmin) return null;

  return (
    <div className="card-premium p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-11 h-11 bg-indigo-50 rounded-xl flex items-center justify-center">
          <Users size={18} className="text-indigo-600" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-900">Equipo de la Clínica</h3>
          <p className="text-sm text-slate-500">Agrega usuarios y controla qué puede ver cada uno</p>
        </div>
      </div>

      {/* Permissions Reference */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-6">
        {Object.entries(ROLE_CONFIG).map(([roleKey, cfg]) => (
          <button
            key={roleKey}
            onClick={() => setExpandedPermissions(expandedPermissions === roleKey ? null : roleKey)}
            className="p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white hover:border-slate-300 transition-all text-left group"
          >
            <div className={`flex items-center gap-1.5 mb-1.5 text-xs font-bold ${cfg.color}`}>
              {cfg.icon}
              {cfg.label}
              <ChevronDown size={10} className={`ml-auto transition-transform ${expandedPermissions === roleKey ? 'rotate-180' : ''}`} />
            </div>
            {expandedPermissions === roleKey && (
              <ul className="space-y-0.5 mt-2">
                {PERMISSIONS_INFO[roleKey].map(p => (
                  <li key={p} className="text-[11px] text-slate-500 flex items-center gap-1">
                    <span className="w-1 h-1 rounded-full bg-slate-400 flex-shrink-0" />
                    {p}
                  </li>
                ))}
              </ul>
            )}
          </button>
        ))}
      </div>

      {/* Invite Form */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 mb-6">
        <h4 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <Mail size={16} className="text-indigo-500" /> Agregar Miembro al Equipo
        </h4>
        <p className="text-xs text-slate-500 mb-3">
          El usuario debe registrarse en DienteLink con este mismo correo. Al iniciar sesión, se vinculará automáticamente a tu clínica.
        </p>
        {error && <div className="text-sm font-semibold text-red-600 bg-red-50 border border-red-100 p-2.5 rounded-lg mb-4">{error}</div>}
        <form onSubmit={handleInvite} className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <input
              type="email"
              placeholder="correo@ejemplo.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-white px-4 py-2.5 rounded-xl border border-slate-300 text-sm outline-none focus:border-indigo-500 transition-all placeholder:text-slate-400"
            />
          </div>
          <div className="w-full sm:w-52">
            <select
              value={role}
              onChange={e => setRole(e.target.value as UserRole)}
              className="w-full bg-white px-4 py-2.5 rounded-xl border border-slate-300 text-sm outline-none focus:border-indigo-500 transition-all text-slate-700"
            >
              <option value="receptionist">Recepcionista</option>
              <option value="assistant">Asistente Clínico</option>
              <option value="admin">Administrador</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={isInviting}
            className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2 whitespace-nowrap shadow-md shadow-indigo-600/20"
          >
            {isInviting ? <span className="animate-spin">⌛</span> : <Plus size={16} />}
            Agregar
          </button>
        </form>
      </div>

      {/* Pending Invitations */}
      {invitations.length > 0 && (
        <div className="mb-6">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Invitaciones Pendientes</h4>
          <div className="space-y-2">
            {invitations.map(inv => (
              <div key={inv.id} className="flex items-center justify-between p-3.5 bg-amber-50 border border-amber-200 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
                    <Mail size={14} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{inv.email}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <RoleBadge role={inv.role} />
                      <span className="text-xs text-amber-600 font-medium">• Pendiente de registro</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => cancelInvitation(inv.id)}
                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                  title="Cancelar invitación"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Team Members */}
      <div>
        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Miembros Activos</h4>
        {loading ? (
          <div className="space-y-2">
            {[1, 2].map(i => (
              <div key={i} className="h-16 bg-slate-100 animate-pulse rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {teamMembers.map(member => {
              const isOwner = member.role === 'owner';
              const isEditing = editingMemberId === member.id;
              const cfg = ROLE_CONFIG[member.role] || ROLE_CONFIG.owner;
              const initials = member.full_name.split(' ').filter(Boolean).map(w => w[0]).join('').substring(0, 2).toUpperCase() || '??';

              return (
                <div key={member.id} className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={`w-11 h-11 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 ${isOwner ? 'bg-gradient-to-br from-indigo-500 to-violet-600' : 'bg-gradient-to-br from-slate-400 to-slate-500'}`}>
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800 flex items-center gap-2 flex-wrap">
                          {member.full_name}
                          {isOwner && <Crown size={12} className="text-indigo-500 flex-shrink-0" />}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <RoleBadge role={member.role} />
                        </div>
                      </div>
                    </div>

                    {/* Actions: only for non-owner members */}
                    {!isOwner && (
                      <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                        {!isEditing ? (
                          <>
                            <button
                              onClick={() => { setEditingMemberId(member.id); setEditingRole(member.role as UserRole); }}
                              className="px-3 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-all border border-indigo-100"
                            >
                              Cambiar rol
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`¿Remover a ${member.full_name} del equipo?\nPerderá acceso a la clínica.`)) {
                                  removeMember(member.id);
                                }
                              }}
                              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                              title="Remover miembro"
                            >
                              <UserMinus size={15} />
                            </button>
                          </>
                        ) : (
                          <div className="flex items-center gap-2">
                            <select
                              value={editingRole}
                              onChange={e => setEditingRole(e.target.value as UserRole)}
                              className="px-3 py-1.5 rounded-lg border border-indigo-300 text-xs font-medium text-slate-700 bg-white outline-none focus:border-indigo-500"
                            >
                              <option value="receptionist">Recepcionista</option>
                              <option value="assistant">Asistente Clínico</option>
                              <option value="admin">Administrador</option>
                            </select>
                            <button
                              onClick={() => handleUpdateRole(member.id)}
                              disabled={isUpdatingRole}
                              className="px-3 py-1.5 text-xs font-bold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all disabled:opacity-50"
                            >
                              {isUpdatingRole ? '...' : 'Guardar'}
                            </button>
                            <button
                              onClick={() => setEditingMemberId(null)}
                              className="p-1.5 text-slate-400 hover:text-slate-700 transition-all"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!loading && teamMembers.length === 0 && (
          <div className="text-center py-8 text-slate-500">
            <Users size={28} className="mx-auto mb-2 text-slate-300" />
            <p className="text-sm font-medium">Aún no hay miembros en el equipo</p>
            <p className="text-xs text-slate-400 mt-1">Agrega a tu primer colaborador arriba</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeamSettings;
