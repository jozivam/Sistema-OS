import { supabase } from './supabaseClient';
import { User, UserRole } from '../types';

const SESSION_KEY = 'sistema_os_session';
const SESSION_TOKEN_KEY = 'sistema_os_session_token';

export const authService = {
    async signIn(email: string, password: string) {
        console.group('DEBUG LOGIN');
        console.log('Tentando logar com:', email);

        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .eq('password', password)
            .single();

        if (userError) {
            console.error('Erro de banco:', userError);
            console.groupEnd();
            throw new Error('E-mail ou senha incorretos.');
        }

        if (!userData) {
            console.warn('Nenhum usuário encontrado com esses dados.');
            console.groupEnd();
            throw new Error('E-mail ou senha incorretos.');
        }

        console.log('Usuário encontrado:', userData);
        console.groupEnd();

        if (userData.is_blocked) {
            throw new Error('Este usuário está bloqueado.');
        }

        // Gerar token de sessão único (UUID simples)
        const sessionToken = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;

        // Persistir token no banco para detecção de sessão dupla
        await supabase.from('users').update({
            active_session_token: sessionToken,
            session_updated_at: new Date().toISOString()
        }).eq('id', userData.id);

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

        // Salvar sessão e token localmente
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
        sessionStorage.setItem(SESSION_TOKEN_KEY, sessionToken);
        return user;
    },

    async signOut() {
        const session = sessionStorage.getItem(SESSION_KEY);
        if (session) {
            try {
                const user: User = JSON.parse(session);
                // Limpar token do banco ao deslogar normalmente
                await supabase.from('users').update({
                    active_session_token: null,
                    session_updated_at: null
                }).eq('id', user.id);
            } catch { /* ignora erros */ }
        }
        sessionStorage.removeItem(SESSION_KEY);
        sessionStorage.removeItem(SESSION_TOKEN_KEY);
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

    async validateSession(user: User): Promise<{ valid: boolean; reason?: 'blocked' | 'concurrent_session' }> {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('id, is_blocked, active_session_token')
                .eq('id', user.id)
                .single();

            // Erro de rede ou sem dados: não deslogar (pode ser falha temporária)
            if (error || !data) {
                console.warn('validateSession: falha ao consultar banco — mantendo sessão ativa.');
                return { valid: true };
            }

            if (data.is_blocked) {
                return { valid: false, reason: 'blocked' };
            }

            // Verificar se o token de sessão ainda é válido (detecção de sessão dupla)
            const localToken = sessionStorage.getItem(SESSION_TOKEN_KEY);
            if (data.active_session_token && localToken && data.active_session_token !== localToken) {
                return { valid: false, reason: 'concurrent_session' };
            }

            return { valid: true };
        } catch (error) {
            console.error("Erro na validação de sessão:", error);
            return { valid: true }; // Em caso de erro de rede, não deslogar
        }
    },


    async signUp(email: string, password: string, name: string) {
        const { data, error } = await supabase.from('users').insert({
            name: name,
            email: email,
            password: password,
            role: UserRole.TECH,
            is_blocked: false
        }).select().single();

        if (error) throw error;
        return data;
    },

    // Desenvolvedor força logout de um usuário limpando o token do banco
    async forceLogoutUser(userId: string): Promise<void> {
        const { error } = await supabase.from('users').update({
            active_session_token: null,
            session_updated_at: null
        }).eq('id', userId);
        if (error) throw error;
    },

    isPlaceholderClient() {
        return (supabase as any).supabaseUrl === 'https://placeholder.supabase.co';
    }
};
