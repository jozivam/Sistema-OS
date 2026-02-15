
import { supabase } from './supabaseClient';
import { Company, User, Customer, ServiceOrder, SystemSettings, ChatMessage, CompanyPayment, UserRole, OrderStatus, CompanyPlan } from '../types';

// Mappers to convert between Supabase snake_case and App camelCase
const mapCompany = (raw: any): Company => ({
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
    monthlyFee: Number(raw.monthly_fee),
    status: raw.status as 'ACTIVE' | 'BLOCKED',
    createdAt: raw.created_at,
    expiresAt: raw.expires_at,
    settings: raw.settings
});

const mapUser = (raw: any): User => ({
    id: raw.id,
    companyId: raw.company_id,
    name: raw.name,
    email: raw.email,
    phone: raw.phone,
    role: raw.role as UserRole,
    city: raw.city,
    isBlocked: raw.is_blocked
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
    customerName: raw.customer_name || raw.customers?.name || 'Desconhecido',
    techId: raw.tech_id,
    techName: raw.tech_name || raw.users?.name || 'Não atribuído',
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
        if (updates.monthlyFee !== undefined) dbUpdates.monthly_fee = updates.monthlyFee;
        if (updates.status) dbUpdates.status = updates.status;
        if (updates.expiresAt) dbUpdates.expires_at = updates.expiresAt;
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
            is_blocked: userData.isBlocked
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

        const { error } = await supabase.from('users').update(dbUpdates).eq('id', id);
        if (error) throw error;
    },

    async deleteUser(id: string) {
        const { error } = await supabase.from('users').delete().eq('id', id);
        if (error) throw error;
    },

    // Clientes
    async getCustomers(companyId: string): Promise<Customer[]> {
        const { data, error } = await supabase.from('customers').select('*').eq('company_id', companyId);
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
    async getOrders(companyId: string, techId?: string): Promise<ServiceOrder[]> {
        let query = supabase
            .from('service_orders')
            .select('*, customers(name), users(name)')
            .eq('company_id', companyId);

        if (techId) {
            query = query.eq('tech_id', techId);
        }

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
        if (updates.description) dbUpdates.description = updates.description;
        if (updates.dailyHistory) dbUpdates.daily_history = updates.dailyHistory;
        if (updates.aiReport) dbUpdates.ai_report = updates.aiReport;
        if (updates.finishedAt) dbUpdates.finished_at = updates.finishedAt;
        if (updates.cancellationReason) dbUpdates.cancellation_reason = updates.cancellationReason;
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
    async getMessages(companyId: string): Promise<ChatMessage[]> {
        const { data, error } = await supabase
            .from('chat_messages')
            .select('*')
            .eq('company_id', companyId)
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
    async getCompanyPayments(companyId: string): Promise<CompanyPayment[]> {
        const { data, error } = await supabase
            .from('company_payments')
            .select('*')
            .eq('company_id', companyId)
            .order('payment_date', { ascending: false });

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
    }
};
