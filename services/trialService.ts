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
            name: 'Oficina do Zé',
            phone: '(11) 98888-1111',
            city: 'São Paulo/SP',
            address: 'Av. Industrial',
            number: '500',
            sector: 'Lapa',
            notes: 'Falar com José ou Ricardo. Oficina mecânica de grande porte.',
            createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
            id: 'trial-client-2',
            companyId: TRIAL_COMPANY_ID,
            name: 'Cafeteria Grão de Ouro',
            phone: '(11) 97777-2222',
            city: 'Campinas/SP',
            address: 'Rua das Flores',
            number: '120',
            sector: 'Cambuí',
            notes: 'Rede de cafeterias. Requer nota fiscal detalhada.',
            createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
        },

        {
            id: 'trial-client-4',
            companyId: TRIAL_COMPANY_ID,
            name: 'Papelaria Central',
            phone: '(15) 95555-4444',
            city: 'Sorocaba/SP',
            address: 'Rua do Comércio',
            number: '10',
            sector: 'Centro',
            notes: 'Loja tradicional. Fechada para almoço entre 12h e 13h.',
            createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
            id: 'trial-client-5',
            companyId: TRIAL_COMPANY_ID,
            name: 'Condomínio Solar das Flores',
            phone: '(11) 94444-5555',
            city: 'São Paulo/SP',
            address: 'Rua das Hortênsias',
            number: '2000',
            sector: 'Morumbi',
            notes: 'Condomínio residencial. Falar com Zelador Marcos.',
            createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
            id: 'trial-client-6',
            companyId: TRIAL_COMPANY_ID,
            name: 'Gráfica Impressa',
            phone: '(19) 93333-6666',
            city: 'Campinas/SP',
            address: 'Rua da Tecnologia',
            number: '80',
            sector: 'Barão Geraldo',
            notes: 'Gráfica rápida. Máquinas sensíveis a poeira.',
            createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
        }
    ];
}

