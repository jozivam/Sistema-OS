
import { supabase } from './supabaseClient';
import { AppState, Company, User, Customer, ServiceOrder, SystemSettings } from '../types';

export const dbService = {
    // Empresas
    async getCompanies(): Promise<Company[]> {
        const { data, error } = await supabase
            .from('companies')
            .select('*');

        if (error) {
            console.error('Erro ao buscar empresas:', error);
            return [];
        }
        return data || [];
    },

    async updateCompany(id: string, updates: Partial<Company>) {
        const { error } = await supabase
            .from('companies')
            .update(updates)
            .eq('id', id);

        if (error) throw error;
    },

    async updateCompanySettings(id: string, settings: SystemSettings) {
        const { error } = await supabase
            .from('companies')
            .update({ settings })
            .eq('id', id);

        if (error) throw error;
    },

    // Usuários
    async getUsers(companyId?: string): Promise<User[]> {
        let query = supabase.from('users').select('*');
        if (companyId) {
            query = query.eq('company_id', companyId);
        }

        const { data, error } = await query;
        if (error) {
            console.error('Erro ao buscar usuários:', error);
            return [];
        }
        return data || [];
    },

    // Clientes
    async getCustomers(companyId: string): Promise<Customer[]> {
        const { data, error } = await supabase
            .from('customers')
            .select('*')
            .eq('company_id', companyId);

        if (error) {
            console.error('Erro ao buscar clientes:', error);
            return [];
        }
        return data || [];
    },

    // Ordens de Serviço
    async getOrders(companyId: string): Promise<ServiceOrder[]> {
        const { data, error } = await supabase
            .from('service_orders')
            .select('*')
            .eq('company_id', companyId);

        if (error) {
            console.error('Erro ao buscar ordens:', error);
            return [];
        }
        return data || [];
    },

    // Sincronização Inicial (Opcional - para migração)
    async syncLocalToSupabase(data: AppState) {
        // Esta função pode ser usada para um "push" inicial dos dados do localStorage para o Supabase
        // Implementar conforme necessário para facilitar a transição do usuário
        console.log('Iniciando sincronização para o Supabase...');
        // TODO: Implementar lógica de insert em lote
    }
};
