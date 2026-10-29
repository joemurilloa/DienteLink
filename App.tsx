import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './services/authService';
import { useSubscription } from './hooks/useSubscription';
import { Toaster } from 'sileo';
import 'sileo/styles.css';
import ErrorBoundary from './components/ErrorBoundary';

const AppLayout = lazy(() => import('./components/AppLayout'));
const PublicBookingPage = lazy(() => import('./components/PublicBookingPage'));
const AuthPage = lazy(() => import('./components/AuthPage'));
const LandingPage = lazy(() => import('./components/LandingPage'));
const TermsPage = lazy(() => import('./components/TermsPage'));

const DemoRoute: React.FC = () => {
  const { enterGuestMode, isGuest } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (!isGuest) enterGuestMode();
    navigate('/', { replace: true });
  }, []);

  return (
    <div className="flex items-center justify-center h-screen bg-slate-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-4" />
        <p className="text-sm text-slate-400 font-medium">Preparando demo...</p>
      </div>
    </div>
  );
};

// Auth guard — shows login when not authenticated
const AuthGuard: React.FC = () => {
  const { user, loading, clinicId, isGuest } = useAuth();
  const subscription = useSubscription(clinicId);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-sm text-slate-400 font-medium">Iniciando DienteLink...</p>
        </div>
      </div>
    );
  }

  // Allow both authenticated users and guests through
  if (!user && !isGuest) return <Navigate to="/welcome" replace />;

  return <AppLayout subscription={subscription} />;
};

const App: React.FC = () => (
  <Router>
    <ErrorBoundary>
      <AuthProvider>
        <Toaster position="top-center" theme="light" />
        <Suspense fallback={<div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>}>
          <Routes>
            {/* Public booking page - completely independent, no sidebar/nav */}
            <Route path="/p/:doctorId" element={<PublicBookingPage />} />
            
            {/* Public Landing Page */}
            <Route path="/welcome" element={<LandingPage />} />
            <Route path="/terminos" element={<TermsPage />} />
            
            {/* Auth Page */}
            <Route path="/login" element={<AuthPage />} />

            {/* Demo / guest mode — enters guest mode and redirects to dashboard */}
            <Route path="/demo" element={<DemoRoute />} />
            
            {/* Main app with auth guard */}
            <Route path="/*" element={<AuthGuard />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </ErrorBoundary>
  </Router>
);

export default App;
