import React, { useState } from 'react';
import { useAuth } from '../services/authService';
import { sileo } from 'sileo';

const AuthPage: React.FC = () => {
  const { signIn, signUp } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [signupSuccess, setSignupSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (isLogin) {
      const { error } = await signIn(email, password);
      if (error) {
        setError(translateError(error));
        sileo.error({ title: 'Error al iniciar sesión', description: translateError(error) });
      } else {
        sileo.success({ title: `¡Bienvenido de vuelta!`, description: 'Cargando tu clínica...' });
      }
    } else {
      if (!fullName.trim()) {
        setError('Ingresa tu nombre completo');
        setLoading(false);
        return;
      }
      if (password.length < 6) {
        setError('La contraseña debe tener al menos 6 caracteres');
        setLoading(false);
        return;
      }
      const { error } = await signUp(email, password, fullName);
      if (error) {
        setError(translateError(error));
        sileo.error({ title: 'Error al crear cuenta', description: translateError(error) });
      } else {
        setSignupSuccess(true);
        sileo.success({ title: '¡Cuenta creada exitosamente!', description: 'Revisa tu email para confirmar tu cuenta' });
      }
    }

    setLoading(false);
  };

  const translateError = (error: string): string => {
    if (error.includes('Invalid login')) return 'Email o contraseña incorrectos';
    if (error.includes('already registered')) return 'Este email ya está registrado';
    if (error.includes('valid email')) return 'Ingresa un email válido';
    if (error.includes('Password')) return 'La contraseña debe tener al menos 6 caracteres';
    if (error.includes('rate limit')) return 'Demasiados intentos. Espera un momento.';
    return error;
  };

  if (signupSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 p-8 text-center">
            <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <span className="text-3xl">✉️</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">¡Revisa tu email!</h2>
            <p className="text-slate-500 text-sm mb-6 leading-relaxed">
              Te enviamos un enlace de confirmación a <strong className="text-slate-700">{email}</strong>. 
              Haz clic en el enlace para activar tu cuenta.
            </p>
            <button
              onClick={() => { setSignupSuccess(false); setIsLogin(true); }}
              className="w-full py-3.5 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all"
            >
              Ir a Iniciar Sesión
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/30">
            <span className="text-3xl">🦷</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">DienteLink</h1>
          <p className="text-sm text-slate-400 font-semibold mt-1">Gestión Dental Profesional</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 p-8">
          {/* Toggle */}
          <div className="flex bg-slate-50 rounded-xl p-1 mb-7">
            <button
              onClick={() => { setIsLogin(true); setError(''); }}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                isLogin ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              Iniciar Sesión
            </button>
            <button
              onClick={() => { setIsLogin(false); setError(''); }}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                !isLogin ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              Crear Cuenta
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Nombre completo
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Dr. Juan Pérez"
                  className="w-full px-4 py-3.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
                  autoComplete="name"
                />
              </div>
            )}

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="doctor@ejemplo.com"
                className="w-full px-4 py-3.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isLogin ? '••••••••' : 'Mínimo 6 caracteres'}
                className="w-full px-4 py-3.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
                required
                minLength={6}
                autoComplete={isLogin ? 'current-password' : 'new-password'}
              />
            </div>

            {error && (
              <div className="px-4 py-3 bg-red-50 border border-red-100 rounded-xl">
                <p className="text-sm text-red-600 font-medium">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-blue-600 text-white rounded-xl font-semibold text-sm shadow-lg shadow-blue-600/25 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all mt-2"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {isLogin ? 'Entrando...' : 'Creando cuenta...'}
                </span>
              ) : (
                isLogin ? 'Entrar a DienteLink' : 'Crear mi Cuenta'
              )}
            </button>
          </form>

          {!isLogin && (
            <p className="text-xs text-slate-400 text-center mt-5 leading-relaxed">
              Al crear tu cuenta aceptas que tus datos clínicos serán almacenados de forma segura en la nube.
            </p>
          )}
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          © {new Date().getFullYear()} DienteLink — Gestión Dental Profesional
        </p>
      </div>
    </div>
  );
};

export default AuthPage;
