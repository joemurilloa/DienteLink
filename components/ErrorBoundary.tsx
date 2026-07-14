import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  constructor(props: Props) {
    super(props);
  }

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error no controlado capturado por ErrorBoundary:', error, errorInfo);
  }

  private handleReset = () => {
    // Attempt to recover by just reloading the page for a clean state
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
          <div className="bg-white rounded-[32px] border border-red-100 p-8 md:p-12 shadow-modern-xl max-w-lg w-full">
            <div className="w-20 h-20 bg-red-50 rounded-[20px] flex items-center justify-center mx-auto mb-6">
              <AlertCircle size={40} className="text-red-500" />
            </div>
            
            <h1 className="text-2xl font-black text-slate-900 tracking-tight mb-2">Algo salió mal</h1>
            <p className="text-slate-500 mb-8 leading-relaxed">
              Ocurrió un error inesperado en la interfaz. Hemos registrado el problema para corregirlo pronto.
            </p>
            
            <button
              onClick={this.handleReset}
              className="w-full flex items-center justify-center gap-2 py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-[16px] font-bold transition-all shadow-md active:scale-[0.98]"
            >
              <RefreshCw size={18} />
              Recargar la Aplicación
            </button>
            
            <div className="mt-8 text-left p-4 bg-slate-50 rounded-2xl border border-slate-300 overflow-x-auto">
              <p className="text-xs text-slate-500 text-center w-full">
                Si el problema persiste, contacta a soporte técnico.
              </p>
            </div>
          </div>
        </div>
      );
    }

    return (this as any).props.children;
  }
}

export default ErrorBoundary;
