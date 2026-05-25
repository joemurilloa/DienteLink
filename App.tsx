import React, { useState, useEffect, Suspense, lazy } from 'react';
import { HashRouter as Router, Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import BottomNav from './components/BottomNav';
import { bookingService } from './services/bookingService';
import { AuthProvider, useAuth } from './services/authService';
import { useFocusManagement } from './lib/KeyboardShortcuts';
import GlobalSearch from './components/GlobalSearch';
import OnboardingWizard from './components/OnboardingWizard';
import { sileo, Toaster } from 'sileo';
import 'sileo/styles.css';

// View components extracted to separate files and lazy loaded
const Dashboard = lazy(() => import('./components/views/DashboardView'));
const PatientsView = lazy(() => import('./components/views/PatientsView'));
const PatientDetailView = lazy(() => import('./components/views/PatientDetailView'));
const CalendarView = lazy(() => import('./components/views/CalendarView'));
const SettingsView = lazy(() => import('./components/views/SettingsView'));
const PatientConsultationView = lazy(() => import('./components/PatientConsultationView'));
const PublicBookingPage = lazy(() => import('./components/PublicBookingPage'));
const BookingManagementView = lazy(() => import('./components/BookingManagementView'));
const AuthPage = lazy(() => import('./components/AuthPage'));
const LandingPage = lazy(() => import('./components/LandingPage'));
const BillingView = lazy(() => import('./components/views/BillingView'));
const PaymentSuccessView = lazy(() => import('./components/views/PaymentSuccessView'));

// Booking Wrapper Components
const BookingManagementWrapper: React.FC = () => {
  const navigate = useNavigate();
  return <BookingManagementView onBack={() => navigate('/')} />;
};

import ErrorBoundary from './components/ErrorBoundary';

const Layout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const { user, clinicId } = useAuth();
  const [servicesReady, setServicesReady] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  // Initialize booking services when clinicId is available
  useEffect(() => {
    if (!clinicId) { setServicesReady(false); return; }

    const initServices = async () => {
      await bookingService.init(clinicId);
      setPendingCount(bookingService.getPendingRequests().length);
      setServicesReady(true);
    };
    initServices().catch(console.error);
  }, [clinicId]);

  // Keep pending count in sync when requests change
  useEffect(() => {
    const refresh = () => setPendingCount(bookingService.getPendingRequests().length);
    window.addEventListener('bookingRequestsUpdated', refresh);
    window.addEventListener('newAppointmentRequest', refresh);
    
    return () => {
      window.removeEventListener('bookingRequestsUpdated', refresh);
      window.removeEventListener('newAppointmentRequest', refresh);
    };
  }, [servicesReady]);

  useFocusManagement();

  // Ensure app always starts on dashboard for first load
  React.useEffect(() => {
    // Interceptar redirecciones de Pagadito que ponen los parámetros antes del '#'
    // Ejemplo: https://diente-link.vercel.app/?token=XYZ&ern=ABC#/payment-success
    const searchParams = new URLSearchParams(window.location.search);
    const token = searchParams.get('token');
    
    if (token) {
      // Limpiar la URL del navegador para no dejar el token expuesto y evitar ciclos
      window.history.replaceState({}, '', window.location.pathname + window.location.hash);
      navigate(`/payment-success?token=${token}`, { replace: true });
      return;
    }

    if (location.pathname === '/#/' || location.pathname === '/') {
      setTimeout(() => {
        if (location.pathname !== '/') {
          navigate('/', { replace: true });
        }
      }, 100);
    }
  }, []);

  const getActivePath = () => {
    if (location.pathname.startsWith('/patient')) return 'patients';
    if (location.pathname === '/consultation') return 'consultation';
    if (location.pathname === '/calendar') return 'calendar';
    if (location.pathname.startsWith('/booking/manage')) return 'solicitudes';
    if (location.pathname === '/settings') return 'settings';
    if (location.pathname === '/billing' || location.pathname === '/payment-success') return 'billing';
    return 'dashboard';
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <OnboardingWizard />
      {/* Skip link for accessibility */}
      <a 
        href="#main-content" 
        className="skip-link"
        onFocus={(e) => e.target.scrollIntoView()}
      >
        Saltar al contenido principal
      </a>
      
      {!servicesReady ? (
        <div className="flex items-center justify-center w-full h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-sm text-slate-400 font-medium">Cargando datos...</p>
          </div>
        </div>
      ) : (
        <>
          <Sidebar activePath={getActivePath()} pendingRequestsCount={pendingCount} />
          <main 
            id="main-content"
            className="flex-1 flex flex-col relative overflow-hidden" 
            role="main"
            aria-label="Contenido principal"
          >
            <Suspense fallback={
              <div className="flex items-center justify-center w-full h-full">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-sm text-slate-400 font-medium">Cargando vista...</p>
                </div>
              </div>
            }>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/patients" element={<PatientsView />} />
                <Route path="/patient/:id" element={<PatientDetailView />} />
                <Route path="/consultation" element={<PatientConsultationView />} />
                <Route path="/calendar" element={<CalendarView />} />
                <Route path="/booking/manage" element={<BookingManagementWrapper />} />
                <Route path="/settings" element={<SettingsView />} />
                <Route path="/billing" element={<BillingView />} />
                <Route path="/payment-success" element={<PaymentSuccessView />} />
                <Route path="*" element={<Dashboard />} />
              </Routes>
            </Suspense>
            <BottomNav activePath={getActivePath()} onSearchOpen={() => setIsSearchOpen(true)} pendingRequestsCount={pendingCount} />
          </main>
          <GlobalSearch isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
        </>
      )}
    </div>
  );
};

// Auth guard — shows login when not authenticated
const AuthGuard: React.FC = () => {
  const { user, loading } = useAuth();

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

  if (!user) return <Navigate to="/welcome" replace />;

  return <Layout />;
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
            
            {/* Auth Page */}
            <Route path="/login" element={<AuthPage />} />
            
            {/* Main app with auth guard */}
            <Route path="/*" element={<AuthGuard />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </ErrorBoundary>
  </Router>
);

export default App;
