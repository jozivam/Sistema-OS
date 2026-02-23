
import { supabase } from './supabaseClient';
import { Company, User, Customer, ServiceOrder, SystemSettings, ChatMessage, CompanyPayment, UserRole, OrderStatus, CompanyPlan, CompanyPeriod, PlanPricing, AppNotification, NotificationType } from '../types';

// Mappers to convert between Supabase snake_case and App camelCase
const mapCompany = (raw: any): Company => {
    let settings = raw.settings;
    if (typeof settings === 'string') {
        try {
            settings = JSON.parse(settings);
        } catch {
            settings = {};
        }
    }

    return {
        id: raw.id,
        name: raw.name,
        corporateName: raw.corporate_name,
        tradeName: raw.trade_name,
        document: raw.document,
        email: raw.email,
        phone: raw.phone,
        address: raw.address,
        city: raw.city,
        plan: raw.plan as CompanyPlan,
        period: (raw.plan_period || 'MENSAL') as CompanyPeriod,
        monthlyFee: Number(raw.monthly_fee),
        status: raw.status as 'ACTIVE' | 'BLOCKED',
        createdAt: raw.created_at,
        expiresAt: raw.expires_at,
        settings: {
            enableAI: settings?.enableAI ?? false,
            enableAttachments: settings?.enableAttachments ?? false,
            enableChat: settings?.enableChat ?? false,
            enableHistory: settings?.enableHistory ?? false,
            orderTypes: settings?.orderTypes || []
        }
    };
};

const mapUser = (raw: any): User => ({
    id: raw.id,
    companyId: raw.company_id,
    name: raw.name,
    email: raw.email,
    phone: raw.phone,
    role: raw.role as UserRole,
    city: raw.city,
    isBlocked: raw.is_blocked,
    password: raw.password
});

const mapCustomer = (raw: any): Customer => ({
    id: raw.id,
    companyId: raw.company_id,
    name: raw.name,
    phone: raw.phone,
    city: raw.city,
    address: raw.address,
    number: raw.number,
    sector: raw.sector,
    notes: raw.notes,
    createdAt: raw.created_at
});

const mapOrder = (raw: any): ServiceOrder => ({
    id: raw.id,
    companyId: raw.company_id,
    customerId: raw.customer_id,
    customerName: raw.customer_name || raw.customer?.name || raw.customers?.name || 'Desconhecido',
    techId: raw.tech_id,
    techName: raw.tech_name || raw.tech?.name || raw.users?.name || 'Não atribuído',
    type: raw.type,
    description: raw.description,
    dailyHistory: raw.daily_history,
    aiReport: raw.ai_report,
    status: raw.status as OrderStatus,
    createdAt: raw.created_at,
    scheduledDate: raw.scheduled_date,
    finishedAt: raw.finished_at,
    cancellationReason: raw.cancellation_reason,
    posts: raw.posts || [],
    attachments: raw.attachments || []
});

