import { supabase } from './supabaseClient';
import { Company, User, Customer, ServiceOrder, Supplier, SystemSettings, ChatMessage, CompanyPayment, UserRole, OrderStatus, CompanyPlan, CompanyPeriod, PlanPricing, AppNotification, NotificationType, Product, StorageLocation, StockMovement } from '../types';
import { IDatabaseService } from './database.types';

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
        zipCode: raw.zip_code,
        address: raw.address,
        number: raw.number,
        complement: raw.complement,
        neighborhood: raw.neighborhood,
        city: raw.city,
        state: raw.state,
        plan: raw.plan as CompanyPlan,
        period: (raw.plan_period || 'MENSAL') as CompanyPeriod,
        monthlyFee: Number(raw.monthly_fee),
        status: raw.status as 'ACTIVE' | 'BLOCKED',
        ativo: raw.ativo ?? true,
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

const mapUser = (raw: any): User => {
    let role = raw.role as string;
    if (role) {
        const r = role.toLowerCase();
        if (r === 'administrador') role = UserRole.ADMIN;
        else if (r === 'técnico' || r === 'tecnico') role = UserRole.TECH;
        else if (r === 'desenvolvedor') role = UserRole.DEVELOPER;
    }

    return {
        id: raw.id,
        companyId: raw.company_id,
        name: raw.name,
        email: raw.email,
        phone: raw.phone,
        role: role as UserRole,
        city: raw.city,
        isBlocked: raw.is_blocked,
        ativo: raw.ativo ?? true,
        password: raw.password
    };
};

const mapCustomer = (raw: any): Customer => ({
    id: raw.id,
    companyId: raw.company_id,
    name: raw.name,
    corporateName: raw.corporate_name,
    document: raw.document,
    customerType: raw.customer_type,
    email: raw.email,
    phone: raw.phone,
    zipCode: raw.zip_code,
    city: raw.city,
    address: raw.address,
    number: raw.number,
    complement: raw.complement,
    neighborhood: raw.neighborhood,
    sector: raw.sector,
    notes: raw.notes,
    estado: raw.estado,
    ativo: raw.ativo ?? true,
    createdAt: raw.created_at
});

const mapOrder = (raw: any): ServiceOrder => {
    let posts = raw.posts;
    if (typeof posts === 'string') {
        try { posts = JSON.parse(posts); } catch { posts = []; }
    }

    let attachments = raw.attachments;
    if (typeof attachments === 'string') {
        try { attachments = JSON.parse(attachments); } catch { attachments = []; }
    }

    // Normalização de status para evitar erros de case (ex: FINALIZADA vs Finalizada)
    let status = raw.status as string;
    if (status) {
        const s = status.toLowerCase();
        if (s === 'aberta') status = OrderStatus.OPEN;
        else if (s === 'em andamento') status = OrderStatus.IN_PROGRESS;
        else if (s === 'pausada') status = OrderStatus.PAUSED;
        else if (s === 'finalizada') status = OrderStatus.FINISHED;
        else if (s === 'cancelada') status = OrderStatus.CANCELLED;
    }

    return {
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
        status: status as OrderStatus,
        ativo: raw.ativo ?? true,
        createdAt: raw.created_at,
        scheduledDate: raw.scheduled_date,
        prazo: raw.prazo,
        finishedAt: raw.finished_at,
        cancellationReason: raw.cancellation_reason,
        posts: posts || [],
        attachments: attachments || []
    };
};

const mapSupplier = (raw: any): Supplier => {
    return {
        id: raw.id,
        companyId: raw.company_id,
        name: raw.name,
        corporateName: raw.corporate_name,
        document: raw.document,
        phone: raw.phone,
        email: raw.email,
        zipCode: raw.zip_code,
        address: raw.address,
        number: raw.number,
        complement: raw.complement,
        neighborhood: raw.neighborhood,
        city: raw.city,
        state: raw.state,
        status: raw.status || 'ACTIVE',
        createdAt: raw.created_at
    };
};

const mapProduct = (raw: any): Product => {
    return {
        id: raw.id,
        companyId: raw.company_id,
        nome: raw.nome,
        descricao: raw.descricao,
        imagens: raw.imagens,
        precoVenda: Number(raw.preco_venda),
        sku: raw.sku,
        peso: Number(raw.peso),
        altura: Number(raw.altura),
        largura: Number(raw.largura),
        comprimento: Number(raw.comprimento),
        quantidadeEstoque: Number(raw.quantidade_estoque),
        ean: raw.ean,
        ncm: raw.ncm,
        variacoes: raw.variacoes,
        categoria: raw.categoria,
        marca: raw.marca,
        seoTitle: raw.seo_title,
        seoDescription: raw.seo_description,
        fornecedorId: raw.fornecedor_id,
        valorCompra: Number(raw.valor_compra),
        margemLucro: Number(raw.margem_lucro),
        status: raw.status || 'ACTIVE',
        createdAt: raw.created_at
    };
};

