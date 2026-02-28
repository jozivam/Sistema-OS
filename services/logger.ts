export interface LogEntry {
    id: string;
    timestamp: string;
    type: 'error' | 'info' | 'warn';
    message: string;
    details?: any;
}

export const logService = {
    addLog: (type: 'error' | 'info' | 'warn', message: string, details?: any) => {
        try {
            const logs = logService.getLogs();
            const newLog: LogEntry = {
                id: Math.random().toString(36).substring(7),
                timestamp: new Date().toISOString(),
                type,
                message,
                details
            };

            const newLogs = [newLog, ...logs].slice(0, 100); // Keep last 100
            localStorage.setItem('system_logs', JSON.stringify(newLogs));

            if (type === 'error') console.error('[LOG]', message, details);
            else if (type === 'warn') console.warn('[LOG]', message, details);
            else console.log('[LOG]', message, details);

        } catch (e) {
            console.error('Failed to log', e);
        }
    },

    getLogs: (): LogEntry[] => {
        try {
            return JSON.parse(localStorage.getItem('system_logs') || '[]');
        } catch {
            return [];
        }
    },

    clearLogs: () => {
        localStorage.removeItem('system_logs');
    }
};
