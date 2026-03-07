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
        unidadeMedida: raw.unidade_medida || 'UN', // Added default 'UN'
        seoTitle: raw.seo_title,
        seoDescription: raw.seo_description,
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
        if (companyId) query = query.eq('company_id', companyId);
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
        const { data, error } = await supabase.from('suppliers').insert({
            company_id: supplier.companyId,
            name: supplier.name,
            corporate_name: supplier.corporateName || null,
            document: supplier.document || null,
            phone: supplier.phone || null,
            email: supplier.email || null,
            status: supplier.status || 'ACTIVE',
            created_at: new Date().toISOString()
        }).select().single();
        if (error) throw error;
        return mapSupplier(data);
    },
    async updateSupplier(id: string, updates: Partial<Supplier>) {
        const { error } = await supabase.from('suppliers').update(updates).eq('id', id);
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
        let query = supabase.from('service_orders').select('*, customers(name), users(name)').eq('ativo', true);
        if (companyId) query = query.eq('company_id', companyId);
        if (techId) query = query.eq('tech_id', techId);
        const { data, error } = await query.order('created_at', { ascending: false });
        if (error) return [];
        return (data || []).map(mapOrder);
    },
    async getOrder(id: string): Promise<ServiceOrder | null> {
        const { data, error } = await supabase.from('service_orders').select('*, customers(name), users(name)').eq('id', id).single();
        if (error) return null;
        return mapOrder(data);
    },
    async createOrder(order: any): Promise<ServiceOrder> {
        const { data, error } = await supabase.from('service_orders').insert(order).select('*, customers(name), users(name)').single();
        if (error) throw error;
        return mapOrder(data);
    },
    async updateOrder(id: string, order: Partial<ServiceOrder>): Promise<void> {
        const { error } = await supabase.from('service_orders').update(order).eq('id', id);
        if (error) throw error;
    },
    async deleteOrder(id: string): Promise<void> {
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
    async getNextSku(companyId: string): Promise<string> {
        const { data, error } = await supabase
            .from('products')
            .select('sku')
            .eq('company_id', companyId);

        if (error) return '01';

        const skus = (data || [])
            .map(p => parseInt(p.sku))
            .filter(n => !isNaN(n));

        if (skus.length === 0) return '01';

        const maxSku = Math.max(...skus);
        const nextSku = maxSku + 1;
        return nextSku.toString().padStart(2, '0');
    },
    async createProduct(product: Omit<Product, 'id' | 'createdAt'>): Promise<Product> {
        const payload = {
            company_id: product.companyId,
            nome: product.nome,
            descricao: product.descricao,
            imagens: product.imagens,
            preco_venda: Number(product.precoVenda),
            sku: product.sku,
            peso: Number(product.peso || 0),
            altura: Number(product.altura || 0),
            largura: Number(product.largura || 0),
            comprimento: Number(product.comprimento || 0),
            quantidade_estoque: 0,
            ean: product.ean,
            ncm: product.ncm,
            variacoes: product.variacoes,
            categoria: product.categoria,
            marca: product.marca,
            // unidade_medida: product.unidadeMedida, // Campo não existe na tabela products
            seo_title: product.seoTitle,
            seo_description: product.seoDescription,
            valor_compra: Number(product.valorCompra || 0),
            margem_lucro: Number(product.margemLucro || 0),
            status: product.status || 'ACTIVE'
        };

        const { data, error } = await supabase.from('products').insert(payload).select().single();
        if (error) throw error;

        return mapProduct(data);
    },
    async updateProduct(id: string, product: Partial<Product>): Promise<void> {
        const payload: any = {
            nome: product.nome,
            descricao: product.descricao,
            sku: product.sku,
            ean: product.ean,
            ncm: product.ncm,
            categoria: product.categoria,
            marca: product.marca,
            // unidade_medida: product.unidadeMedida, // Campo não existe na tabela products
            seo_title: product.seoTitle,
            seo_description: product.seoDescription,
            preco_venda: product.precoVenda !== undefined ? Number(product.precoVenda) : undefined,
            valor_compra: product.valorCompra !== undefined ? Number(product.valorCompra) : undefined,
            margem_lucro: product.margemLucro !== undefined ? Number(product.margemLucro) : undefined,
            peso: product.peso !== undefined ? Number(product.peso) : undefined,
            altura: product.altura !== undefined ? Number(product.altura) : undefined,
            largura: product.largura !== undefined ? Number(product.largura) : undefined,
            comprimento: product.comprimento !== undefined ? Number(product.comprimento) : undefined,
            imagens: product.imagens,
            status: product.status
        };

        Object.keys(payload).forEach(key => payload[key] === undefined && delete payload[key]);

        const { error } = await supabase.from('products').update(payload).eq('id', id);
        if (error) throw error;
    },
    async deleteProduct(id: string): Promise<void> {
        // Limpeza profunda de dependências para permitir excluir produtos com histórico de estoque básico
        try {
            // Remove movimentações
            await supabase.from('stock_movements').delete().eq('produto_id', id);

            // Tenta remover de níveis de estoque (se a tabela existir)
            await supabase.from('inventory_levels').delete().eq('produto_id', id);

            // Se houver outras tabelas de histórico simples, adicionar aqui
        } catch (e) {
            console.warn("Aviso na limpeza de dependências:", e);
        }

        const { error } = await supabase.from('products').delete().eq('id', id);
        if (error) throw error;
    },

    async removeCategory(category: string, companyId: string): Promise<void> {
        const { error } = await supabase
            .from('products')
            .update({ categoria: null })
            .eq('company_id', companyId)
            .eq('categoria', category);
        if (error) throw error;
    },

    async removeBrand(brand: string, companyId: string): Promise<void> {
        const { error } = await supabase
            .from('products')
            .update({ marca: null })
            .eq('company_id', companyId)
            .eq('marca', brand);
        if (error) throw error;
    },

    // Locais de Estoque
    async getStorageLocations(companyId?: string): Promise<StorageLocation[]> {
        if (!companyId) return [];
        let query = supabase.from('storage_locations').select('*').eq('ativo', true);
        if (companyId) query = query.eq('company_id', companyId);
        const { data, error } = await query.order('nome');
        if (error) throw error;
        return (data || []).map(mapStorageLocation);
    },
    async createStorageLocation(location: any): Promise<StorageLocation> {
        const dbLocation = {
            nome: location.nome,
            localizacao: location.localizacao || '',
            company_id: location.companyId || location.company_id,
            ativo: location.ativo ?? true
        };
        const { data, error } = await supabase.from('storage_locations').insert(dbLocation).select().single();
        if (error) throw error;
        return mapStorageLocation(data);
    },
    async updateStorageLocation(id: string, location: Partial<StorageLocation>): Promise<void> {
        const { error } = await supabase.from('storage_locations').update(location).eq('id', id);
        if (error) throw error;
    },
    async deleteStorageLocation(id: string): Promise<void> {
        const { error } = await supabase.from('storage_locations').update({ ativo: false }).eq('id', id);
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
        const dbMovement = {
            company_id: movement.companyId || movement.company_id,
            produto_id: movement.produtoId || movement.produto_id,
            tipo: movement.tipo,
            quantidade: movement.quantidade,
            origem_id: movement.origemId || movement.origem_id || null,
            destino_id: movement.destinoId || movement.destino_id || null,
            fornecedor_id: movement.fornecedorId || movement.fornecedor_id || null,
            document_ref: movement.documentRef || movement.document_ref || '',
            user_id: movement.userId || movement.user_id,
            user_name: movement.userName || movement.user_name,
            observacoes: movement.observacoes || ''
        };
        const { data, error } = await supabase.from('stock_movements').insert(dbMovement).select().single();
        if (error) throw error;
        return mapStockMovement(data);
    },

    async getProductBalance(productId: string, locationId: string): Promise<number> {
        // Busca todas as movimentações do produto que envolvem este local
        const { data, error } = await supabase
            .from('stock_movements')
            .select('tipo, quantidade, origem_id, destino_id')
            .eq('produto_id', productId)
            .or(`origem_id.eq.${locationId},destino_id.eq.${locationId}`);

        if (error) throw error;

        let balance = 0;
        (data || []).forEach(m => {
            if (m.destino_id === locationId) {
                // Entrada ou Destino de Transferência
                balance += Number(m.quantidade);
            } else if (m.origem_id === locationId) {
                // Saída ou Origem de Transferência
                balance -= Number(m.quantidade);
            }
        });
        return balance;
    },

    async deleteStockMovement(movementId: string): Promise<void> {
        const { error } = await supabase
            .from('stock_movements')
            .delete()
            .eq('id', movementId);

        if (error) throw error;
    },

    async getStocksByLocation(companyId: string, locationId: string): Promise<Record<string, number>> {
        const { data, error } = await supabase
            .from('stock_movements')
            .select('produto_id, tipo, quantidade, origem_id, destino_id')
            .eq('company_id', companyId)
            .or(`origem_id.eq.${locationId},destino_id.eq.${locationId}`);

        if (error) throw error;

        const balances: Record<string, number> = {};
        (data || []).forEach(m => {
            const pid = m.produto_id;
            if (!balances[pid]) balances[pid] = 0;

            if (m.destino_id === locationId) {
                balances[pid] += Number(m.quantidade);
            } else if (m.origem_id === locationId) {
                balances[pid] -= Number(m.quantidade);
            }
        });
        return balances;
    },

    async getLatestDeliveryDates(companyId: string, locationId: string): Promise<Record<string, string>> {
        const { data, error } = await supabase
            .from('stock_movements')
            .select('produto_id, created_at')
            .eq('company_id', companyId)
            .eq('destino_id', locationId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        const dates: Record<string, string> = {};
        (data || []).forEach(m => {
            const pid = m.produto_id;
            if (!dates[pid]) {
                dates[pid] = m.created_at;
            }
        });
        return dates;
    },

    // Vendas / PDV
    async getVendas(companyId?: string): Promise<any[]> {
        let query = supabase.from('vendas').select('*, customers(name)');
        if (companyId) query = query.eq('company_id', companyId);
        const { data, error } = await query.order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
    },
    async getVenda(id: string): Promise<any | null> {
        const { data, error } = await supabase.from('vendas').select('*, venda_itens(*, products(*))').eq('id', id).single();
        if (error) throw error;
        return data;
    },
    async createVenda(venda: any, itens: any[]): Promise<any> {
        // 1. Criar a Venda
        const { data: sale, error: saleError } = await supabase.from('vendas').insert(venda).select().single();
        if (saleError) throw saleError;

        // 2. Criar os Itens
        const itemsToInsert = itens.map(item => ({
            venda_id: sale.id,
            product_id: item.productId,
            quantidade: item.quantidade,
            preco_unitario: item.precoUnitario,
            desconto: item.desconto,
            subtotal: item.subtotal
        }));

        const { error: itemsError } = await supabase.from('venda_itens').insert(itemsToInsert);
        if (itemsError) throw itemsError;

        // 3. Gerar Movimentações de Estoque (SAIDA)
        for (const item of itens) {
            await this.createStockMovement({
                company_id: venda.company_id,
                produto_id: item.productId,
                tipo: 'SAIDA',
                quantidade: item.quantidade,
                origem_id: item.origem_id, // Local de onde saiu o produto
                user_id: venda.user_id,
                user_name: venda.user_name || 'PDV',
                observacoes: `Venda PDV #${sale.id.slice(0, 8)}`
            });
        }

        return sale;
    },
    async deleteVenda(id: string): Promise<void> {
        const { error } = await supabase.from('vendas').delete().eq('id', id);
        if (error) throw error;
    },

    // Chat
    async getMessages(companyId?: string): Promise<ChatMessage[]> {
        let query = supabase.from('chat_messages').select('*');
        if (companyId) query = query.eq('company_id', companyId);
        const { data, error } = await query.order('timestamp', { ascending: true });
        if (error) return [];
        return (data || []).map(raw => ({ id: raw.id, companyId: raw.company_id, senderId: raw.sender_id, senderName: raw.sender_name, receiverId: raw.receiver_id, channelId: raw.channel_id, text: raw.text, timestamp: raw.timestamp }));
    },
    async sendMessage(message: any): Promise<void> {
        const { error } = await supabase.from('chat_messages').insert(message);
        if (error) throw error;
    },

    // Pagamentos
    async getCompanyPayments(companyId?: string): Promise<CompanyPayment[]> {
        let query = supabase.from('company_payments').select('*');
        if (companyId) query = query.eq('company_id', companyId);
        const { data, error } = await query.order('payment_date', { ascending: false });
        if (error) return [];
        return (data || []).map(raw => ({ id: raw.id, companyId: raw.company_id, amount: raw.amount, paymentDate: raw.payment_date, planReference: raw.plan_reference, expiresAtAfter: raw.expires_at_after }));
    },
    async createCompanyPayment(payment: any): Promise<CompanyPayment> {
        const { data, error } = await supabase.from('company_payments').insert(payment).select().single();
        if (error) throw error;
        return { id: data.id, companyId: data.company_id, amount: data.amount, paymentDate: data.payment_date, planReference: data.plan_reference, expiresAtAfter: data.expires_at_after };
    },
    async deleteCompanyPayment(id: string): Promise<void> {
        const { error } = await supabase.from('company_payments').delete().eq('id', id);
        if (error) throw error;
    },
    async getAllPayments(): Promise<any[]> {
        const { data, error } = await supabase.from('company_payments').select('*, companies(name)').order('payment_date', { ascending: false });
        if (error) return [];
        return (data || []).map(raw => ({ ...raw, companyName: raw.companies?.name || 'Excluída' }));
    },

    // Notificações
    async getNotifications(companyId: string): Promise<AppNotification[]> {
        const { data, error } = await supabase.from('notifications').select('*').eq('company_id', companyId).order('created_at', { ascending: false }).limit(20);
        if (error) return [];
        return (data || []).map(raw => ({ id: raw.id, companyId: raw.company_id, type: raw.type as NotificationType, title: raw.title, content: raw.content, link: raw.link, isRead: raw.is_read, createdAt: raw.created_at }));
    },
    async createNotification(notification: any): Promise<void> {
        const { error } = await supabase.from('notifications').insert(notification);
        if (error) throw error;
    },
    async markNotificationAsRead(id: string): Promise<void> {
        const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', id);
        if (error) throw error;
    },

    // Outros
    async generateAIReport(orderId: string, description: string, history: string): Promise<string> {
        const { data, error } = await supabase.functions.invoke('generate-report', { body: { description, history } });
        if (error) throw error;
        return data.text || '';
    },
    async getSupportMessages(companyId: string): Promise<ChatMessage[]> {
        const { data, error } = await supabase.from('chat_messages').select('*').eq('channel_id', `support_${companyId}`).order('timestamp', { ascending: true });
        if (error) return [];
        return (data || []).map(raw => ({ id: raw.id, companyId: raw.company_id, senderId: raw.sender_id, senderName: raw.sender_name, receiverId: raw.receiver_id, channelId: raw.channel_id, text: raw.text, timestamp: raw.timestamp }));
    },
    async getAllSupportChannels(): Promise<any[]> {
        const { data: companies } = await supabase.from('companies').select('id, name, trade_name').eq('status', 'ACTIVE');
        return (companies || []).map(c => ({ companyId: c.id, companyName: c.trade_name || c.name, lastMessage: '', timestamp: '' }));
    },
    async getPlanPricing(): Promise<any[]> {
        const { data, error } = await supabase.from('plan_pricing').select('*');
        if (error) return [];
        return data;
    },
    async setPlanPricing(planType: string, period: string, basePrice: number, discountPct: number): Promise<void> {
        await supabase.from('plan_pricing').upsert({ plan_type: planType, period, base_price: basePrice, discount_pct: discountPct }, { onConflict: 'plan_type,period' });
    },
    async getAdminCount(companyId: string): Promise<number> {
        const { count } = await supabase.from('users').select('*', { count: 'exact', head: true }).eq('company_id', companyId).eq('role', 'Administrador');
        return count || 0;
    },
    async forceLogoutUser(_userId: string): Promise<void> { return Promise.resolve(); },
    async getActiveSessionUsers(_companyId?: string): Promise<User[]> { return Promise.resolve([]); },
    async globalSearch(companyId: string, query: string, _userRole: string): Promise<any> {
        const { data: customers } = await supabase.from('customers').select('*').eq('company_id', companyId).ilike('name', `%${query}%`).limit(5);
        return { customers: (customers || []).map(mapCustomer), orders: [], users: [] };
    },
    async upsertCompanies(items: Company[]) { await supabase.from('companies').upsert(items.map(i => ({ ...i, settings: JSON.stringify(i.settings) }))); },
    async upsertUsers(items: User[]) { await supabase.from('users').upsert(items.map(i => ({ ...i, company_id: i.companyId }))); },
    async upsertCustomers(items: Customer[]) { await supabase.from('customers').upsert(items.map(i => ({ ...i, company_id: i.companyId }))); },
    async upsertOrders(items: ServiceOrder[]) { await supabase.from('service_orders').upsert(items.map(i => ({ ...i, company_id: i.companyId, customer_id: i.customerId, tech_id: i.techId }))); },
    async upsertMessages(items: ChatMessage[]) { await supabase.from('chat_messages').upsert(items.map(i => ({ ...i, company_id: i.companyId, sender_id: i.senderId }))); },
    async upsertPayments(items: CompanyPayment[]) { await supabase.from('company_payments').upsert(items.map(i => ({ ...i, company_id: i.companyId }))); },
    supabase
};
