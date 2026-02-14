
import { supabase } from './supabaseClient';
import { User, UserRole } from '../types';

export const authService = {
    async signIn(email: string, password: string) {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) throw error;

        // Buscar dados complementares do usuário na tabela public.users
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('id', data.user.id)
            .single();

        if (userError) {
            console.warn('Erro ao buscar dados do perfil do usuário:', userError);
            // Se não houver dados em public.users, retornar o básico do auth
            return {
                id: data.user.id,
                email: data.user.email || '',
                name: data.user.email?.split('@')[0] || 'Usuário',
                role: UserRole.TECH // Default caso falhe
            } as User;
        }

        return {
            id: userData.id,
            companyId: userData.company_id,
            name: userData.name,
            email: userData.email,
            phone: userData.phone,
            role: userData.role as UserRole,
            city: userData.city,
            isBlocked: userData.is_blocked
        } as User;
    },

    async signOut() {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
    },

    async getCurrentUser(): Promise<User | null> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;

        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('id', user.id)
            .single();

        if (userError) return null;

        return {
            id: userData.id,
            companyId: userData.company_id,
            name: userData.name,
            email: userData.email,
            phone: userData.phone,
            role: userData.role as UserRole,
            city: userData.city,
            isBlocked: userData.is_blocked
        } as User;
    }
};