function buildDemoOrders(techName: string): ServiceOrder[] {
    const now = new Date();
    const d = (offsetDays: number, hour = 9, min = 0) => {
        const d = new Date(now);
        d.setDate(d.getDate() + offsetDays);
        d.setHours(hour, min, 0, 0);
        return d.toISOString();
    };

    return [
        {
            id: 'trial-order-1',
            companyId: TRIAL_COMPANY_ID,
            customerId: 'trial-client-1',
            customerName: 'Oficina do Zé',
            techId: TRIAL_TECH_ID,
            techName: techName,
            type: 'Manutenção',
            description: 'Manutenção preventiva no compressor de ar principal. Verificação de vazamentos e troca de óleo.',
            aiReport: '',
            status: OrderStatus.IN_PROGRESS,
            createdAt: d(-2, 14, 0),
            scheduledDate: d(0, 12, 57),
            posts: [
                {
                    id: 'trial-post-1',
                    userId: TRIAL_TECH_ID,
                    userName: techName,
                    content: 'Iniciada drenagem do óleo antigo. Identificado pequeno vazamento na válvula de segurança.',
                    createdAt: d(-1, 15, 30)
                }
            ],
            attachments: []
        },
        {
            id: 'trial-order-2',
            companyId: TRIAL_COMPANY_ID,
            customerId: 'trial-client-2',
            customerName: 'Cafeteria Grão de Ouro',
            techId: TRIAL_TECH_ID,
            techName: techName,
            type: 'Instalação',
            description: 'Instalação de nova máquina de espresso e moedor profissional. Ajuste de pressão e moagem.',
            aiReport: '',
            status: OrderStatus.OPEN,
            createdAt: d(-1, 10, 0),
            scheduledDate: d(1, 12, 57),
            posts: [],
            attachments: []
        },

        {
            id: 'trial-order-4',
            companyId: TRIAL_COMPANY_ID,
            customerId: 'trial-client-2',
            customerName: 'Cafeteria Grão de Ouro',
            techId: TRIAL_TECH_ID,
            techName: techName,
            type: 'Orçamento',
            description: 'Orçamento para sistema de filtragem de água industrial (osmose reversa).',
            aiReport: '',
            status: OrderStatus.OPEN,
            createdAt: d(-3, 11, 0),
            scheduledDate: d(3, 12, 57),
            posts: [],
            attachments: []
        },
        {
            id: 'trial-order-5',
            companyId: TRIAL_COMPANY_ID,
            customerId: 'trial-client-4',
            customerName: 'Papelaria Central',
            techId: TRIAL_TECH_ID,
            techName: techName,
            type: 'Configuração',
            description: 'Configuração de rede Wi-Fi para clientes e novo sistema de segurança (CFTV).',
            aiReport: '',
            status: OrderStatus.PAUSED,
            createdAt: d(-5, 9, 0),
            scheduledDate: d(-1, 14, 0),
            posts: [
                {
                    id: 'trial-post-5',
                    userId: TRIAL_TECH_ID,
                    userName: techName,
                    content: 'Aguardando entrega das câmeras IP (atraso do fornecedor).',
                    createdAt: d(-2, 10, 0)
                }
            ],
            attachments: []
        },
        {
            id: 'trial-order-6',
            companyId: TRIAL_COMPANY_ID,
            customerId: 'trial-client-5',
            customerName: 'Condomínio Solar das Flores',
            techId: TRIAL_TECH_ID,
            techName: techName,
            type: 'Visita Técnica',
            description: 'Verificação periódica dos motores dos portões eletrônicos.',
            aiReport: '',
            status: OrderStatus.FINISHED,
            createdAt: d(-10, 8, 0),
            finishedAt: d(-8, 11, 0),
            posts: [],
            attachments: []
        },
        {
            id: 'trial-order-7',
            companyId: TRIAL_COMPANY_ID,
            customerId: 'trial-client-6',
            customerName: 'Gráfica Impressa',
            techId: TRIAL_TECH_ID,
            techName: techName,
            type: 'Manutenção',
            description: 'Troca de cilindros e limpeza interna da impressora offset.',
            aiReport: '',
            status: OrderStatus.FINISHED,
            createdAt: d(-15, 14, 0),
            finishedAt: d(-14, 17, 30),
            posts: [],
            attachments: []
        },
        {
            id: 'trial-order-8',
            companyId: TRIAL_COMPANY_ID,
            customerId: 'trial-client-1',
            customerName: 'Oficina do Zé',
            techId: TRIAL_TECH_ID,
            techName: techName,
            type: 'Reparo',
            description: 'Reparo no elevador hidráulico nº 3. Mangueira estourada.',
            aiReport: '',
            status: OrderStatus.CANCELLED,
            createdAt: d(-20, 10, 0),
            posts: [
                {
                    id: 'trial-post-8',
                    userId: TRIAL_ADMIN_ID,
                    userName: 'Administrador',
                    content: 'Cancelado pelo cliente — consertou por conta própria.',
                    createdAt: d(-19, 14, 0)
                }
            ],
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

    // Auto-update se estiver vazio ou se detectar dados "antigos" (ex: sem Oficina do Zé)
    const needsUpdate = !raw || raw === '[]' || (raw && !raw.includes('Oficina do Zé'));

    if (needsUpdate && isActiveTrial()) {
        const customers = buildDemoCustomers();
        saveTrialCustomers(customers);
        return customers;
    }

    if (!raw) return [];
    try { return JSON.parse(raw); } catch { return []; }
}

export function getTrialOrders(): ServiceOrder[] {
    const raw = sessionStorage.getItem(TRIAL_ORDERS_KEY);

    // Auto-update se estiver vazio ou se detectar dados "antigos"
    const needsUpdate = !raw || raw === '[]' || (raw && !raw.includes('trial-order-4'));

    if (needsUpdate && isActiveTrial()) {
        const session = JSON.parse(sessionStorage.getItem(TRIAL_SESSION_KEY) || '{}');
        const techName = session.tech?.name || 'Técnico Demo';
        const orders = buildDemoOrders(techName);
        saveTrialOrders(orders);
        return orders;
    }

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
