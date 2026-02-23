/**
 * trialService.ts
 * Gerencia o ambiente de demonstração (trial). Nenhum dado é salvo no Supabase.
 * Todos os dados ficam em sessionStorage e são apagados ao sair.
 */

import { User, UserRole, Company, CompanyPlan, CompanyPeriod, Customer, ServiceOrder, OrderStatus } from '../types';

const TRIAL_SESSION_KEY = 'trial_session';
const TRIAL_ROLE_KEY = 'trial_current_role';
const TRIAL_CUSTOMERS_KEY = 'trial_customers';
const TRIAL_ORDERS_KEY = 'trial_orders';

export const TRIAL_COMPANY_ID = 'trial-company';
export const TRIAL_ADMIN_ID = 'trial-admin';
export const TRIAL_TECH_ID = 'trial-tech';

export function isTrialUser(user: User | null): boolean {
    return !!user?.id?.startsWith('trial-');
}

function buildTrialCompany(companyName: string): Company {
    return {
        id: TRIAL_COMPANY_ID,
        name: companyName,
        corporateName: companyName,
        tradeName: companyName,
        document: '00.000.000/0000-00',
        email: 'demo@sistemaosdemo.com.br',
        phone: '(11) 9 9999-9999',
        address: 'Rua Demonstração, 123',
        city: 'São Paulo',
        plan: CompanyPlan.DIAMANTE,
        period: CompanyPeriod.MENSAL,
        monthlyFee: 197,
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // +7 dias
        settings: {
            enableAI: true,
            enableAttachments: true,
            enableChat: true,
            enableHistory: true,
            orderTypes: ['Instalação', 'Manutenção', 'Reparo', 'Configuração', 'Visita Técnica']
        }
    };
}

function buildTrialAdmin(userName: string): User {
    return {
        id: TRIAL_ADMIN_ID,
        companyId: TRIAL_COMPANY_ID,
        name: userName,
        email: 'admin@demo.com',
        phone: '(11) 9 9999-9999',
        role: UserRole.TRIAL,
        isBlocked: false,
    };
}

function buildTrialTech(userName: string): User {
    return {
        id: TRIAL_TECH_ID,
        companyId: TRIAL_COMPANY_ID,
        name: `${userName} (Técnico)`,
        email: 'tecnico@demo.com',
        phone: '(11) 9 8888-8888',
        role: UserRole.TRIAL,
        isBlocked: false,
    };
}

function buildDemoCustomers(): Customer[] {
    return [
        {
            id: 'trial-client-1',
            companyId: TRIAL_COMPANY_ID,
            name: 'João Silva',
            phone: '(11) 9 1111-2222',
            city: 'São Paulo',
            address: 'Rua das Flores, 45',
            sector: 'Residencial',
            notes: 'Cliente desde 2023. Prefere atendimento à tarde.',
            createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
            id: 'trial-client-2',
            companyId: TRIAL_COMPANY_ID,
            name: 'Maria Tecnologia Ltda.',
            phone: '(11) 9 3333-4444',
            city: 'Guarulhos',
            address: 'Av. Industrial, 200',
            sector: 'Empresarial',
            notes: 'Empresa com 20 computadores. Contrato de manutenção mensal.',
            createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
            id: 'trial-client-3',
            companyId: TRIAL_COMPANY_ID,
            name: 'Pedro Eletrodomésticos',
            phone: '(11) 9 5555-6666',
            city: 'São Paulo',
            address: 'Rua do Comércio, 78',
            sector: 'Comércio',
            notes: 'Loja de eletrodomésticos. Chama para instalação de equipamentos.',
            createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
        }
    ];
}

