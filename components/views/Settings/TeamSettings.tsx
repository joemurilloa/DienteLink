import React, { useState } from 'react';
import { useTeam } from '../../../hooks/useTeam';
import { useRoleAccess } from '../../RoleGuard';
import { UserRole } from '../../../types';
import { Users, Mail, Shield, UserMinus, X, Plus } from 'lucide-react';

const TeamSettings: React.FC = () => {
  const { teamMembers, invitations, loading, inviteMember, isInviting, cancelInvitation, removeMember } = useTeam();
  const { isAdmin } = useRoleAccess();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('assistant');
  const [error, setError] = useState('');

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
      setError(err.message || 'Error al enviar invitación');
    }
  };

  const getRoleLabel = (r: string) => {
    switch (r) {
      case 'owner': return 'Propietario';
      case 'admin': return 'Administrador';
      case 'assistant': return 'Asistente Clínico';
      case 'receptionist': return 'Recepcionista';
      default: return r;
    }
  };

  if (!isAdmin) return null; // Only admins can see this panel

  return (
    <div className="card-premium p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
          <Users size={18} className="text-indigo-600" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-900">Equipo de Clínica</h3>
          <p className="text-xs text-slate-400">Invita a secretarias y asistentes para colaborar</p>
        </div>
      </div>

        {/* Invite Form */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 mb-8">
          <h4 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Mail size={16} className="text-indigo-500" /> Nueva Invitación
          </h4>
          {error && <div className="text-xs font-semibold text-red-600 bg-red-50 border border-red-100 p-2.5 rounded-lg mb-4">{error}</div>}
          <form onSubmit={handleInvite} className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <input
                type="email"
                placeholder="correo@ejemplo.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-white px-4 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-indigo-500 transition-all placeholder:text-slate-400"
              />
            </div>
            <div className="w-full sm:w-48">
              <select
                value={role}
                onChange={e => setRole(e.target.value as UserRole)}
                className="w-full bg-white px-4 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-indigo-500 transition-all text-slate-700"
              >
                <option value="assistant">Asistente Clínico</option>
                <option value="receptionist">Recepcionista</option>
                <option value="admin">Administrador</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={isInviting}
              className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2 whitespace-nowrap shadow-md shadow-indigo-600/20"
            >
              {isInviting ? <span className="animate-spin">⌛</span> : <Plus size={16} />}
              Invitar
            </button>
          </form>
        </div>

        {/* Pending Invitations */}
        {invitations.length > 0 && (
          <div className="mb-8">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Invitaciones Pendientes</h4>
            <div className="space-y-2">
              {invitations.map(inv => (
                <div key={inv.id} className="flex items-center justify-between p-3.5 bg-white border border-slate-100 rounded-xl shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                      <Mail size={14} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{inv.email}</p>
                      <p className="text-xs text-slate-400">Rol: {getRoleLabel(inv.role)}</p>
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
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Miembros Activos</h4>
          {loading ? (
            <p className="text-sm text-slate-400 animate-pulse">Cargando equipo...</p>
          ) : (
            <div className="space-y-2">
              {teamMembers.map(member => {
                const isOwner = member.role === 'owner';
                return (
                  <div key={member.id} className="flex items-center justify-between p-3.5 bg-white border border-slate-100 rounded-xl shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${isOwner ? 'bg-indigo-500' : 'bg-slate-300'}`}>
                        {member.full_name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                          {member.full_name}
                          {isOwner && <Shield size={12} className="text-indigo-500" />}
                        </p>
                        <p className="text-xs text-slate-400">{getRoleLabel(member.role)}</p>
                      </div>
                    </div>
                    {!isOwner && (
                      <button
                        onClick={() => {
                          if(confirm(`¿Estás seguro de que deseas remover a ${member.full_name} del equipo?`)) {
                            removeMember(member.id);
                          }
                        }}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        title="Remover miembro"
                      >
                        <UserMinus size={16} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
  );
};

export default TeamSettings;
