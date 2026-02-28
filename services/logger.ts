export interface LogEntry {
    id: string;
    timestamp: string;
    type: 'error' | 'info' | 'warn';
    message: string;
    details?: any;
    context?: 'developer' | 'client' | 'global';
}

const getStorageKey = () => {
    return window.location.hash.includes('/developer') ? 'dev_system_logs' : 'client_system_logs';
};

export const logService = {
    addLog: (type: 'error' | 'info' | 'warn', message: string, details?: any) => {
        try {
            const key = getStorageKey();
            const logs = logService.getLogsByKey(key);
            const newLog: LogEntry = {
                id: Math.random().toString(36).substring(7),
                timestamp: new Date().toISOString(),
                type,
                message,
                details,
                context: key === 'dev_system_logs' ? 'developer' : 'client'
            };

            const newLogs = [newLog, ...logs].slice(0, 100);
            localStorage.setItem(key, JSON.stringify(newLogs));

            if (type === 'error') console.error('[LOG]', message, details);
            else if (type === 'warn') console.warn('[LOG]', message, details);
            else console.log('[LOG]', message, details);

        } catch (e) {
            console.error('Failed to log', e);
        }
    },

    getLogs: (): LogEntry[] => {
        return logService.getLogsByKey('client_system_logs');
    },

    getDevLogs: (): LogEntry[] => {
        return logService.getLogsByKey('dev_system_logs');
    },

    getLogsByKey: (key: string): LogEntry[] => {
        try {
            return JSON.parse(localStorage.getItem(key) || '[]');
        } catch {
            return [];
        }
    },

    clearLogs: () => {
        localStorage.removeItem('client_system_logs');
    },

    clearDevLogs: () => {
        localStorage.removeItem('dev_system_logs');
    },

    setupGlobalErrorHandling: () => {
        if ((window as any)._logServiceInjected) return;
        (window as any)._logServiceInjected = true;

        window.addEventListener('error', (event) => {
            logService.addLog('error', `Erro Frontend: ${event.message}`, {
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                stack: event.error?.stack || null
            });
        });

        window.addEventListener('unhandledrejection', (event) => {
            logService.addLog('error', `Rejeição Não Tratada: ${event.reason?.message || event.reason || 'Erro desconhecido'}`, {
                stack: event.reason?.stack || null,
                reason: event.reason
            });
        });
    }
};
