import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import BottomNav from './components/BottomNav';
import PatientConsultationView from './components/PatientConsultationView';
import PublicBookingPage from './components/PublicBookingPage';
import BookingManagementView from './components/BookingManagementView';
import { persistenceService } from './services/persistenceService';
import { bookingService } from './services/bookingService';
import { AuthProvider, useAuth } from './services/authService';
import AuthPage from './components/AuthPage';
import { useKeyboardShortcuts, useFocusManagement } from './lib/KeyboardShortcuts';
import GlobalSearch from './components/GlobalSearch';
import { sileo, Toaster } from 'sileo';
import 'sileo/styles.css';

// View components extracted to separate files
import Dashboard from './components/views/DashboardView';
import PatientsView from './components/views/PatientsView';
import PatientDetailView from './components/views/PatientDetailView';
import CalendarView from './components/views/CalendarView';
import SettingsView from './components/views/SettingsView';

// Booking Wrapper Components
const BookingManagementWrapper: React.FC = () => {
  const navigate = useNavigate();
  return <BookingManagementView onBack={() => navigate('/')} />;
};

// Error boundary component
class ErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError(_: Error) {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-screen">
          <div className="text-center p-8">
            <h2 className="text-xl font-bold text-red-600 mb-4">Error en la aplicación</h2>
            <p className="text-slate-600 mb-4">Ha ocurrido un error inesperado.</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
            >
              Recargar página
            </button>
          </div>
        </div>
      );
    }

    return (this as any).props.children;
  }
}

const Layout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const { user } = useAuth();
  const [servicesReady, setServicesReady] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  // Initialize persistence & booking services when user is available
  useEffect(() => {
    if (!user) { setServicesReady(false); return; }

    // Wire up error notifications from persistence layer
    persistenceService.onError((msg) => {
      sileo.error({ title: 'Error de sincronización', description: msg });
    });

    const initServices = async () => {
      await Promise.all([
        persistenceService.init(user.id),
        bookingService.init(user.id),
      ]);
      setPendingCount(bookingService.getPendingRequests().length);
      setServicesReady(true);
    };
    initServices().catch(console.error);
  }, [user]);

  // Keep pending count in sync when requests change
  useEffect(() => {
    const refresh = () => setPendingCount(bookingService.getPendingRequests().length);
    window.addEventListener('bookingRequestsUpdated', refresh);
    window.addEventListener('newAppointmentRequest', refresh);
    const interval = setInterval(refresh, 5000);
    return () => {
      window.removeEventListener('bookingRequestsUpdated', refresh);
      window.removeEventListener('newAppointmentRequest', refresh);
      clearInterval(interval);
    };
  }, [servicesReady]);

  // Enhanced keyboard shortcuts
  useKeyboardShortcuts();
  useFocusManagement();

  // Ensure app always starts on dashboard for first load
  React.useEffect(() => {
    if (location.pathname === '/#/' || location.pathname === '/') {
      setTimeout(() => {
        if (location.pathname !== '/') {
          navigate('/', { replace: true });
        }
      }, 100);
    }
  }, []);

  // Ctrl+K keyboard shortcut for global search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const getActivePath = () => {
    if (location.pathname.startsWith('/patient')) return 'patients';
    if (location.pathname === '/consultation') return 'consultation';
    if (location.pathname === '/calendar') return 'calendar';
    if (location.pathname.startsWith('/booking/manage')) return 'solicitudes';
    if (location.pathname === '/settings') return 'settings';
    return 'dashboard';
  };

  return (
    <div className="flex h-screen overflow-hidden">
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
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/patients" element={<PatientsView />} />
              <Route path="/patient/:id" element={
                <React.Suspense fallback={<div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>}>
                  <PatientDetailView />
                </React.Suspense>
              } />
              <Route path="/consultation" element={
                <React.Suspense fallback={<div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>}>
                  <PatientConsultationView />
                </React.Suspense>
              } />
              <Route path="/calendar" element={<CalendarView />} />
              <Route path="/booking/manage" element={<BookingManagementWrapper />} />
              <Route path="/settings" element={<SettingsView />} />
              <Route path="*" element={<Dashboard />} />
            </Routes>
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

  if (!user) return <AuthPage />;

  return <Layout />;
};

const App: React.FC = () => (
  <Router>
    <ErrorBoundary>
      <AuthProvider>
        <Toaster position="top-center" theme="light" />
        <Routes>
          {/* Public booking page - completely independent, no sidebar/nav */}
          <Route path="/p/:doctorId" element={<PublicBookingPage />} />
          {/* Main app with auth guard */}
          <Route path="/*" element={<AuthGuard />} />
        </Routes>
      </AuthProvider>
    </ErrorBoundary>
  </Router>
);

export default App;
