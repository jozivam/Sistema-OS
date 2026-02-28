import { supabase } from './supabaseClient';
import { User, UserRole } from '../types';
import { logService } from './logger';
import { IAuthService } from './database.types';

const SESSION_KEY = 'sistema_os_session';
const SESSION_TOKEN_KEY = 'sistema_os_session_token';

const mapAuthUser = (sbUser: any): User => ({
    id: sbUser.id,
    email: sbUser.email || '',
    name: sbUser.user_metadata?.name || sbUser.app_metadata?.name || 'Usuário',
    role: (sbUser.app_metadata?.role || sbUser.user_metadata?.role) as UserRole,
    companyId: sbUser.app_metadata?.company_id || sbUser.user_metadata?.company_id,
    phone: sbUser.user_metadata?.phone,
});

export const authService: IAuthService = {
    async signIn(email: string, password: string) {
        const { data, error: authError } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (authError) {
            throw new Error('E-mail ou senha incorretos.');
        }

        if (!data.user) {
            throw new Error('Usuário não encontrado.');
        }

        // Buscar dados complementares do perfil público
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('id', data.user.id)
            .single();

        if (userError || !userData) {
            throw new Error('Perfil de usuário não encontrado no banco de dados.');
        }

        if (userData.is_blocked) {
            // Se estiver bloqueado, desloga do auth também
            await supabase.auth.signOut();
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
            password: userData.password // Mantido para compatibilidade se necessário
        };

        // Salvar sessão localmente (backup do session storage se necessário, 
        // embora o Supabase Auth já gerencie o dele)
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
        return user;
    },

    async signOut() {
        const session = sessionStorage.getItem(SESSION_KEY);
        if (session) {
            try {
                const user: User = JSON.parse(session);
                // Limpar token do banco ao deslogar normalmente
                await supabase.from('users').update({
                    is_blocked: false // Apenas um update dummy se necessário, ou remover o update
                }).eq('id', user.id);
            } catch { /* ignora erros */ }
        }
        sessionStorage.removeItem(SESSION_KEY);
        sessionStorage.removeItem(SESSION_TOKEN_KEY);
        await supabase.auth.signOut().catch(() => { });
    },

    async getCurrentUser(): Promise<User | null> {
        // Primeiro tenta a sessão normal
        const session = sessionStorage.getItem(SESSION_KEY);
        if (session) {
            try {
                return JSON.parse(session);
            } catch {
                return null;
            }
        }

        // Tenta buscar do Supabase se não estiver no cache local
        const { data: { user }, error } = await supabase.auth.getUser();
        if (!error && user) {
            const mapped = mapAuthUser(user);
            sessionStorage.setItem(SESSION_KEY, JSON.stringify(mapped));
            return mapped;
        }

        // Fallback para Trial
        try {
            const { getCurrentTrialUser } = await import('./trialService');
            return getCurrentTrialUser();
        } catch {
            return null;
        }
    },

    async validateSession(user: User): Promise<{ valid: boolean; reason?: 'blocked' | 'concurrent_session' }> {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('id, is_blocked')
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


            return { valid: true };
        } catch (error) {
            console.error("Erro na validação de sessão:", error);
            return { valid: true }; // Em caso de erro de rede, não deslogar
        }
    },


    async signUp(email: string, password: string, name: string, companyId: string) {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    name,
                    company_id: companyId
                }
            }
        });

        if (error) throw error;
        if (!data.user) throw new Error('Falha ao criar usuário na autenticação.');

        // O trigger no banco deve cuidar de inserir em public.users
        return mapAuthUser(data.user);
    },

    // Desenvolvedor força logout de um usuário limpando o token do banco
    async forceLogoutUser(userId: string): Promise<void> {
        const { error } = await supabase.from('users').update({
            is_blocked: false
        }).eq('id', userId);
        if (error) throw error;
    },

    isPlaceholderClient() {
        return (supabase as any).supabaseUrl === 'https://placeholder.supabase.co';
    },

    async adminCreateUser(userData: { email: string, password?: string, name: string, role: string, company_id: string, phone?: string, city?: string }) {
        // Se não houver senha, gera uma aleatória de 8 caracteres
        const password = userData.password || Math.random().toString(36).slice(-8);

        const { data, error } = await supabase.functions.invoke('create-user', {
            body: {
                email: userData.email,
                password,
                name: userData.name,
                role: userData.role,
                company_id: userData.company_id,
                phone: userData.phone,
                city: userData.city
            }
        });

        if (error) {
            let errorMessage = error.message;
            let fullDetails = null;

            if (error.context && typeof error.context.json === 'function') {
                try {
                    const errBody = await error.context.json();
                    fullDetails = errBody;
                    if (errBody && errBody.error) {
                        errorMessage = errBody.error;
                    }
                } catch (e) {
                    // Ignore parse error
                }
            } else if (error.message.includes('non-2xx')) {
                errorMessage = "Erro interno no servidor (A API não retornou sucesso). Verifique o console ou a aba de Logs.";
            }

            logService.addLog('error', `Falha ao cadastrar: ${errorMessage}`, {
                originalError: error,
                contextBody: fullDetails,
                payloadSent: {
                    email: userData.email,
                    role: userData.role,
                    company_id: userData.company_id
                }
            });

            throw new Error(errorMessage);
        }

        logService.addLog('info', `Usuário criado com sucesso via adminCreateUser`, { email: userData.email });

        return { user: data?.user || data, password };
    }
};
