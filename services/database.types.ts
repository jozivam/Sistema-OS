import {
    Company, User, Customer, ServiceOrder,
    ChatMessage, CompanyPayment, AppNotification, Supplier,
    Product, StorageLocation, StockMovement
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
    updateCustomerCredit(id: string, newBalance: number): Promise<void>;


    // Fornecedores
    getSuppliers(companyId?: string): Promise<Supplier[]>;
    getSupplier(id: string): Promise<Supplier | null>;
    createSupplier(supplier: any): Promise<Supplier>;
    updateSupplier(id: string, supplier: Partial<Supplier>): Promise<void>;
    deleteSupplier(id: string): Promise<void>;

    // Ordens de Serviço
    getOrders(companyId?: string, techId?: string): Promise<ServiceOrder[]>;
    getOrder(id: string): Promise<ServiceOrder | null>;
    createOrder(order: any): Promise<ServiceOrder>;
    updateOrder(id: string, order: Partial<ServiceOrder>): Promise<void>;
    deleteOrder(id: string): Promise<void>;
    generateAIReport(orderId: string, description: string, history: string): Promise<string>;

    // Produtos
    getProducts(companyId?: string): Promise<Product[]>;
    getProduct(id: string): Promise<Product | null>;
    getNextSku(companyId: string): Promise<string>;
    createProduct(product: any): Promise<Product>;
    updateProduct(id: string, product: Partial<Product>): Promise<void>;
    deleteProduct(id: string): Promise<void>;
    removeCategory(category: string, companyId: string): Promise<void>;
    removeBrand(brand: string, companyId: string): Promise<void>;

    // Locais de Armazenamento (Depósitos)
    getStorageLocations(companyId?: string): Promise<StorageLocation[]>;
    createStorageLocation(location: any): Promise<StorageLocation>;
    updateStorageLocation(id: string, location: Partial<StorageLocation>): Promise<void>;
    deleteStorageLocation(id: string): Promise<void>;

    // Movimentações
    getStockMovements(companyId?: string, productId?: string): Promise<StockMovement[]>;
    createStockMovement(movement: any): Promise<StockMovement>;
    getProductBalance(productId: string, locationId: string): Promise<number>;
    getStocksByLocation(companyId: string, locationId: string): Promise<Record<string, number>>;
    getLatestDeliveryDates(companyId: string, locationId: string): Promise<Record<string, string>>;
    deleteStockMovement(movementId: string): Promise<void>;

    // Vendas / PDV
    getVendas(companyId?: string): Promise<any[]>;
    getVenda(id: string): Promise<any | null>;
    createVenda(venda: any, itens: any[]): Promise<any>;
    deleteVenda(id: string): Promise<void>;

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

    // Pesquisa Global
    globalSearch(companyId: string, query: string, userRole: string): Promise<{ customers: Customer[], orders: ServiceOrder[], users: User[] }>;

    // Métodos de Upsert (Restauração)
    upsertCompanies(companies: Company[]): Promise<void>;
    upsertUsers(users: User[]): Promise<void>;
    upsertCustomers(customers: Customer[]): Promise<void>;
    upsertOrders(orders: ServiceOrder[]): Promise<void>;
    upsertMessages(messages: ChatMessage[]): Promise<void>;
    upsertPayments(payments: CompanyPayment[]): Promise<void>;

    // Financeiro
    getFinanceAccounts(companyId: string): Promise<any[]>;
    createFinanceAccount(account: any): Promise<any>;
    updateFinanceAccount(id: string, account: any): Promise<void>;

    getFinanceCategories(companyId: string, type?: 'INCOME' | 'EXPENSE'): Promise<any[]>;
    createFinanceCategory(category: any): Promise<any>;

    getFinanceTransactions(companyId: string, filters?: any): Promise<any[]>;
    createFinanceTransaction(transaction: any): Promise<any>;
    updateFinanceTransaction(id: string, transaction: any): Promise<void>;

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
