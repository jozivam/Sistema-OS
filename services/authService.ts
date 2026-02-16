import { supabase } from './supabaseClient';
import { User, UserRole } from '../types';

const SESSION_KEY = 'sistema_os_session';

// Garante que o localStorage seja limpo para evitar conflitos com a nova sessão efêmera
if (typeof window !== 'undefined') {
    localStorage.clear();
}

export const authService = {
    async signIn(email: string, password: string) {
        // Busca o usuário diretamente na tabela pública
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .eq('password', password) // Simples conferência de texto (devemos usar hash no futuro)
            .single();

        if (userError || !userData) {
            throw new Error('E-mail ou senha incorretos.');
        }

        if (userData.is_blocked) {
            throw new Error('Este usuário está bloqueado.');
        }

        const user: User = {
            id: userData.id,
            companyId: userData.company_id,
            name: userData.name,
            email: userData.email,
            phone: userData.phone,
            role: userData.role as UserRole,
            city: userData.city,
            isBlocked: userData.is_blocked,
            password: userData.password
        };

        // Salvar sessão manualmente (Efêmera: limpa ao fechar aba/navegador)
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
        return user;
    },

    async signOut() {
        sessionStorage.removeItem(SESSION_KEY);
        // Tenta deslogar do supabase se houver sessão residual, mas não bloqueia
        await supabase.auth.signOut().catch(() => { });
    },

    async getCurrentUser(): Promise<User | null> {
        const session = sessionStorage.getItem(SESSION_KEY);
        if (!session) return null;
        try {
            return JSON.parse(session);
        } catch {
            return null;
        }
    },

    async validateSession(user: User): Promise<boolean> {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('id, is_blocked')
                .eq('id', user.id)
                .single();

            if (error || !data || data.is_blocked) {
                return false;
            }
            return true;
        } catch (error) {
            console.error("Erro na validação de sessão:", error);
            return false;
        }
    },

    async signUp(email: string, password: string, name: string) {
        // No fluxo profissional restrito, o signup é apenas pela tabela users
        // Esta função pode ser usada pelo desenvolvedor no painel
        const { data, error } = await supabase.from('users').insert({
            name: name,
            email: email,
            password: password,
            role: UserRole.TECH,
            is_blocked: false
        }).select().single();

        if (error) throw error;
        return data;
    }
};
