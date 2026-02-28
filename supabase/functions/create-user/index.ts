import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

        if (!supabaseUrl || !supabaseServiceKey) {
            throw new Error('Supabase URL ou Service Role Key não configurados no ambiente da Edge Function.')
        }

        const supabaseClient = createClient(supabaseUrl, supabaseServiceKey)

        const { email, password, name, role, company_id, phone, city } = await req.json()

        console.log(`Iniciando criação de usuário: ${email} (Papel: ${role}, Empresa: ${company_id})`)

        // 1. Criar o usuário no Auth usando a Service Role (Admin)
        const { data: authUser, error: authError } = await supabaseClient.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: {
                name,
                role,
                company_id,
                phone,
                city,
                password // Enviamos a senha plana no metadado apenas para o trigger (opcional, mas o usuário quer no banco public)
            },
            app_metadata: {
                role,
                company_id
            }
        })

        if (authError) {
            console.error('Erro ao Criar Usuário no Auth:', authError)
            throw authError
        }

        console.log(`Usuário criado com sucesso no Auth: ${authUser.user.id}`)

        return new Response(
            JSON.stringify({ user: authUser.user }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200
            }
        )
    } catch (error) {
        console.error('Erro Crítico na Edge Function:', error.message)
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400
            }
        )
    }
})