function buildDemoOrders(techName: string): ServiceOrder[] {
    const now = new Date();
    return [
        {
            id: 'trial-order-1',
            companyId: TRIAL_COMPANY_ID,
            customerId: 'trial-client-1',
            customerName: 'João Silva',
            techId: TRIAL_TECH_ID,
            techName: techName,
            type: 'Manutenção',
            description: 'Computador lento, travando constantemente. Cliente relata que o problema começou após atualização do Windows.',
            aiReport: '',
            status: OrderStatus.IN_PROGRESS,
            createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            scheduledDate: now.toISOString().split('T')[0],
            posts: [
                {
                    id: 'trial-post-1',
                    userId: TRIAL_TECH_ID,
                    userName: techName,
                    content: 'Realizei limpeza de arquivos temporários e desfragmentação do HD. Aguardando análise de vírus.',
                    createdAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
                }
            ],
            attachments: []
        },
        {
            id: 'trial-order-2',
            companyId: TRIAL_COMPANY_ID,
            customerId: 'trial-client-2',
            customerName: 'Maria Tecnologia Ltda.',
            techId: TRIAL_TECH_ID,
            techName: techName,
            type: 'Instalação',
            description: 'Instalação de 5 novos computadores na sede da empresa. Configuração de rede e domínio.',
            aiReport: '',
            status: OrderStatus.OPEN,
            createdAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
            scheduledDate: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            posts: [],
            attachments: []
        },
        {
            id: 'trial-order-3',
            companyId: TRIAL_COMPANY_ID,
            customerId: 'trial-client-3',
            customerName: 'Pedro Eletrodomésticos',
            techId: TRIAL_TECH_ID,
            techName: techName,
            type: 'Reparo',
            description: 'Impressora fiscal não funciona. Erro ao emitir NFC-e.',
            aiReport: 'Com base no histórico da O.S., o problema está relacionado ao driver da impressora fiscal. Recomenda-se reinstalar o driver e verificar a conexão COM.',
            status: OrderStatus.FINISHED,
            createdAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
            finishedAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
            posts: [
                {
                    id: 'trial-post-2',
                    userId: TRIAL_TECH_ID,
                    userName: techName,
                    content: 'Reinstalei o driver da impressora Daruma FS-600. Testado com sucesso. O.S. encerrada.',
                    createdAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
                }
            ],
            attachments: []
        },
        {
            id: 'trial-order-4',
            companyId: TRIAL_COMPANY_ID,
            customerId: 'trial-client-1',
            customerName: 'João Silva',
            techId: TRIAL_TECH_ID,
            techName: techName,
            type: 'Configuração',
            description: 'Configuração de roteador e extensão de Wi-Fi para cobertura em toda a residência.',
            aiReport: '',
            status: OrderStatus.OPEN,
            createdAt: new Date().toISOString(),
            posts: [],
            attachments: []
        }
    ];
}

// ─────────────────────────────────────────────
//  API pública
// ─────────────────────────────────────────────

export function startTrial(userName: string, companyName: string): User {
    const company = buildTrialCompany(companyName || 'Minha Empresa');
    const admin = buildTrialAdmin(userName || 'Usuário Demo');
    const tech = buildTrialTech(userName || 'Usuário Demo');
    const customers = buildDemoCustomers();
    const orders = buildDemoOrders(tech.name);

    sessionStorage.setItem(TRIAL_SESSION_KEY, JSON.stringify({ admin, tech, company }));
    sessionStorage.setItem(TRIAL_ROLE_KEY, 'admin');
    sessionStorage.setItem(TRIAL_CUSTOMERS_KEY, JSON.stringify(customers));
    sessionStorage.setItem(TRIAL_ORDERS_KEY, JSON.stringify(orders));

    return admin;
}

export function getTrialCompany(): Company | null {
    const raw = sessionStorage.getItem(TRIAL_SESSION_KEY);
    if (!raw) return null;
    try {
        return JSON.parse(raw).company as Company;
    } catch {
        return null;
    }
}

export function getCurrentTrialUser(): User | null {
    const raw = sessionStorage.getItem(TRIAL_SESSION_KEY);
    if (!raw) return null;
    try {
        const { admin, tech } = JSON.parse(raw);
        const role = sessionStorage.getItem(TRIAL_ROLE_KEY) || 'admin';
        return role === 'tech' ? tech : admin;
    } catch {
        return null;
    }
}

export function switchTrialRole(): User | null {
    const raw = sessionStorage.getItem(TRIAL_SESSION_KEY);
    if (!raw) return null;
    try {
        const { admin, tech } = JSON.parse(raw);
        const current = sessionStorage.getItem(TRIAL_ROLE_KEY) || 'admin';
        const next = current === 'admin' ? 'tech' : 'admin';
        sessionStorage.setItem(TRIAL_ROLE_KEY, next);
        return next === 'tech' ? tech : admin;
    } catch {
        return null;
    }
}

export function getTrialCustomers(): Customer[] {
    const raw = sessionStorage.getItem(TRIAL_CUSTOMERS_KEY);
    if (!raw) return [];
    try { return JSON.parse(raw); } catch { return []; }
}

export function getTrialOrders(): ServiceOrder[] {
    const raw = sessionStorage.getItem(TRIAL_ORDERS_KEY);
    if (!raw) return [];
    try { return JSON.parse(raw); } catch { return []; }
}

export function saveTrialOrders(orders: ServiceOrder[]): void {
    sessionStorage.setItem(TRIAL_ORDERS_KEY, JSON.stringify(orders));
}

export function saveTrialCustomers(customers: Customer[]): void {
    sessionStorage.setItem(TRIAL_CUSTOMERS_KEY, JSON.stringify(customers));
}

export function cleanupTrial(): void {
    [TRIAL_SESSION_KEY, TRIAL_ROLE_KEY, TRIAL_CUSTOMERS_KEY, TRIAL_ORDERS_KEY].forEach(k =>
        sessionStorage.removeItem(k)
    );
}

export function isActiveTrial(): boolean {
    return !!sessionStorage.getItem(TRIAL_SESSION_KEY);
}

export function getCurrentTrialRoleLabel(): 'admin' | 'tech' {
    return (sessionStorage.getItem(TRIAL_ROLE_KEY) as 'admin' | 'tech') || 'admin';
}
