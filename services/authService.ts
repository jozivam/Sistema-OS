
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
    },

    async signUp(email: string, password: string, name: string) {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
        });

        if (error) {
            if (error.message.includes('Email signups are disabled')) {
                throw new Error('EMAIL_SIGNUP_DISABLED');
            }
            throw error;
        }
        if (!data.user) throw new Error('Falha ao criar usuário.');

        // Criar perfil em public.users
        const { error: profileError } = await supabase.from('users').insert({
            id: data.user.id,
            name: name,
            email: email,
            role: UserRole.TECH, // Default, será promovido depois
            is_blocked: false
        });

        if (profileError) {
            console.error('Erro ao criar perfil em public.users:', profileError);
            throw profileError;
        }

        return data.user;
    }
};
