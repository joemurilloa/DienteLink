import React, { lazy, Suspense, useEffect, useState } from 'react';
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { bookingService } from '../services/bookingService';
import { useAuth } from '../services/authService';
import { useFocusManagement } from '../lib/KeyboardShortcuts';
import { useSubscription } from '../hooks/useSubscription';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';
import OnboardingWizard from './OnboardingWizard';
import InstallPrompt from './InstallPrompt';
import ConnectionStatus from './ConnectionStatus';
import TrialBanner from './TrialBanner';
import DemoBanner from './DemoBanner';
import SubscriptionGate from './SubscriptionGate';

const Dashboard = lazy(() => import('./views/DashboardView'));
const PatientsView = lazy(() => import('./views/PatientsView'));
const PatientDetailView = lazy(() => import('./views/PatientDetailView'));
const CalendarView = lazy(() => import('./views/CalendarView'));
const SettingsView = lazy(() => import('./views/SettingsView'));
const PatientConsultationView = lazy(() => import('./PatientConsultationView'));
const BookingManagementView = lazy(() => import('./BookingManagementView'));
const SubscriptionPage = lazy(() => import('./views/SubscriptionPage'));
const AdminBillingView = lazy(() => import('./views/AdminBillingView'));
const GlobalSearch = lazy(() => import('./GlobalSearch'));

const DelayedFallback: React.FC = () => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setShow(true), 200);
    return () => window.clearTimeout(timer);
  }, []);

  if (!show) return null;

  return (
    <div className="flex items-center justify-center w-full h-full">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
    </div>
  );
};

const BookingManagementWrapper: React.FC = () => {
  const navigate = useNavigate();
  return <BookingManagementView onBack={() => navigate('/')} />;
};

interface AppLayoutProps {
  subscription: ReturnType<typeof useSubscription>;
}

const AppLayout: React.FC<AppLayoutProps> = ({ subscription }) => {
  const location = useLocation();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const { clinicId, isGuest } = useAuth();
  const [servicesReady, setServicesReady] = useState(false);
  const [servicesError, setServicesError] = useState<string | null>(null);
  const [bookingAttempt, setBookingAttempt] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (!clinicId) {
      setServicesReady(false);
      setServicesError(null);
      return;
    }

    if (isGuest) {
      let cancelled = false;
      setServicesError(null);
      bookingService.init('demo').then(() => {
        if (cancelled) return;
        setServicesReady(true);
        setPendingCount(bookingService.getPendingRequests().length);
      }).catch((error) => {
        console.error(error);
        if (cancelled) return;
        setServicesReady(false);
        setServicesError('No se pudo preparar la demo.');
      });
      return () => {
        cancelled = true;
      };
    }

    let cancelled = false;
    const initServices = async () => {
      setServicesReady(false);
      setServicesError(null);
      await bookingService.init(clinicId);
      if (cancelled) return;
      setPendingCount(bookingService.getPendingRequests().length);
      setServicesReady(true);
    };

    initServices().catch((error) => {
      console.error(error);
      if (cancelled) return;
      setServicesReady(false);
      setServicesError('No se pudo cargar la agenda del consultorio. Reintenta antes de cambiar el horario.');
    });

    return () => {
      cancelled = true;
    };
  }, [clinicId, isGuest, bookingAttempt]);

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

  const getActivePath = () => {
    if (location.pathname.startsWith('/patient')) return 'patients';
    if (location.pathname === '/consultation') return 'consultation';
    if (location.pathname === '/calendar') return 'calendar';
    if (location.pathname.startsWith('/booking/manage')) return 'solicitudes';
    if (location.pathname === '/settings' || location.pathname === '/admin') return 'settings';
    return 'dashboard';
  };

  return (
    <div className="app-shell flex h-screen overflow-hidden bg-slate-50">
      <OnboardingWizard />
      <a href="#main-content" className="skip-link" onFocus={(event) => event.target.scrollIntoView()}>
        Saltar al contenido principal
      </a>

      {!servicesReady ? (
        <div className="flex items-center justify-center w-full h-full">
          <div className="text-center max-w-sm px-6">
            {servicesError ? (
              <>
                <p className="text-sm font-semibold text-slate-800 mb-2">No se cargó la agenda</p>
                <p className="text-sm text-slate-500 mb-4">{servicesError}</p>
                <button
                  type="button"
                  onClick={() => setBookingAttempt((n) => n + 1)}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700"
                >
                  Reintentar
                </button>
              </>
            ) : (
              <>
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-4" />
                <p className="text-sm text-slate-400 font-medium">Cargando datos...</p>
              </>
            )}
          </div>
        </div>
      ) : (
        <>
          <Sidebar activePath={getActivePath()} pendingRequestsCount={pendingCount} />
          <main
            id="main-content"
            className="flex-1 min-w-0 flex flex-col relative overflow-hidden"
            role="main"
            aria-label="Contenido principal"
          >
            <DemoBanner />
            <TrialBanner subscription={subscription} />
            <InstallPrompt />
            <ConnectionStatus />
            <SubscriptionGate subscription={subscription}>
              <Suspense fallback={<DelayedFallback />}>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/patients" element={<PatientsView />} />
                  <Route path="/patient/:id" element={<PatientDetailView />} />
                  <Route path="/consultation" element={<PatientConsultationView />} />
                  <Route path="/calendar" element={<CalendarView />} />
                  <Route path="/booking/manage" element={<BookingManagementWrapper />} />
                  <Route path="/settings" element={<SettingsView />} />
                  <Route path="/admin" element={<AdminBillingView />} />
                  <Route path="/subscription" element={<SubscriptionPage />} />
                  <Route path="*" element={<Dashboard />} />
                </Routes>
              </Suspense>
            </SubscriptionGate>
            <BottomNav
              activePath={getActivePath()}
              onSearchOpen={() => setIsSearchOpen(true)}
              pendingRequestsCount={pendingCount}
            />
          </main>
          {isSearchOpen && (
            <Suspense fallback={null}>
              <GlobalSearch isOpen onClose={() => setIsSearchOpen(false)} />
            </Suspense>
          )}
        </>
      )}
    </div>
  );
};

export default AppLayout;
