import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../services/authService';
import { sileo } from 'sileo';
import DentalLogo from './DentalLogo';

const AuthPage: React.FC = () => {
  const { user, signIn, signUp, signInWithGoogle, resetPassword } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/', { replace: true });
    }
  }, [user, navigate]);
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [isResetMode, setIsResetMode] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (isResetMode) {
      if (!email.trim()) {
        setError('Ingresa tu email para recuperar la contraseña');
        setLoading(false);
        return;
      }
      const { error } = await resetPassword(email);
      if (error) {
        setError(translateError(error));
        sileo.error({ title: 'Error al enviar enlace', description: translateError(error) });
      } else {
        setResetSuccess(true);
        sileo.success({ title: 'Enlace enviado', description: 'Revisa tu bandeja de entrada o spam.' });
      }
    } else if (isLogin) {
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
    if (error.includes('User not found')) return 'No hay ninguna cuenta con este email';
    return error;
  };

  if (signupSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-300 p-8 text-center">
            <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <span className="text-3xl">✉️</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">¡Revisa tu email!</h2>
            <p className="text-slate-500 text-sm mb-2 leading-relaxed">
              Te enviamos un enlace de confirmación a <strong className="text-slate-700">{email}</strong>. 
              Haz clic en el enlace para activar tu cuenta.
            </p>
            <p className="text-sm text-slate-500 mb-6">
              ¿No lo encuentras? Revisa tu carpeta de spam o correo no deseado.
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
          <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/25">
            <DentalLogo size={36} variant="white" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">DienteLink</h1>
          <p className="text-sm text-slate-500 font-semibold mt-1">Gestión Dental Profesional</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-300 p-8">
          {/* Toggle */}
          <div className="flex bg-slate-50 rounded-xl p-1 mb-7">
            <button
              onClick={() => { setIsLogin(true); setError(''); }}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                isLogin ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-600'
              }`}
            >
              Iniciar Sesión
            </button>
            <button
              onClick={() => { setIsLogin(false); setError(''); }}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                !isLogin ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-600'
              }`}
            >
              Crear Cuenta
            </button>
          </div>

          <button
            onClick={() => {
              setLoading(true);
              signInWithGoogle().catch((err) => {
                sileo.error({ title: 'Error', description: err.message });
                setLoading(false);
              });
            }}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-3.5 bg-white border border-slate-300 text-slate-700 rounded-xl font-semibold hover:bg-slate-50 transition-all shadow-sm mb-6"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              <path d="M1 1h22v22H1z" fill="none" />
            </svg>
            Continuar con Google
          </button>

          <div className="relative flex items-center mb-6">
            <div className="flex-grow border-t border-slate-300"></div>
            <span className="flex-shrink-0 mx-4 text-sm font-semibold text-slate-500 uppercase tracking-wider">
              o usar correo
            </span>
            <div className="flex-grow border-t border-slate-300"></div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                  Nombre completo
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Dr. Juan Pérez"
                  className="w-full px-4 py-3.5 rounded-xl border border-slate-300 bg-slate-50 text-sm font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
                  autoComplete="name"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="doctor@ejemplo.com"
                className="w-full px-4 py-3.5 rounded-xl border border-slate-300 bg-slate-50 text-sm font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
                required
                autoComplete="email"
              />
            </div>

            {!isResetMode && (
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Contraseña
                  </label>
                  {isLogin && (
                    <button
                      type="button"
                      onClick={() => { setIsResetMode(true); setError(''); setResetSuccess(false); }}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      ¿Olvidaste tu contraseña?
                    </button>
                  )}
                </div>
                <div className="relative group">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={isLogin ? '••••••••' : 'Mínimo 6 caracteres'}
                    className="w-full px-4 py-3.5 rounded-xl border border-slate-300 bg-slate-50 text-sm font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
                    required={!isResetMode}
                    minLength={6}
                    autoComplete={isLogin ? 'current-password' : 'new-password'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-slate-500 transition-colors"
                  >
                    {showPassword ? 'Ocultar' : 'Ver'}
                  </button>
                </div>
              </div>
            )}

            {error && (
              <div className="px-4 py-3 bg-red-50 border border-red-100 rounded-xl">
                <p className="text-sm text-red-600 font-medium">{error}</p>
              </div>
            )}

            {resetSuccess && (
              <div className="px-4 py-3 bg-green-50 border border-green-100 rounded-xl">
                <p className="text-sm text-green-700 font-medium">✨ Enlace de recuperación enviado. Revisa tu bandeja de entrada o spam.</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || resetSuccess}
              className="w-full py-3.5 bg-blue-600 text-white rounded-xl font-semibold text-sm shadow-lg shadow-blue-600/25 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all mt-2"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {isResetMode ? 'Enviando...' : isLogin ? 'Entrando...' : 'Creando cuenta...'}
                </span>
              ) : (
                isResetMode ? 'Enviar enlace de recuperación' : isLogin ? 'Entrar a DienteLink' : 'Crear mi Cuenta'
              )}
            </button>
            
            {isResetMode && (
              <button
                type="button"
                onClick={() => { setIsResetMode(false); setError(''); setResetSuccess(false); }}
                className="w-full py-3 text-slate-500 hover:text-slate-800 text-sm font-medium transition-colors"
              >
                Volver a Iniciar Sesión
              </button>
            )}
          </form>

          {!isLogin && (
            <p className="text-sm text-slate-500 text-center mt-5 leading-relaxed">
              Al crear tu cuenta aceptas que tus datos clínicos serán almacenados de forma segura en la nube.
            </p>
          )}
        </div>

        <p className="text-center text-sm text-slate-500 mt-6">
          © {new Date().getFullYear()} DienteLink — Gestión Dental Profesional
        </p>
      </div>
    </div>
  );
};

export default AuthPage;