export const dbService = {
    // Empresas
    async getCompanies(): Promise<Company[]> {
        const { data, error } = await supabase.from('companies').select('*');
        if (error) throw error;
        return (data || []).map(mapCompany);
    },

    async getCompany(id: string): Promise<Company | null> {
        const { data, error } = await supabase.from('companies').select('*').eq('id', id).single();
        if (error) return null;
        return mapCompany(data);
    },

    async updateCompany(id: string, updates: Partial<Company>) {
        const dbUpdates: any = {};
        if (updates.name) dbUpdates.name = updates.name;
        if (updates.corporateName) dbUpdates.corporate_name = updates.corporateName;
        if (updates.tradeName) dbUpdates.trade_name = updates.tradeName;
        if (updates.document) dbUpdates.document = updates.document;
        if (updates.email) dbUpdates.email = updates.email;
        if (updates.phone) dbUpdates.phone = updates.phone;
        if (updates.address) dbUpdates.address = updates.address;
        if (updates.city) dbUpdates.city = updates.city;
        if (updates.plan) dbUpdates.plan = updates.plan;
        if (updates.period) dbUpdates.plan_period = updates.period;
        if (updates.monthlyFee !== undefined) dbUpdates.monthly_fee = updates.monthlyFee;
        if (updates.status) dbUpdates.status = updates.status;
        if (updates.expiresAt !== undefined) dbUpdates.expires_at = updates.expiresAt;
        if (updates.settings) dbUpdates.settings = updates.settings;

        const { error } = await supabase.from('companies').update(dbUpdates).eq('id', id);
        if (error) throw error;
    },

    async createCompany(company: Omit<Company, 'id' | 'createdAt'>) {
        const { data, error } = await supabase.from('companies').insert({
            name: company.name,
            corporate_name: company.corporateName,
            trade_name: company.tradeName,
            document: company.document,
            email: company.email,
            phone: company.phone,
            address: company.address,
            city: company.city,
            plan: company.plan,
            monthly_fee: company.monthlyFee,
            status: company.status,
            expires_at: company.expiresAt,
            settings: company.settings
        }).select().single();
        if (error) throw error;
        return mapCompany(data);
    },

    async deleteCompany(id: string) {
        // Warning: This should probably handle cascading deletes or be handled by foreign keys
        const { error } = await supabase.from('companies').delete().eq('id', id);
        if (error) throw error;
    },

    // Usuários
    async getUsers(companyId?: string): Promise<User[]> {
        let query = supabase.from('users').select('*');
        if (companyId) query = query.eq('company_id', companyId);
        const { data, error } = await query;
        if (error) return [];
        return (data || []).map(mapUser);
    },

    async getUser(id: string): Promise<User | null> {
        const { data, error } = await supabase.from('users').select('*').eq('id', id).single();
        if (error) return null;
        return mapUser(data);
    },

    async createUser(userData: Omit<User, 'id'> & { id?: string }) {
        const { data, error } = await supabase.from('users').insert({
            id: userData.id,
            company_id: userData.companyId,
            name: userData.name,
            email: userData.email,
            phone: userData.phone,
            role: userData.role,
            city: userData.city,
            is_blocked: userData.isBlocked,
            password: userData.password
        }).select().single();
        if (error) throw error;
        return mapUser(data);
    },

    async updateUser(id: string, updates: Partial<User>) {
        const dbUpdates: any = {};
        if (updates.name) dbUpdates.name = updates.name;
        if (updates.email) dbUpdates.email = updates.email;
        if (updates.phone) dbUpdates.phone = updates.phone;
        if (updates.role) dbUpdates.role = updates.role;
        if (updates.city) dbUpdates.city = updates.city;
        if (updates.isBlocked !== undefined) dbUpdates.is_blocked = updates.isBlocked;
        if (updates.password) dbUpdates.password = updates.password;

        const { error } = await supabase.from('users').update(dbUpdates).eq('id', id);
        if (error) throw error;
    },

    async deleteUser(id: string) {
        const { error } = await supabase.from('users').delete().eq('id', id);
        if (error) throw error;
    },

    // Clientes
    async getCustomers(companyId?: string): Promise<Customer[]> {
        let query = supabase.from('customers').select('*');
        if (companyId) query = query.eq('company_id', companyId);
        const { data, error } = await query;
        if (error) return [];
        return (data || []).map(mapCustomer);
    },

    async getCustomer(id: string): Promise<Customer | null> {
        const { data, error } = await supabase.from('customers').select('*').eq('id', id).single();
        if (error) return null;
        return mapCustomer(data);
    },

    async createCustomer(customer: Omit<Customer, 'id' | 'createdAt'>) {
        const { data, error } = await supabase.from('customers').insert({
            company_id: customer.companyId,
            name: customer.name,
            phone: customer.phone,
            city: customer.city,
            address: customer.address,
            number: customer.number,
            sector: customer.sector,
            notes: customer.notes
        }).select().single();
        if (error) throw error;
        return mapCustomer(data);
    },

    async updateCustomer(id: string, updates: Partial<Customer>) {
        const dbUpdates: any = {};
        if (updates.name) dbUpdates.name = updates.name;
        if (updates.phone) dbUpdates.phone = updates.phone;
        if (updates.city) dbUpdates.city = updates.city;
        if (updates.address) dbUpdates.address = updates.address;
        if (updates.number) dbUpdates.number = updates.number;
        if (updates.sector) dbUpdates.sector = updates.sector;
        if (updates.notes) dbUpdates.notes = updates.notes;

        const { error } = await supabase.from('customers').update(dbUpdates).eq('id', id);
        if (error) throw error;
    },

    async deleteCustomer(id: string) {
        const { error } = await supabase.from('customers').delete().eq('id', id);
        if (error) throw error;
    },

    // Ordens de Serviço
    async getOrders(companyId?: string, techId?: string): Promise<ServiceOrder[]> {
        let query = supabase
            .from('service_orders')
            .select('*, customers(name), users(name)');

        if (companyId) query = query.eq('company_id', companyId);
        if (techId) query = query.eq('tech_id', techId);

        const { data, error } = await query.order('created_at', { ascending: false });

        if (error) return [];
        return (data || []).map(mapOrder);
    },

    async createOrder(order: Omit<ServiceOrder, 'id' | 'createdAt'>) {
        const { data, error } = await supabase.from('service_orders').insert({
            company_id: order.companyId,
            customer_id: order.customerId,
            tech_id: order.techId,
            type: order.type,
            description: order.description,
            status: order.status,
            scheduled_date: order.scheduledDate,
            posts: [],
            attachments: order.attachments || []
        }).select('*, customers(name), users(name)').single();

        if (error) throw error;
        return mapOrder(data);
    },

    async getOrder(id: string): Promise<ServiceOrder | null> {
        const { data, error } = await supabase
            .from('service_orders')
            .select('*, customers(name), users(name)')
            .eq('id', id)
            .single();

        if (error) return null;
        return mapOrder(data);
    },

    async updateOrder(id: string, updates: Partial<ServiceOrder>) {
        const dbUpdates: any = {};
        if (updates.status) dbUpdates.status = updates.status;
        if (updates.description !== undefined) dbUpdates.description = updates.description;
        if (updates.dailyHistory !== undefined) dbUpdates.daily_history = updates.dailyHistory;
        if (updates.aiReport !== undefined) dbUpdates.ai_report = updates.aiReport;
        if (updates.finishedAt !== undefined) dbUpdates.finished_at = updates.finishedAt;
        if (updates.cancellationReason !== undefined) dbUpdates.cancellation_reason = updates.cancellationReason;
        if (updates.scheduledDate !== undefined) dbUpdates.scheduled_date = updates.scheduledDate;
        if (updates.type) dbUpdates.type = updates.type;
        if (updates.techId !== undefined) dbUpdates.tech_id = updates.techId || null;
        if (updates.posts) dbUpdates.posts = updates.posts;
        if (updates.attachments) dbUpdates.attachments = updates.attachments;

        const { error } = await supabase.from('service_orders').update(dbUpdates).eq('id', id);
        if (error) throw error;
    },

    async deleteOrder(id: string) {
        const { error } = await supabase.from('service_orders').delete().eq('id', id);
        if (error) throw error;
    },

    // Chat
    async getMessages(companyId?: string): Promise<ChatMessage[]> {
        let query = supabase
            .from('chat_messages')
            .select('*');

        if (companyId) query = query.eq('company_id', companyId);

        const { data, error } = await query.order('timestamp', { ascending: true });

        if (error) return [];
        return (data || []).map(raw => ({
            id: raw.id,
            companyId: raw.company_id,
            senderId: raw.sender_id,
            senderName: raw.sender_name,
            receiverId: raw.receiver_id,
            channelId: raw.channel_id,
            text: raw.text,
            timestamp: raw.timestamp
        }));
    },

    async sendMessage(message: Omit<ChatMessage, 'id' | 'timestamp'>) {
        const { error } = await supabase.from('chat_messages').insert({
            company_id: message.companyId,
            sender_id: message.senderId,
            sender_name: message.senderName,
            receiver_id: message.receiverId,
            channel_id: message.channelId,
            text: message.text
        });
        if (error) throw error;
    },

    // Pagamentos de Empresas
    async getCompanyPayments(companyId?: string): Promise<CompanyPayment[]> {
        let query = supabase
            .from('company_payments')
            .select('*');

        if (companyId) query = query.eq('company_id', companyId);

        const { data, error } = await query.order('payment_date', { ascending: false });

        if (error) return [];
        return (data || []).map(raw => ({
            id: raw.id,
            companyId: raw.company_id,
            amount: raw.amount,
            paymentDate: raw.payment_date,
            planReference: raw.plan_reference,
            expiresAtAfter: raw.expires_at_after
        }));
    },

    async createCompanyPayment(payment: Omit<CompanyPayment, 'id'>) {
        const { data, error } = await supabase.from('company_payments').insert({
            company_id: payment.companyId,
            amount: payment.amount,
            payment_date: payment.paymentDate,
            plan_reference: payment.planReference,
            expires_at_after: payment.expiresAtAfter
        }).select().single();

        if (error) throw error;
        return {
            id: data.id,
            companyId: data.company_id,
            amount: data.amount,
            paymentDate: data.payment_date,
            planReference: data.plan_reference,
            expiresAtAfter: data.expires_at_after
        };
    },

    async deleteCompanyPayment(id: string) {
        const { error } = await supabase.from('company_payments').delete().eq('id', id);
        if (error) throw error;
    },

    async getAllPayments(): Promise<(CompanyPayment & { companyName: string })[]> {
        const { data, error } = await supabase
            .from('company_payments')
            .select('*, companies(name)')
            .order('payment_date', { ascending: false });

        if (error) return [];
        return (data || []).map(raw => ({
            id: raw.id,
            companyId: raw.company_id,
            companyName: raw.companies?.name || 'Empresa Excluída',
            amount: raw.amount,
            paymentDate: raw.payment_date,
            planReference: raw.plan_reference,
            expiresAtAfter: raw.expires_at_after
        }));
    },

    // Métodos de Restauração (Batch Upsert)
    async upsertCompanies(companies: Company[]) {
        const data = companies.map(c => ({
            id: c.id,
            name: c.name,
            corporate_name: c.corporateName,
            trade_name: c.tradeName,
            document: c.document,
            email: c.email,
            phone: c.phone,
            address: c.address,
            city: c.city,
            plan: c.plan,
            monthly_fee: c.monthlyFee,
            status: c.status,
            created_at: c.createdAt,
            expires_at: c.expiresAt,
            settings: c.settings
        }));
        const { error } = await supabase.from('companies').upsert(data, { onConflict: 'id' });
        if (error) throw error;
    },

    async upsertUsers(users: User[]) {
        const data = users.map(u => ({
            id: u.id,
            company_id: u.companyId,
            name: u.name,
            email: u.email,
            phone: u.phone,
            role: u.role,
            city: u.city,
            is_blocked: u.isBlocked,
            password: u.password
        }));
        const { error } = await supabase.from('users').upsert(data, { onConflict: 'id' });
        if (error) throw error;
    },

    async upsertCustomers(customers: Customer[]) {
        const data = customers.map(c => ({
            id: c.id,
            company_id: c.companyId,
            name: c.name,
            phone: c.phone,
            city: c.city,
            address: c.address,
            number: c.number,
            sector: c.sector,
            notes: c.notes,
            created_at: c.createdAt
        }));
        const { error } = await supabase.from('customers').upsert(data, { onConflict: 'id' });
        if (error) throw error;
    },

    async upsertOrders(orders: ServiceOrder[]) {
        const data = orders.map(o => ({
            id: o.id,
            company_id: o.companyId,
            customer_id: o.customerId,
            tech_id: o.techId,
            type: o.type,
            description: o.description,
            status: o.status,
            scheduled_date: o.scheduledDate,
            created_at: o.createdAt,
            finished_at: o.finishedAt,
            cancellation_reason: o.cancellationReason,
            daily_history: o.dailyHistory,
            ai_report: o.aiReport,
            posts: o.posts,
            attachments: o.attachments
        }));
        const { error } = await supabase.from('service_orders').upsert(data, { onConflict: 'id' });
        if (error) throw error;
    },

    async upsertMessages(messages: ChatMessage[]) {
        const data = messages.map(m => ({
            id: m.id,
            company_id: m.companyId,
            sender_id: m.senderId,
            sender_name: m.senderName,
            receiver_id: m.receiverId,
            channel_id: m.channelId,
            text: m.text,
            timestamp: m.timestamp
        }));
        const { error } = await supabase.from('chat_messages').upsert(data, { onConflict: 'id' });
        if (error) throw error;
    },

    async upsertPayments(payments: CompanyPayment[]) {
        const data = payments.map(p => ({
            id: p.id,
            company_id: p.companyId,
            amount: p.amount,
            payment_date: p.paymentDate,
            plan_reference: p.planReference,
            expires_at_after: p.expiresAtAfter
        }));
        const { error } = await supabase.from('company_payments').upsert(data, { onConflict: 'id' });
        if (error) throw error;
    },

    // Notificações
    async getNotifications(companyId: string): Promise<AppNotification[]> {
        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('company_id', companyId)
            .order('created_at', { ascending: false })
            .limit(20);

        if (error) return [];
        return (data || []).map(raw => ({
            id: raw.id,
            companyId: raw.company_id,
            type: raw.type as NotificationType,
            title: raw.title,
            content: raw.content,
            link: raw.link,
            isRead: raw.is_read,
            createdAt: raw.created_at
        }));
    },

    async createNotification(notification: Omit<AppNotification, 'id' | 'createdAt' | 'isRead'>) {
        const { error } = await supabase.from('notifications').insert({
            company_id: notification.companyId,
            type: notification.type,
            title: notification.title,
            content: notification.content,
            link: notification.link
        });
        if (error) throw error;
    },

    async markNotificationAsRead(id: string) {
        const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', id);
        if (error) throw error;
    },

    // Canais de Suporte (Direct Developer <=> Admin)
    async getSupportMessages(companyId: string): Promise<ChatMessage[]> {
        const { data, error } = await supabase
            .from('chat_messages')
            .select('*')
            .eq('channel_id', `support_${companyId}`)
            .order('timestamp', { ascending: true });

        if (error) return [];
        return (data || []).map(raw => ({
            id: raw.id,
            companyId: raw.company_id,
            senderId: raw.sender_id,
            senderName: raw.sender_name,
            receiverId: raw.receiver_id,
            channelId: raw.channel_id,
            text: raw.text,
            timestamp: raw.timestamp
        }));
    },

    async getAllSupportChannels(): Promise<{ companyId: string, companyName: string, lastMessage: string, timestamp: string }[]> {
        // 1. Busca todas as empresas ativas
        const { data: companies, error: compError } = await supabase
            .from('companies')
            .select('id, name, trade_name')
            .eq('status', 'ACTIVE')
            .order('trade_name', { ascending: true });

        if (compError) return [];

        // 2. Busca as últimas mensagens de suporte
        const { data: messages, error: msgError } = await supabase
            .from('chat_messages')
            .select('company_id, text, timestamp')
            .filter('channel_id', 'ilike', 'support_%')
            .order('timestamp', { ascending: false });

        if (msgError) return (companies || []).map(c => ({
            companyId: c.id,
            companyName: c.trade_name || c.name,
            lastMessage: '',
            timestamp: ''
        }));

        // 3. Mapeia as mensagens para as empresas
        const latestMsgs: Record<string, { text: string, timestamp: string }> = {};
        messages?.forEach(msg => {
            if (!latestMsgs[msg.company_id]) {
                latestMsgs[msg.company_id] = { text: msg.text, timestamp: msg.timestamp };
            }
        });

        // 4. Retorna a lista completa prioritizando quem tem mensagem recente
        return (companies || []).map(c => ({
            companyId: c.id,
            companyName: c.trade_name || c.name,
            lastMessage: latestMsgs[c.id]?.text || 'Sem mensagens anteriores',
            timestamp: latestMsgs[c.id]?.timestamp || ''
        })).sort((a, b) => {
            if (a.timestamp && b.timestamp) return b.timestamp.localeCompare(a.timestamp);
            if (a.timestamp) return -1;
            if (b.timestamp) return 1;
            return a.companyName.localeCompare(b.companyName);
        });
    },
    // Exportando o cliente para uso em listeners realtime
    supabase,

    // === Precificação dos Planos ===
    async getPlanPricing(): Promise<PlanPricing[]> {
        const { data, error } = await supabase
            .from('plan_pricing')
            .select('*')
            .order('plan_type')
            .order('period');
        if (error) return [];
        return (data || []).map(raw => ({
            id: raw.id,
            planType: raw.plan_type,
            period: raw.period as CompanyPeriod,
            basePrice: Number(raw.base_price),
            discountPct: Number(raw.discount_pct),
            updatedAt: raw.updated_at
        }));
    },

    async setPlanPricing(planType: string, period: string, basePrice: number, discountPct: number): Promise<void> {
        const { error } = await supabase
            .from('plan_pricing')
            .upsert(
                { plan_type: planType, period, base_price: basePrice, discount_pct: discountPct, updated_at: new Date().toISOString() },
                { onConflict: 'plan_type,period' }
            );
        if (error) throw error;
    },

    // === Contagem de Admins ===
    async getAdminCount(companyId: string): Promise<number> {
        const { count, error } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true })
            .eq('company_id', companyId)
            .eq('role', 'Administrador')
            .eq('is_blocked', false);
        if (error) return 0;
        return count || 0;
    },

    // === Sessões Ativas ===
    async forceLogoutUser(userId: string): Promise<void> {
        const { error } = await supabase
            .from('users')
            .update({ active_session_token: null, session_updated_at: null })
            .eq('id', userId);
        if (error) throw error;
    },

    async getActiveSessionUsers(companyId?: string): Promise<User[]> {
        let query = supabase
            .from('users')
            .select('*')
            .not('active_session_token', 'is', null);
        if (companyId) query = query.eq('company_id', companyId);
        const { data, error } = await query;
        if (error) return [];
        return (data || []).map(mapUser);
    },
};
