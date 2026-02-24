import {
    Company, User, Customer, ServiceOrder,
    ChatMessage, CompanyPayment, AppNotification
} from '../types';

export interface IDatabaseService {
    // Empresas
    getCompanies(): Promise<Company[]>;
    getCompany(id: string): Promise<Company | null>;
    createCompany(company: any): Promise<Company>;
    updateCompany(id: string, company: Partial<Company>): Promise<void>;
    deleteCompany(id: string): Promise<void>;

    // Usuários
    getUsers(companyId?: string): Promise<User[]>;
    getUser(id: string): Promise<User | null>;
    createUser(user: any): Promise<User>;
    updateUser(id: string, user: Partial<User>): Promise<void>;
    deleteUser(id: string): Promise<void>;

    // Clientes
    getCustomers(companyId?: string): Promise<Customer[]>;
    getCustomer(id: string): Promise<Customer | null>;
    createCustomer(customer: any): Promise<Customer>;
    updateCustomer(id: string, customer: Partial<Customer>): Promise<void>;
    deleteCustomer(id: string): Promise<void>;

    // Ordens de Serviço
    getOrders(companyId?: string, techId?: string): Promise<ServiceOrder[]>;
    getOrder(id: string): Promise<ServiceOrder | null>;
    createOrder(order: any): Promise<ServiceOrder>;
    updateOrder(id: string, order: Partial<ServiceOrder>): Promise<void>;
    deleteOrder(id: string): Promise<void>;

    // Chat
    getMessages(companyId?: string): Promise<ChatMessage[]>;
    sendMessage(message: any): Promise<void>;

    // Pagamentos
    getCompanyPayments(companyId?: string): Promise<CompanyPayment[]>;
    createCompanyPayment(payment: any): Promise<CompanyPayment>;
    deleteCompanyPayment(id: string): Promise<void>;
    getAllPayments(): Promise<any[]>;

    // Notificações
    getNotifications(companyId: string): Promise<AppNotification[]>;
    createNotification(notification: any): Promise<void>;
    markNotificationAsRead(id: string): Promise<void>;

    // Suporte e Precificação
    getSupportMessages(companyId: string): Promise<ChatMessage[]>;
    getAllSupportChannels(): Promise<any[]>;
    getPlanPricing(): Promise<any[]>;
    setPlanPricing(planType: string, period: string, basePrice: number, discountPct: number): Promise<void>;
    getAdminCount(companyId: string): Promise<number>;

    // Sessões e Admin
    forceLogoutUser(userId: string): Promise<void>;
    getActiveSessionUsers(companyId?: string): Promise<User[]>;

    // Métodos de Upsert (Restauração)
    upsertCompanies(companies: Company[]): Promise<void>;
    upsertUsers(users: User[]): Promise<void>;
    upsertCustomers(customers: Customer[]): Promise<void>;
    upsertOrders(orders: ServiceOrder[]): Promise<void>;
    upsertMessages(messages: ChatMessage[]): Promise<void>;
    upsertPayments(payments: CompanyPayment[]): Promise<void>;

    // Acesso direto ao cliente (para Realtime ou transições)
    supabase: any;
}

export interface IAuthService {
    getCurrentUser(): Promise<User | null>;
    signIn(email: string, password: string): Promise<User>;
    signOut(): Promise<void>;
    signUp(email: string, password: string, name: string, companyId: string): Promise<User>;
    validateSession(user?: User): Promise<any>;
    adminCreateUser(userData: any): Promise<{ user: any, password?: string }>;
    forceLogoutUser(userId: string): Promise<void>;
    isPlaceholderClient(): boolean;
}
