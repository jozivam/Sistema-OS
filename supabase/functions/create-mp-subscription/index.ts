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
    const { companyId, plan, period, amount } = await req.json()
    const MP_ACCESS_TOKEN = Deno.env.get('MP_ACCESS_TOKEN')

    if (!MP_ACCESS_TOKEN) {
      throw new Error('Mercado Pago token is not configured')
    }

    // 1. Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')
    const supabase = createClient(supabaseUrl!, supabaseKey!)

    // 2. Fetch company data
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('*')
      .eq('id', companyId)
      .single()

    if (companyError || !company) {
      throw new Error('Company not found')
    }

    // 3. Create Preapproval Plan in Mercado Pago (if it doesn't exist)
    // Mercado Pago requires a "Plan" entity before linking a customer to it
    const planName = `${plan} - ${period} - ${company.trade_name}`

    const mpPlanPayload = {
      reason: planName,
      auto_recurring: {
        frequency: period === 'MENSAL' ? 1 : period === 'ANUAL' ? 12 : 1,
        frequency_type: "months",
        transaction_amount: amount,
        currency_id: "BRL"
      },
      back_url: `${req.headers.get('origin')}/admin?payment=success`,
    }

    const planResponse = await fetch("https://api.mercadopago.com/preapproval_plan", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${MP_ACCESS_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(mpPlanPayload)
    });

    if (!planResponse.ok) {
      const errorData = await planResponse.json();
      console.error("MP Plan Error:", errorData);
      throw new Error('Failed to create Mercado Pago plan');
    }

    const planData = await planResponse.json();

    // 4. Create the actual subscription link for this customer
    const mpSubscriptionPayload = {
      preapproval_plan_id: planData.id,
      card_token_id: "optional", // Only needed if doing direct API UI
      payer_email: company.email,
      external_reference: companyId, // Crucial for identifying it in the Webhook
      back_url: `${req.headers.get('origin')}/admin?payment=success`,
      reason: planName
    };

    const subResponse = await fetch("https://api.mercadopago.com/preapproval", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${MP_ACCESS_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(mpSubscriptionPayload)
    });

    if (!subResponse.ok) {
      const errorData = await subResponse.json();
      console.error("MP Subscription Error:", errorData);
      throw new Error('Failed to create Mercado Pago subscription URL');
    }

    const subscriptionData = await subResponse.json();

    // The frontend needs `init_point` to redirect the user
    return new Response(
      JSON.stringify({ init_point: subscriptionData.init_point }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
})
