
import { AppState, User, Company, CompanyPlan, SystemSettings } from '../types';

const defaultSettings: SystemSettings = {
  enableAI: true,
  enableAttachments: true,
  enableChat: true,
  enableHistory: true,
  orderTypes: ['Instalação', 'Manutenção', 'Orçamento', 'Retirada', 'Suporte']
};

export const storageService = {
  // O storageService agora atua principalmente como ponte para o estado da sessão local
  // enquanto o dbService lida com a persistência real no Supabase.

  getSessionUser: (): User | null => {
    try {
      const sessionUser = sessionStorage.getItem('os_ia_session');
      return sessionUser ? JSON.parse(sessionUser) : null;
    } catch (e) {
      console.error("Erro ao ler sessão do sessionStorage:", e);
      return null;
    }
  },

  setSessionUser: (user: User | null) => {
    if (user) {
      sessionStorage.setItem('os_ia_session', JSON.stringify(user));
    } else {
      sessionStorage.removeItem('os_ia_session');
    }
  },

  clearAuth: () => {
    sessionStorage.removeItem('os_ia_session');
  }
};