const mapStorageLocation = (raw: any): StorageLocation => {
    return {
        id: raw.id,
        companyId: raw.company_id,
        nome: raw.nome,
        localizacao: raw.localizacao,
        ativo: raw.ativo,
        createdAt: raw.created_at
    };
};

const mapStockMovement = (raw: any): StockMovement => {
    return {
        id: raw.id,
        companyId: raw.company_id,
        produtoId: raw.produto_id,
        tipo: raw.tipo,
        quantidade: Number(raw.quantidade),
        origemId: raw.origem_id,
        destinoId: raw.destino_id,
        fornecedorId: raw.fornecedor_id,
        documentRef: raw.document_ref,
        userId: raw.user_id,
        userName: raw.user_name,
        observacoes: raw.observacoes,
        createdAt: raw.created_at
    };
};


export const dbService: IDatabaseService = {
    // Empresas
    async getCompanies(): Promise<Company[]> {
        const { data, error } = await supabase.from('companies').select('*').eq('ativo', true);
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
        if (updates.zipCode) dbUpdates.zip_code = updates.zipCode;
        if (updates.address) dbUpdates.address = updates.address;
        if (updates.number) dbUpdates.number = updates.number;
        if (updates.complement) dbUpdates.complement = updates.complement;
        if (updates.neighborhood) dbUpdates.neighborhood = updates.neighborhood;
        if (updates.city) dbUpdates.city = updates.city;
        if (updates.state) dbUpdates.state = updates.state;
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
        const { error } = await supabase.from('companies').update({ ativo: false }).eq('id', id);
        if (error) throw error;
    },

    // Usuários
    async getUsers(companyId?: string): Promise<User[]> {
        if (companyId === 'trial-company') return [];
        let query = supabase.from('users').select('*').eq('ativo', true);
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
        const { error } = await supabase.from('users').update({ ativo: false }).eq('id', id);
        if (error) throw error;
    },

    // Clientes
    async getCustomers(companyId?: string): Promise<Customer[]> {
        if (companyId === 'trial-company') {
            const { getTrialCustomers } = await import('./trialService');
            return getTrialCustomers();
        }
        let query = supabase.from('customers').select('*').eq('ativo', true);
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
            corporate_name: customer.corporateName,
            document: customer.document,
            customer_type: customer.customerType,
            email: customer.email,
            phone: customer.phone,
            zip_code: customer.zipCode,
            city: customer.city,
            address: customer.address,
            number: customer.number,
            complement: customer.complement,
            neighborhood: customer.neighborhood,
            sector: customer.sector,
            estado: customer.estado,
            notes: customer.notes
        }).select().single();
        if (error) throw error;
        return mapCustomer(data);
    },

    async updateCustomer(id: string, updates: Partial<Customer>) {
        const dbUpdates: any = {};
        if (updates.name) dbUpdates.name = updates.name;
        if (updates.corporateName !== undefined) dbUpdates.corporate_name = updates.corporateName;
        if (updates.document !== undefined) dbUpdates.document = updates.document;
        if (updates.customerType !== undefined) dbUpdates.customer_type = updates.customerType;
        if (updates.email !== undefined) dbUpdates.email = updates.email;
        if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
        if (updates.zipCode !== undefined) dbUpdates.zip_code = updates.zipCode;
        if (updates.city !== undefined) dbUpdates.city = updates.city;
        if (updates.address !== undefined) dbUpdates.address = updates.address;
        if (updates.number !== undefined) dbUpdates.number = updates.number;
        if (updates.complement !== undefined) dbUpdates.complement = updates.complement;
        if (updates.neighborhood !== undefined) dbUpdates.neighborhood = updates.neighborhood;
        if (updates.sector !== undefined) dbUpdates.sector = updates.sector;
        if (updates.estado !== undefined) dbUpdates.estado = updates.estado;
        if (updates.notes !== undefined) dbUpdates.notes = updates.notes;

        const { error } = await supabase.from('customers').update(dbUpdates).eq('id', id);
        if (error) throw error;
    },

    async deleteCustomer(id: string) {
        const { error } = await supabase.from('customers').update({ ativo: false }).eq('id', id);
        if (error) throw error;
    },

    // Fornecedores
    async getSuppliers(companyId?: string): Promise<Supplier[]> {
        let query = supabase.from('suppliers').select('*').order('name', { ascending: true });
        if (companyId) {
            query = query.eq('company_id', companyId);
        }
        const { data, error } = await query;
        if (error) throw error;
        return (data || []).map(mapSupplier);
    },

    async getSupplier(id: string): Promise<Supplier | null> {
        const { data, error } = await supabase.from('suppliers').select('*').eq('id', id).single();
        if (error && error.code !== 'PGRST116') throw error;
        if (!data) return null;
        return mapSupplier(data);
    },

    async createSupplier(supplier: Omit<Supplier, 'id' | 'createdAt'>): Promise<Supplier> {
        const newId = crypto.randomUUID();
        const { data, error } = await supabase.from('suppliers').insert({
            id: newId,
            company_id: supplier.companyId,
            name: supplier.name,
            corporate_name: supplier.corporateName || null,
            document: supplier.document || null,
            phone: supplier.phone || null,
            email: supplier.email || null,
            zip_code: supplier.zipCode || null,
            address: supplier.address || null,
            number: supplier.number || null,
            complement: supplier.complement || null,
            neighborhood: supplier.neighborhood || null,
            city: supplier.city || null,
            state: supplier.state || null,
            status: supplier.status || 'ACTIVE',
            created_at: new Date().toISOString()
        }).select().single();
        if (error) throw error;
        return mapSupplier(data);
    },

    async updateSupplier(id: string, updates: Partial<Supplier>) {
        const mappedUpdates: any = {};
        if (updates.name !== undefined) mappedUpdates.name = updates.name;
        if (updates.corporateName !== undefined) mappedUpdates.corporate_name = updates.corporateName;
        if (updates.document !== undefined) mappedUpdates.document = updates.document;
        if (updates.phone !== undefined) mappedUpdates.phone = updates.phone;
        if (updates.email !== undefined) mappedUpdates.email = updates.email;
        if (updates.zipCode !== undefined) mappedUpdates.zip_code = updates.zipCode;
        if (updates.address !== undefined) mappedUpdates.address = updates.address;
        if (updates.number !== undefined) mappedUpdates.number = updates.number;
        if (updates.complement !== undefined) mappedUpdates.complement = updates.complement;
        if (updates.neighborhood !== undefined) mappedUpdates.neighborhood = updates.neighborhood;
        if (updates.city !== undefined) mappedUpdates.city = updates.city;
        if (updates.state !== undefined) mappedUpdates.state = updates.state;
        if (updates.status !== undefined) mappedUpdates.status = updates.status;

        const { error } = await supabase.from('suppliers').update(mappedUpdates).eq('id', id);
        if (error) throw error;
    },

    async deleteSupplier(id: string) {
        const { error } = await supabase.from('suppliers').delete().eq('id', id);
        if (error) throw error;
    },

    // Ordens de Serviço
    async getOrders(companyId?: string, techId?: string): Promise<ServiceOrder[]> {
        if (companyId === 'trial-company') {
            const { getTrialOrders } = await import('./trialService');
            let orders = getTrialOrders();
            if (techId) orders = orders.filter((o: any) => o.techId === techId);
            return orders;
        }

        let query = supabase
            .from('service_orders')
            .select('*, customers(name), users(name)')
            .eq('ativo', true);

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
        if (id.startsWith('trial-')) return; // Ignore on trial mode
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
        const { error } = await supabase.from('service_orders').update({ ativo: false }).eq('id', id);
        if (error) throw error;
    },

    // Produtos
    async getProducts(companyId?: string): Promise<Product[]> {
        let query = supabase.from('products').select('*');
        if (companyId) query = query.eq('company_id', companyId);
        const { data, error } = await query.order('nome');
        if (error) throw error;
        return (data || []).map(mapProduct);
    },
    async getProduct(id: string): Promise<Product | null> {
        const { data, error } = await supabase.from('products').select('*').eq('id', id).single();
        if (error) return null;
        return mapProduct(data);
    },
    async createProduct(product: any): Promise<Product> {
        const payload = {
            company_id: product.companyId,
            nome: product.nome,
            descricao: product.descricao,
            imagens: product.imagens,
            preco_venda: product.precoVenda,
            sku: product.sku,
            peso: product.peso,
            altura: product.altura,
            largura: product.largura,
            comprimento: product.comprimento,
            quantidade_estoque: product.quantidadeEstoque,
            ean: product.ean,
            ncm: product.ncm,
            variacoes: product.variacoes,
            categoria: product.categoria,
            marca: product.marca,
            seo_title: product.seoTitle,
            seo_description: product.seoDescription,
            fornecedor_id: product.fornecedorId,
            valor_compra: product.valorCompra,
            margem_lucro: product.margemLucro,
            status: product.status || 'ACTIVE'
        };
        const { data, error } = await supabase.from('products').insert(payload).select().single();
        if (error) throw error;
        return mapProduct(data);
    },
    async updateProduct(id: string, product: Partial<Product>): Promise<void> {
        const payload: any = {};
        if (product.nome !== undefined) payload.nome = product.nome;
        if (product.descricao !== undefined) payload.descricao = product.descricao;
        if (product.imagens !== undefined) payload.imagens = product.imagens;
        if (product.precoVenda !== undefined) payload.preco_venda = product.precoVenda;
        if (product.sku !== undefined) payload.sku = product.sku;
        if (product.peso !== undefined) payload.peso = product.peso;
        if (product.altura !== undefined) payload.altura = product.altura;
        if (product.largura !== undefined) payload.largura = product.largura;
        if (product.comprimento !== undefined) payload.comprimento = product.comprimento;
        if (product.quantidadeEstoque !== undefined) payload.quantidade_estoque = product.quantidadeEstoque;
        if (product.ean !== undefined) payload.ean = product.ean;
        if (product.ncm !== undefined) payload.ncm = product.ncm;
        if (product.variacoes !== undefined) payload.variacoes = product.variacoes;
        if (product.categoria !== undefined) payload.categoria = product.categoria;
        if (product.marca !== undefined) payload.marca = product.marca;
        if (product.seoTitle !== undefined) payload.seo_title = product.seoTitle;
        if (product.seoDescription !== undefined) payload.seo_description = product.seoDescription;
        if (product.fornecedorId !== undefined) payload.fornecedor_id = product.fornecedorId;
        if (product.valorCompra !== undefined) payload.valor_compra = product.valorCompra;
        if (product.margemLucro !== undefined) payload.margem_lucro = product.margemLucro;
        if (product.status !== undefined) payload.status = product.status;

        const { error } = await supabase.from('products').update(payload).eq('id', id);
        if (error) throw error;
    },
    async deleteProduct(id: string): Promise<void> {
        const { error } = await supabase.from('products').delete().eq('id', id);
        if (error) throw error;
    },

    // Locais de Armazenamento
    async getStorageLocations(companyId?: string): Promise<StorageLocation[]> {
        let query = supabase.from('storage_locations').select('*');
        if (companyId) query = query.eq('company_id', companyId);
        const { data, error } = await query.order('nome');
        if (error) throw error;
        return (data || []).map(mapStorageLocation);
    },
    async createStorageLocation(location: any): Promise<StorageLocation> {
        const { data, error } = await supabase.from('storage_locations').insert({
            company_id: location.companyId,
            nome: location.nome,
            localizacao: location.localizacao,
            ativo: location.ativo ?? true
        }).select().single();
        if (error) throw error;
        return mapStorageLocation(data);
    },
    async updateStorageLocation(id: string, location: Partial<StorageLocation>): Promise<void> {
        const payload: any = {};
        if (location.nome !== undefined) payload.nome = location.nome;
        if (location.localizacao !== undefined) payload.localizacao = location.localizacao;
        if (location.ativo !== undefined) payload.ativo = location.ativo;
        const { error } = await supabase.from('storage_locations').update(payload).eq('id', id);
        if (error) throw error;
    },
    async deleteStorageLocation(id: string): Promise<void> {
        const { error } = await supabase.from('storage_locations').delete().eq('id', id);
        if (error) throw error;
    },

    // Movimentações
    async getStockMovements(companyId?: string, productId?: string): Promise<StockMovement[]> {
        let query = supabase.from('stock_movements').select('*');
        if (companyId) query = query.eq('company_id', companyId);
        if (productId) query = query.eq('produto_id', productId);
        const { data, error } = await query.order('created_at', { ascending: false });
        if (error) throw error;
        return (data || []).map(mapStockMovement);
    },
    async createStockMovement(movement: any): Promise<StockMovement> {
        const { data, error } = await supabase.from('stock_movements').insert({
            company_id: movement.companyId,
            produto_id: movement.produtoId,
            tipo: movement.tipo,
            quantidade: movement.quantidade,
            origem_id: movement.origemId,
            destino_id: movement.destinoId,
            fornecedor_id: movement.fornecedorId,
            document_ref: movement.documentRef,
            user_id: movement.userId,
            user_name: movement.userName,
            observacoes: movement.observacoes
        }).select().single();
        if (error) throw error;
        return mapStockMovement(data);
    },

    // Chat
    async getMessages(companyId?: string): Promise<ChatMessage[]> {
        if (companyId === 'trial-company') return [];
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
        if (message.companyId === 'trial-company') return; // Ignore on trial mode
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
        if (companyId === 'trial-company') return [];
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
        if (companyId === 'trial-company') return [];
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

    // Inteligência Artificial
    async generateAIReport(orderId: string, description: string, history: string): Promise<string> {
        if (orderId.startsWith('trial-')) {
            // Mock de inteligência artificial para o trial
            await new Promise(resolve => setTimeout(resolve, 2000));
            return `## Relatório Técnico Preliminar (Modo Demonstração)

**Situação Encontrada:**
O cliente relatou o seguinte problema: *${description}*

**Ações Técnicas Realizadas:**
De acordo com o acompanhamento: *${history}*

**Conclusão:**
Este é um relatório gerado localmente pelo ambiente de testes (Demonstração). Em produção, este texto seria preenchido pela Inteligência Artificial configurada na plataforma (Google Gemini) com base no Diário de Bordo Técnico.`;
        }

        const { data, error } = await supabase.functions.invoke('generate-report', {
            body: { description, history }
        });

        if (error) {
            console.error("Erro na Function generate-report", error);
            throw new Error('Falha ao gerar relatório com Inteligência Artificial.');
        }

        return data.text || 'Erro de formatação do relatório gerado.';
    },

    // Canais de Suporte (Direct Developer <=> Admin)
    async getSupportMessages(companyId: string): Promise<ChatMessage[]> {
        if (companyId === 'trial-company') return [];
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
        if (companyId === 'trial-company') return 1;
        const { count, error } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true })
            .eq('company_id', companyId)
            .eq('role', 'Administrador')
            .eq('is_blocked', false);
        if (error) return 0;
        return count || 0;
    },

    // === Sessões Ativas (Removido por incompatibilidade de schema) ===
    async forceLogoutUser(_userId: string): Promise<void> {
        return Promise.resolve();
    },

    async getActiveSessionUsers(_companyId?: string): Promise<User[]> {
        return Promise.resolve([]);
    },

    // === Pesquisa Global ===
    async globalSearch(companyId: string, query: string, userRole: string): Promise<{ customers: Customer[], orders: ServiceOrder[], users: User[] }> {
        if (!query || query.trim().length === 0) {
            return { customers: [], orders: [], users: [] };
        }

        const safeQuery = `%${query.trim()}%`;
        const isAdminOrDev = ['Administrador', 'Desenvolvedor'].includes(userRole);
        const isTech = userRole === 'Técnico' || userRole === 'Tecnico';

        // Arrays de queries independentes baseados em regras
        const fetchCustomers = supabase
            .from('customers')
            .select('*')
            .eq('company_id', companyId)
            .eq('ativo', true)
            // No PostgREST .or() recebe uma string no formato "coluna.op.valor,coluna2.op.valor"
            // Sem as aspas duplas adicionais dentro do valor, apenas a url encoding
            .or(`name.ilike.%${query.trim()}%,phone.ilike.%${query.trim()}%,city.ilike.%${query.trim()}%`)
            .limit(5);

        // Ordens: Se admin vê todas da empresa, se técnico vê apenas as atribuídas a ele
        const fetchOrders = supabase
            .from('service_orders')
            .select(`
                *,
                tech:users!tech_id(name),
                customer:customers!inner(id, name, city)
            `)
            .eq('company_id', companyId)
            .eq('ativo', true)
            // Filtros de or: busca direto na ordem. Não usaremos id.ilike pois se for UUID o PostgREST retorna 400.
            .or(`type.ilike.%${query.trim()}%,description.ilike.%${query.trim()}%`)
            .order('created_at', { ascending: false })
            .limit(5);

        let fetchUsers: any = Promise.resolve<{ data: any[], error: any }>({ data: [], error: null });
        if (isAdminOrDev) {
            fetchUsers = supabase
                .from('users')
                .select('*')
                .eq('company_id', companyId)
                .eq('ativo', true)
                .or(`name.ilike.%${query.trim()}%,email.ilike.%${query.trim()}%`)
                .limit(5);
        }

        const [custRes, ordRes, usrRes] = await Promise.all([fetchCustomers, fetchOrders, fetchUsers]);

        if (custRes.error) console.error("Error fetching customers for global search:", custRes.error);
        if (ordRes.error) console.error("Error fetching orders for global search:", ordRes.error);
        if (usrRes.error) console.error("Error fetching users for global search:", usrRes.error);

        return {
            customers: (custRes.data || []).map(mapCustomer),
            orders: (ordRes.data || []).map(mapOrder),
            users: (usrRes.data || []).map(mapUser)
        };
    },
};
