import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const {
            companyData,
            userData,
            paymentData
        } = await req.json()

        // 0. Normalização de dados (Limpeza de máscaras para consistência no DB)
        const cleanDocument = companyData.document.replace(/\D/g, '');
        const cleanPhone = companyData.phone.replace(/\D/g, '');

        // 1. Calcular Data de Expiração
        const period = paymentData?.period || 'MENSAL';
        const amount = paymentData?.amount || 0;

        const expiresAt = new Date();
        if (period === 'TRIMESTRAL') expiresAt.setMonth(expiresAt.getMonth() + 3);
        else if (period === 'SEMESTRAL') expiresAt.setMonth(expiresAt.getMonth() + 6);
        else if (period === 'ANUAL') expiresAt.setMonth(expiresAt.getMonth() + 12);
        else expiresAt.setMonth(expiresAt.getMonth() + 1);

        // 2. Criar ou Recuperar a Empresa (Idempotente)
        console.log("Gerenciando registro da empresa para documento:", cleanDocument);

        // Verificar se empresa com este documento já existe para evitar duplicatas
        const { data: existingCompanies, error: searchError } = await supabaseAdmin
            .from('companies')
            .select('id')
            .eq('document', cleanDocument)
            .order('created_at', { ascending: false })
            .limit(1);

        if (searchError) {
            console.error("Erro ao buscar empresa existente:", searchError);
            throw new Error(`Erro na busca de empresa: ${searchError.message}`);
        }

        const existingCompany = existingCompanies && existingCompanies.length > 0 ? existingCompanies[0] : null;

        let company;
        let companyError;

        const companyPayload = {
            name: companyData.name,
            trade_name: companyData.name,
            corporate_name: companyData.corporateName || companyData.name,
            document: cleanDocument, // Salvar limpo
            email: companyData.email,
            phone: cleanPhone, // Salvar limpo
            address: companyData.address,
            plan: companyData.plan || 'DIAMANTE',
            plan_period: period,
            monthly_fee: amount,
            status: 'ACTIVE',
            expires_at: expiresAt.toISOString()
        };

        if (existingCompany) {
            console.log("Empresa já existe, atualizando ID:", existingCompany.id);
            const { data, error } = await supabaseAdmin
                .from('companies')
                .update(companyPayload)
                .eq('id', existingCompany.id)
                .select()
                .single();
            company = data;
            companyError = error;
        } else {
            console.log("Criando nova empresa...");
            const { data, error } = await supabaseAdmin
                .from('companies')
                .insert(companyPayload)
                .select()
                .single();
            company = data;
            companyError = error;
        }

        if (companyError || !company) {
            console.error("Erro no processamento da empresa:", companyError);
            throw new Error(`Erro no registro da empresa: ${companyError?.message || 'Falha ao obter ID da empresa'}`);
        }

        // 3. Gerenciar Usuário Administrador (Idempotente e Simples)
        console.log("Gerenciando acesso do usuário:", userData.adminEmail);

        let authUser;
        const userPayload = {
            email: userData.adminEmail,
            password: userData.password,
            email_confirm: true,
            user_metadata: {
                name: userData.name,
                role: 'Administrador',
                company_id: company.id,
                password: userData.password
            },
            app_metadata: {
                role: 'Administrador',
                company_id: company.id
            }
        };

        // Tentar criar primeiro
        const { data: newUser, error: authError } = await supabaseAdmin.auth.admin.createUser(userPayload);

        if (authError) {
            // Se já existir, atualizar para garantir que o company_id esteja correto
            if (authError.message.includes("already registered") || authError.message.includes("already exists")) {
                console.log("Usuário já existe no Auth, buscando ID para sincronização...");
                const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
                if (listError) throw listError;

                const existingUser = users.find(u => u.email?.toLowerCase() === userData.adminEmail.toLowerCase());
                if (!existingUser) throw new Error("Conflito de e-mail detectado, mas usuário não pôde ser localizado.");

                console.log("Sincronizando usuário existente ID:", existingUser.id, "com Empresa:", company.id);
                const { data: updated, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
                    existingUser.id,
                    {
                        password: userData.password,
                        user_metadata: userPayload.user_metadata,
                        app_metadata: userPayload.app_metadata
                    }
                );

                if (updateError) throw updateError;
                authUser = { user: updated.user };
            } else {
                console.error("Erro fatal na criação do usuário:", authError);
                throw authError;
            }
        } else {
            authUser = newUser;
        }

        // 4. Registrar Pagamento Inicial (Opcional, não deve travar o processo principal)
        try {
            console.log("Registrando log de pagamento...");
            await supabaseAdmin
                .from('company_payments')
                .insert({
                    company_id: company.id,
                    amount: amount,
                    payment_date: new Date().toISOString(),
                    plan_reference: `${companyData.plan} - ${period}`,
                    expires_at_after: expiresAt.toISOString()
                });
        } catch (pErr) {
            console.error("Aviso: Falha ao registrar log de pagamento (não fatal):", pErr);
        }

        return new Response(
            JSON.stringify({
                success: true,
                companyId: company.id,
                userId: authUser?.user?.id
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200
            }
        );
    } catch (error) {
        console.error("Checkout Fatal Error:", (error as Error).message);
        return new Response(
            JSON.stringify({
                error: (error as Error).message,
                details: "Não foi possível completar a contratação. Verifique se os dados já estão em uso."
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400
            }
        );
    }
})
