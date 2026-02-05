
import { AppState, User, Company, UserRole, OrderStatus, CompanyPlan, SystemSettings } from '../types';

const STORAGE_KEY = 'os_ia_multi_tenant_v1';

const defaultSettings: SystemSettings = {
  enableAI: true,
  enableAttachments: true,
  enableChat: true,
  enableHistory: true,
  orderTypes: ['Instalação', 'Manutenção', 'Orçamento', 'Retirada', 'Suporte']
};

const demoCompanies: Company[] = [
  {
    id: 'dev-corp',
    name: 'Gestão Online Developer',
    tradeName: 'Gestão Online',
    corporateName: 'Gestão Online Soluções em Software LTDA',
    document: '00.000.000/0001-00',
    email: 'contato@gestao.online',
    phone: '(00) 0000-0000',
    address: 'Av. Developer, 1000',
    city: 'Silicon Valley',
    plan: CompanyPlan.LIVRE,
    monthlyFee: 0,
    status: 'ACTIVE',
    createdAt: '2022-12-31T00:00:00.000Z',
    settings: defaultSettings
  },
  {
    id: 'comp-1',
    name: 'Tech Solutions',
    tradeName: 'Tech Solutions',
    corporateName: 'Tech Solutions Hardware e Servicos LTDA',
    document: '12.345.678/0001-90',
    email: 'admin@techsolutions.com',
    phone: '(11) 98888-7777',
    address: 'Rua das Tecnologias, 45',
    city: 'São Paulo/SP',
    plan: CompanyPlan.TRIMESTRAL,
    monthlyFee: 59.90,
    status: 'ACTIVE',
    createdAt: '2022-12-31T00:00:00.000Z',
    settings: defaultSettings
  },
  {
    id: 'comp-2',
    name: 'Other Corp',
    tradeName: 'Other Corp',
    corporateName: 'Other Services and Consulting Corp',
    document: '98.765.432/0001-10',
    email: 'office@othercorp.com',
    phone: '(21) 97777-6666',
    address: 'Av. das Americas, 500',
    city: 'Rio de Janeiro/RJ',
    plan: CompanyPlan.MENSAL,
    monthlyFee: 29.90,
    status: 'BLOCKED',
    createdAt: '2023-12-31T00:00:00.000Z',
    settings: defaultSettings
  },
  {
    id: 'comp-3',
    name: 'System Governance',
    tradeName: 'System Governance',
    corporateName: 'Governance Systems e Auditoria LTDA',
    document: '00.000.000/0001-00',
    email: 'suporte@governance.com',
    phone: '(31) 96666-5555',
    address: 'Rua da Auditoria, 12',
    city: 'Belo Horizonte/MG',
    plan: CompanyPlan.ANUAL,
    monthlyFee: 99.90,
    status: 'BLOCKED',
    createdAt: '2022-12-31T00:00:00.000Z',
    settings: defaultSettings
  }
];

const initialData: AppState = {
  companies: demoCompanies,
  users: [
    { id: 'dev-1', name: 'João Marcio Rodrigues', email: 'dev@sistema.com', password: 'dev', role: UserRole.DEVELOPER },
    { id: 'u1', companyId: 'comp-1', name: 'Admin Tech', email: 'admin@tech.com', password: 'admin', role: UserRole.ADMIN },
    { id: 'u2', companyId: 'comp-1', name: 'Tecnico Silva', email: 'tech@tech.com', password: 'tech', role: UserRole.TECH }
  ],
  customers: [],
  orders: [],
  currentUser: null,
  settings: defaultSettings,
  messages: [],
  companyPayments: []
};

export const storageService = {
  getData: (): AppState => {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      const sessionUser = sessionStorage.getItem('os_ia_session');
      let currentUser = sessionUser ? JSON.parse(sessionUser) : null;

      if (!data) return { ...initialData, currentUser };
      const parsed = JSON.parse(data);
      if (!parsed) return { ...initialData, currentUser };

      const rawCompanies = parsed.companies || [];
      const companies = (Array.isArray(rawCompanies) ? rawCompanies : []).map((c: any) => {
        if (!c || typeof c !== 'object') return c;
        const existingSettings = c.settings || {};
        return {
          ...c,
          settings: {
            enableAI: existingSettings.enableAI ?? false,
            enableAttachments: existingSettings.enableAttachments ?? false,
            enableChat: existingSettings.enableChat ?? false,
            enableHistory: existingSettings.enableHistory ?? false,
            orderTypes: existingSettings.orderTypes || defaultSettings.orderTypes
          }
        };
      });

      return {
        ...initialData,
        ...parsed,
        companies: companies.length > 0 ? companies : (parsed.companies || initialData.companies),
        users: parsed.users || initialData.users,
        companyPayments: parsed.companyPayments || [],
        currentUser
      };
    } catch (e) {
      console.error("Erro ao ler dados do localStorage:", e);
      return initialData;
    }
  },
  saveData: (data: AppState) => {
    const { currentUser, ...persistentData } = data;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(persistentData));
    if (currentUser) {
      sessionStorage.setItem('os_ia_session', JSON.stringify(currentUser));
    }
  },
  clearAuth: () => {
    sessionStorage.removeItem('os_ia_session');
    const data = storageService.getData();
    data.currentUser = null;
    storageService.saveData(data);
  }
};
