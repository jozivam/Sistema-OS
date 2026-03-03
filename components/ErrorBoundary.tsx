import React, { Component, ErrorInfo, ReactNode } from 'react';
import { logService } from '../services/logger';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

class ErrorBoundary extends React.Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null
    };

    public static getDerivedStateFromError(error: Error): State {
        // Update state so the next render will show the fallback UI.
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        // Registra o erro na classe global logService
        logService.addLog('error', `Erro Fatal no React: ${error.message}`, {
            stack: error.stack,
            componentStack: errorInfo.componentStack
        });
        console.error('Uncaught error in React ErrorBoundary:', error, errorInfo);
    }

    private handleReset = () => {
        // Reseta o estado do ErrorBoundary se o usuário tentar recarregar parte da UI
        (this as any).setState({ hasError: false, error: null });
        // Mas o recomendável em SPA críticas é um refresh:
        window.location.reload();
    };

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
                    <div className="w-24 h-24 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-6 shadow-sm border border-red-200">
                        <i className="fa-solid fa-triangle-exclamation text-4xl"></i>
                    </div>
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight mb-2">Ops! O sistema encontrou um erro.</h1>
                    <p className="text-slate-500 max-w-md font-medium mb-8">
                        Um problema inesperado aconteceu na interface do usuário. Não se preocupe, o erro foi <strong className="text-slate-700">registrado automaticamente em nossos logs</strong> (Configurações &gt; Logs) para a equipe técnica investigar.
                    </p>

                    <div className="flex gap-4">
                        <button
                            onClick={this.handleReset}
                            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-500/30 transition-all flex items-center gap-2"
                        >
                            <i className="fa-solid fa-rotate-right"></i>
                            Recarregar Sistema
                        </button>
                    </div>

                    <div className="mt-12 text-left bg-white p-6 rounded-2xl border border-slate-200 max-w-2xl w-full shadow-sm">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 border-b border-slate-100 pb-2">Detalhes Técnicos do Erro</h3>
                        <pre className="text-[10px] text-red-500 bg-red-50 p-4 rounded-xl overflow-x-auto font-mono custom-scrollbar">
                            {this.state.error?.toString()}
                        </pre>
                    </div>
                </div>
            );
        }

        return (this as any).props.children;
    }
}

export default ErrorBoundary;
